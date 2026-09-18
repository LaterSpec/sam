import { isStepCount, streamText, type ModelMessage } from "ai";
import { sessionActor } from "@/lib/domain/session-context";
import { SAMY_MAX_STEPS, SAMY_USER_MESSAGE_MAX, SAMY_WRITE_TOOL_NAMES } from "./constants";
import { loadActiveMemories } from "./memories";
import { buildSamyToolSet, createSamyModel } from "./openai-tools";
import { buildSamySystemPrompt } from "./prompt";
import {
  createConversation,
  getOwnedConversation,
  insertMessage,
  loadRecentMessages,
  maybeSetTitle,
} from "./store";
import { isBlatantlyOffTopic, offTopicRefusal } from "./topic-guard";
import { reserveSamyMessage } from "@/lib/plans/usage";

type SessionUser = { id: string; email: string; name?: string | null };

export type SamyChatBody = {
  conversationId?: string | null;
  message?: string;
};

function encodeSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/** Finite POST SSE: the stream ends when the model turn finishes. Not a hanging GET keep-alive. */
function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function toModelMessages(
  history: Array<{ role: "user" | "assistant"; content: { text?: string } }>,
  userText: string
): ModelMessage[] {
  const messages: ModelMessage[] = [];
  for (const item of history) {
    const text = item.content.text?.trim();
    if (!text) continue;
    messages.push({ role: item.role, content: text });
  }
  messages.push({ role: "user", content: userText });
  return messages;
}

export async function runSamyChat(input: {
  sessionUser: SessionUser;
  fullName: string;
  language: "en" | "es";
  currency: string;
  timezone: string;
  body: SamyChatBody;
  abortSignal?: AbortSignal;
}): Promise<Response> {
  const rawMessage = typeof input.body.message === "string" ? input.body.message : "";
  const message = rawMessage.trim().slice(0, SAMY_USER_MESSAGE_MAX);
  if (!message) {
    return Response.json({ error: "message_required" }, { status: 400 });
  }

  const entitlement = await reserveSamyMessage(input.sessionUser.id);

  let conversationId = typeof input.body.conversationId === "string" ? input.body.conversationId : null;
  if (conversationId) {
    const owned = await getOwnedConversation(input.sessionUser.id, conversationId);
    if (!owned) conversationId = null;
  }
  if (!conversationId) {
    const created = await createConversation(input.sessionUser.id, message);
    conversationId = created.id;
  }

  const history = await loadRecentMessages(conversationId);
  const isFollowUp = history.length > 0;
  await maybeSetTitle(conversationId, message);

  if (isBlatantlyOffTopic(message, isFollowUp)) {
    const refusal = offTopicRefusal(input.language);
    await insertMessage({ conversationId, role: "user", content: { text: message } });
    await insertMessage({ conversationId, role: "assistant", content: { text: refusal } });
    const encoder = new TextEncoder();
    return sseResponse(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(encodeSse("meta", { conversationId })));
          controller.enqueue(encoder.encode(encodeSse("text-delta", { text: refusal })));
          controller.enqueue(encoder.encode(encodeSse("done", { conversationId })));
          controller.close();
        },
      })
    );
  }

  const memories = await loadActiveMemories(input.sessionUser.id);
  const actor = sessionActor({ user: { id: input.sessionUser.id, email: input.sessionUser.email } });
  const tools = buildSamyToolSet(actor, conversationId, entitlement.limits.mcpScopes);
  const model = createSamyModel();
  const system = buildSamySystemPrompt({
    fullName: input.fullName,
    language: input.language,
    currency: input.currency,
    timezone: input.timezone,
    memories,
  });

  await insertMessage({ conversationId, role: "user", content: { text: message } });

  const encoder = new TextEncoder();
  const timeout = AbortSignal.timeout(50_000);
  const abortSignal =
    input.abortSignal && typeof AbortSignal.any === "function"
      ? AbortSignal.any([timeout, input.abortSignal])
      : timeout;

  const result = streamText({
    model,
    system,
    messages: toModelMessages(history, message),
    tools,
    stopWhen: isStepCount(SAMY_MAX_STEPS),
    abortSignal,
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(encodeSse(event, data)));
      };
      send("meta", { conversationId });
      let fullText = "";
      const toolsUsed: string[] = [];
      let mutated = false;
      try {
        for await (const part of result.fullStream) {
          if (part.type === "text-delta") {
            fullText += part.text;
            send("text-delta", { text: part.text });
          } else if (part.type === "tool-call") {
            const name = "toolName" in part ? String(part.toolName) : "tool";
            toolsUsed.push(name);
            send("tool-call", { name });
            if (SAMY_WRITE_TOOL_NAMES.has(name)) mutated = true;
          } else if (part.type === "error") {
            send("error", { message: "model_error" });
          }
        }
        const text = fullText.trim();
        if (text) {
          await insertMessage({
            conversationId,
            role: "assistant",
            content: { text, toolsUsed: toolsUsed.length ? [...new Set(toolsUsed)] : undefined },
          });
        }
        if (mutated) send("finance_mutated", {});
        send("done", { conversationId });
      } catch {
        try {
          const fallback =
            input.language === "es"
              ? "No pude completar esa consulta. Inténtalo de nuevo."
              : "I could not complete that request. Try again.";
          if (!fullText.trim()) {
            await insertMessage({
              conversationId,
              role: "assistant",
              content: { text: fallback },
            });
            send("text-delta", { text: fallback });
          }
          send("error", { message: "stream_failed" });
        } catch {
          /* stream already closed */
        }
      } finally {
        controller.close();
      }
    },
  });

  return sseResponse(stream);
}
