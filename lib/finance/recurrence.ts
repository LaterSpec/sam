export type RecurrenceUnit = "day" | "week" | "month" | "year";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string): Date {
  if (!ISO_DATE_RE.test(value)) throw new Error("invalid date");
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error("invalid date");
  }
  return date;
}

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayInTimeZone(timeZone = "America/Lima", now = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;
    if (year && month && day) return `${year}-${month}-${day}`;
  } catch {
    // Fall through to the project timezone.
  }
  if (timeZone !== "America/Lima") return todayInTimeZone("America/Lima", now);
  return toIsoDate(now);
}

function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Advances from the original schedule anchor, not from a clamped occurrence.
 * That keeps Jan 31 -> Feb 28 -> Mar 31 instead of drifting to Mar 28.
 */
export function occurrenceAt(
  anchorIso: string,
  unit: RecurrenceUnit,
  interval: number,
  index: number
): string {
  const anchor = parseIsoDate(anchorIso);
  const step = Math.max(1, Math.trunc(interval)) * Math.max(0, Math.trunc(index));

  if (unit === "day" || unit === "week") {
    const next = new Date(anchor);
    next.setUTCDate(next.getUTCDate() + step * (unit === "week" ? 7 : 1));
    return toIsoDate(next);
  }

  const anchorYear = anchor.getUTCFullYear();
  const anchorMonth = anchor.getUTCMonth();
  const anchorDay = anchor.getUTCDate();
  const totalMonths = unit === "year" ? step * 12 : step;
  const monthOrdinal = anchorYear * 12 + anchorMonth + totalMonths;
  const year = Math.floor(monthOrdinal / 12);
  const month = monthOrdinal % 12;
  const day = Math.min(anchorDay, daysInUtcMonth(year, month));
  return toIsoDate(new Date(Date.UTC(year, month, day)));
}

export function nextOccurrenceAfter(
  anchorIso: string,
  unit: RecurrenceUnit,
  interval: number,
  afterIso: string
): string {
  parseIsoDate(afterIso);
  for (let index = 0; index < 100_000; index += 1) {
    const candidate = occurrenceAt(anchorIso, unit, interval, index);
    if (candidate > afterIso) return candidate;
  }
  throw new Error("recurrence exceeds supported range");
}

export function nextOccurrenceFrom(
  anchorIso: string,
  currentIso: string,
  unit: RecurrenceUnit,
  interval: number
): string {
  parseIsoDate(currentIso);
  if (currentIso < anchorIso) return anchorIso;
  return nextOccurrenceAfter(anchorIso, unit, interval, currentIso);
}

export function previewOccurrences(input: {
  startDate: string;
  unit: RecurrenceUnit;
  interval: number;
  endDate?: string | null;
  limit?: number;
}): string[] {
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 6), 1), 100);
  const dates: string[] = [];
  for (let index = 0; dates.length < limit; index += 1) {
    const candidate = occurrenceAt(input.startDate, input.unit, input.interval, index);
    if (input.endDate && candidate > input.endDate) break;
    dates.push(candidate);
  }
  return dates;
}

export function countOccurrencesThrough(input: {
  startDate: string;
  unit: RecurrenceUnit;
  interval: number;
  throughDate: string;
  endDate?: string | null;
  cap?: number;
}): number {
  const cap = Math.min(Math.max(Math.trunc(input.cap ?? 100), 1), 10_000);
  let count = 0;
  for (let index = 0; count < cap; index += 1) {
    const candidate = occurrenceAt(input.startDate, input.unit, input.interval, index);
    if (candidate > input.throughDate || (input.endDate && candidate > input.endDate)) break;
    count += 1;
  }
  return count;
}
