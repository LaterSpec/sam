import { db } from "@/lib/db";
import { holdings, watchlist, trades } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { mapHolding } from "@/lib/market/build-market";
import { getMarketQuotesOnly } from "@/lib/db/queries/load-user-data";
import { positiveMoneySchema, symbolSchema } from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";
import type { MarketQuote } from "@/lib/market/build-market";

export async function listHoldings(ctx: ActorContext) {
  const rows = await db
    .select()
    .from(holdings)
    .where(eq(holdings.userId, ctx.userId))
    .orderBy(asc(holdings.openedAt));
  return rows.map(mapHolding);
}

export async function listWatchlist(ctx: ActorContext) {
  const rows = await db
    .select()
    .from(watchlist)
    .where(eq(watchlist.userId, ctx.userId))
    .orderBy(asc(watchlist.sort));
  return rows.map((w) => ({ sym: w.symbol, name: w.name }));
}

export async function getQuote(_ctx: ActorContext, symbol: string) {
  const sym = symbolSchema.parse(symbol);
  const market = await getMarketQuotesOnly();
  const q = market[sym];
  if (!q || typeof q !== "object") return { symbol: sym, found: false as const };
  const quote = q as MarketQuote;
  return {
    symbol: sym,
    found: true as const,
    price: quote.price,
    prevClose: quote.prevClose,
    changePct: Math.round(quote.pct * 100) / 100,
    bid: quote.bid,
    ask: quote.ask,
    source: quote.source,
    live: quote.live,
  };
}

export async function buyHolding(
  ctx: ActorContext,
  input: { symbol: string; name: string; amount: number; price: number }
) {
  const uid = ctx.userId;
  const symbol = symbolSchema.parse(input.symbol);
  const name = (input.name || symbol).trim().slice(0, 120);
  const amount = positiveMoneySchema.parse(input.amount);
  const price = positiveMoneySchema.parse(input.price);
  const qty = amount / price;

  const existing = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, uid), eq(holdings.symbol, symbol)))
    .limit(1);

  let row;
  if (existing[0]) {
    const ex = existing[0];
    const newQty = Number(ex.qty) + qty;
    const newAvg = newQty > 0 ? (Number(ex.qty) * Number(ex.avgCost) + amount) / newQty : price;
    [row] = await db
      .update(holdings)
      .set({ qty: String(newQty), avgCost: String(newAvg), updatedAt: new Date() })
      .where(and(eq(holdings.id, ex.id), eq(holdings.userId, uid)))
      .returning();
  } else {
    [row] = await db
      .insert(holdings)
      .values({ userId: uid, symbol, name, qty: String(qty), avgCost: String(price) })
      .returning();
  }

  await db.insert(trades).values({
    userId: uid,
    symbol,
    side: "buy",
    qty: String(qty),
    price: String(price),
    amount: String(amount),
  });
  await db.delete(watchlist).where(and(eq(watchlist.userId, uid), eq(watchlist.symbol, symbol)));
  return { row: mapHolding(row), removedFromWatch: symbol };
}

export async function sellHolding(
  ctx: ActorContext,
  input: { symbol: string; amount?: number; qty?: number; price: number }
) {
  const uid = ctx.userId;
  const symbol = symbolSchema.parse(input.symbol);
  const price = positiveMoneySchema.parse(input.price);
  const existing = await db
    .select()
    .from(holdings)
    .where(and(eq(holdings.userId, uid), eq(holdings.symbol, symbol)))
    .limit(1);

  if (!existing[0]) throw new DomainError(DomainErrorCodes.notHeld, "not held");
  const ex = existing[0];
  const sellQty =
    input.qty != null
      ? positiveMoneySchema.parse(input.qty)
      : positiveMoneySchema.parse(input.amount ?? 0) / price;
  if (sellQty <= 0) throw new DomainError(DomainErrorCodes.invalidAmount, "quantity must be positive");
  const newQty = Number(ex.qty) - sellQty;
  const amt = Math.min(sellQty, Number(ex.qty)) * price;

  let removed = false;
  let row = null;
  if (newQty <= 1e-6) {
    await db.delete(holdings).where(and(eq(holdings.id, ex.id), eq(holdings.userId, uid)));
    removed = true;
  } else {
    [row] = await db
      .update(holdings)
      .set({ qty: String(newQty), updatedAt: new Date() })
      .where(and(eq(holdings.id, ex.id), eq(holdings.userId, uid)))
      .returning();
  }

  await db.insert(trades).values({
    userId: uid,
    symbol,
    side: "sell",
    qty: String(Math.min(sellQty, Number(ex.qty))),
    price: String(price),
    amount: String(amt),
  });
  return { row: row ? mapHolding(row) : null, removed, symbol };
}

export async function addWatch(ctx: ActorContext, symbol: string, name: string) {
  const cleanSymbol = symbolSchema.parse(symbol);
  const cleanName = (name || cleanSymbol).trim().slice(0, 120);
  const [row] = await db
    .insert(watchlist)
    .values({ userId: ctx.userId, symbol: cleanSymbol, name: cleanName })
    .returning();
  return { sym: row.symbol, name: row.name };
}

export async function removeWatch(ctx: ActorContext, symbol: string) {
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, ctx.userId), eq(watchlist.symbol, symbolSchema.parse(symbol))));
  return { sym: symbolSchema.parse(symbol) };
}
