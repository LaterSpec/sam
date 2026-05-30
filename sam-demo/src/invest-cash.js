// Budget inefficiencies → buying power vs portfolio mark-to-market.

function num(v) {
  return v == null ? 0 : Number(v);
}

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function isCurrentMonth(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  return currentMonthKey(d) === currentMonthKey();
}

/** Per-category surplus when spent < cap this month. */
export function computeInefficiencies(budgets, expenses) {
  const spentByKey = {};
  (expenses || [])
    .filter((e) => e.kind === 'expense' && isCurrentMonth(e.occurred_at))
    .forEach((e) => {
      const key = e.catKey || e.category || 'misc';
      spentByKey[key] = (spentByKey[key] || 0) + num(e.amount);
    });

  const byCategory = (budgets || []).map((b) => {
    const spent = spentByKey[b.key] || 0;
    const surplus = Math.max(0, num(b.cap) - spent);
    return {
      key: b.key,
      name: b.name,
      icon: b.icon,
      c: b.c,
      cap: num(b.cap),
      spent,
      surplus,
    };
  });

  const total = byCategory.reduce((a, c) => a + c.surplus, 0);
  return { byCategory, total: Math.round(total * 100) / 100 };
}

export function portfolioValue(holdings, market) {
  return (holdings || []).reduce((a, h) => {
    const q = market && market[h.sym];
    const px = q && q.price != null ? q.price : h.avgCost;
    return a + num(h.qty) * px;
  }, 0);
}

/**
 * Initialize or clamp investCash against current inefficiencies total.
 */
export function resolveInvestCash(state, inefficienciesTotal) {
  const stored = state.investCash;
  if (stored == null || Number.isNaN(Number(stored))) {
    return Math.round(inefficienciesTotal * 100) / 100;
  }
  return Math.min(num(stored), Math.round(inefficienciesTotal * 100) / 100);
}

export function enrichInvestState(state) {
  const ineff = computeInefficiencies(state.budgets, state.expenses);
  const investCash = resolveInvestCash(state, ineff.total);
  return {
    inefficiencies: ineff.byCategory,
    inefficienciesTotal: ineff.total,
    investCash,
  };
}
