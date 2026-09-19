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
import { ThoughtLine } from "./thought-line";
import { updateToolProgress, type ToolProgress } from "@/lib/samy/progress";
import { readSamySse } from "@/lib/samy/sse";

const CONVO_KEY_PREFIX = "samy.conversationId.";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolsUsed?: string[];
  pending?: boolean;
  progress?: ToolProgress[];
  elapsed?: number;
  failed?: boolean;
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

export function SamyInspector({
  userId,
  userName,
  timezone,
  language,
  copy,
  onClose,
  onMutated,
}: {
  userId: string;
  userName: string;
  timezone: string;
  language: "es" | "en";
  copy: DesktopCopy;
  onClose: () => void;
  onMutated: () => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const followThread = useRef(true);
  const interactionVersion = useRef(0);
  const firstName = firstNameFrom(userName);

  useEffect(() => {
    const stored = readStoredConversationId(userId);
    if (!stored) return;
    let cancelled = false;
    const version = interactionVersion.current;
    void loadSamyConversationAction(stored).then((loaded) => {
      if (cancelled || !loaded || version !== interactionVersion.current) return;
      setConversationId(loaded.id);
      setMessages(
        loaded.messages.map((item) => ({
          id: item.id,
          role: item.role,
          text: item.text,
          toolsUsed: item.toolsUsed,
          progress: item.progress,
          elapsed: item.elapsed,
          failed: item.failed,
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
    if (followThread.current) threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight });
  }, [messages, busy]);

  const selectConversation = useCallback(async (id: string) => {
    interactionVersion.current += 1;
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
        progress: item.progress,
        elapsed: item.elapsed,
        failed: item.failed,
      }))
    );
    setHistoryOpen(false);
    setError(null);
  }, [userId]);

  const startNew = useCallback(async () => {
    interactionVersion.current += 1;
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
    interactionVersion.current += 1;
    setDraft("");
    setError(null);
    setBusy(true);
    followThread.current = true;
    const startedAt = performance.now();
    let finished = false;
    let mutatedInTurn = false;
    const userMessageId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;
    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", text },
      { id: assistantId, role: "assistant", text: "", pending: true, progress: [] },
    ]);

    try {
      const response = await fetch("/api/samy/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
        signal: abort.signal,
      });
      if (!response.ok) {
        if (response.status === 503 || response.status === 504 || response.status === 502) {
          throw new Error(copy.samyError);
        }
        const payload = (await response.json().catch(() => null)) as { error?: string; message?: string; resetAt?: string | null } | null;
        const reset = payload?.resetAt
          ? ` Try again after ${new Date(payload.resetAt).toLocaleString()}.`
          : "";
        throw new Error(`${payload?.message ?? payload?.error ?? copy.samyError}${reset}`);
      }
      await readSamySse(response, (event, data) => {
        if (abort.signal.aborted) return;
        if (!data || typeof data !== "object") return;
        const payload = data as { conversationId?: string; text?: string; message?: string; id?: string; name?: string; status?: ToolProgress["status"]; elapsed?: number; failed?: boolean };
        if (event === "meta" && payload.conversationId) {
          setConversationId(payload.conversationId);
          writeStoredConversationId(userId, payload.conversationId);
        }
        if (event === "text-delta" && payload.text) {
          setMessages((current) =>
            current.map((item) =>
              item.id === assistantId
                ? { ...item, text: item.text + payload.text }
                : item
            )
          );
        }
        if ((event === "tool-call" || event === "tool-result") && payload.id && payload.name) {
          const step: ToolProgress = { id: payload.id, name: payload.name, status: event === "tool-call" ? "running" : payload.status ?? "error" };
          setMessages(current => current.map(item => item.id === assistantId ? { ...item, progress: updateToolProgress(item.progress ?? [], step) } : item));
        }
        if (event === "done") {
          finished = true;
          setMessages(current => current.map(item => item.id === assistantId ? { ...item, elapsed: payload.elapsed, failed: item.failed || payload.failed } : item));
        }
        if (event === "finance_mutated") mutatedInTurn = true;
        if (event === "error") {
          setError(copy.samyError);
          setMessages(current => current.map(item => item.id === assistantId ? { ...item, failed: true } : item));
        }
      });
      if (!finished) throw new Error(copy.samyError);
      if (mutatedInTurn) {
        try {
          onMutated();
        } catch {
          /* hydration errors handled safely */
        }
      }
    } catch (caught) {
      if (abort.signal.aborted) return;
      setError(caught instanceof Error ? caught.message : copy.samyError);
      setMessages(current => current.map(item => item.id === assistantId ? { ...item, failed: true } : item));
      if (mutatedInTurn) {
        try {
          onMutated();
        } catch {
          /* ignore */
        }
      }
    } finally {
      if (abort.signal.aborted) return;
      setBusy(false);
      setMessages((current) =>
        current
          .map((item) => (item.id === assistantId ? { ...item, pending: false, elapsed: item.elapsed ?? (performance.now() - startedAt) / 1000, progress: item.progress?.map(step => step.status === "running" ? { ...step, status: "interrupted" as const } : step) } : item))
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
          <button type="button" disabled={busy} onClick={() => void openHistory()} aria-label={copy.samyHistory} title={copy.samyHistory}>
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
                  <strong title={row.title}>{row.title}</strong>
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
          <div className="samy-thread" ref={threadRef} onScroll={event => {
            const node = event.currentTarget;
            followThread.current = node.scrollHeight - node.scrollTop - node.clientHeight < 64;
          }}>
            {empty ? (
              <div className="samy-empty">
                <SamBrandIcon size={42} color="var(--desk-ink)" />
                <h2>{hello.replaceAll("{name}", firstName)}</h2>
                <p>{prompt}</p>
              </div>
            ) : (
              messages.map((item) => (
                <div key={item.id} className={`samy-bubble is-${item.role}`}>
                  {item.role === "assistant" && item.progress === undefined && item.toolsUsed?.length ? (
                    <small className="samy-tool-note">{copy.samyUsingTools}</small>
                  ) : null}
                  {item.role === "assistant" && item.progress !== undefined && <ThoughtLine working={Boolean(item.pending)} steps={item.progress} language={language} phase={item.text ? "responding" : "preparing"} elapsed={item.elapsed} failed={item.failed}/>}
                  {item.role === "assistant" ? (
                    <SamyMarkdown text={item.text} />
                  ) : (
                    <p>{item.text}</p>
                  )}
                </div>
              ))
            )}
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
