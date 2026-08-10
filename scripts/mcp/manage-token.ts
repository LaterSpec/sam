/**
 * Create / list / revoke MCP tokens for the sole (or selected) SAM user.
 *
 * Usage:
 *   npx tsx scripts/mcp/manage-token.ts list
 *   npx tsx scripts/mcp/manage-token.ts create --name "hermes" [--all-scopes] [--days 90] [--allow-empty-pepper]
 *   npx tsx scripts/mcp/manage-token.ts revoke --id <uuid>
 *   npx tsx scripts/mcp/manage-token.ts revoke --prefix <public_prefix>
 *
 * Prints the raw token once on create. Never commit that value.
 * Create requires MCP_TOKEN_PEPPER unless --allow-empty-pepper (local-only).
 */
import { config } from "dotenv";
import { and, desc, eq, isNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { mcpTokens, user } from "../../lib/db/schema";
import { generateToken } from "../../lib/mcp/token";
import { ALL_SCOPES, DEFAULT_SCOPES } from "../../lib/mcp/scopes";

config({ path: ".env.local", quiet: true });

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const cmd = process.argv[2];
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  if (!process.env.MCP_TOKEN_PEPPER) {
    console.warn("warning: MCP_TOKEN_PEPPER empty — production must use the same pepper");
  }

  const sql = neon(databaseUrl);
  const db = drizzle(sql);

  const users = await db.select({ id: user.id, email: user.email, name: user.name }).from(user);
  if (users.length === 0) throw new Error("no users in database");
  if (users.length > 1 && !arg("--user")) {
    console.error("multiple users; pass --user <id|email>");
    for (const u of users) console.error(`  ${u.id}  ${u.email}`);
    process.exit(1);
  }
  const userKey = arg("--user");
  const selected =
    users.length === 1
      ? users[0]
      : users.find((u) => u.id === userKey || u.email === userKey);
  if (!selected) throw new Error(`user not found: ${userKey}`);

  if (cmd === "list") {
    const rows = await db
      .select()
      .from(mcpTokens)
      .where(eq(mcpTokens.userId, selected.id))
      .orderBy(desc(mcpTokens.createdAt));
    console.log(JSON.stringify({ user: selected, tokens: rows.map((r) => ({
      id: r.id,
      name: r.name,
      publicPrefix: r.publicPrefix,
      scopes: r.scopes,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt,
      expiresAt: r.expiresAt,
      revokedAt: r.revokedAt,
    })) }, null, 2));
    return;
  }

  if (cmd === "create") {
    if (!process.env.MCP_TOKEN_PEPPER && !hasFlag("--allow-empty-pepper")) {
      throw new Error(
        "MCP_TOKEN_PEPPER is empty; set it in .env.local (must match production) or pass --allow-empty-pepper for local-only tokens"
      );
    }
    const name = arg("--name") ?? `cli-${new Date().toISOString().slice(0, 10)}`;
    const scopes = hasFlag("--all-scopes") ? [...ALL_SCOPES] : [...DEFAULT_SCOPES];
    const days = arg("--days") ? Number(arg("--days")) : undefined;
    const expiresAt =
      days && days > 0 ? new Date(Date.now() + Math.min(days, 3650) * 864e5) : null;

    const { token, publicPrefix, tokenHash } = await generateToken();
    const [row] = await db
      .insert(mcpTokens)
      .values({
        userId: selected.id,
        name,
        publicPrefix,
        tokenHash,
        scopes,
        expiresAt,
      })
      .returning();

    console.log(
      JSON.stringify(
        {
          user: { id: selected.id, email: selected.email },
          summary: {
            id: row.id,
            name: row.name,
            publicPrefix: row.publicPrefix,
            scopes: row.scopes,
            expiresAt: row.expiresAt,
          },
          token,
          hint: "export SAM_MCP_TOKEN with this value; shown only once",
        },
        null,
        2
      )
    );
    return;
  }

  if (cmd === "revoke") {
    const id = arg("--id");
    const prefix = arg("--prefix");
    if (!id && !prefix) throw new Error("pass --id <uuid> or --prefix <public_prefix>");

    const updated = await db
      .update(mcpTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(mcpTokens.userId, selected.id),
          isNull(mcpTokens.revokedAt),
          id ? eq(mcpTokens.id, id) : eq(mcpTokens.publicPrefix, prefix!)
        )
      )
      .returning({ id: mcpTokens.id, name: mcpTokens.name, publicPrefix: mcpTokens.publicPrefix });

    if (updated.length === 0) throw new Error("no active token matched");
    console.log(JSON.stringify({ revoked: updated }, null, 2));
    return;
  }

  console.error(
    "usage: list | create --name N [--all-scopes] [--days N] [--allow-empty-pepper] | revoke --id|--prefix"
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
