export type PlanErrorCode =
  | "plan_required"
  | "plan_expired"
  | "trial_expired"
  | "quota_exceeded"
  | "rate_limited"
  | "resource_limit_reached"
  | "resource_locked";

export type PlanErrorPayload = {
  code: PlanErrorCode;
  feature: string;
  message: string;
  limit?: number | null;
  used?: number;
  resetAt?: string | null;
};

export class PlanError extends Error {
  readonly code: PlanErrorCode;
  readonly feature: string;
  readonly limit?: number | null;
  readonly used?: number;
  readonly resetAt?: Date | null;

  constructor(payload: Omit<PlanErrorPayload, "resetAt"> & { resetAt?: Date | null }) {
    super(payload.message);
    this.name = "PlanError";
    this.code = payload.code;
    this.feature = payload.feature;
    this.limit = payload.limit;
    this.used = payload.used;
    this.resetAt = payload.resetAt;
  }

  toPayload(): PlanErrorPayload {
    return {
      code: this.code,
      feature: this.feature,
      message: this.message,
      limit: this.limit,
      used: this.used,
      resetAt: this.resetAt?.toISOString() ?? null,
    };
  }
}

export function isPlanQuotaDatabaseError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("plan_quota_exceeded:");
}
