import { db } from "@/lib/db";
import { mcpAuditLogs } from "@/lib/db/schema";
import type { ActorContext } from "@/lib/domain/types";

const SENSITIVE_KEYS = new Set(["notes", "password", "secret", "token"]);

/** Produces an audit-safe copy of tool input: drops sensitive keys, truncates strings. */
export function redactInput(input: unknown): unknown {
  if (input == null) return null;
  if (typeof input === "string") return input.length > 200 ? `${input.slice(0, 200)}…` : input;
  if (typeof input !== "object") return input;
  if (Array.isArray(input)) return input.slice(0, 50).map(redactInput);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] = "[redacted]";
      continue;
    }
    out[k] = redactInput(v);
  }
  return out;
}

export type AuditEntry = {
  ctx: ActorContext;
  toolName: string;
  input: unknown;
  resultStatus: "ok" | "error" | "denied";
  errorMessage?: string | null;
  requestId?: string | null;
};

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(mcpAuditLogs).values({
      userId: entry.ctx.userId,
      tokenId: entry.ctx.tokenId ?? null,
      toolName: entry.toolName,
      input: redactInput(entry.input) as Record<string, unknown>,
      resultStatus: entry.resultStatus,
      errorMessage: entry.errorMessage ?? null,
      requestId: entry.requestId ?? null,
    });
  } catch {
    // Auditing must never break a tool call.
  }
}
