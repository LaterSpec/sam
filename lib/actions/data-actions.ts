"use server";

import { db } from "@/lib/db";
import {
  transactions,
  goals,
  categories,
  incomeSources,
  savingsBuckets,
  holdings,
  watchlist,
  trades,
  portfolioSnapshots,
  profiles,
  accounts,
  user as userTable,
  session as sessionTable,
  account as accountTable,
} from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { loadUserData, getMarketQuotesOnly, getBarsForSymbols } from "@/lib/db/queries/load-user-data";
import { mapHolding } from "@/lib/market/build-market";
import { revalidatePath } from "next/cache";
import { formatTime } from "@/lib/utils";
import { accountColor, accountDefaultIcon } from "@/lib/accounts/account-types";
import { auth } from "@/lib/auth/auth";

function mapAccountRow(a: typeof accounts.$inferSelect) {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    balance: Number(a.balance),
    creditLimit: a.creditLimit != null ? Number(a.creditLimit) : null,
    last4: a.last4,
    icon: a.icon,
    color: a.color,
  };
}

export async function fetchUserDataAction() {
  const session = await requireSession();
  return loadUserData(session.user.id, session.user.email);
}

export async function fetchMarketQuotesAction() {
  await requireSession();
  return getMarketQuotesOnly();
}

export async function fetchBarsAction(symbols: string[]) {
  await requireSession();
  return getBarsForSymbols(symbols);
}

export async function addExpenseAction(input: {
  amount: number;
  name: string;
  catKey: string;
  accountId?: string;
  budgets: Array<{ id: string; key: string; icon: string; c: string }>;
  accounts: Array<{ id: string; type: string }>;
}) {
  const session = await requireSession();
  const cat = input.budgets.find((b) => b.key === input.catKey);
  const acc =
    (input.accountId ? input.accounts.find((a) => a.id === input.accountId) : undefined) ||
    input.accounts.find((a) => a.type === "checking") ||
    input.accounts.find((a) => a.type === "cash") ||
    input.accounts[0];

  const [row] = await db
    .insert(transactions)
    .values({
      userId: session.user.id,
      name: input.name,
      amount: String(input.amount),
      kind: "expense",
      categoryId: cat?.id ?? null,
      accountId: acc?.id ?? null,
      icon: cat?.icon ?? "●",
    })
    .returning();

  revalidatePath("/app");
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    category: cat?.key ?? "misc",
    catKey: cat?.key ?? "misc",
    catColor: cat?.c ?? "#8b949e",
    icon: row.icon ?? "●",
    time: formatTime(row.occurredAt.toISOString()),
    occurred_at: row.occurredAt.toISOString(),
    kind: "expense",
    accountId: row.accountId ?? undefined,
  };
}

export async function deleteExpenseAction(id: string) {
  const session = await requireSession();
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, session.user.id)));
  revalidatePath("/app");
}

export async function updateExpenseAction(input: {
  id: string;
  amount?: number;
  name?: string;
  catKey?: string;
  notes?: string;
  budgets: Array<{ id: string; key: string; icon: string; c: string }>;
}) {
  const session = await requireSession();
  const uid = session.user.id;

  const existing = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, input.id), eq(transactions.userId, uid)))
    .limit(1);

  if (!existing[0]) {
    return { error: "not found" as const };
  }

  const cat = input.catKey != null ? input.budgets.find((b) => b.key === input.catKey) : undefined;
  const patch: {
    amount?: string;
    name?: string;
    notes?: string | null;
    categoryId?: string | null;
    icon?: string;
  } = {};

  if (input.amount != null) patch.amount = String(input.amount);
  if (input.name != null) patch.name = input.name;
  if (input.notes !== undefined) patch.notes = input.notes || null;
  if (input.catKey != null) {
    patch.categoryId = cat?.id ?? null;
    if (cat) patch.icon = cat.icon;
  }

  const [row] = await db
    .update(transactions)
    .set(patch)
    .where(and(eq(transactions.id, input.id), eq(transactions.userId, uid)))
    .returning();

  const resolvedCat =
    cat ??
    (row.categoryId ? input.budgets.find((b) => b.id === row.categoryId) : undefined);

  revalidatePath("/app");
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    category: resolvedCat?.key ?? "misc",
    catKey: resolvedCat?.key ?? "misc",
    catColor: resolvedCat?.c ?? "#8b949e",
    icon: row.icon ?? "●",
    time: formatTime(row.occurredAt.toISOString()),
    occurred_at: row.occurredAt.toISOString(),
    kind: row.kind,
    notes: row.notes ?? undefined,
  };
}

