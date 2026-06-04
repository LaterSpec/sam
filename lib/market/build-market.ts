export type MarketQuote = {
  price: number;
  prevClose: number | null;
  dayOpen: number | null;
  bid: number | null;
  ask: number | null;
  pct: number;
  source: string;
  live: boolean;
};

export type MarketMap = Record<string, MarketQuote | boolean | undefined> & {
  __liveActive?: boolean;
};

export type DailyBar = { date: string; close: number };

export function mapHolding(h: {
  id: string;
  symbol: string;
  name: string;
  qty: string | number;
  avgCost: string | number;
  openedAt: Date | string;
}) {
  return {
    id: h.id,
    sym: h.symbol,
    name: h.name,
    qty: Number(h.qty),
    avgCost: Number(h.avgCost),
    openedAt: h.openedAt,
  };
}

export function buildMarket(
  quoteRows: Array<{
    symbol: string;
    source: string;
    sessionDate: string;
    price: string | null;
    bid: string | null;
    ask: string | null;
    prevClose: string | null;
    dayOpen: string | null;
    changePct: string | null;
    capturedAt: Date | null;
  }>,
  barRows: Array<{ symbol: string; barDate: string; close: string | number }>
): MarketMap {
  const today = new Date().toISOString().slice(0, 10);
  const latestBar: Record<string, { date: string; close: number }> = {};
  barRows.forEach((b) => {
    const cur = latestBar[b.symbol];
    if (!cur || b.barDate > cur.date) latestBar[b.symbol] = { date: b.barDate, close: Number(b.close) };
  });

  const live: Record<string, (typeof quoteRows)[0]> = {};
  const yahoo: Record<string, (typeof quoteRows)[0]> = {};
  quoteRows.forEach((q) => {
    const bucket = q.source === "live" ? live : yahoo;
    const cur = bucket[q.symbol];
    if (!cur || q.sessionDate > cur.sessionDate) bucket[q.symbol] = q;
  });

  const out: MarketMap = {};
  const syms = new Set([...Object.keys(live), ...Object.keys(yahoo), ...Object.keys(latestBar)]);
  const nowMs = Date.now();

  syms.forEach((sym) => {
    const l = live[sym];
    const y = yahoo[sym];
    const liveToday = l && l.sessionDate === today;
    const liveFresh =
      liveToday && l.capturedAt && nowMs - new Date(l.capturedAt).getTime() < 120000;
    const price = Number(
      (liveToday && l.price) || (y && y.price) || (latestBar[sym] && latestBar[sym].close) || 0
    );
    if (!price) return;
    const prevClose = y && y.prevClose != null ? Number(y.prevClose) : null;
    const pct = prevClose ? ((price - prevClose) / prevClose) * 100 : y ? Number(y.changePct) : 0;
    out[sym] = {
      price,
      prevClose,
      dayOpen: y && y.dayOpen != null ? Number(y.dayOpen) : null,
      bid: Number((l && l.bid) || (y && y.bid)) || null,
      ask: Number((l && l.ask) || (y && y.ask)) || null,
      pct,
      source: liveToday ? "live" : "yahoo",
      live: !!liveFresh,
    };
  });

  out.__liveActive = Object.values(out).some((q) => q && typeof q === "object" && "live" in q && q.live);
  return out;
}

export function buildDailyBars(
  barRows: Array<{ symbol: string; barDate: string; close: string | number }>
): Record<string, DailyBar[]> {
  const bySym: Record<string, DailyBar[]> = {};
  barRows.forEach((b) => {
    (bySym[b.symbol] ??= []).push({ date: b.barDate, close: Number(b.close) });
  });
  Object.values(bySym).forEach((arr) => arr.sort((a, b) => (a.date < b.date ? -1 : 1)));
  return bySym;
}

export function portfolioValue(
  holdings: Array<{ sym: string; qty: number; avgCost: number }>,
  market: MarketMap
): number {
  return (holdings || []).reduce((a, h) => {
    const q = market[h.sym] as MarketQuote | undefined;
    const px = q && q.price != null ? q.price : h.avgCost;
    return a + h.qty * px;
  }, 0);
}

export function symbolSeed(sym: string): number {
  let s = 0;
  for (let i = 0; i < sym.length; i++) s = (s * 31 + sym.charCodeAt(i)) >>> 0;
  return (s % 1000) / 31;
}

export function makeSeries(seed: number, length: number, tick = 0, volatility = 0.06): number[] {
  const out: number[] = [];
  let v = 0.5;
  for (let i = 0; i < length; i++) {
    const wave =
      0.32 * Math.sin(i * 0.35 + seed + tick * 0.22) +
      0.18 * Math.sin(i * 0.95 + seed * 1.4) +
      0.1 * Math.sin(i * 2.3 + seed * 2.1 + tick * 0.4);
    v = 0.5 + wave * (0.5 + volatility);
    out.push(Math.max(0.04, Math.min(0.96, v)));
  }
  return out;
}

export function seriesToPrices(series: number[], basePrice: number, spreadPct = 0.06): number[] {
  const lo = basePrice * (1 - spreadPct);
  const hi = basePrice * (1 + spreadPct);
  return series.map((n) => lo + (hi - lo) * n);
}
