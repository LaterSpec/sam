import assert from "node:assert/strict";
import { test } from "node:test";
import { parseQueryRange } from "../lib/domain/query-range";
import { buildSamySystemPrompt } from "../lib/samy/prompt";

test("all-history queries do not fabricate bounds", () => {
  assert.deepEqual(parseQueryRange(), { from: null, to: null });
});
test("date ranges preserve local offsets and reject ambiguous or inverted bounds", () => {
  assert.deepEqual(parseQueryRange("2026-09-01T00:00:00-05:00", "2026-09-18T23:59:59.999-05:00"), {
    from: "2026-09-01T05:00:00.000Z", to: "2026-09-19T04:59:59.999Z",
  });
  for (const invalid of ["2026-09-18", "nonsense", "2026-09-18T12:00:00", "2026-02-30T12:00:00Z"]) {
    assert.throws(() => parseQueryRange(undefined, invalid), /timezone offset/);
  }
  assert.throws(() => parseQueryRange("2026-09-19T00:00:00Z", "2026-09-18T00:00:00Z"), /after/);
});
test("Samy uses the user's local month at a UTC month boundary", () => {
  const prompt = buildSamySystemPrompt({ fullName: "Manuel", language: "es", currency: "PEN", timezone: "America/Lima", memories: [], now: new Date("2026-10-01T02:00:00Z") });
  assert.match(prompt, /2026-09-01T05:00:00.000Z/);
  assert.match(prompt, /sam_get_latest_transaction/);
  assert.match(prompt, /Never use a paginated list/);
});