export async function addGoalAction(input: { name: string; target: number }) {
  const session = await requireSession();
  const [row] = await db
    .insert(goals)
    .values({
      userId: session.user.id,
      name: input.name,
      target: String(input.target),
      saved: "0",
      eta: "tbd",
    })
    .returning();
  revalidatePath("/app");
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target),
    saved: 0,
    eta: row.eta,
    icon: row.icon,
    c: row.color,
    done: row.done,
  };
}

export async function setGoalSavedAction(goalId: string, saved: number, done?: boolean) {
  const session = await requireSession();
  await db
    .update(goals)
    .set({ saved: String(saved), ...(typeof done === "boolean" ? { done } : {}) })
    .where(and(eq(goals.id, goalId), eq(goals.userId, session.user.id)));
  revalidatePath("/app");
}

export async function setBudgetCapAction(categoryId: string, cap: number) {
  const session = await requireSession();
  await db
    .update(categories)
    .set({ monthlyCap: String(cap) })
    .where(and(eq(categories.id, categoryId), eq(categories.userId, session.user.id)));
  revalidatePath("/app");
}

export async function addIncomeAction(input: {
  name: string;
  amt: number;
  freq?: string;
  next?: string;
  accountId?: string;
}) {
  const session = await requireSession();
  const uid = session.user.id;

  const [row] = await db
    .insert(incomeSources)
    .values({
      userId: uid,
      name: input.name,
      amount: String(input.amt),
      freq: input.freq || "one-time",
      nextDate: input.next || "—",
    })
    .returning();

  let incomeTxRow: {
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
  } | null = null;
  let accountUpdate: { id: string; balance: number } | null = null;

  if (input.accountId) {
    const [txRow] = await db
      .insert(transactions)
      .values({
        userId: uid,
        name: input.name,
        amount: String(input.amt),
        kind: "income",
        accountId: input.accountId,
        icon: "◆",
      })
      .returning();

    incomeTxRow = {
      id: txRow.id,
      name: txRow.name,
      amount: Number(txRow.amount),
      category: "income",
      catKey: "income",
      catColor: "#56d364",
      icon: txRow.icon ?? "◆",
      time: formatTime(txRow.occurredAt.toISOString()),
      occurred_at: txRow.occurredAt.toISOString(),
      kind: "income",
      accountId: txRow.accountId ?? undefined,
    };

    const [acc] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, input.accountId), eq(accounts.userId, uid)))
      .limit(1);
    if (acc) {
      const newBal = Number(acc.balance) + input.amt;
      await db.update(accounts).set({ balance: String(newBal) }).where(eq(accounts.id, acc.id));
      accountUpdate = { id: acc.id, balance: newBal };
    }
  }

  revalidatePath("/app");
  return {
    id: row.id,
    name: row.name,
    amt: Number(row.amount),
    icon: row.icon,
    c: row.color,
    freq: row.freq,
    next: row.nextDate,
    incomeTx: incomeTxRow,
    account: accountUpdate,
  };
}

export async function setBucketBalanceAction(bucketId: string, balance: number) {
  const session = await requireSession();
  await db
    .update(savingsBuckets)
    .set({ balance: String(balance) })
    .where(and(eq(savingsBuckets.id, bucketId), eq(savingsBuckets.userId, session.user.id)));
  revalidatePath("/app");
}

