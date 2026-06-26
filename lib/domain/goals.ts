import { db } from "@/lib/db";
import { goals } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { moneySchema, shortTextSchema, uuidSchema, colorSchema, cleanName } from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";

export type GoalDto = {
  id: string;
  name: string;
  target: number;
  saved: number;
  eta: string | null;
  icon: string;
  c: string;
  done: boolean;
};

export async function listGoals(ctx: ActorContext): Promise<GoalDto[]> {
  const rows = await db
    .select()
    .from(goals)
    .where(eq(goals.userId, ctx.userId))
    .orderBy(asc(goals.sort));
  return rows.map((g) => ({
    id: g.id,
    name: g.name,
    target: Number(g.target),
    saved: Number(g.saved),
    eta: g.eta,
    icon: g.icon,
    c: g.color,
    done: g.done,
  }));
}

export async function createGoal(
  ctx: ActorContext,
  input: { name: string; target: number; icon?: string; color?: string }
): Promise<GoalDto> {
  const name = shortTextSchema.parse(input.name);
  const target = moneySchema.parse(input.target);
  const [row] = await db
    .insert(goals)
    .values({
      userId: ctx.userId,
      name,
      target: String(target),
      saved: "0",
      icon: input.icon || "◆",
      color: colorSchema.parse(input.color) || "#58a6ff",
      eta: "tbd",
    })
    .returning();
  return {
    id: row.id,
    name: row.name,
    target: Number(row.target),
    saved: 0,
    eta: row.eta,
    icon: row.icon,
    c: row.color,
    done: row.done,
  };
}

export async function updateGoal(
  ctx: ActorContext,
  input: { id: string; name?: string; target?: number; icon?: string; color?: string }
): Promise<GoalDto> {
  const uid = ctx.userId;
  const goalId = uuidSchema.parse(input.id);
  const patch: { name?: string; target?: string; icon?: string; color?: string } = {};
  if (input.name != null) patch.name = cleanName(input.name);
  if (input.target != null) patch.target = String(moneySchema.parse(input.target));
  if (input.icon != null) patch.icon = input.icon;
  if (input.color != null) patch.color = colorSchema.parse(input.color);

  const [row] = await db
    .update(goals)
    .set(patch)
    .where(and(eq(goals.id, goalId), eq(goals.userId, uid)))
    .returning();
  if (!row) throw new DomainError(DomainErrorCodes.goalNotFound, "goal not found");
  const saved = Number(row.saved);
  const target = Number(row.target);
  if (row.done !== saved >= target) {
    await db
      .update(goals)
      .set({ done: saved >= target })
      .where(and(eq(goals.id, goalId), eq(goals.userId, uid)));
  }
  return {
    id: row.id,
    name: row.name,
    target,
    saved,
    eta: row.eta,
    icon: row.icon,
    c: row.color,
    done: saved >= target,
  };
}

export async function setGoalSaved(ctx: ActorContext, goalId: string, saved: number) {
  const uid = ctx.userId;
  const id = uuidSchema.parse(goalId);
  const nextSaved = moneySchema.parse(saved);
  const [goal] = await db
    .select({ target: goals.target })
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, uid)))
    .limit(1);
  if (!goal) throw new DomainError(DomainErrorCodes.goalNotFound, "goal not found");
  const cappedSaved = Math.min(nextSaved, Number(goal.target));
  await db
    .update(goals)
    .set({ saved: String(cappedSaved), done: cappedSaved >= Number(goal.target) })
    .where(and(eq(goals.id, id), eq(goals.userId, uid)));
  return { id, saved: cappedSaved, done: cappedSaved >= Number(goal.target) };
}
