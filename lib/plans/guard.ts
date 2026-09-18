import { and, asc, eq, gt, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  mcpTokens,
  planResourceSelections,
  transactions,
  userIntegrationInstalls,
} from "@/lib/db/schema";
import type { Scope } from "@/lib/mcp/scopes";
import { PlanError } from "./errors";
import { monthWindow } from "./time";
import { resolveEntitlements } from "./resolve";

export async function allowedScopesForUser(userId: string): Promise<Scope[]> {
  return (await resolveEntitlements(userId)).limits.mcpScopes;
}

export async function assertScopeAllowedByPlan(userId: string, scope: Scope): Promise<void> {
  const allowed = await allowedScopesForUser(userId);
  if (!allowed.includes(scope)) {
    throw new PlanError({
      code: "plan_required",
      feature: scope,
      message: `Your current plan does not allow ${scope}.`,
    });
  }
}

export async function assertAccountCreationAllowed(userId: string, currency: string): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  const rows = await db
    .select({ count: sql<number>`count(*)::int`, currencies: sql<string[]>`array_agg(distinct ${accounts.currency})` })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const count = Number(rows[0]?.count ?? 0);
  const currencies = rows[0]?.currencies ?? [];
  if (entitlement.limits.accounts != null && count >= entitlement.limits.accounts) {
    throw new PlanError({
      code: "resource_limit_reached",
      feature: "accounts",
      message: "Your account limit has been reached.",
      limit: entitlement.limits.accounts,
      used: count,
    });
  }
  if (!currencies.includes(currency) && currencies.length >= entitlement.limits.currencies) {
    throw new PlanError({
      code: "resource_limit_reached",
      feature: "currencies",
      message: "Your current plan does not allow another active currency.",
      limit: entitlement.limits.currencies,
      used: currencies.length,
    });
  }
}

export async function assertTransactionAllowed(
  userId: string,
  occurredAt: Date,
  accountId?: string | null
): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  if (entitlement.accessMode === "free") {
    const [selection] = await db
      .select({
        activeCurrency: planResourceSelections.activeCurrency,
        activeAccountIds: planResourceSelections.activeAccountIds,
      })
      .from(planResourceSelections)
      .where(
        and(
          eq(planResourceSelections.userId, userId),
          eq(planResourceSelections.entitlementVersion, entitlement.entitlementVersion)
        )
      )
      .limit(1);
    const allAccounts = await db
      .select({ id: accounts.id, currency: accounts.currency })
      .from(accounts)
      .where(eq(accounts.userId, userId))
      .orderBy(asc(accounts.sort), asc(accounts.createdAt));
    const needsSelection = allAccounts.length > 2 || new Set(allAccounts.map((a) => a.currency)).size > 1;
    if (needsSelection && !selection) {
      throw new PlanError({
        code: "resource_locked",
        feature: "free_resource_selection",
        message: "Choose the accounts that will remain editable on Free.",
      });
    }
    if (selection && accountId && !selection.activeAccountIds.includes(accountId)) {
      throw new PlanError({
        code: "resource_locked",
        feature: "account",
        message: "This account is read-only on your current plan.",
      });
    }
  }

  const limit = entitlement.limits.transactionsMonthly;
  if (limit == null) return;
  const window = monthWindow(occurredAt, entitlement.meteringTimezone);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.status, "confirmed"),
        sql`${transactions.occurredAt} >= ${window.start}`,
        sql`${transactions.occurredAt} < ${window.end}`
      )
    );
  const used = Number(row?.count ?? 0);
  if (used >= limit) {
    throw new PlanError({
      code: "quota_exceeded",
      feature: "transactions",
      message: "Your transaction quota for this month has been reached.",
      limit,
      used,
      resetAt: window.end,
    });
  }
}

