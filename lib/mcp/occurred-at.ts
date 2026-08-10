import { z } from "zod";

/**
 * Accepts agent-friendly expense/income dates:
 * - omitted → caller uses "now"
 * - `YYYY-MM-DD` → noon UTC that day (stable budget month)
 * - full ISO datetime with `Z` or numeric offset (`±HH:MM`)
 *
 * No-offset local forms (`YYYY-MM-DDTHH:mm[:ss]`) are rejected so midnight
 * is not reinterpreted across timezones into the wrong budget month.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:\d{2})$/i;
const ISO_WITH_TZ = /^\d{4}-\d{2}-\d{2}T.+?(?:Z|[+-]\d{2}:\d{2})$/i;

function requireValidInstant(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("invalid occurredAt date");
  }
  return parsed.toISOString();
}

export function normalizeOccurredAt(raw: string): string {
  const value = raw.trim();
  if (!value) throw new Error("invalid occurredAt date");

  const dateOnly = DATE_ONLY.exec(value);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    const iso = `${y}-${m}-${d}T12:00:00.000Z`;
    const out = requireValidInstant(iso);
    // Reject impossible calendar dates (Date rolls Feb 31 → March).
    if (!out.startsWith(`${y}-${m}-${d}`)) {
      throw new Error("invalid occurredAt date");
    }
    return out;
  }

  if (/^\d{4}-\d{2}-\d{2}T/.test(value) && !HAS_TIMEZONE.test(value)) {
    throw new Error("invalid occurredAt date");
  }

  if (!ISO_WITH_TZ.test(value)) {
    throw new Error("invalid occurredAt date");
  }

  return requireValidInstant(value);
}

export const occurredAtSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    try {
      return normalizeOccurredAt(value);
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "occurredAt must be YYYY-MM-DD or ISO datetime with Z/offset; omit to use now",
      });
      return z.NEVER;
    }
  })
  .describe("YYYY-MM-DD or ISO datetime with Z/offset; omit to use now");
