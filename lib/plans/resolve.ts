import { and, eq, gt, gte, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  accounts,
  mcpTokens,
  planResourceSelections,
  planUsageBuckets,
  profiles,
  transactions,
  userIntegrationInstalls,
} from "@/lib/db/schema";
import {
  PLAN_CATALOG,
  PLAN_CONTACT_EMAIL,
  TRIAL_LIMITS,
  isPlanId,
  limitsForAccess,
  type AccessMode,
  type PlanId,
  type PlanLimits,
} from "./catalog";
import { dayWindow, monthWindow } from "./time";

export type ResolvedEntitlements = {
  assignedPlan: PlanId;
  effectivePlan: PlanId;
  accessMode: AccessMode;
  startsAt: Date | null;
  endsAt: Date | null;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  paidStartedAt: Date | null;
  paidEndsAt: Date | null;
  entitlementVersion: number;
  meteringTimezone: string;
  limits: PlanLimits;
};

export type UsageValue = {
  used: number;
  limit: number | null;
  resetAt: string | null;
  warningAt?: number | null;
};

export type PlanSnapshot = {
  assignedPlan: PlanId;
  effectivePlan: PlanId;
  accessMode: AccessMode;
  label: string;
  startsAt: string | null;
  endsAt: string | null;
  limits: PlanLimits;
  usage: {
    samy: UsageValue;
    samyToday: UsageValue | null;
    mcpCalls: UsageValue;
    transactions: UsageValue;
    accounts: UsageValue;
    mcpTokens: UsageValue;
    integrations: UsageValue;
  };
  contactEmail: string;
  needsFreeResourceSelection: boolean;
  freeSelection: { activeCurrency: string; activeAccountIds: string[] } | null;
  lockedResources: {
    accounts: number;
    currencies: number;
    mcpTokens: number;
    integrations: number;
  };
};

export function resolveAccessState(
  input: {
    assignedPlan: PlanId;
    trialStartedAt: Date | null;
    trialEndsAt: Date | null;
    planStartedAt: Date | null;
    planExpiresAt: Date | null;
  },
  now = new Date()
): { accessMode: AccessMode; effectivePlan: PlanId; startsAt: Date | null; endsAt: Date | null } {
  const paidActive =
    input.assignedPlan !== "free" &&
    input.planStartedAt != null &&
    input.planExpiresAt != null &&
    input.planStartedAt.getTime() <= now.getTime() &&
    input.planExpiresAt.getTime() > now.getTime();
  const trialActive =
    !paidActive &&
    input.trialStartedAt != null &&
    input.trialEndsAt != null &&
    input.trialStartedAt.getTime() <= now.getTime() &&
    input.trialEndsAt.getTime() > now.getTime();
  const accessMode: AccessMode = paidActive ? "paid" : trialActive ? "trial" : "free";
  return {
    accessMode,
    effectivePlan: paidActive ? input.assignedPlan : trialActive ? "pro" : "free",
    startsAt: paidActive ? input.planStartedAt : trialActive ? input.trialStartedAt : null,
    endsAt: paidActive ? input.planExpiresAt : trialActive ? input.trialEndsAt : null,
  };
}

export async function resolveEntitlements(
  userId: string,
  now = new Date()
): Promise<ResolvedEntitlements> {
  const [row] = await db
    .select({
      plan: profiles.plan,
      trialStartedAt: profiles.trialStartedAt,
      trialEndsAt: profiles.trialEndsAt,
      planStartedAt: profiles.planStartedAt,
      planExpiresAt: profiles.planExpiresAt,
      entitlementVersion: profiles.entitlementVersion,
      meteringTimezone: profiles.meteringTimezone,
    })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  if (!row) throw new Error("profile_not_found");

  const assignedPlan = isPlanId(row.plan) ? row.plan : "free";
  const access = resolveAccessState({ assignedPlan, ...row }, now);
  return {
    assignedPlan,
    ...access,
    trialStartedAt: row.trialStartedAt,
    trialEndsAt: row.trialEndsAt,
    paidStartedAt: row.planStartedAt,
    paidEndsAt: row.planExpiresAt,
    entitlementVersion: row.entitlementVersion,
    meteringTimezone: row.meteringTimezone || "America/Lima",
    limits: limitsForAccess(access.effectivePlan, access.accessMode),
  };
}

function keyForTrial(start: Date | null) {
  return start ? `trial:${start.toISOString()}` : "trial:missing";
}

function usageFor(
  rows: Array<{ metric: string; windowKey: string; used: number; windowEnd: Date }>,
  metric: string,
  windowKey: string
) {
  return rows.find((row) => row.metric === metric && row.windowKey === windowKey)?.used ?? 0;
}

