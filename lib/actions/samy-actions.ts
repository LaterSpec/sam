"use server";

import { requireSession } from "@/lib/auth/session";
import {
  createConversation,
  deleteConversation,
  getOwnedConversation,
  listConversations,
  loadRecentMessages,
} from "@/lib/samy/store";

export async function listSamyConversationsAction() {
  const session = await requireSession();
  return listConversations(session.user.id);
}

export async function loadSamyConversationAction(conversationId: string) {
  const session = await requireSession();
  const owned = await getOwnedConversation(session.user.id, conversationId);
  if (!owned) return null;
  const messages = await loadRecentMessages(conversationId);
  return {
    id: owned.id,
    title: owned.title,
    messages: messages.map((item) => ({
      id: item.id,
      role: item.role,
      text: item.content.text ?? "",
      toolsUsed: item.content.toolsUsed ?? [],
      progress: item.content.progress,
      elapsed: item.content.elapsed,
      failed: item.content.failed,
    })),
  };
}

export async function createSamyConversationAction() {
  const session = await requireSession();
  const row = await createConversation(session.user.id);
  return { id: row.id, title: row.title };
}

export async function deleteSamyConversationAction(conversationId: string) {
  const session = await requireSession();
  return deleteConversation(session.user.id, conversationId);
}
