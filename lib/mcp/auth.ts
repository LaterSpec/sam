import { db } from "@/lib/db";
import { mcpTokens, user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getCachedMcpAuth, setCachedMcpAuth } from "./auth-cache";
import type { AuthResult } from "./auth-result";
import { hashSecret, parseToken, timingSafeEqual } from "./token";
import { isValidScope } from "./scopes";

export type { AuthResult } from "./auth-result";

const LAST_USED_TOUCH_MS = 15 * 60 * 1000;

export type AuthenticateOptions = {
  /** When false, skip last_used writes (initialize / ping / tools/list). Default true. */
  touchLastUsed?: boolean;
  /** Reuse a short-lived auth result and skip Neon. For MCP keep-alives. */
  useCache?: boolean;
};

/**
 * Verifies an Authorization header / raw bearer token and returns an
 * ActorContext scoped to the owning user. Updates last-used metadata on success
 * unless `touchLastUsed` is false.
 */
export async function authenticate(
  authorization: string | null,
  ip: string | null,
  options: AuthenticateOptions = {}
): Promise<AuthResult> {
  if (!authorization) return { ok: false, status: 401, error: "missing_authorization" };

  const parsed = parseToken(authorization);
  if (!parsed) return { ok: false, status: 401, error: "invalid_token_format" };

  if (options.useCache) {
    const cached = await getCachedMcpAuth(authorization);
    if (cached) return cached;
  }

  const rows = await db
    .select({
      id: mcpTokens.id,
      userId: mcpTokens.userId,
      tokenHash: mcpTokens.tokenHash,
      scopes: mcpTokens.scopes,
      expiresAt: mcpTokens.expiresAt,
      revokedAt: mcpTokens.revokedAt,
      lastUsedAt: mcpTokens.lastUsedAt,
      email: userTable.email,
    })
    .from(mcpTokens)
    .innerJoin(userTable, eq(userTable.id, mcpTokens.userId))
    .where(eq(mcpTokens.publicPrefix, parsed.publicPrefix))
    .limit(1);

  const row = rows[0];
  let result: AuthResult;
  if (!row) {
    result = { ok: false, status: 401, error: "invalid_token" };
  } else {
    const candidateHash = await hashSecret(parsed.secret);
    if (!timingSafeEqual(candidateHash, row.tokenHash)) {
      result = { ok: false, status: 401, error: "invalid_token" };
    } else if (row.revokedAt) {
      result = { ok: false, status: 401, error: "token_revoked" };
    } else if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
      result = { ok: false, status: 401, error: "token_expired" };
    } else {
      result = {
        ok: true,
        ctx: {
          userId: row.userId,
          email: row.email,
          authMethod: "mcp_token",
          scopes: (row.scopes ?? []).filter(isValidScope),
          tokenId: row.id,
        },
      };
    }
  }

  if (options.useCache) {
    await setCachedMcpAuth(authorization, result).catch(() => undefined);
  }

  if (
    result.ok &&
    options.touchLastUsed !== false &&
    row &&
    (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() >= LAST_USED_TOUCH_MS)
  ) {
    try {
      await db
        .update(mcpTokens)
        .set({ lastUsedAt: new Date(), lastUsedIp: ip ?? undefined })
        .where(eq(mcpTokens.id, row.id));
    } catch {
      // ignore
    }
  }

  return result;
}
