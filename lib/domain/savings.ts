import { db } from "@/lib/db";
import { savingsBuckets } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { moneySchema, uuidSchema } from "./validation";
import { DomainError, DomainErrorCodes, type ActorContext } from "./types";

export type BucketDto = {
  id: string;
  name: string;
  icon: string;
  c: string;
  balance: number;
  target: number;
  apy: number;
};

export async function listSavingsBuckets(ctx: ActorContext): Promise<BucketDto[]> {
  const rows = await db
    .select()
    .from(savingsBuckets)
    .where(eq(savingsBuckets.userId, ctx.userId))
    .orderBy(asc(savingsBuckets.sort));
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    icon: b.icon,
    c: b.color,
    balance: Number(b.balance),
    target: Number(b.target),
    apy: Number(b.apy),
  }));
}

export async function setBucketBalance(ctx: ActorContext, bucketId: string, balance: number) {
  const id = uuidSchema.parse(bucketId);
  const [row] = await db
    .update(savingsBuckets)
    .set({ balance: String(moneySchema.parse(balance)) })
    .where(and(eq(savingsBuckets.id, id), eq(savingsBuckets.userId, ctx.userId)))
    .returning();
  if (!row) throw new DomainError(DomainErrorCodes.bucketNotFound, "bucket not found");
  return { id: row.id, balance: Number(row.balance) };
}
