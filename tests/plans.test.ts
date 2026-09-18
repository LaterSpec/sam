import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PLAN_CATALOG, TRIAL_LIMITS, limitsForAccess } from "../lib/plans/catalog";
import { dayWindow, isValidTimeZone, minuteWindow, monthWindow } from "../lib/plans/time";
import { resolveAccessState } from "../lib/plans/resolve";

describe("plan catalog", () => {
  it("keeps the locked Free, Pro and Agent limits", () => {
    assert.equal(PLAN_CATALOG.free.limits.transactionsMonthly, 100);
    assert.equal(PLAN_CATALOG.free.limits.mcpTokens, 1);
    assert.deepEqual(PLAN_CATALOG.free.limits.mcpScopes, ["sam:read"]);
    assert.equal(PLAN_CATALOG.pro.limits.transactionsMonthly, 500);
    assert.equal(PLAN_CATALOG.pro.limits.samyMessagesMonthly, 150);
    assert.equal(PLAN_CATALOG.pro.limits.transfers, false);
    assert.equal(PLAN_CATALOG.agent.limits.transactionsMonthly, null);
    assert.equal(PLAN_CATALOG.agent.limits.transfers, true);
  });

  it("uses near-Pro trial access with independent safety quotas", () => {
    assert.equal(limitsForAccess("free", "trial"), TRIAL_LIMITS);
    assert.equal(TRIAL_LIMITS.samyMessagesTrialTotal, 50);
    assert.equal(TRIAL_LIMITS.samyMessagesDailyHard, 10);
    assert.equal(TRIAL_LIMITS.mcpCallsTrialTotal, 100);
    assert.equal(TRIAL_LIMITS.mcpTokens, 1);
    assert.equal(TRIAL_LIMITS.recurring, true);
    assert.equal(TRIAL_LIMITS.transfers, false);
  });
});

describe("plan metering windows", () => {
  it("uses the user's local calendar boundaries", () => {
    const now = new Date("2026-09-18T04:30:45.000Z");
    const minute = minuteWindow(now, "America/Lima");
    const day = dayWindow(now, "America/Lima");
    const month = monthWindow(now, "America/Lima");
    assert.equal(minute.key, "2026-09-17T23:30");
    assert.equal(day.key, "2026-09-17");
    assert.equal(day.start.toISOString(), "2026-09-17T05:00:00.000Z");
    assert.equal(day.end.toISOString(), "2026-09-18T05:00:00.000Z");
    assert.equal(month.key, "2026-09");
    assert.equal(month.start.toISOString(), "2026-09-01T05:00:00.000Z");
  });

  it("handles daylight-saving days without assuming 24 hours", () => {
    const spring = dayWindow(new Date("2026-03-08T17:00:00.000Z"), "America/New_York");
    assert.equal(spring.end.getTime() - spring.start.getTime(), 23 * 60 * 60 * 1000);
    assert.equal(isValidTimeZone("America/Lima"), true);
    assert.equal(isValidTimeZone("Mars/Olympus"), false);
  });
});

describe("plan access resolution", () => {
  const now = new Date("2026-09-18T12:00:00.000Z");
  const trialStartedAt = new Date("2026-09-15T12:00:00.000Z");
  const trialEndsAt = new Date("2026-09-22T12:00:00.000Z");

  it("gives an active paid plan precedence over trial", () => {
    const access = resolveAccessState({
      assignedPlan: "agent",
      trialStartedAt,
      trialEndsAt,
      planStartedAt: new Date("2026-09-17T12:00:00.000Z"),
      planExpiresAt: new Date("2026-10-17T12:00:00.000Z"),
    }, now);
    assert.equal(access.accessMode, "paid");
    assert.equal(access.effectivePlan, "agent");
  });

  it("falls through to trial and then Free at exact expiry", () => {
    const base = {
      assignedPlan: "pro" as const,
      trialStartedAt,
      trialEndsAt,
      planStartedAt: null,
      planExpiresAt: null,
    };
    assert.deepEqual(resolveAccessState(base, now).accessMode, "trial");
    assert.equal(resolveAccessState(base, trialEndsAt).accessMode, "free");
    assert.equal(resolveAccessState(base, trialEndsAt).effectivePlan, "free");
  });
});
