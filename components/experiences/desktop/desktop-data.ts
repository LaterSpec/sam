import type { AppState } from "@/lib/db/queries/load-user-data";
import { currencySymbol, normalizeCurrency, type Currency } from "@/lib/finance/currency";

export type LedgerTransaction = AppState["expenses"][number];

export function transactionCurrency(state: AppState, tx: LedgerTransaction): Currency {
  if (tx.currency) return normalizeCurrency(tx.currency);
  return normalizeCurrency(state.accounts.find((account) => account.id === tx.accountId)?.currency);
}
export function allTransactions(state: AppState, currency?: Currency): LedgerTransaction[] {
  return [...state.expenses, ...state.incomeTx]
    .filter((tx) => !currency || transactionCurrency(state, tx) === currency)
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
}

export function currentMonthTransactions(state: AppState, currency: Currency): LedgerTransaction[] {
  const now = new Date();
  return allTransactions(state, currency).filter((tx) => {
    const date = new Date(tx.occurred_at);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
}

export function formatMoney(value: number, currency: Currency, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function compactMoney(value: number, currency: Currency): string {
  return `${currencySymbol(currency)}${Math.abs(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function desktopSummary(state: AppState, currency: Currency) {
  const month = currentMonthTransactions(state, currency);
  const income = month.filter((tx) => tx.kind === "income").reduce((sum, tx) => sum + tx.amount, 0);
  const expenses = month.filter((tx) => tx.kind === "expense").reduce((sum, tx) => sum + tx.amount, 0);
  const balance = state.accounts
    .filter((account) => account.currency === currency)
    .reduce((sum, account) => sum + account.balance, 0);
  const upcomingExpense = state.recurringRules
    .filter((rule) => rule.status === "active" && rule.kind === "expense" && rule.accountCurrency === currency)
    .reduce((sum, rule) => sum + rule.amount, 0);
  const upcomingIncome = state.recurringRules
    .filter((rule) => rule.status === "active" && rule.kind === "income" && rule.accountCurrency === currency)
    .reduce((sum, rule) => sum + rule.amount, 0);
  const projected = balance + upcomingIncome - upcomingExpense;
  return {
    balance,
    income,
    expenses,
    saved: Math.max(0, income - expenses),
    projected,
    upcomingExpense,
    upcomingIncome,
  };
}

export function budgetRows(state: AppState, currency: Currency) {
  const monthExpenses = currentMonthTransactions(state, currency).filter((tx) => tx.kind === "expense");
  // Show every category envelope. Cap is category-level; spent is scoped to the
  // active currency so PEN spend does not hide USD default categories.
  return state.budgets
    .map((budget) => {
      const spent = monthExpenses
        .filter((tx) => tx.catKey === budget.key)
        .reduce((sum, tx) => sum + tx.amount, 0);
      const ratio = budget.cap > 0 ? spent / budget.cap : 0;
      return { ...budget, spent, ratio, remaining: budget.cap - spent };
    })
    .sort((a, b) => b.ratio - a.ratio || a.name.localeCompare(b.name));
}

/** Categories selectable when recording an expense. */
export function expenseCategoryOptions(state: AppState, _currency: Currency) {
  return [...state.budgets].sort((a, b) => a.name.localeCompare(b.name));
}

export function accountName(state: AppState, id?: string): string {
  return state.accounts.find((account) => account.id === id)?.name ?? "Unassigned";
}
