export type DatedAmount = { amount: number; occurred_at: string };

export const DEFAULT_FINANCE_TIMEZONE = "America/Lima";

function safeTimeZone(timeZone?: string): string {
  if (!timeZone) return DEFAULT_FINANCE_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return DEFAULT_FINANCE_TIMEZONE;
  }
}

export function monthKey(value: Date | string, timeZone = DEFAULT_FINANCE_TIMEZONE): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
}

export function inSameMonth(
  value: Date | string,
  reference = new Date(),
  timeZone = DEFAULT_FINANCE_TIMEZONE
): boolean {
  return monthKey(value, timeZone) === monthKey(reference, timeZone);
}

export function filterCurrentMonth<T extends { occurred_at: string }>(
  items: T[],
  reference = new Date(),
  timeZone = DEFAULT_FINANCE_TIMEZONE
): T[] {
  return items.filter((item) => inSameMonth(item.occurred_at, reference, timeZone));
}

export function memberAgeDays(memberSince: string | null): number {
  if (!memberSince) return 0;
  const start = new Date(`${memberSince}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.floor((Date.now() - start.getTime()) / 86400000);
}

export function hasTrendHistory(memberSince: string | null, minDays = 30): boolean {
  return memberAgeDays(memberSince) >= minDays;
}

export function sumInMonth(
  items: DatedAmount[],
  year: number,
  month: number,
  timeZone = DEFAULT_FINANCE_TIMEZONE
): number {
  const targetKey = `${year}-${String(month + 1).padStart(2, "0")}`;
  return items.reduce((acc, t) => {
    if (monthKey(t.occurred_at, timeZone) === targetKey) return acc + t.amount;
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

export function monthlyTotals(
  items: DatedAmount[],
  n = 6,
  now = new Date(),
  timeZone = DEFAULT_FINANCE_TIMEZONE
) {
  return buildLastNMonths(n, now).map((m) => ({
    label: m.label,
    value: sumInMonth(items, m.year, m.month, timeZone),
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
  now = new Date(),
  timeZone = DEFAULT_FINANCE_TIMEZONE
): { current: number; previous: number; pct: number | null } {
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const prev = new Date(cy, cm - 1, 1);
  const current = sumInMonth(items, cy, cm, timeZone);
  const previous = sumInMonth(items, prev.getFullYear(), prev.getMonth(), timeZone);
  return { current, previous, pct: monthOverMonthPct(current, previous) };
}
