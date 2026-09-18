import { getSql } from "@/lib/db/sql";
import { PlanError, isPlanQuotaDatabaseError } from "./errors";
import { dayWindow, minuteWindow, monthWindow, type MeteringWindow } from "./time";
import { resolveEntitlements, trialUsageKey, type ResolvedEntitlements } from "./resolve";

export type UsageMetric =
  | "samy:minute"
  | "samy:day"
  | "samy:trial"
  | "samy:month"
  | "mcp:read:minute"
  | "mcp:write:minute"
  | "mcp:trial"
  | "mcp:month";

type Reservation = {
  subjectType: "user" | "token";
  subjectId: string;
  userId: string;
  metric: UsageMetric;
  windowKey: string;
  windowStart: string;
  windowEnd: string;
  limit: number;
  amount: number;
};

function reservation(
  entitlement: ResolvedEntitlements,
  input: {
    subjectType: "user" | "token";
    subjectId: string;
    userId: string;
    metric: UsageMetric;
    window: MeteringWindow;
    limit: number;
  }
): Reservation {
  return {
    ...input,
    windowKey: input.window.key,
    windowStart: input.window.start.toISOString(),
    windowEnd: input.window.end.toISOString(),
    amount: 1,
  };
}

async function reserve(specs: Reservation[], feature: string): Promise<void> {
  const sql = getSql();
  try {
    await sql.query("select * from reserve_plan_usage($1::jsonb)", [JSON.stringify(specs)]);
  } catch (error) {
    if (isPlanQuotaDatabaseError(error)) {
      const matched = specs.find((spec) =>
        error instanceof Error ? error.message.includes(spec.metric) : false
      );
      throw new PlanError({
        code: matched?.metric.endsWith(":minute") ? "rate_limited" : "quota_exceeded",
        feature,
        message: matched?.metric.endsWith(":minute")
          ? "Too many requests. Try again shortly."
          : "Your plan quota has been reached.",
        limit: matched?.limit,
        resetAt: matched ? new Date(matched.windowEnd) : null,
      });
    }
    throw error;
  }
}

function trialWindow(entitlement: ResolvedEntitlements): MeteringWindow {
  if (!entitlement.trialStartedAt || !entitlement.trialEndsAt) {
    throw new PlanError({
      code: "trial_expired",
      feature: "trial",
      message: "Your Pro trial has ended.",
    });
  }
  return {
    key: trialUsageKey(entitlement),
    start: entitlement.trialStartedAt,
    end: entitlement.trialEndsAt,
  };
}

export async function reserveSamyMessage(userId: string, now = new Date()) {
  const entitlement = await resolveEntitlements(userId, now);
  if (entitlement.accessMode === "free") {
    throw new PlanError({
      code: entitlement.trialEndsAt ? "trial_expired" : "plan_required",
      feature: "samy",
      message: "Samy AI requires an active trial, Pro, or Agent plan.",
    });
  }

  const specs: Reservation[] = [
    reservation(entitlement, {
      subjectType: "user",
      subjectId: userId,
      userId,
      metric: "samy:minute",
      window: minuteWindow(now, entitlement.meteringTimezone),
      limit: entitlement.limits.samyMessagesPerMinute,
    }),
  ];

  if (entitlement.accessMode === "trial") {
    specs.push(
      reservation(entitlement, {
        subjectType: "user",
        subjectId: userId,
        userId,
        metric: "samy:day",
        window: dayWindow(now, entitlement.meteringTimezone),
        limit: entitlement.limits.samyMessagesDailyHard ?? 10,
      }),
      reservation(entitlement, {
        subjectType: "user",
        subjectId: userId,
        userId,
        metric: "samy:trial",
        window: trialWindow(entitlement),
        limit: entitlement.limits.samyMessagesTrialTotal,
      })
    );
  } else {
    specs.push(
      reservation(entitlement, {
        subjectType: "user",
        subjectId: userId,
        userId,
        metric: "samy:month",
        window: monthWindow(now, entitlement.meteringTimezone),
        limit: entitlement.limits.samyMessagesMonthly,
      })
    );
  }
  await reserve(specs, "samy");
  return entitlement;
}

export async function reserveMcpToolCall(input: {
  userId: string;
  tokenId: string;
  write: boolean;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const entitlement = await resolveEntitlements(input.userId, now);
  const burstMetric: UsageMetric = input.write ? "mcp:write:minute" : "mcp:read:minute";
  const burstLimit = input.write ? 20 : 60;
  const specs: Reservation[] = [
    reservation(entitlement, {
      subjectType: "token",
      subjectId: input.tokenId,
      userId: input.userId,
      metric: burstMetric,
      window: minuteWindow(now, entitlement.meteringTimezone),
      limit: burstLimit,
    }),
  ];

  if (entitlement.accessMode === "trial") {
    specs.push(
      reservation(entitlement, {
        subjectType: "user",
        subjectId: input.userId,
        userId: input.userId,
        metric: "mcp:trial",
        window: trialWindow(entitlement),
        limit: entitlement.limits.mcpCallsTrialTotal,
      })
    );
  } else {
    const limit = entitlement.limits.mcpCallsMonthly;
    if (limit == null || limit <= 0) {
      throw new PlanError({
        code: "plan_required",
        feature: "mcp",
        message: "MCP is not available for this plan.",
      });
    }
    specs.push(
      reservation(entitlement, {
        subjectType: "user",
        subjectId: input.userId,
        userId: input.userId,
        metric: "mcp:month",
        window: monthWindow(now, entitlement.meteringTimezone),
        limit,
      })
    );
  }
  await reserve(specs, "mcp");
  return entitlement;
}
