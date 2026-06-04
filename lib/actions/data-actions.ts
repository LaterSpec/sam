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
import { eq, and } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { loadUserData, getMarketQuotesOnly, getBarsForSymbols } from "@/lib/db/queries/load-user-data";
import { mapHolding } from "@/lib/market/build-market";
import { revalidatePath } from "next/cache";
import { formatTime } from "@/lib/utils";

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
  budgets: Array<{ id: string; key: string; icon: string; c: string }>;
  accounts: Array<{ id: string; type: string }>;
}) {
  const session = await requireSession();
  const cat = input.budgets.find((b) => b.key === input.catKey);
  const acc = input.accounts.find((a) => a.type === "checking") || input.accounts[0];

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
}) {
  const session = await requireSession();
  const [row] = await db
    .insert(incomeSources)
    .values({
      userId: session.user.id,
      name: input.name,
      amount: String(input.amt),
      freq: input.freq || "one-time",
      nextDate: input.next || "—",
    })
    .returning();
  revalidatePath("/app");
  return {
    id: row.id,
    name: row.name,
    amt: Number(row.amount),
    icon: row.icon,
    c: row.color,
    freq: row.freq,
    next: row.nextDate,
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
