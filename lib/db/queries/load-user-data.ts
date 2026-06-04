import { db } from "@/lib/db";
import {
  profiles,
  accounts,
  categories,
  transactions,
  goals,
  incomeSources,
  savingsBuckets,
  holdings,
  watchlist,
  marketSymbols,
  marketQuotes,
  marketDailyBars,
  portfolioSnapshots,
} from "@/lib/db/schema";
import { eq, gte, inArray, asc, desc, and } from "drizzle-orm";
import { buildMarket, buildDailyBars, mapHolding } from "@/lib/market/build-market";
import { formatTime, isoDay, num } from "@/lib/utils";
import type { UserPrefs } from "@/lib/db/schema";

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
    creditLimit: number | null;
    last4: string | null;
    icon: string;
    color: string;
  }>;
  budgets: Array<{ id: string; key: string; name: string; icon: string; c: string; cap: number }>;
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
  buckets: Array<{
    id: string;
    name: string;
    icon: string;
    c: string;
    balance: number;
    target: number;
    apy: number;
  }>;
  holdings: ReturnType<typeof mapHolding>[];
  watchlist: Array<{ sym: string; name: string }>;
  tickerPool: Array<{ sym: string; name: string }>;
  market: ReturnType<typeof buildMarket>;
  dailyBars: ReturnType<typeof buildDailyBars>;
  portfolioSnapshots: Array<{ t: string; v: number }>;
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
    category: cat ? cat.key : "misc",
    catKey: cat ? cat.key : "misc",
    catColor: cat ? cat.color : "#8b949e",
    icon: t.icon || (cat ? cat.icon : "●"),
    time: formatTime(t.occurredAt.toISOString()),
    occurred_at: t.occurredAt.toISOString(),
    kind: t.kind,
  };
}

export async function loadUserData(userId: string, email: string): Promise<AppState | null> {
  const barsCutoff = isoDay(-50);
  const snapCutoff = new Date(Date.now() - 40 * 864e5);

  const [
    profileRow,
    accountsRows,
    categoriesRows,
    txRows,
    goalsRows,
    incomeRows,
    bucketsRows,
    holdingsRows,
    watchlistRows,
    symbolsRows,
    quotesRows,
    snapshotsRows,
  ] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.id, userId)).limit(1),
    db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.sort)),
    db.select().from(categories).where(eq(categories.userId, userId)).orderBy(asc(categories.sort)),
    db.select().from(transactions).where(eq(transactions.userId, userId)).orderBy(asc(transactions.occurredAt)),
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.sort)),
    db.select().from(incomeSources).where(eq(incomeSources.userId, userId)).orderBy(asc(incomeSources.sort)),
    db.select().from(savingsBuckets).where(eq(savingsBuckets.userId, userId)).orderBy(asc(savingsBuckets.sort)),
    db.select().from(holdings).where(eq(holdings.userId, userId)).orderBy(asc(holdings.openedAt)),
    db.select().from(watchlist).where(eq(watchlist.userId, userId)).orderBy(asc(watchlist.sort)),
    db
      .select({ symbol: marketSymbols.symbol, name: marketSymbols.name, curated: marketSymbols.curated, sort: marketSymbols.sort })
      .from(marketSymbols)
      .where(eq(marketSymbols.active, true))
      .orderBy(asc(marketSymbols.sort)),
    db.select().from(marketQuotes).where(gte(marketQuotes.sessionDate, isoDay(-1))),
    db
      .select({ value: portfolioSnapshots.value, capturedAt: portfolioSnapshots.capturedAt })
      .from(portfolioSnapshots)
      .where(and(eq(portfolioSnapshots.userId, userId), gte(portfolioSnapshots.capturedAt, snapCutoff)))
      .orderBy(asc(portfolioSnapshots.capturedAt)),
  ]);

  const profile = profileRow[0];
  if (!profile) return null;

  const barSyms = Array.from(
    new Set([
      ...holdingsRows.map((h) => h.symbol),
      ...watchlistRows.map((w) => w.symbol),
      "SPY",
    ])
  );

  const barsRows =
    barSyms.length > 0
      ? await db
          .select()
          .from(marketDailyBars)
          .where(and(inArray(marketDailyBars.symbol, barSyms), gte(marketDailyBars.barDate, barsCutoff)))
          .orderBy(asc(marketDailyBars.barDate))
      : [];

  const market = buildMarket(
    quotesRows.map((q) => ({
      symbol: q.symbol,
      source: q.source,
      sessionDate: q.sessionDate,
      price: q.price,
      bid: q.bid,
      ask: q.ask,
      prevClose: q.prevClose,
      dayOpen: q.dayOpen,
      changePct: q.changePct,
      capturedAt: q.capturedAt,
    })),
    barsRows.map((b) => ({ symbol: b.symbol, barDate: b.barDate, close: b.close }))
  );

  const dailyBars = buildDailyBars(
    barsRows.map((b) => ({ symbol: b.symbol, barDate: b.barDate, close: b.close }))
  );

  const catById: Record<string, typeof categories.$inferSelect> = {};
  categoriesRows.forEach((c) => {
    catById[c.id] = c;
  });

  const allTx = txRows.map((t) => mapExpense(t, catById));
  const prefs = (profile.prefs as UserPrefs) || {
    notifications: true,
    biometric: true,
    theme: "dark",
    rollover: false,
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
    buckets: bucketsRows.map((b) => ({
      id: b.id,
      name: b.name,
      icon: b.icon,
      c: b.color,
      balance: num(b.balance),
      target: num(b.target),
      apy: num(b.apy),
    })),
    holdings: holdingsRows.map(mapHolding),
    watchlist: watchlistRows.map((w) => ({ sym: w.symbol, name: w.name })),
    tickerPool: symbolsRows.map((s) => ({ sym: s.symbol, name: s.name })),
    market,
    dailyBars,
    portfolioSnapshots: snapshotsRows.map((r) => ({
      t: r.capturedAt.toISOString(),
      v: num(r.value),
    })),
  };
}

export async function getMarketQuotesOnly() {
  const quotesRows = await db.select().from(marketQuotes).where(gte(marketQuotes.sessionDate, isoDay(-1)));
  return buildMarket(
    quotesRows.map((q) => ({
      symbol: q.symbol,
      source: q.source,
      sessionDate: q.sessionDate,
      price: q.price,
      bid: q.bid,
      ask: q.ask,
      prevClose: q.prevClose,
      dayOpen: q.dayOpen,
      changePct: q.changePct,
      capturedAt: q.capturedAt,
    })),
    []
  );
}

export async function getBarsForSymbols(symbols: string[]) {
  if (!symbols.length) return {};
  const cutoff = isoDay(-50);
  const rows = await db
    .select()
    .from(marketDailyBars)
    .where(and(inArray(marketDailyBars.symbol, symbols), gte(marketDailyBars.barDate, cutoff)))
    .orderBy(asc(marketDailyBars.barDate));
  return buildDailyBars(rows.map((b) => ({ symbol: b.symbol, barDate: b.barDate, close: b.close })));
}
