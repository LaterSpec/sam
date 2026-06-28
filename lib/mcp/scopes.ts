import { DomainError, DomainErrorCodes, type ActorContext } from "@/lib/domain/types";

export const SCOPES = {
  read: "sam:read",
  expensesWrite: "sam:expenses.write",
  categoriesWrite: "sam:categories.write",
  incomeWrite: "sam:income.write",
  recurringWrite: "sam:recurring.write",
  savingsWrite: "sam:savings.write",
  goalsWrite: "sam:goals.write",
  accountsWrite: "sam:accounts.write",
  accountsTransfer: "sam:accounts.transfer",
  investWrite: "sam:invest.write",
  profileWrite: "sam:profile.write",
} as const;

export type Scope = (typeof SCOPES)[keyof typeof SCOPES];

export const ALL_SCOPES: Scope[] = Object.values(SCOPES);

/** Scopes a brand-new token gets by default (safe, useful baseline). */
export const DEFAULT_SCOPES: Scope[] = [
  SCOPES.read,
  SCOPES.expensesWrite,
  SCOPES.categoriesWrite,
];

export function isValidScope(scope: string): scope is Scope {
  return (ALL_SCOPES as string[]).includes(scope);
}

export function hasScope(ctx: ActorContext, scope: Scope): boolean {
  return ctx.scopes.includes("*") || ctx.scopes.includes(scope);
}

export function requireScope(ctx: ActorContext, scope: Scope): void {
  if (!hasScope(ctx, scope)) {
    throw new DomainError(DomainErrorCodes.scopeDenied, `missing scope: ${scope}`);
  }
}

export const SCOPE_DESCRIPTIONS: Record<Scope, string> = {
  [SCOPES.read]: "Read accounts, categories, transactions, summaries, goals, invest",
  [SCOPES.expensesWrite]: "Create, update and delete expense transactions",
  [SCOPES.categoriesWrite]: "Create and update categories and budget caps",
  [SCOPES.incomeWrite]: "Add income sources and income transactions",
  [SCOPES.recurringWrite]: "Create, update, pause, archive and retry recurring transactions",
  [SCOPES.savingsWrite]: "Update savings bucket balances",
  [SCOPES.goalsWrite]: "Create and update goals",
  [SCOPES.accountsWrite]: "Create and update accounts",
  [SCOPES.accountsTransfer]: "Transfer balances between accounts (high risk)",
  [SCOPES.investWrite]: "Simulated buy/sell and watchlist changes",
  [SCOPES.profileWrite]: "Update username and preferences",
};
