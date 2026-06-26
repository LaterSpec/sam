"use server";

import { db } from "@/lib/db";
import { mcpTokens } from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { requireSession } from "@/lib/auth/session";
import { generateToken } from "@/lib/mcp/token";
import { DEFAULT_SCOPES, isValidScope, type Scope } from "@/lib/mcp/scopes";
import { z } from "zod";

const tokenNameSchema = z.string().trim().min(1).max(60);

export type McpTokenSummary = {
  id: string;
  name: string;
  publicPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

function sanitizeScopes(scopes?: string[]): Scope[] {
  if (!scopes || scopes.length === 0) return DEFAULT_SCOPES;
  const valid = scopes.filter(isValidScope);
  return valid.length > 0 ? Array.from(new Set(valid)) : DEFAULT_SCOPES;
}

export async function listMcpTokensAction(): Promise<McpTokenSummary[]> {
  const session = await requireSession();
  const rows = await db
    .select()
    .from(mcpTokens)
    .where(eq(mcpTokens.userId, session.user.id))
    .orderBy(desc(mcpTokens.createdAt));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    publicPrefix: r.publicPrefix,
    scopes: r.scopes ?? [],
    createdAt: r.createdAt.toISOString(),
    lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    revokedAt: r.revokedAt ? r.revokedAt.toISOString() : null,
  }));
}

export async function createMcpTokenAction(input: {
  name: string;
  scopes?: string[];
  expiresInDays?: number;
}): Promise<{ token: string; summary: McpTokenSummary }> {
  const session = await requireSession();
  const name = tokenNameSchema.parse(input.name);
  const scopes = sanitizeScopes(input.scopes);
  const expiresAt =
    input.expiresInDays && input.expiresInDays > 0
      ? new Date(Date.now() + Math.min(input.expiresInDays, 3650) * 864e5)
      : null;

  const { token, publicPrefix, tokenHash } = await generateToken();

  const [row] = await db
    .insert(mcpTokens)
    .values({
      userId: session.user.id,
      name,
      publicPrefix,
      tokenHash,
      scopes,
      expiresAt,
    })
    .returning();

  return {
    token,
    summary: {
      id: row.id,
      name: row.name,
      publicPrefix: row.publicPrefix,
      scopes: row.scopes ?? [],
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: null,
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      revokedAt: null,
    },
  };
}

export async function revokeMcpTokenAction(id: string): Promise<{ ok: true }> {
  const session = await requireSession();
  const tokenId = z.string().uuid().parse(id);
  await db
    .update(mcpTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(mcpTokens.id, tokenId), eq(mcpTokens.userId, session.user.id)));
  return { ok: true };
}