export async function getPlanSnapshot(userId: string, now = new Date()): Promise<PlanSnapshot> {
  const entitlement = await resolveEntitlements(userId, now);
  const day = dayWindow(now, entitlement.meteringTimezone);
  const month = monthWindow(now, entitlement.meteringTimezone);
  const trialKey = keyForTrial(entitlement.trialStartedAt);

  const [
    accountRows,
    tokenCountRows,
    integrationCountRows,
    transactionCountRows,
    usageRows,
    selectionRows,
  ] = await Promise.all([
    db
      .select({ id: accounts.id, currency: accounts.currency })
      .from(accounts)
      .where(eq(accounts.userId, userId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(mcpTokens)
      .where(
        and(
          eq(mcpTokens.userId, userId),
          isNull(mcpTokens.revokedAt),
          or(isNull(mcpTokens.expiresAt), gt(mcpTokens.expiresAt, now))
        )
      ),
    db
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
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.status, "confirmed"),
          gte(transactions.occurredAt, month.start),
          lt(transactions.occurredAt, month.end)
        )
      ),
    db
      .select({
        metric: planUsageBuckets.metric,
        windowKey: planUsageBuckets.windowKey,
        used: planUsageBuckets.used,
        windowEnd: planUsageBuckets.windowEnd,
      })
      .from(planUsageBuckets)
      .where(
        and(eq(planUsageBuckets.userId, userId), gte(planUsageBuckets.windowEnd, now))
      ),
    db
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
      .limit(1),
  ]);

  const accountCount = accountRows.length;
  const currencyCount = new Set(accountRows.map((row) => row.currency)).size;
  const tokenCount = Number(tokenCountRows[0]?.count ?? 0);
  const integrationCount = Number(integrationCountRows[0]?.count ?? 0);
  const transactionCount = Number(transactionCountRows[0]?.count ?? 0);
  const selection = selectionRows[0] ?? null;
  const needsSelection =
    entitlement.accessMode === "free" &&
    !selection &&
    (accountCount > (PLAN_CATALOG.free.limits.accounts ?? Infinity) || currencyCount > 1);

  const samyWindowKey = entitlement.accessMode === "trial" ? trialKey : month.key;
  const samyMetric = entitlement.accessMode === "trial" ? "samy:trial" : "samy:month";
  const samyLimit =
    entitlement.accessMode === "trial"
      ? TRIAL_LIMITS.samyMessagesTrialTotal
      : entitlement.limits.samyMessagesMonthly;
  const mcpWindowKey = entitlement.accessMode === "trial" ? trialKey : month.key;
  const mcpMetric = entitlement.accessMode === "trial" ? "mcp:trial" : "mcp:month";
  const mcpLimit =
    entitlement.accessMode === "trial"
      ? TRIAL_LIMITS.mcpCallsTrialTotal
      : entitlement.limits.mcpCallsMonthly;

  return {
    assignedPlan: entitlement.assignedPlan,
    effectivePlan: entitlement.effectivePlan,
    accessMode: entitlement.accessMode,
    label: entitlement.accessMode === "trial" ? "Pro Trial" : PLAN_CATALOG[entitlement.effectivePlan].name,
    startsAt: entitlement.startsAt?.toISOString() ?? null,
    endsAt: entitlement.endsAt?.toISOString() ?? null,
    limits: entitlement.limits,
    usage: {
      samy: {
        used: usageFor(usageRows, samyMetric, samyWindowKey),
        limit: samyLimit,
        resetAt:
          entitlement.accessMode === "trial"
            ? entitlement.trialEndsAt?.toISOString() ?? null
            : month.end.toISOString(),
        warningAt: entitlement.limits.samyMessagesDailySoft,
      },
      samyToday:
        entitlement.accessMode === "trial"
          ? {
              used: usageFor(usageRows, "samy:day", day.key),
              limit: TRIAL_LIMITS.samyMessagesDailyHard,
              resetAt: day.end.toISOString(),
            }
          : null,
      mcpCalls: {
        used: usageFor(usageRows, mcpMetric, mcpWindowKey),
        limit: mcpLimit,
        resetAt:
          entitlement.accessMode === "trial"
            ? entitlement.trialEndsAt?.toISOString() ?? null
            : month.end.toISOString(),
      },
      transactions: {
        used: transactionCount,
        limit: entitlement.limits.transactionsMonthly,
        resetAt: month.end.toISOString(),
      },
      accounts: { used: accountCount, limit: entitlement.limits.accounts, resetAt: null },
      mcpTokens: { used: tokenCount, limit: entitlement.limits.mcpTokens, resetAt: null },
      integrations: {
        used: integrationCount,
        limit: entitlement.limits.integrations,
        resetAt: null,
      },
    },
    contactEmail: PLAN_CONTACT_EMAIL,
    needsFreeResourceSelection: needsSelection,
    freeSelection: selection
      ? { activeCurrency: selection.activeCurrency, activeAccountIds: selection.activeAccountIds }
      : null,
    lockedResources: {
      accounts: Math.max(0, accountCount - (entitlement.limits.accounts ?? accountCount)),
      currencies: Math.max(0, currencyCount - entitlement.limits.currencies),
      mcpTokens: Math.max(0, tokenCount - (entitlement.limits.mcpTokens ?? tokenCount)),
      integrations: Math.max(
        0,
        integrationCount - (entitlement.limits.integrations ?? integrationCount)
      ),
    },
  };
}

export function trialUsageKey(entitlement: ResolvedEntitlements) {
  return keyForTrial(entitlement.trialStartedAt);
}
