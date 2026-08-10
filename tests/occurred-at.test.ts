import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeOccurredAt, occurredAtSchema } from "../lib/mcp/occurred-at";

describe("normalizeOccurredAt", () => {
  it("maps date-only to noon UTC", () => {
    assert.equal(normalizeOccurredAt("2026-03-15"), "2026-03-15T12:00:00.000Z");
  });

  it("keeps ISO with Z", () => {
    assert.equal(normalizeOccurredAt("2026-03-15T09:30:00.000Z"), "2026-03-15T09:30:00.000Z");
  });

  it("parses offset datetimes", () => {
    assert.equal(normalizeOccurredAt("2026-03-15T09:30:00-05:00"), "2026-03-15T14:30:00.000Z");
  });

  it("rejects no-offset local datetime forms", () => {
    assert.throws(() => normalizeOccurredAt("2026-03-15T09:30"));
    assert.throws(() => normalizeOccurredAt("2026-03-15T09:30:00"));
    assert.throws(() => normalizeOccurredAt("2026-08-01T00:00:00"));
  });

  it("rejects invalid calendar dates", () => {
    assert.throws(() => normalizeOccurredAt("2026-02-31"));
    assert.throws(() => normalizeOccurredAt("2026-04-31"));
  });

  it("rejects invalid clock times", () => {
    assert.throws(() => normalizeOccurredAt("2026-03-15T25:00:00Z"));
  });

  it("rejects garbage and space-separated forms", () => {
    assert.throws(() => normalizeOccurredAt("not-a-date"));
    assert.throws(() => normalizeOccurredAt("2026-03-15 09:30:00"));
  });
});

describe("occurredAtSchema", () => {
  it("transforms date-only", () => {
    assert.equal(occurredAtSchema.parse("2026-08-01"), "2026-08-01T12:00:00.000Z");
  });

  it("rejects no-offset T times with a clear message", () => {
    assert.throws(
      () => occurredAtSchema.parse("2026-03-15T09:30:00"),
      (err: unknown) =>
        err instanceof Error &&
        err.message.includes("YYYY-MM-DD or ISO datetime with Z/offset")
    );
  });

  it("is optional when wrapped", () => {
    assert.equal(occurredAtSchema.optional().parse(undefined), undefined);
  });
});
