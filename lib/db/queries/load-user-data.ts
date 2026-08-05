import { db } from "@/lib/db";
import {
  profiles,
  accounts,
  categories,
  transactions,
  goals,
  incomeSources,
  savingsBuckets,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { formatTime, num } from "@/lib/utils";
import { normalizeCurrency, type Currency } from "@/lib/finance/currency";
import type { UserPrefs } from "@/lib/db/schema";
import {
  listRecurringOccurrences,
  listRecurringRules,
  type RecurringOccurrenceDto,
  type RecurringRuleDto,
} from "@/lib/domain/recurring";

export type AppState = {
  user: {
    id: string;
    email: string;
    full_name: string;
    username: string | null;
    plan: string;
    streak: number;
    member_since: string | null;
  };
  prefs: UserPrefs;
  streak: number;
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    currency: Currency;
    creditLimit: number | null;
    last4: string | null;
    icon: string;
    color: string;
  }>;
  budgets: Array<{ id: string; key: string; name: string; icon: string; c: string; cap: number; currency: Currency }>;
  expenses: Array<{
    id: string;
    name: string;
    amount: number;
    category: string;
    catKey: string;
    catColor: string;
    icon: string;
    time: string;
    occurred_at: string;
    kind: string;
    accountId?: string;
    status?: string;
    source?: string;
    recurringOccurrenceId?: string;
    currency?: Currency;
  }>;
  incomeTx: AppState["expenses"];
  goals: Array<{
    id: string;
    name: string;
    target: number;
    saved: number;
    eta: string | null;
    icon: string;
    c: string;
    done: boolean;
  }>;
  incomeSources: Array<{
    id: string;
    name: string;
    amt: number;
    icon: string;
    c: string;
    freq: string;
    next: string | null;
  }>;
  recurringRules: RecurringRuleDto[];
  recurringOccurrences: RecurringOccurrenceDto[];
  buckets: Array<{
    id: string;
    name: string;
    icon: string;
    c: string;
    balance: number;
    target: number;
    apy: number;
  }>;
};

function mapExpense(
  t: typeof transactions.$inferSelect,
  catById: Record<string, typeof categories.$inferSelect>
) {
  const cat = t.categoryId ? catById[t.categoryId] : null;
  return {
    id: t.id,
    name: t.name,
    amount: num(t.amount),
    category: cat ? cat.name : "Miscellaneous",
    catKey: cat ? cat.key : "misc",
    catColor: cat ? cat.color : "#8b949e",
    icon: t.icon || (cat ? cat.icon : "●"),
    time: formatTime(t.occurredAt.toISOString()),
    occurred_at: t.occurredAt.toISOString(),
    kind: t.kind,
    accountId: t.accountId ?? undefined,
    status: t.status,
    source: t.source,
    recurringOccurrenceId: t.recurringOccurrenceId ?? undefined,
    currency: normalizeCurrency(t.currency),
  };
}

export async function loadUserData(userId: string, email: string): Promise<AppState | null> {
  const [
    profileRow,
    accountsRows,
    categoriesRows,
    txRows,
    goalsRows,
    incomeRows,
    bucketsRows,
    recurringRuleRows,
    recurringOccurrenceResult,
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.sort)),
    db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.sort)),
    db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(asc(transactions.occurredAt)),
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.sort)),
    db.select().from(incomeSources).where(eq(incomeSources.userId, userId)).orderBy(asc(incomeSources.sort)),
    db.select().from(savingsBuckets).where(eq(savingsBuckets.userId, userId)).orderBy(asc(savingsBuckets.sort)),
    listRecurringRules(
      { userId, email, authMethod: "session", scopes: [] },
      { includeArchived: true }
    ),
    listRecurringOccurrences(
      { userId, email, authMethod: "session", scopes: [] },
      { limit: 100 }
    ),
  ]);

  const profile = profileRow[0];
  if (!profile) return null;

  const catById: Record<string, typeof categories.$inferSelect> = {};
  categoriesRows.forEach((c) => {
    catById[c.id] = c;
  });

  const allTx = txRows.filter((t) => t.status === "confirmed").map((t) => mapExpense(t, catById));
  const prefs = (profile.prefs as UserPrefs) || {
    theme: "dark",
    language: "es",
    defaultCurrency: "USD",
    timezone: "America/Lima",
  };

  return {
    user: {
      id: userId,
      email,
      full_name: profile.fullName || email.split("@")[0],
      username: profile.username,
      plan: profile.plan,
      streak: profile.streak,
      member_since: profile.memberSince,
    },
    prefs,
    streak: profile.streak,
    accounts: accountsRows.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: num(a.balance),
      currency: normalizeCurrency(a.currency),
      creditLimit: a.creditLimit != null ? num(a.creditLimit) : null,
      last4: a.last4,
      icon: a.icon,
      color: a.color,
    })),
    budgets: categoriesRows.map((c) => ({
      id: c.id,
      key: c.key,
      name: c.name,
      icon: c.icon,
      c: c.color,
      cap: num(c.monthlyCap),
      currency: normalizeCurrency(c.currency),
    })),
    expenses: allTx.filter((t) => t.kind === "expense"),
    incomeTx: allTx.filter((t) => t.kind === "income"),
    goals: goalsRows.map((g) => ({
      id: g.id,
      name: g.name,
      target: num(g.target),
      saved: num(g.saved),
      eta: g.eta,
      icon: g.icon,
      c: g.color,
      done: g.done,
    })),
    incomeSources: incomeRows.map((s) => ({
      id: s.id,
      name: s.name,
      amt: num(s.amount),
      icon: s.icon,
      c: s.color,
      freq: s.freq,
      next: s.nextDate,
    })),
    recurringRules: recurringRuleRows,
    recurringOccurrences: recurringOccurrenceResult.occurrences,
    buckets: bucketsRows.map((b) => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      c: b.color,
      balance: num(b.balance),
      target: num(b.target),
      apy: num(b.apy),
    })),
  };
}