export async function updatePrefsAction(prefs: Record<string, unknown>) {
  const session = await requireSession();
  await db.update(profiles).set({ prefs }).where(eq(profiles.id, session.user.id));
  revalidatePath("/app");
}

export async function recordSnapshotAction(value: number) {
  const session = await requireSession();
  await db.insert(portfolioSnapshots).values({ userId: session.user.id, value: String(value) });
}

export async function buyHoldingAction(input: {
  symbol: string;
  name: string;
  amount: number;
  price: number;
}) {
  const session = await requireSession();
  const uid = session.user.id;
  const qty = input.amount / input.price;

  const existing = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, uid), eq(holdings.symbol, input.symbol)))
    .limit(1);

  let row;
  if (existing[0]) {
    const ex = existing[0];
    const newQty = Number(ex.qty) + qty;
    const newAvg = newQty > 0 ? (Number(ex.qty) * Number(ex.avgCost) + input.amount) / newQty : input.price;
    [row] = await db
      .update(holdings)
      .set({ qty: String(newQty), avgCost: String(newAvg), updatedAt: new Date() })
      .where(eq(holdings.id, ex.id))
      .returning();
  } else {
    [row] = await db
      .insert(holdings)
      .values({
        userId: uid,
        symbol: input.symbol,
        name: input.name || input.symbol,
        qty: String(qty),
        avgCost: String(input.price),
      })
      .returning();
  }

  await db.insert(trades).values({
    userId: uid,
    symbol: input.symbol,
    side: "buy",
    qty: String(qty),
    price: String(input.price),
    amount: String(input.amount),
  });
  await db.delete(watchlist).where(and(eq(watchlist.userId, uid), eq(watchlist.symbol, input.symbol)));
  revalidatePath("/app");
  return { row: mapHolding(row), removedFromWatch: input.symbol };
}

export async function sellHoldingAction(input: {
  symbol: string;
  amount?: number;
  qty?: number;
  price: number;
}) {
  const session = await requireSession();
  const uid = session.user.id;
  const existing = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, uid), eq(holdings.symbol, input.symbol)))
    .limit(1);

  if (!existing[0]) return { error: "not held" };
  const ex = existing[0];
  const sellQty = input.qty != null ? input.qty : (input.amount ?? 0) / input.price;
  const newQty = Number(ex.qty) - sellQty;
  const amt = Math.min(sellQty, Number(ex.qty)) * input.price;

  let removed = false;
  let row = null;
  if (newQty <= 1e-6) {
    await db.delete(holdings).where(eq(holdings.id, ex.id));
    removed = true;
  } else {
    [row] = await db
      .update(holdings)
      .set({ qty: String(newQty), updatedAt: new Date() })
      .where(eq(holdings.id, ex.id))
      .returning();
  }

  await db.insert(trades).values({
    userId: uid,
    symbol: input.symbol,
    side: "sell",
    qty: String(Math.min(sellQty, Number(ex.qty))),
    price: String(input.price),
    amount: String(amt),
  });
  revalidatePath("/app");
  return { row: row ? mapHolding(row) : null, removed, symbol: input.symbol };
}

export async function addWatchAction(symbol: string, name: string) {
  const session = await requireSession();
  const [row] = await db
    .insert(watchlist)
    .values({ userId: session.user.id, symbol, name: name || symbol })
    .returning();
  revalidatePath("/app");
  return { sym: row.symbol, name: row.name };
}

export async function removeWatchAction(symbol: string) {
  const session = await requireSession();
  await db.delete(watchlist).where(and(eq(watchlist.userId, session.user.id), eq(watchlist.symbol, symbol)));
  revalidatePath("/app");
}

