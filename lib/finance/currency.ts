export type Currency = "USD" | "PEN";

export const SUPPORTED_CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "USD $" },
  { code: "PEN", symbol: "S/", label: "PEN S/" },
];

export const DEFAULT_CURRENCY: Currency = "USD";

export function isCurrency(value: unknown): value is Currency {
  return value === "USD" || value === "PEN";
}

export function normalizeCurrency(value: unknown): Currency {
  return isCurrency(value) ? value : DEFAULT_CURRENCY;
}

export function currencySymbol(currency: unknown): string {
  return normalizeCurrency(currency) === "PEN" ? "S/" : "$";
}

/**
 * Format a money amount with the correct currency symbol. No FX conversion is
 * performed: the value is always shown in the currency it belongs to.
 */
export function formatMoney(
  amount: number,
  currency: unknown,
  opts?: { sign?: boolean; decimals?: number }
): string {
  const sym = currencySymbol(currency);
  const decimals = opts?.decimals ?? 2;
  const neg = amount < 0;
  const abs = Math.abs(amount);
  const body = `${sym}${abs.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
  if (opts?.sign) return `${neg ? "-" : "+"}${body}`;
  return `${neg ? "-" : ""}${body}`;
}

/** Compact format (e.g. $1.2k / S/3.4M) preserving the currency symbol. */
export function formatMoneyShort(amount: number, currency: unknown): string {
  const sym = currencySymbol(currency);
  const a = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (a >= 1e6) return `${sign}${sym}${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${sign}${sym}${(a / 1e3).toFixed(1)}k`;
  return `${sign}${sym}${a.toFixed(a < 10 ? 2 : 0)}`;
}

/**
 * Group amounts by currency and render a combined label like "$1,200 + S/3,400"
 * for aggregate totals that mix currencies (no conversion).
 */
export function formatGroupedTotals(
  entries: { amount: number; currency: unknown }[],
  opts?: { decimals?: number }
): string {
  const byCur = new Map<Currency, number>();
  for (const e of entries) {
    const c = normalizeCurrency(e.currency);
    byCur.set(c, (byCur.get(c) ?? 0) + e.amount);
  }
  if (byCur.size === 0) return formatMoney(0, DEFAULT_CURRENCY, opts);
  // Stable order: USD first, then PEN.
  const order: Currency[] = ["USD", "PEN"];
  const parts: string[] = [];
  for (const c of order) {
    if (byCur.has(c)) parts.push(formatMoney(byCur.get(c)!, c, opts));
  }
  return parts.join(" + ");
}
