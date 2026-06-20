export type DatedAmount = { amount: number; occurred_at: string };

export function memberAgeDays(memberSince: string | null): number {
  if (!memberSince) return 0;
  const start = new Date(`${memberSince}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.floor((Date.now() - start.getTime()) / 86400000);
}

export function hasTrendHistory(memberSince: string | null, minDays = 30): boolean {
  return memberAgeDays(memberSince) >= minDays;
}

export function sumInMonth(items: DatedAmount[], year: number, month: number): number {
  return items.reduce((acc, t) => {
    const d = new Date(t.occurred_at);
    if (d.getFullYear() === year && d.getMonth() === month) return acc + t.amount;
    return acc;
  }, 0);
}

export function buildLastNMonths(n: number, now = new Date()) {
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("en", { month: "short" }),
    });
  }
  return months;
}

export function monthlyTotals(items: DatedAmount[], n = 6, now = new Date()) {
  return buildLastNMonths(n, now).map((m) => ({
    label: m.label,
    value: sumInMonth(items, m.year, m.month),
    isCurrent: m.year === now.getFullYear() && m.month === now.getMonth(),
  }));
}

export function monthOverMonthPct(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function monthOverMonthFromTx(
  items: DatedAmount[],
  now = new Date()
): { current: number; previous: number; pct: number | null } {
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const prev = new Date(cy, cm - 1, 1);
  const current = sumInMonth(items, cy, cm);
  const previous = sumInMonth(items, prev.getFullYear(), prev.getMonth());
  return { current, previous, pct: monthOverMonthPct(current, previous) };
}
