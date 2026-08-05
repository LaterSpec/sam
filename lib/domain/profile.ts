import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { prefsSchema } from "./validation";
import type { ActorContext } from "./types";

export async function getProfile(ctx: ActorContext) {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, ctx.userId)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: ctx.email,
    fullName: row.fullName,
    username: row.username,
    currency: row.currency,
    memberSince: row.memberSince,
    prefs: prefsSchema.parse(row.prefs),
    capabilities: ctx.scopes,
  };
}

export async function updateUsername(ctx: ActorContext, username: string) {
  const clean = username.trim();
  if (!clean || /\s/.test(clean)) throw new Error("username cannot contain spaces");
  const [row] = await db
    .update(profiles)
    .set({ username: clean })
    .where(eq(profiles.id, ctx.userId))
    .returning({ username: profiles.username });
  return { username: row?.username ?? clean };
}

export async function updatePrefs(ctx: ActorContext, prefs: Record<string, unknown>) {
  // Merge over current prefs so partial updates (e.g. only `theme`) don't reset
  // the rest to schema defaults.
  const [row] = await db
    .select({ prefs: profiles.prefs })
    .from(profiles)
    .where(eq(profiles.id, ctx.userId))
    .limit(1);
  const current = (row?.prefs as Record<string, unknown>) ?? {};
  const parsed = prefsSchema.parse({ ...current, ...prefs });
  await db.update(profiles).set({ prefs: parsed }).where(eq(profiles.id, ctx.userId));
  return parsed;
}
