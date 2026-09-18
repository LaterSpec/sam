"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, History, Plus, Trash2, X } from "lucide-react";
import { SamBrandIcon } from "@/components/ui/sam-brand-icon";
import {
  createSamyConversationAction,
  deleteSamyConversationAction,
  listSamyConversationsAction,
  loadSamyConversationAction,
} from "@/lib/actions/samy-actions";
import { firstNameFrom } from "@/lib/samy/prompt";
import { greetingPeriod } from "@/lib/samy/parse";
import type { DesktopCopy } from "../desktop-copy";
import { SamyMarkdown } from "./samy-markdown";

const CONVO_KEY_PREFIX = "samy.conversationId.";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolsUsed?: string[];
  pending?: boolean;
};

type HistoryRow = { id: string; title: string; updatedAt: Date | string };

function convoKey(userId: string) {
  return `${CONVO_KEY_PREFIX}${userId}`;
}

function readStoredConversationId(userId: string): string | null {
  try {
    return sessionStorage.getItem(convoKey(userId));
  } catch {
    return null;
  }
}

function writeStoredConversationId(userId: string, id: string | null) {
  try {
    if (id) sessionStorage.setItem(convoKey(userId), id);
    else sessionStorage.removeItem(convoKey(userId));
  } catch {
    /* ignore */
  }
}

async function readSse(
  response: Response,
  onEvent: (event: string, data: unknown) => void
) {
  if (!response.body) throw new Error("no stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      let event = "message";
      let dataLine = "";
      for (const line of chunk.split("\n")) {
        if (line.startsWith("event:")) event = line.slice(6).trim();
        if (line.startsWith("data:")) dataLine += line.slice(5).trim();
      }
      if (!dataLine) continue;
      try {
        onEvent(event, JSON.parse(dataLine) as unknown);
      } catch {
        onEvent(event, dataLine);
      }
    }
  }
}