export async function assertRecurringAllowed(userId: string): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  if (!entitlement.limits.recurring) {
    throw new PlanError({
      code: entitlement.trialEndsAt ? "trial_expired" : "plan_required",
      feature: "recurring",
      message: "Recurring rules require an active trial, Pro, or Agent plan.",
    });
  }
}

export async function assertTransferAllowed(userId: string): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  if (!entitlement.limits.transfers) {
    throw new PlanError({
      code: "plan_required",
      feature: "transfers",
      message: "Internal transfers require the Agent plan.",
    });
  }
}

export async function assertMcpTokenCreationAllowed(userId: string): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mcpTokens)
    .where(
      and(
        eq(mcpTokens.userId, userId),
        isNull(mcpTokens.revokedAt),
        or(isNull(mcpTokens.expiresAt), gt(mcpTokens.expiresAt, new Date()))
      )
    );
  const used = Number(row?.count ?? 0);
  if (entitlement.limits.mcpTokens != null && used >= entitlement.limits.mcpTokens) {
    throw new PlanError({
      code: "resource_limit_reached",
      feature: "mcp_tokens",
      message: "Your active MCP token limit has been reached.",
      limit: entitlement.limits.mcpTokens,
      used,
    });
  }
}

export async function assertMcpTokenUsable(userId: string, tokenId: string): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  const limit = entitlement.limits.mcpTokens;
  if (limit == null) return;
  const rows = await db
    .select({ id: mcpTokens.id })
    .from(mcpTokens)
    .where(
      and(
        eq(mcpTokens.userId, userId),
        isNull(mcpTokens.revokedAt),
        or(isNull(mcpTokens.expiresAt), gt(mcpTokens.expiresAt, new Date()))
      )
    )
    .orderBy(asc(mcpTokens.createdAt), asc(mcpTokens.id))
    .limit(limit);
  if (!rows.some((row) => row.id === tokenId)) {
    throw new PlanError({
      code: limit === 0 ? "plan_required" : "resource_locked",
      feature: "mcp_token",
      message: "This MCP token is read-only or inactive under your current plan.",
      limit,
    });
  }
}

export async function assertIntegrationInstallAllowed(userId: string): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  const limit = entitlement.limits.integrations;
  if (limit == null) return;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userIntegrationInstalls)
    .where(
      and(
        eq(userIntegrationInstalls.userId, userId),
        or(
          eq(userIntegrationInstalls.status, "installed"),
          eq(userIntegrationInstalls.status, "connected")
        )
      )
    );
  const used = Number(row?.count ?? 0);
  if (used >= limit) {
    throw new PlanError({
      code: limit === 0 ? "plan_required" : "resource_limit_reached",
      feature: "integrations",
      message: "Your integration limit has been reached.",
      limit,
      used,
    });
  }
}

export async function assertIntegrationUsable(userId: string, installId: string): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  const limit = entitlement.limits.integrations;
  if (limit == null) return;
  const rows = await db
    .select({ id: userIntegrationInstalls.id })
    .from(userIntegrationInstalls)
    .where(
      and(
        eq(userIntegrationInstalls.userId, userId),
        or(
          eq(userIntegrationInstalls.status, "installed"),
          eq(userIntegrationInstalls.status, "connected")
        )
      )
    )
    .orderBy(asc(userIntegrationInstalls.createdAt), asc(userIntegrationInstalls.id))
    .limit(limit);
  if (!rows.some((row) => row.id === installId)) {
    throw new PlanError({
      code: limit === 0 ? "plan_required" : "resource_locked",
      feature: "integration",
      message: "This integration is inactive under your current plan.",
      limit,
    });
  }
}

export async function assertThemeSelectionAllowed(userId: string): Promise<void> {
  const entitlement = await resolveEntitlements(userId);
  if (!entitlement.limits.multiTheme) {
    throw new PlanError({
      code: "plan_required",
      feature: "themes",
      message: "Additional themes require an active trial, Pro, or Agent plan.",
    });
  }
}
