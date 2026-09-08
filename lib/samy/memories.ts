import { and, desc, eq, gt, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { samyMemories, type SamyMemoryKind } from "@/lib/db/schema";
import { DomainError } from "@/lib/domain/types";
import { SAMY_MEMORY_CONTENT_MAX, SAMY_MEMORY_LIMIT } from "./constants";

const KINDS = new Set<SamyMemoryKind>(["preference", "fact", "instruction", "insight"]);

function slugKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

export type MemoryRow = {
  key: string;
  kind: string;
  content: string;
  importance: number;
};

export async function loadActiveMemories(userId: string): Promise<MemoryRow[]> {
  const now = new Date();
  return db
    .select({
      key: samyMemories.key,
      kind: samyMemories.kind,
      content: samyMemories.content,
      importance: samyMemories.importance,
    })
    .from(samyMemories)
    .where(
      and(
        eq(samyMemories.userId, userId),
        or(isNull(samyMemories.expiresAt), gt(samyMemories.expiresAt, now))
      )
    )
    .orderBy(desc(samyMemories.importance), desc(samyMemories.updatedAt))
    .limit(SAMY_MEMORY_LIMIT);
}

export async function rememberMemory(input: {
  userId: string;
  key: string;
  kind: string;
  content: string;
  importance?: number;
  conversationId?: string;
}): Promise<MemoryRow> {
  const key = slugKey(input.key);
  if (!key) throw new DomainError("invalid_memory_key", "memory key is required");
  const kind = KINDS.has(input.kind as SamyMemoryKind) ? (input.kind as SamyMemoryKind) : "fact";
  const content = input.content.trim().slice(0, SAMY_MEMORY_CONTENT_MAX);
  if (!content) throw new DomainError("invalid_memory", "memory content is required");
  const importance = Math.min(5, Math.max(1, Math.trunc(input.importance ?? 3)));
  const now = new Date();

  const [row] = await db
    .insert(samyMemories)
    .values({
      userId: input.userId,
      key,
      kind,
      content,
      importance,
      sourceConversationId: input.conversationId ?? null,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [samyMemories.userId, samyMemories.key],
      set: {
        kind,
        content,
        importance,
        sourceConversationId: input.conversationId ?? null,
        updatedAt: now,
      },
    })
    .returning({
      key: samyMemories.key,
      kind: samyMemories.kind,
      content: samyMemories.content,
      importance: samyMemories.importance,
    });

  return row;
}

export async function forgetMemory(userId: string, key: string): Promise<{ deleted: boolean }> {
  const slug = slugKey(key);
  const deleted = await db
    .delete(samyMemories)
    .where(and(eq(samyMemories.userId, userId), eq(samyMemories.key, slug)))
    .returning({ id: samyMemories.id });
  return { deleted: deleted.length > 0 };
}

export async function recallMemories(userId: string, query: string): Promise<MemoryRow[]> {
  const needle = query.trim().slice(0, 120);
  if (!needle) return loadActiveMemories(userId);
  const pattern = `%${needle.replace(/[%_]/g, "")}%`;
  const now = new Date();
  return db
    .select({
      key: samyMemories.key,
      kind: samyMemories.kind,
      content: samyMemories.content,
      importance: samyMemories.importance,
    })
    .from(samyMemories)
    .where(
      and(
        eq(samyMemories.userId, userId),
        or(isNull(samyMemories.expiresAt), gt(samyMemories.expiresAt, now)),
        or(ilike(samyMemories.key, pattern), ilike(samyMemories.content, pattern))
      )
    )
    .orderBy(desc(samyMemories.importance), desc(samyMemories.updatedAt))
    .limit(10);
}