export function SamyInspector({
  userId,
  userName,
  timezone,
  copy,
  onClose,
  onMutated,
}: {
  userId: string;
  userName: string;
  timezone: string;
  copy: DesktopCopy;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [usingTools, setUsingTools] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const firstName = firstNameFrom(userName);

  useEffect(() => {
    const stored = readStoredConversationId(userId);
    if (!stored) return;
    let cancelled = false;
    void loadSamyConversationAction(stored).then((loaded) => {
      if (cancelled || !loaded) return;
      setConversationId(loaded.id);
      setMessages(
        loaded.messages.map((item) => ({
          id: item.id,
          role: item.role,
          text: item.text,
          toolsUsed: item.toolsUsed,
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, usingTools, busy]);

  const selectConversation = useCallback(async (id: string) => {
    const loaded = await loadSamyConversationAction(id);
    if (!loaded) return;
    setConversationId(loaded.id);
    writeStoredConversationId(userId, loaded.id);
    setMessages(
      loaded.messages.map((item) => ({
        id: item.id,
        role: item.role,
        text: item.text,
        toolsUsed: item.toolsUsed,
      }))
    );
    setHistoryOpen(false);
    setError(null);
  }, [userId]);

  const startNew = useCallback(async () => {
    const created = await createSamyConversationAction();
    setConversationId(created.id);
    writeStoredConversationId(userId, created.id);
    setMessages([]);
    setHistoryOpen(false);
    setError(null);
  }, [userId]);

  const openHistory = useCallback(async () => {
    setHistoryOpen(true);
    setHistory(await listSamyConversationsAction());
  }, []);

  const removeConversation = useCallback(
    async (id: string) => {
      await deleteSamyConversationAction(id);
      setHistory((current) => current?.filter((row) => row.id !== id) ?? null);
      if (conversationId === id) {
        setConversationId(null);
        writeStoredConversationId(userId, null);
        setMessages([]);
      }
    },
    [conversationId, userId]
  );

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setError(null);
    setBusy(true);
    setUsingTools(false);
    const userMessageId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", text },
      { id: assistantId, role: "assistant", text: "", pending: true },
    ]);

    try {
      const response = await fetch("/api/samy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
        signal: abort.signal,
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string; message?: string; resetAt?: string | null } | null;
        const reset = payload?.resetAt
          ? ` Try again after ${new Date(payload.resetAt).toLocaleString()}.`
          : "";
        throw new Error(`${payload?.message ?? payload?.error ?? "send_failed"}${reset}`);
      }
      await readSse(response, (event, data) => {
        if (abort.signal.aborted) return;
        const payload = data as { conversationId?: string; text?: string; message?: string };
        if (event === "meta" && payload.conversationId) {
          setConversationId(payload.conversationId);
          writeStoredConversationId(userId, payload.conversationId);
        }
        if (event === "text-delta" && payload.text) {
          setUsingTools(false);
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? { ...item, text: item.text + payload.text, pending: false }
                : item
            )
          );
        }
        if (event === "tool-call") setUsingTools(true);
        if (event === "finance_mutated") onMutated();
        if (event === "error") setError(copy.samyError);
      });
    } catch (caught) {
      if (abort.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : copy.samyError);
      setMessages((current) => current.filter((item) => item.id !== assistantId || item.text));
    } finally {
      if (abort.signal.aborted) return;
      setBusy(false);
      setUsingTools(false);
      setMessages((current) =>
        current
          .map((item) => (item.id === assistantId ? { ...item, pending: false } : item))
          .filter((item) => item.id !== assistantId || item.text.trim().length > 0)
      );
    }
  }, [busy, conversationId, copy.samyError, draft, onMutated, userId]);

  const empty = messages.length === 0 && !busy;
  const period = greetingPeriod(new Date(), timezone);
  const hello =
    period === "morning" ? copy.samyHelloMorning : period === "afternoon" ? copy.samyHelloAfternoon : copy.samyHelloEvening;
  const prompts = [copy.samyPromptA, copy.samyPromptB, copy.samyPromptC];
  const prompt = prompts[Math.abs(firstName.length) % prompts.length].replaceAll("{name}", firstName);

  return (
    <aside className="desk-inspector is-open samy-panel" aria-label="Samy">
      <div className="desk-inspector-top">
        <span>
          <SamBrandIcon size={15} color="var(--desk-info)" />
          Samy
        </span>
        <div className="samy-top-actions">
          <button type="button" onClick={() => void openHistory()} aria-label={copy.samyHistory} title={copy.samyHistory}>
            <History size={16} />
          </button>
          <button type="button" onClick={onClose} aria-label={copy.close}>
            <X size={17} />
          </button>
        </div>
      </div>

      {historyOpen ? (
        <div className="samy-history">
          <div className="samy-history-bar">
            <button type="button" className="desk-text-button" onClick={() => setHistoryOpen(false)}>
              {copy.samyBack}
            </button>
            <button type="button" className="desk-secondary-button" onClick={() => void startNew()}>
              <Plus size={13} /> {copy.samyNewChat}
            </button>
          </div>
          <ul>
            {(history ?? []).length === 0 ? <li className="samy-history-empty">{copy.samyNoChats}</li> : null}
            {(history ?? []).map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => void selectConversation(row.id)}>
                  <strong>{row.title}</strong>
                  <small>{new Date(row.updatedAt).toLocaleString()}</small>
                </button>
                <button type="button" className="samy-history-delete" onClick={() => void removeConversation(row.id)} aria-label={copy.samyDeleteChat}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <div className="samy-thread" ref={threadRef}>
            {empty ? (
              <div className="samy-empty">
                <SamBrandIcon size={42} color="var(--desk-ink)" />
                <h2>{hello.replaceAll("{name}", firstName)}</h2>
                <p>{prompt}</p>
              </div>
            ) : (
              messages.map((item) => (
                <div key={item.id} className={`samy-bubble is-${item.role}`}>
                  {item.role === "assistant" && item.toolsUsed?.length ? (
                    <small className="samy-tool-note">{copy.samyUsingTools}</small>
                  ) : null}
                  {item.role === "assistant" && item.pending && !item.text && !usingTools ? (
                    <span className="samy-thinking" aria-label={copy.samyThinking}>
                      <i /><i /><i />
                    </span>
                  ) : item.role === "assistant" ? (
                    <SamyMarkdown text={item.text} />
                  ) : (
                    <p>{item.text}</p>
                  )}
                </div>
              ))
            )}
            {usingTools ? <div className="samy-tool-live">{copy.samyUsingTools}</div> : null}
            {error ? <p className="samy-error">{error}</p> : null}
          </div>
          <form
            className="samy-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              placeholder={copy.samyPlaceholder}
              rows={2}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !draft.trim()} aria-label={copy.samySend}>
              <ArrowUp size={16} />
            </button>
          </form>
        </>
      )}
    </aside>
  );
}
