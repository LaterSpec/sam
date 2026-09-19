import { DomainError } from "./types";
import { z } from "zod";

const instantSchema = z.string().datetime({ offset: true });

/** Explicit instants only: a date-only upper bound otherwise silently omits most of that day. */
export function parseQueryRange(from?: string, to?: string) {
  const parse = (value: string | undefined) => {
    if (value === undefined) return null;
    if (!instantSchema.safeParse(value).success || !Number.isFinite(Date.parse(value))) {
      throw new DomainError("invalid_date_range", "Use an ISO datetime with timezone offset, including local start/end of day when needed.");
    }
    return new Date(value);
  };
  const start = parse(from);
  const end = parse(to);
  if (start && end && start > end) throw new DomainError("invalid_date_range", "from must not be after to");
  return { from: start?.toISOString() ?? null, to: end?.toISOString() ?? null };
}
