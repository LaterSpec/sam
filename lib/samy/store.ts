import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  samyConversations,
  samyMessages,
  type SamyMessageContent,
} from "@/lib/db/schema";
import { SAMY_HISTORY_LIMIT, SAMY_RATE_LIMIT_PER_MINUTE, SAMY_TITLE_MAX } from "./constants";

export type StoredSamyMessage = {
  id: string;
  role: "user" | "assistant";
  content: SamyMessageContent;
  createdAt: Date;
};

function titleFromMessage(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (!compact) return "New chat";
  return compact.length <= SAMY_TITLE_MAX ? compact : `${compact.slice(0, SAMY_TITLE_MAX - 1)}…`;
}

export async function listConversations(userId: string) {
  return db
    .select({
      id: samyConversations.id,
      title: samyConversations.title,
      updatedAt: samyConversations.updatedAt,
    })
    .from(samyConversations)
    .where(eq(samyConversations.userId, userId))
    .orderBy(desc(samyConversations.updatedAt))
    .limit(50);
}

export async function getOwnedConversation(userId: string, conversationId: string) {
  const [row] = await db
    .select()
    .from(samyConversations)
    .where(and(eq(samyConversations.id, conversationId), eq(samyConversations.userId, userId)))
    .limit(1);
  return row ?? null;
}

export async function createConversation(userId: string, firstMessage?: string) {
  const [row] = await db
    .insert(samyConversations)
    .values({
      userId,
      title: firstMessage ? titleFromMessage(firstMessage) : "New chat",
    })
    .returning();
  return row;
}

export async function deleteConversation(userId: string, conversationId: string) {
  const deleted = await db
    .delete(samyConversations)
    .where(and(eq(samyConversations.id, conversationId), eq(samyConversations.userId, userId)))
    .returning({ id: samyConversations.id });
  return deleted.length > 0;
}

export async function loadRecentMessages(conversationId: string): Promise<StoredSamyMessage[]> {
  const rows = await db
    .select({
      id: samyMessages.id,
      role: samyMessages.role,
      content: samyMessages.content,
      createdAt: samyMessages.createdAt,
    })
    .from(samyMessages)
    .where(eq(samyMessages.conversationId, conversationId))
    .orderBy(desc(samyMessages.createdAt))
    .limit(SAMY_HISTORY_LIMIT);

  return rows
    .reverse()
    .filter((row): row is StoredSamyMessage => row.role === "user" || row.role === "assistant");
}

export async function insertMessage(input: {
  conversationId: string;
  role: "user" | "assistant";
  content: SamyMessageContent;
}) {
  const [row] = await db
    .insert(samyMessages)
    .values({
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
    })
    .returning();
  await db
    .update(samyConversations)
    .set({ updatedAt: new Date() })
    .where(eq(samyConversations.id, input.conversationId));
  return row;
}

export async function maybeSetTitle(conversationId: string, firstMessage: string) {
  const [row] = await db
    .select({ title: samyConversations.title })
    .from(samyConversations)
    .where(eq(samyConversations.id, conversationId))
    .limit(1);
  if (!row || row.title !== "New chat") return;
  await db
    .update(samyConversations)
    .set({ title: titleFromMessage(firstMessage), updatedAt: new Date() })
    .where(eq(samyConversations.id, conversationId));
}

export async function countRecentUserMessages(userId: string): Promise<number> {
  const since = new Date(Date.now() - 60_000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(samyMessages)
    .innerJoin(samyConversations, eq(samyMessages.conversationId, samyConversations.id))
    .where(
      and(
        eq(samyConversations.userId, userId),
        eq(samyMessages.role, "user"),
        gte(samyMessages.createdAt, since)
      )
    );
  return Number(row?.count ?? 0);
}

export function isRateLimited(count: number): boolean {
  return count >= SAMY_RATE_LIMIT_PER_MINUTE;
}
