import { db } from "@/lib/db";
import { profiles, portfolioSnapshots } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { moneySchema, prefsSchema } from "./validation";
import type { ActorContext } from "./types";

export async function getProfile(ctx: ActorContext) {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, ctx.userId)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    email: ctx.email,
    fullName: row.fullName,
    username: row.username,
    plan: row.plan,
    streak: row.streak,
    currency: row.currency,
    memberSince: row.memberSince,
    prefs: row.prefs,
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

export async function recordSnapshot(ctx: ActorContext, value: number) {
  const parsed = moneySchema.parse(value);
  const recent = await db
    .select({ capturedAt: portfolioSnapshots.capturedAt })
    .from(portfolioSnapshots)
    .where(eq(portfolioSnapshots.userId, ctx.userId))
    .orderBy(desc(portfolioSnapshots.capturedAt))
    .limit(1);
  if (recent[0] && Date.now() - recent[0].capturedAt.getTime() < 10 * 60 * 1000) return;
  await db.insert(portfolioSnapshots).values({ userId: ctx.userId, value: String(parsed) });
}
