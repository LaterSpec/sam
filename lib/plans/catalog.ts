import { SCOPES, type Scope } from "@/lib/mcp/scopes";

export type PlanId = "free" | "pro" | "agent";
export type AccessMode = "free" | "trial" | "paid";

export type PlanLimits = {
  samyMessagesMonthly: number;
  samyMessagesTrialTotal: number;
  samyMessagesDailyHard: number | null;
  samyMessagesDailySoft: number | null;
  samyMessagesPerMinute: number;
  transactionsMonthly: number | null;
  accounts: number | null;
  currencies: number;
  recurring: boolean;
  pwa: boolean;
  multiTheme: boolean;
  mcpTokens: number | null;
  mcpCallsMonthly: number | null;
  mcpCallsTrialTotal: number;
  integrations: number | null;
  transfers: boolean;
  mcpScopes: Scope[];
};

export type PlanDefinition = {
  id: PlanId;
  name: string;
  priceUsd: number;
  limits: PlanLimits;
};

const READ_ONLY_SCOPES: Scope[] = [SCOPES.read];
const PRO_SCOPES: Scope[] = [
  SCOPES.read,
  SCOPES.expensesWrite,
  SCOPES.categoriesWrite,
  SCOPES.incomeWrite,
  SCOPES.recurringWrite,
  SCOPES.savingsWrite,
  SCOPES.goalsWrite,
  SCOPES.accountsWrite,
  SCOPES.profileWrite,
];

export const PLAN_CATALOG: Record<PlanId, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    limits: {
      samyMessagesMonthly: 0,
      samyMessagesTrialTotal: 0,
      samyMessagesDailyHard: null,
      samyMessagesDailySoft: null,
      samyMessagesPerMinute: 20,
      transactionsMonthly: 100,
      accounts: 2,
      currencies: 1,
      recurring: false,
      pwa: false,
      multiTheme: false,
      mcpTokens: 1,
      mcpCallsMonthly: 100,
      mcpCallsTrialTotal: 0,
      integrations: 0,
      transfers: false,
      mcpScopes: READ_ONLY_SCOPES,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 5,
    limits: {
      samyMessagesMonthly: 150,
      samyMessagesTrialTotal: 0,
      samyMessagesDailyHard: null,
      samyMessagesDailySoft: 20,
      samyMessagesPerMinute: 20,
      transactionsMonthly: 500,
      accounts: 8,
      currencies: 2,
      recurring: true,
      pwa: true,
      multiTheme: true,
      mcpTokens: 3,
      mcpCallsMonthly: 5_000,
      mcpCallsTrialTotal: 0,
      integrations: 3,
      transfers: false,
      mcpScopes: PRO_SCOPES,
    },
  },
  agent: {
    id: "agent",
    name: "Agent",
    priceUsd: 10,
    limits: {
      samyMessagesMonthly: 500,
      samyMessagesTrialTotal: 0,
      samyMessagesDailyHard: null,
      samyMessagesDailySoft: 50,
      samyMessagesPerMinute: 20,
      transactionsMonthly: null,
      accounts: null,
      currencies: 2,
      recurring: true,
      pwa: true,
      multiTheme: true,
      mcpTokens: null,
      mcpCallsMonthly: 25_000,
      mcpCallsTrialTotal: 0,
      integrations: null,
      transfers: true,
      mcpScopes: [...PRO_SCOPES, SCOPES.accountsTransfer],
    },
  },
};

export const TRIAL_LIMITS: PlanLimits = {
  ...PLAN_CATALOG.pro.limits,
  samyMessagesMonthly: 0,
  samyMessagesTrialTotal: 50,
  samyMessagesDailyHard: 10,
  samyMessagesDailySoft: null,
  mcpTokens: 1,
  mcpCallsMonthly: null,
  mcpCallsTrialTotal: 100,
  transfers: false,
  mcpScopes: PRO_SCOPES,
};

export const PLAN_CONTACT_EMAIL = "manuel@devnyro.com";
export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export function isPlanId(value: unknown): value is PlanId {
  return value === "free" || value === "pro" || value === "agent";
}

export function limitsForAccess(plan: PlanId, mode: AccessMode): PlanLimits {
  return mode === "trial" ? TRIAL_LIMITS : PLAN_CATALOG[plan].limits;
}

export function allowedMcpScopes(plan: PlanId, mode: AccessMode): Scope[] {
  return limitsForAccess(plan, mode).mcpScopes;
}
