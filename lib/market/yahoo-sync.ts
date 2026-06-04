import { db } from "@/lib/db";
import { marketQuotes, marketDailyBars, marketSymbols } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

/** Yahoo usa guión en clase B; en DB guardamos el símbolo original */
const YAHOO_TICKER: Record<string, string> = {
  "BRK.B": "BRK-B",
};

function toYahooTicker(symbol: string): string {
  return YAHOO_TICKER[symbol] ?? symbol.replace(/\./g, "-");
}

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

const FETCH_TIMEOUT_MS = 20_000;

async function fetchChart(yahooTicker: string): Promise<YahooChartResult> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=3mo`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 SAM/1.0" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Yahoo chart ${yahooTicker}: ${res.status}`);
  return res.json();
}

async function upsertBars(
  symbol: string,
  rows: Array<{ barDate: string; close: string }>
) {
  const CHUNK = 40;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    if (chunk.length === 0) continue;
    await db
      .insert(marketDailyBars)
      .values(chunk.map((r) => ({ symbol, barDate: r.barDate, close: r.close })))
      .onConflictDoUpdate({
        target: [marketDailyBars.symbol, marketDailyBars.barDate],
        set: { close: sql`excluded.close` },
      });
  }
}

export async function syncMarketData(options?: { limit?: number }) {
  const today = new Date().toISOString().slice(0, 10);
  let quotesUpdated = 0;
  let barsUpdated = 0;
  let skipped = 0;

  let symbols = await db
    .select({ symbol: marketSymbols.symbol })
    .from(marketSymbols)
    .where(eq(marketSymbols.active, true));

  if (options?.limit) symbols = symbols.slice(0, options.limit);

  const total = symbols.length;
  console.log(`[market-sync] syncing ${total} symbols…`);

  for (let i = 0; i < symbols.length; i++) {
    const { symbol } = symbols[i];
    const yahooTicker = toYahooTicker(symbol);
    const label = yahooTicker !== symbol ? `${symbol}→${yahooTicker}` : symbol;

    try {
      const data = await fetchChart(yahooTicker);
      const result = data.chart?.result?.[0];
      if (!result) {
        skipped++;
        console.warn(`[market-sync] ${i + 1}/${total} ${label}: no chart data`);
        continue;
      }

      const meta = result.meta ?? {};
      const price = meta.regularMarketPrice;
      if (price == null) {
        skipped++;
        console.warn(`[market-sync] ${i + 1}/${total} ${label}: no price`);
        continue;
      }

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
      const barRows: Array<{ barDate: string; close: string }> = [];
      for (let j = 0; j < timestamps.length; j++) {
        const close = closes[j];
        if (close == null) continue;
        barRows.push({
          barDate: new Date(timestamps[j] * 1000).toISOString().slice(0, 10),
          close: String(close),
        });
      }
      if (barRows.length > 0) {
        await upsertBars(symbol, barRows);
        barsUpdated += barRows.length;
      }

      console.log(
        `[market-sync] ${i + 1}/${total} ${label} ✓ quote + ${barRows.length} bars`
      );
    } catch (err) {
      skipped++;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[market-sync] ${i + 1}/${total} ${label}: skip (${msg})`);
    }

    // Evita rate-limit de Yahoo entre símbolos
    if (i < symbols.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `[market-sync] done — quotes: ${quotesUpdated}, bars: ${barsUpdated}, skipped: ${skipped}`
  );
  return { quotesUpdated, barsUpdated, skipped, symbols: total };
}
