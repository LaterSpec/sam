// Simulated market: random walk + deterministic bars (same helpers as SAM interactive).

import seed from './data/seed.json';

const STORAGE_MARKET = 'sam-demo-market';

export function symbolSeed(sym) {
  let s = 0;
  for (let i = 0; i < sym.length; i++) s = (s * 31 + sym.charCodeAt(i)) >>> 0;
  return (s % 1000) / 31;
}

export function makeSeries(seedVal, length, tick = 0, volatility = 0.06) {
  const out = [];
  for (let i = 0; i < length; i++) {
    const wave =
      0.32 * Math.sin(i * 0.35 + seedVal + tick * 0.22) +
      0.18 * Math.sin(i * 0.95 + seedVal * 1.4) +
      0.10 * Math.sin(i * 2.3 + seedVal * 2.1 + tick * 0.4);
    const v = 0.5 + wave * (0.5 + volatility);
    out.push(Math.max(0.04, Math.min(0.96, v)));
  }
  return out;
}

export function seriesToPrices(series, basePrice, spreadPct = 0.06) {
  const lo = basePrice * (1 - spreadPct);
  const hi = basePrice * (1 + spreadPct);
  return series.map((n) => lo + (hi - lo) * n);
}

function isoDay(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 10);
}

function loadStoredPrices() {
  try {
    const raw = localStorage.getItem(STORAGE_MARKET);
    if (raw) return JSON.parse(raw);
  } catch (_) { /* ignore */ }
  return null;
}

function saveStoredPrices(prices) {
  try {
    localStorage.setItem(STORAGE_MARKET, JSON.stringify({ prices, at: Date.now() }));
  } catch (_) { /* ignore */ }
}

function initPrices() {
  const stored = loadStoredPrices();
  if (stored && stored.prices) return { ...stored.prices };

  const base = seed.basePrices || {};
  const prices = {};
  Object.keys(base).forEach((sym) => {
    prices[sym] = base[sym];
  });
  saveStoredPrices(prices);
  return prices;
}

let livePrices = initPrices();
let tickCount = 0;

const VOL = {
  AAPL: 0.004, MSFT: 0.0035, NVDA: 0.008, AMZN: 0.005, META: 0.006,
  TSLA: 0.012, AVGO: 0.005, AMD: 0.009, NFLX: 0.006, V: 0.003,
  SPY: 0.0025, QQQ: 0.003, ORCL: 0.004, ADBE: 0.005, QCOM: 0.005,
  ASML: 0.004, NKE: 0.005, BABA: 0.007,
};

export function tickMarket(extraSymbols = []) {
  const syms = new Set([
    ...Object.keys(seed.basePrices || {}),
    ...extraSymbols,
  ]);
  syms.forEach((sym) => {
    if (livePrices[sym] == null) {
      livePrices[sym] = seed.basePrices[sym] || 100 + symbolSeed(sym) * 50;
    }
    const vol = VOL[sym] || 0.005;
    const drift = (Math.random() - 0.5) * 2 * vol;
    livePrices[sym] = Math.max(0.01, livePrices[sym] * (1 + drift));
  });
  tickCount += 1;
  saveStoredPrices(livePrices);
}

export function buildMarketMap(symbols) {
  const out = {};
  const syms = symbols && symbols.length
    ? symbols
    : Object.keys(livePrices);

  syms.forEach((sym) => {
    const price = livePrices[sym];
    if (price == null) return;
    const base = seed.basePrices[sym] || price;
    const prevClose = base * (0.98 + (symbolSeed(sym) % 0.04));
    const pct = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
    const spread = price * 0.0008;
    out[sym] = {
      price: Math.round(price * 100) / 100,
      prevClose: Math.round(prevClose * 100) / 100,
      dayOpen: Math.round((prevClose * 1.002) * 100) / 100,
      bid: Math.round((price - spread) * 100) / 100,
      ask: Math.round((price + spread) * 100) / 100,
      pct: Math.round(pct * 100) / 100,
      source: 'live',
      live: true,
    };
  });
  out.__liveActive = true;
  return out;
}

export function getMarketQuotes(extraSymbols = []) {
  tickMarket(extraSymbols);
  return buildMarketMap([
    ...Object.keys(livePrices),
    ...extraSymbols,
  ]);
}

export function buildDailyBars(symbols) {
  const bySym = {};
  const today = new Date();
  (symbols || Object.keys(seed.basePrices)).forEach((sym) => {
    const base = livePrices[sym] || seed.basePrices[sym] || 100;
    const s = symbolSeed(sym);
    const series = makeSeries(s, 50, tickCount, 0.08);
    const prices = seriesToPrices(series, base, 0.12);
    const bars = [];
    for (let i = 0; i < 50; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (49 - i));
      bars.push({
        date: d.toISOString().slice(0, 10),
        close: Math.round(prices[i] * 100) / 100,
      });
    }
    bySym[sym] = bars;
  });
  return bySym;
}

export function getBarsFor(symbols) {
  if (!symbols || !symbols.length) return {};
  return buildDailyBars(symbols);
}

export function resetMarket() {
  livePrices = {};
  localStorage.removeItem(STORAGE_MARKET);
  livePrices = initPrices();
}
