import assert from "node:assert/strict";
import test from "node:test";
import {
  countOccurrencesThrough,
  nextOccurrenceAfter,
  occurrenceAt,
  parseIsoDate,
  previewOccurrences,
} from "../lib/finance/recurrence";

test("monthly schedules keep their original anchor after clamping", () => {
  assert.equal(occurrenceAt("2025-01-31", "month", 1, 1), "2025-02-28");
  assert.equal(occurrenceAt("2025-01-31", "month", 1, 2), "2025-03-31");
});

test("leap-day yearly schedules clamp and recover", () => {
  assert.equal(occurrenceAt("2024-02-29", "year", 1, 1), "2025-02-28");
  assert.equal(occurrenceAt("2024-02-29", "year", 1, 4), "2028-02-29");
});

test("interval schedules and inclusive end dates are deterministic", () => {
  assert.deepEqual(
    previewOccurrences({
      startDate: "2026-01-01",
      unit: "week",
      interval: 2,
      endDate: "2026-01-29",
      limit: 10,
    }),
    ["2026-01-01", "2026-01-15", "2026-01-29"]
  );
});

test("catch-up count includes the through date and honors the cap", () => {
  assert.equal(
    countOccurrencesThrough({
      startDate: "2026-01-01",
      unit: "day",
      interval: 1,
      throughDate: "2026-01-10",
    }),
    10
  );
  assert.equal(
    countOccurrencesThrough({
      startDate: "2020-01-01",
      unit: "day",
      interval: 1,
      throughDate: "2026-01-10",
      cap: 100,
    }),
    100
  );
});

test("resume helper returns the first strictly future date", () => {
  assert.equal(nextOccurrenceAfter("2026-01-01", "month", 1, "2026-03-01"), "2026-04-01");
});

test("invalid calendar dates are rejected", () => {
  assert.throws(() => parseIsoDate("2026-02-30"));
  assert.throws(() => parseIsoDate("not-a-date"));
});
