import { db } from "@/lib/db";
import { marketSymbols, marketQuotes, marketDailyBars } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const SYMBOLS_SEED: Array<[string, string, number | null, boolean, number]> = [
  ["AAPL", "Apple", 174, true, 0],
  ["MSFT", "Microsoft", 354, true, 1],
  ["NVDA", "NVIDIA", 366, true, 2],
  ["AMZN", "Amazon", 192, true, 3],
  ["META", "Meta Platforms", 289, true, 4],
  ["TSLA", "Tesla", 1984, true, 5],
  ["AVGO", "Broadcom", 606, true, 6],
  ["AMD", "AMD", 889, true, 7],
  ["NFLX", "Netflix", 290, true, 8],
  ["V", "Visa", 421, true, 9],
  ["SPY", "SPDR S&P 500", null, true, 10],
  ["QQQ", "Invesco QQQ", null, true, 11],
  ["GOOGL", "Alphabet", 303, false, 12],
  ["BRK.B", "Berkshire Hathaway", null, false, 13],
  ["JPM", "JPMorgan", null, false, 14],
  ["UNH", "UnitedHealth", null, false, 15],
  ["XOM", "Exxon Mobil", null, false, 16],
  ["LLY", "Eli Lilly", null, false, 17],
  ["JNJ", "Johnson & Johnson", null, false, 18],
  ["WMT", "Walmart", null, false, 19],
];

type YahooChartResult = {
  chart?: {
    result?: Array<{
      meta?: {
        regularMarketPrice?: number;
        previousClose?: number;
        regularMarketOpen?: number;
        chartPreviousClose?: number;
      };
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
  };
};

async function fetchChart(symbol: string): Promise<YahooChartResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 SAM/1.0" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Yahoo chart ${symbol}: ${res.status}`);
  return res.json();
}

export async function syncMarketData() {
  const today = new Date().toISOString().slice(0, 10);
  let quotesUpdated = 0;
  let barsUpdated = 0;

  for (const [symbol, name, assetId, curated, sort] of SYMBOLS_SEED) {
    await db
      .insert(marketSymbols)
      .values({
        symbol,
        name,
        assetId: assetId ?? undefined,
        curated,
        sort,
        active: true,
      })
      .onConflictDoUpdate({
        target: marketSymbols.symbol,
        set: { name, assetId: assetId ?? undefined, curated, sort, active: true },
      });
  }

  const symbols = await db
    .select({ symbol: marketSymbols.symbol })
    .from(marketSymbols)
    .where(eq(marketSymbols.active, true));

  for (const { symbol } of symbols) {
    try {
      const data = await fetchChart(symbol);
      const result = data.chart?.result?.[0];
      if (!result) continue;

      const meta = result.meta ?? {};
      const price = meta.regularMarketPrice;
      if (price == null) continue;

      const prevClose = meta.previousClose ?? meta.chartPreviousClose ?? null;
      const changePct =
        prevClose && prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : null;

      await db
        .insert(marketQuotes)
        .values({
          symbol,
          source: "yahoo",
          sessionDate: today,
          price: String(price),
          prevClose: prevClose != null ? String(prevClose) : null,
          dayOpen: meta.regularMarketOpen != null ? String(meta.regularMarketOpen) : null,
          changePct: changePct != null ? String(changePct) : null,
        })
        .onConflictDoUpdate({
          target: [marketQuotes.symbol, marketQuotes.source, marketQuotes.sessionDate],
          set: {
            price: String(price),
            prevClose: prevClose != null ? String(prevClose) : null,
            dayOpen: meta.regularMarketOpen != null ? String(meta.regularMarketOpen) : null,
            changePct: changePct != null ? String(changePct) : null,
            capturedAt: new Date(),
          },
        });
      quotesUpdated++;

      const timestamps = result.timestamp ?? [];
      const closes = result.indicators?.quote?.[0]?.close ?? [];
      for (let i = 0; i < timestamps.length; i++) {
        const close = closes[i];
        if (close == null) continue;
        const barDate = new Date(timestamps[i] * 1000).toISOString().slice(0, 10);
        await db
          .insert(marketDailyBars)
          .values({ symbol, barDate, close: String(close) })
          .onConflictDoUpdate({
            target: [marketDailyBars.symbol, marketDailyBars.barDate],
            set: { close: String(close) },
          });
        barsUpdated++;
      }
    } catch (err) {
      console.warn(`[market-sync] skip ${symbol}:`, err);
    }
  }

  return { quotesUpdated, barsUpdated, symbols: symbols.length };
}
