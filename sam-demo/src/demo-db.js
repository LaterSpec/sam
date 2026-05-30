// SAM Demo · localStorage data layer (SamDB-compatible API)

import seed from './data/seed.json';
import {
  getMarketQuotes,
  getBarsFor,
  buildDailyBars,
  resetMarket,
} from './market-engine';
import {
  computeInefficiencies,
  enrichInvestState,
} from './invest-cash.js';

const KEY_SESSION = 'sam-demo-session';
const KEY_STATE = 'sam-demo-state';

let navigateFn = null;
const sessionListeners = new Set();

function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function num(v) {
  return v == null ? 0 : Number(v);
}

function readSession() {
  try {
    const raw = localStorage.getItem(KEY_SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeSession(session) {
  if (session) localStorage.setItem(KEY_SESSION, JSON.stringify(session));
  else localStorage.removeItem(KEY_SESSION);
  sessionListeners.forEach((fn) => fn(session));
}

function readOverrides() {
  try {
    const raw = localStorage.getItem(KEY_STATE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeOverrides(overrides) {
  localStorage.setItem(KEY_STATE, JSON.stringify(overrides));
}

function cloneSeedState() {
  return {
    expenses: JSON.parse(JSON.stringify(seed.expenses)),
    incomeTx: JSON.parse(JSON.stringify(seed.incomeTx)),
    goals: JSON.parse(JSON.stringify(seed.goals)),
    incomeSources: JSON.parse(JSON.stringify(seed.incomeSources)),
    buckets: JSON.parse(JSON.stringify(seed.buckets)),
    accounts: JSON.parse(JSON.stringify(seed.accounts)),
    budgets: JSON.parse(JSON.stringify(seed.budgets)),
    holdings: JSON.parse(JSON.stringify(seed.holdings || [])),
    watchlist: JSON.parse(JSON.stringify(seed.watchlist)),
    prefs: JSON.parse(JSON.stringify(seed.prefs)),
    portfolioSnapshots: JSON.parse(JSON.stringify(seed.portfolioSnapshots || [])),
    investCash: null,
  };
}

function mergeState() {
  const overrides = readOverrides();
  const base = cloneSeedState();
  const merged = { ...base, ...overrides };
  if (overrides.expenses) merged.expenses = overrides.expenses;
  if (overrides.incomeTx) merged.incomeTx = overrides.incomeTx;
  if (overrides.goals) merged.goals = overrides.goals;
  if (overrides.holdings) merged.holdings = overrides.holdings;
  if (overrides.watchlist) merged.watchlist = overrides.watchlist;
  if (overrides.accounts) merged.accounts = overrides.accounts;
  if (overrides.budgets) merged.budgets = overrides.budgets;
  if (overrides.buckets) merged.buckets = overrides.buckets;
  if (overrides.incomeSources) merged.incomeSources = overrides.incomeSources;
  if (overrides.prefs) merged.prefs = { ...base.prefs, ...overrides.prefs };
  if (overrides.portfolioSnapshots) merged.portfolioSnapshots = overrides.portfolioSnapshots;
  if (overrides.investCash != null) merged.investCash = overrides.investCash;
  return merged;
}

function persistPatch(patch) {
  const overrides = readOverrides();
  writeOverrides({ ...overrides, ...patch });
}

function mapHolding(h) {
  return {
    id: h.id,
    sym: h.sym || h.symbol,
    name: h.name,
    qty: num(h.qty),
    avgCost: num(h.avgCost ?? h.avg_cost),
    openedAt: h.openedAt,
  };
}

function clampInvestCashAfterExpense(state) {
  const ineff = computeInefficiencies(state.budgets, state.expenses);
  const cash = state.investCash != null ? num(state.investCash) : ineff.total;
  return Math.min(cash, ineff.total);
}

export const SamDemoDB = {
  setNavigate(fn) {
    navigateFn = fn;
  },

  onSessionChange(cb) {
    sessionListeners.add(cb);
    return () => sessionListeners.delete(cb);
  },

  async getSession() {
    const s = readSession();
    return s || null;
  },

  async startGuest() {
    const session = {
      userId: seed.user.id,
      email: seed.user.email,
      fullName: seed.user.full_name,
      isGuest: true,
    };
    writeSession(session);
    if (!localStorage.getItem(KEY_STATE)) {
      const base = cloneSeedState();
      const enriched = enrichInvestState(base);
      writeOverrides({ ...base, investCash: enriched.investCash });
    }
    return { session };
  },

  async signIn() {
    return this.startGuest();
  },

  async signUp(email, _pw, fullName) {
    const session = {
      userId: uid(),
      email: email || 'guest@demo.sam',
      fullName: fullName || 'Guest',
      isGuest: true,
    };
    writeSession(session);
    const base = cloneSeedState();
    const enriched = enrichInvestState(base);
    writeOverrides({ ...base, investCash: enriched.investCash });
    return { data: { user: session }, error: null };
  },

  async signOut() {
    writeSession(null);
  },

  async deleteAccount() {
    localStorage.removeItem(KEY_STATE);
    localStorage.removeItem('sam-demo-market');
    resetMarket();
    writeSession(null);
    return { error: null };
  },

  goOnboarding() {
    if (navigateFn) navigateFn('/');
    else window.location.href = '/';
  },

  goApp() {
    if (navigateFn) navigateFn('/app');
    else window.location.href = '/app';
  },

  async loadUserData() {
    const session = readSession();
    if (!session) return null;

    const state = mergeState();
    const invest = enrichInvestState(state);
    if (state.investCash == null || state.investCash !== invest.investCash) {
      persistPatch({ investCash: invest.investCash });
    }

    const holdingSyms = (state.holdings || []).map((h) => h.sym);
    const watchSyms = (state.watchlist || []).map((w) => w.sym);
    const barSyms = [...new Set([...holdingSyms, ...watchSyms, 'SPY'])];
    const dailyBars = buildDailyBars(barSyms);
    const market = getMarketQuotes([
      ...holdingSyms,
      ...watchSyms,
      ...Object.keys(seed.basePrices),
    ]);

    return {
      user: {
        id: session.userId || seed.user.id,
        email: session.email || seed.user.email,
        full_name: session.fullName || seed.user.full_name,
        username: seed.user.username,
        plan: seed.user.plan,
        streak: seed.user.streak,
        member_since: seed.user.member_since,
      },
      prefs: state.prefs,
      streak: seed.user.streak,
      accounts: state.accounts,
      budgets: state.budgets,
      expenses: state.expenses,
      incomeTx: state.incomeTx,
      goals: state.goals,
      incomeSources: state.incomeSources,
      buckets: state.buckets,
      holdings: (state.holdings || []).map(mapHolding),
      watchlist: state.watchlist,
      tickerPool: seed.tickerPool,
      market,
      dailyBars,
      portfolioSnapshots: state.portfolioSnapshots || [],
      investCash: invest.investCash,
      inefficiencies: invest.inefficiencies,
      inefficienciesTotal: invest.inefficienciesTotal,
    };
  },

  async addExpense({ amount, name, catKey, budgets, accounts }) {
    const state = mergeState();
    const cat = (budgets || state.budgets || []).find((b) => b.key === catKey);
    const row = {
      id: uid(),
      name,
      amount: num(amount),
      category: cat ? cat.key : 'misc',
      catKey: cat ? cat.key : 'misc',
      catColor: cat ? cat.c : '#8b949e',
      icon: cat ? cat.icon : '●',
      time: 'now',
      occurred_at: new Date().toISOString(),
      kind: 'expense',
    };
    const expenses = [...state.expenses, row];
    const next = { ...state, expenses };
    const investCash = clampInvestCashAfterExpense(next);
    persistPatch({ expenses, investCash });
    const invest = enrichInvestState({ ...next, investCash });
    return { row, investCash: invest.investCash, inefficienciesTotal: invest.inefficienciesTotal };
  },

  async deleteExpense(id) {
    const state = mergeState();
    const expenses = state.expenses.filter((e) => e.id !== id);
    const next = { ...state, expenses };
    const invest = enrichInvestState(next);
    persistPatch({ expenses, investCash: invest.investCash });
    return { error: null };
  },

  async addGoal({ name, target, icon, color }) {
    const state = mergeState();
    const row = {
      id: uid(),
      name,
      target: num(target),
      saved: 0,
      eta: 'tbd',
      icon: icon || '◆',
      c: color || '#58a6ff',
      done: false,
    };
    persistPatch({ goals: [...state.goals, row] });
    return { row };
  },

  async setGoalSaved(goalId, saved, done) {
    const state = mergeState();
    persistPatch({
      goals: state.goals.map((g) =>
        g.id === goalId
          ? { ...g, saved, ...(typeof done === 'boolean' ? { done } : {}) }
          : g
      ),
    });
    return { error: null };
  },

  async setBudgetCap(categoryId, cap) {
    const state = mergeState();
    const budgets = state.budgets.map((b) =>
      b.id === categoryId ? { ...b, cap: num(cap) } : b
    );
    const next = { ...state, budgets };
    const invest = enrichInvestState(next);
    persistPatch({ budgets, investCash: invest.investCash });
    return { error: null, investCash: invest.investCash, inefficienciesTotal: invest.inefficienciesTotal };
  },

  async addIncome({ name, amt, icon, color, freq, next }) {
    const state = mergeState();
    const row = {
      id: uid(),
      name,
      amt: num(amt),
      icon: icon || '◆',
      c: color || '#58a6ff',
      freq: freq || 'one-time',
      next: next || '—',
    };
    persistPatch({ incomeSources: [...state.incomeSources, row] });
    return { row };
  },

  async setBucketBalance(bucketId, balance) {
    const state = mergeState();
    persistPatch({
      buckets: state.buckets.map((b) =>
        b.id === bucketId ? { ...b, balance: num(balance) } : b
      ),
    });
    return { error: null };
  },

  async updatePrefs(prefs) {
    const state = mergeState();
    persistPatch({ prefs: { ...state.prefs, ...prefs } });
    return { error: null };
  },

  async buyHolding({ symbol, name, amount, price }) {
    const amt = Number(amount);
    const px = Number(price);
    if (!(amt > 0) || !(px > 0)) return { error: 'invalid buy' };
    const state = mergeState();
    const invest = enrichInvestState(state);
    if (amt > invest.investCash + 0.001) {
      return { error: 'insufficient buying power' };
    }

    const qty = amt / px;
    const existing = (state.holdings || []).find((h) => h.sym === symbol);
    let row;
    const newCash = Math.round((invest.investCash - amt) * 100) / 100;

    if (existing) {
      const prevQty = num(existing.qty);
      const newQty = prevQty + qty;
      if (prevQty < 0 && newQty >= -1e-8) {
        if (newQty <= 1e-8) {
          persistPatch({
            holdings: state.holdings.filter((h) => h.sym !== symbol),
            watchlist: state.watchlist.filter((w) => w.sym !== symbol),
            investCash: newCash,
          });
          return { removed: true, symbol, investCash: newCash };
        }
        row = { ...existing, qty: newQty, avgCost: px };
      } else {
        const newAvg = newQty > 0
          ? (prevQty * num(existing.avgCost) + amt) / newQty
          : num(existing.avgCost);
        row = { ...existing, qty: newQty, avgCost: newAvg };
      }
      persistPatch({
        holdings: state.holdings.map((h) => (h.sym === symbol ? row : h)),
        watchlist: state.watchlist.filter((w) => w.sym !== symbol),
        investCash: newCash,
      });
    } else {
      row = {
        id: uid(),
        sym: symbol,
        name: name || symbol,
        qty,
        avgCost: px,
        openedAt: new Date().toISOString(),
      };
      persistPatch({
        holdings: [...(state.holdings || []), row],
        watchlist: state.watchlist.filter((w) => w.sym !== symbol),
        investCash: newCash,
      });
    }
    return { row: mapHolding(row), removedFromWatch: symbol, investCash: newCash };
  },

  async sellHolding({ symbol, amount, qty: sellQty, price }) {
    const px = Number(price);
    if (!(px > 0)) return { error: 'invalid sell' };
    const state = mergeState();
    const invest = enrichInvestState(state);
    const sellAmount = amount != null ? Number(amount) : num(sellQty) * px;
    if (!(sellAmount > 0)) return { error: 'invalid sell' };

    const sellQuantity = sellQty != null ? num(sellQty) : sellAmount / px;
    const newCash = Math.round((invest.investCash + sellAmount) * 100) / 100;
    const existing = (state.holdings || []).find((h) => h.sym === symbol);

    if (!existing) {
      const row = {
        id: uid(),
        sym: symbol,
        name: symbol,
        qty: -sellQuantity,
        avgCost: px,
        openedAt: new Date().toISOString(),
      };
      persistPatch({
        holdings: [...(state.holdings || []), row],
        investCash: newCash,
      });
      return { row: mapHolding(row), shortOpened: true, investCash: newCash };
    }

    const newQty = num(existing.qty) - sellQuantity;

    if (Math.abs(newQty) <= 1e-8) {
      persistPatch({
        holdings: state.holdings.filter((h) => h.sym !== symbol),
        investCash: newCash,
      });
      return { removed: true, symbol, investCash: newCash };
    }

    const row = { ...existing, qty: newQty };
    persistPatch({
      holdings: state.holdings.map((h) => (h.sym === symbol ? row : h)),
      investCash: newCash,
    });
    return { row: mapHolding(row), removed: false, symbol, investCash: newCash };
  },

  async addWatch({ symbol, name }) {
    const state = mergeState();
    if (state.watchlist.some((w) => w.sym === symbol)) return { row: { sym: symbol, name } };
    const row = { sym: symbol, name: name || symbol };
    persistPatch({ watchlist: [...state.watchlist, row] });
    return { row };
  },

  async removeWatch(symbol) {
    const state = mergeState();
    persistPatch({ watchlist: state.watchlist.filter((w) => w.sym !== symbol) });
    return { error: null };
  },

  async getMarketQuotes() {
    const state = mergeState();
    const syms = [
      ...(state.holdings || []).map((h) => h.sym),
      ...(state.watchlist || []).map((w) => w.sym),
    ];
    return getMarketQuotes(syms);
  },

  async getBarsFor(symbols) {
    return getBarsFor(symbols);
  },

  async recordSnapshot(value) {
    const state = mergeState();
    const snap = { t: new Date().toISOString(), v: num(value) };
    persistPatch({
      portfolioSnapshots: [...(state.portfolioSnapshots || []), snap],
    });
    return { error: null };
  },

  computeInefficiencies(budgets, expenses) {
    return computeInefficiencies(budgets, expenses);
  },

  URLS: { ONBOARDING_URL: '/', APP_URL: '/app' },
};

export default SamDemoDB;
