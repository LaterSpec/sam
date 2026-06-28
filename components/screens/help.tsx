"use client";

import { useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useT } from "@/lib/i18n/i18n-context";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function HelpScreen({ state, setState }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const [query, setQuery] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const faqs = [
    {
      q: "Where is my data stored?",
      c: sam.yellow,
      a: "Your data lives in Neon Postgres behind the Cloudflare app — accounts, transactions, goals and budgets are tied to your user account.",
    },
    {
      q: "Is my data private?",
      c: sam.green,
      a: "Yes. Every record is scoped to your authenticated user id, so only your session can read or write your data.",
    },
    {
      q: "How do I add accounts and expenses?",
      c: sam.cyan,
      a: "Accounts → [+ create account] to add a cash or card balance. Expenses → [+ new expense] to log spending against a category.",
    },
    {
      q: "How do I connect SAM to AI tools (MCP)?",
      c: sam.cyan,
      a: "1) Profile → integrations → connect mcp → create a token (copy it, it is shown once). 2) In your AI client (Cursor, Claude, Hermes, OpenClaw...) add an MCP server with URL <your-app>/api/mcp and header Authorization: Bearer <your token>. 3) Reload the client and ask it about your finances. See docs/MCP.md for client-specific setup.",
    },
    {
      q: "How do I export my data?",
      c: sam.magenta,
      a: "Profile → data → export csv downloads all your transactions as a CSV file.",
    },
    {
      q: "How do I reset or delete my account?",
      c: sam.orange,
      a: "Profile → danger → delete account wipes your user and all owned rows. This cannot be undone.",
    },
  ];

  const filtered = query
    ? faqs.filter((f) => {
        const ql = query.toLowerCase();
        return (
          f.q.toLowerCase().includes(ql) ||
          f.a.toLowerCase().includes(ql) ||
          t(f.q).toLowerCase().includes(ql) ||
          t(f.a).toLowerCase().includes(ql)
        );
      })
    : faqs;

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["profile", "stats", "help", "settings"]} active="help" onChange={(t) => setState((s) => ({ ...s, profileTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Help" cmd="man sam" />
        <Comment>{t("search the product guide")}</Comment>
        <div
          style={{
            marginTop: 14,
            padding: "10px 12px",
            border: `1px solid ${sam.border}`,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Mono c={sam.green}>→</Mono>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("grep 'how to...'")}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: sam.text,
              fontFamily: sam.font,
              fontSize: 13,
            }}
          />
          {query && (
            <span onClick={() => setQuery("")} style={{ cursor: "pointer", color: sam.comment }}>
              ×
            </span>
          )}
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ FAQ
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{filtered.length}] ▾</span>
          </div>
          {filtered.length === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: sam.comment, textAlign: "center" }}>
              {`// ${t('no results for "{q}"', { q: query })}`}
            </div>
          )}
          {filtered.map((f, i) => {
            const isOpen = openFaq === i;
            const isLast = i === filtered.length - 1;
            return (
              <div
                key={i}
                onClick={() => setOpenFaq(isOpen ? null : i)}
                style={{ marginTop: 10, fontSize: 13, cursor: "pointer", padding: "4px 0" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <Mono c={sam.comment}>{isLast ? "└─" : "├─"}</Mono>
                  <Mono c={f.c}>?</Mono>
                  <Mono c={sam.text}>{t(f.q)}</Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={sam.comment}>{isOpen ? "▾" : "▸"}</Mono>
                </div>
                {isOpen && (
                  <div
                    style={{
                      marginTop: 6,
                      marginLeft: 26,
                      padding: "8px 10px",
                      fontSize: 12,
                      color: sam.textDim,
                      lineHeight: 1.5,
                      border: `1px solid ${sam.border}`,
                      background: sam.overlay,
                    }}
                  >
                    {t(f.a)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
