import { db } from "@/lib/db";
import { mcpTokens, user as userTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ActorContext } from "@/lib/domain/types";
import { hashSecret, parseToken, timingSafeEqual } from "./token";

export type AuthResult =
  | { ok: true; ctx: ActorContext }
  | { ok: false; status: 401; error: string };

/**
 * Verifies an Authorization header / raw bearer token and returns an
 * ActorContext scoped to the owning user. Updates last-used metadata on success.
 */
export async function authenticate(
  authorization: string | null,
  ip: string | null
): Promise<AuthResult> {
  if (!authorization) return { ok: false, status: 401, error: "missing_authorization" };

  const parsed = parseToken(authorization);
  if (!parsed) return { ok: false, status: 401, error: "invalid_token_format" };

  const rows = await db
    .select({
      id: mcpTokens.id,
      userId: mcpTokens.userId,
      tokenHash: mcpTokens.tokenHash,
      scopes: mcpTokens.scopes,
      expiresAt: mcpTokens.expiresAt,
      revokedAt: mcpTokens.revokedAt,
      email: userTable.email,
    })
    .from(mcpTokens)
    .innerJoin(userTable, eq(userTable.id, mcpTokens.userId))
    .where(eq(mcpTokens.publicPrefix, parsed.publicPrefix))
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, status: 401, error: "invalid_token" };

  const candidateHash = await hashSecret(parsed.secret);
  if (!timingSafeEqual(candidateHash, row.tokenHash)) {
    return { ok: false, status: 401, error: "invalid_token" };
  }
  if (row.revokedAt) return { ok: false, status: 401, error: "token_revoked" };
  if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
    return { ok: false, status: 401, error: "token_expired" };
  }

  // Best-effort last-used metadata; never block auth on this write.
  try {
    await db
      .update(mcpTokens)
      .set({ lastUsedAt: new Date(), lastUsedIp: ip ?? undefined })
      .where(eq(mcpTokens.id, row.id));
  } catch {
    // ignore
  }

  return {
    ok: true,
    ctx: {
      userId: row.userId,
      email: row.email,
      authMethod: "mcp_token",
      scopes: row.scopes ?? [],
      tokenId: row.id,
    },
  };
}