export async function addAccountAction(input: { name: string; type: string; icon?: string }) {
  const session = await requireSession();
  const uid = session.user.id;
  const trimmed = input.name.trim();
  if (!trimmed) throw new Error("name required");

  const existing = await db
    .select({ sort: accounts.sort })
    .from(accounts)
    .where(eq(accounts.userId, uid))
    .orderBy(desc(accounts.sort))
    .limit(1);
  const nextSort = (existing[0]?.sort ?? -1) + 1;
  const type = input.type || "cash";
  const icon = input.icon?.trim() || accountDefaultIcon(type);

  const [row] = await db
    .insert(accounts)
    .values({
      userId: uid,
      name: trimmed,
      type,
      balance: "0",
      icon,
      color: accountColor(type),
      sort: nextSort,
    })
    .returning();

  revalidatePath("/app");
  return mapAccountRow(row);
}

export async function updateAccountAction(input: {
  id: string;
  name?: string;
  type?: string;
  icon?: string;
}) {
  const session = await requireSession();
  const uid = session.user.id;

  const patch: { name?: string; type?: string; icon?: string; color?: string } = {};
  if (input.name != null) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new Error("name required");
    patch.name = trimmed;
  }
  if (input.type != null) {
    patch.type = input.type;
    patch.color = accountColor(input.type);
  }
  if (input.icon != null) patch.icon = input.icon.trim() || accountDefaultIcon(input.type ?? "cash");

  const [row] = await db
    .update(accounts)
    .set(patch)
    .where(and(eq(accounts.id, input.id), eq(accounts.userId, uid)))
    .returning();

  if (!row) throw new Error("account not found");
  revalidatePath("/app");
  return mapAccountRow(row);
}

export async function transferAction(input: { fromId: string; toId: string; amount: number }) {
  const session = await requireSession();
  const uid = session.user.id;
  const amount = input.amount;

  if (input.fromId === input.toId) throw new Error("cannot transfer to same account");
  if (!(amount > 0)) throw new Error("amount must be positive");

  const rows = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, uid)));
  const from = rows.find((a) => a.id === input.fromId);
  const to = rows.find((a) => a.id === input.toId);
  if (!from || !to) throw new Error("account not found");

  const fromBal = Number(from.balance);
  if (fromBal < amount) throw new Error("insufficient balance");

  const newFrom = fromBal - amount;
  const newTo = Number(to.balance) + amount;

  await db
    .update(accounts)
    .set({ balance: String(newFrom) })
    .where(and(eq(accounts.id, from.id), eq(accounts.userId, uid)));
  await db
    .update(accounts)
    .set({ balance: String(newTo) })
    .where(and(eq(accounts.id, to.id), eq(accounts.userId, uid)));

  revalidatePath("/app");
  return {
    from: { id: from.id, balance: newFrom },
    to: { id: to.id, balance: newTo },
  };
}

export async function setCredentialsAction(newPassword: string) {
  const session = await requireSession();
  if (!newPassword || newPassword.length < 8) throw new Error("password must be at least 8 characters");

  const uid = session.user.id;
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(newPassword);

  const existing = await db
    .select()
    .from(accountTable)
    .where(and(eq(accountTable.userId, uid), eq(accountTable.providerId, "credential")))
    .limit(1);

  if (existing[0]) {
    await db
      .update(accountTable)
      .set({ password: hash, updatedAt: new Date() })
      .where(eq(accountTable.id, existing[0].id));
  } else {
    await db.insert(accountTable).values({
      id: crypto.randomUUID(),
      accountId: uid,
      providerId: "credential",
      userId: uid,
      password: hash,
    });
  }

  revalidatePath("/app");
  return { ok: true as const };
}

export async function deleteAccountAction() {
  const session = await requireSession();
  const uid = session.user.id;
  await db.delete(sessionTable).where(eq(sessionTable.userId, uid));
  await db.delete(accountTable).where(eq(accountTable.userId, uid));
  await db.delete(userTable).where(eq(userTable.id, uid));
}

export async function signOutAction() {
  const { auth } = await import("@/lib/auth/auth");
  const { headers } = await import("next/headers");
  await auth.api.signOut({ headers: await headers() });
}
