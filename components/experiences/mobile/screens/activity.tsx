"use client";

import { useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useT, useI18n } from "@/lib/i18n/i18n-context";
import { currencySymbol, formatGroupedTotals, normalizeCurrency } from "@/lib/finance/currency";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function ActivityScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const { lang } = useI18n();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const income = (state.incomeTx || []).map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    type: "income" as const,
    icon: e.icon || "⬢",
    c: sam.green,
    tag: "income",
    day: e.occurred_at,
    currency: normalizeCurrency(
      e.currency ?? state.accounts.find((account) => account.id === e.accountId)?.currency
    ),
  }));
  const expenses = state.expenses.map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    type: "expense" as const,
    icon: e.icon,
    c: e.catColor,
    tag: e.category,
    day: e.occurred_at,
    currency: normalizeCurrency(
      e.currency ?? state.accounts.find((account) => account.id === e.accountId)?.currency
    ),
  }));
  let all = [...income, ...expenses];
  if (filter !== "all") all = all.filter((r) => r.type === filter.slice(0, -1));
  if (query) all = all.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));
  all.sort((a, b) => new Date(b.day).getTime() - new Date(a.day).getTime());

  const counts = {
    all: income.length + expenses.length,
    income: income.length,
    expenses: expenses.length,
  };

  const groups: Record<string, typeof all> = {};
  all.forEach((r) => {
    const d = new Date(r.day);
    const key = Number.isNaN(d.getTime()) ? "Unknown" : d.toISOString().slice(0, 10);
    (groups[key] = groups[key] || []).push(r);
  });
  const orderedDays = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const dayLabel = (key: string) =>
    key === "Unknown"
      ? t("Unknown")
      : new Date(`${key}T00:00:00`).toLocaleDateString(lang === "es" ? "es" : "en", {
          weekday: "short",
          month: "short",
          day: "numeric",
        });

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["home", "activity", "accounts"]} active="activity" onChange={(t) => setState((s) => ({ ...s, homeTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Activity" cmd="log --all" />
        <Comment>{t("{n} tx · filter live · tap to view", { n: counts.all })}</Comment>
        <div style={{ marginTop: 14, display: "flex", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
          {(["all", "income", "expenses"] as const).map((f) => (
            <span key={f} onClick={() => setFilter(f)} style={{ cursor: "pointer" }}>
              <Mono c={filter === f ? sam.yellow : sam.comment} b={filter === f}>
                [{t(f)}]
              </Mono>
              <Mono c={sam.comment} style={{ fontSize: 10 }}>
                {" "}
                {counts[f]}
              </Mono>
            </span>
          ))}
        </div>
        <div
          style={{
            marginTop: 12,
            padding: "8px 10px",
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
            placeholder={t("grep tx ...")}
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
        {orderedDays.length === 0 && (
          <div style={{ marginTop: 24, fontSize: 12, color: sam.comment, textAlign: "center" }}>
            {`// ${t('no matches for "{q}"', { q: query })}`}
          </div>
        )}
        {orderedDays.map((day) => {
          const rows = groups[day];
          const expanded = !!expandedDays[day];
          const visibleRows = expanded ? rows : rows.slice(0, 3);
          const netByCurrency = formatGroupedTotals(
            rows.map((row) => ({
              amount: row.type === "income" ? row.amount : -row.amount,
              currency: row.currency,
            })),
            { decimals: 0 }
          );
          return (
            <div key={day} style={{ marginTop: 18 }}>
              <div
                onClick={() => setExpandedDays((s) => ({ ...s, [day]: !s[day] }))}
                style={{ fontSize: 12, color: sam.cyan, fontWeight: 600, cursor: "pointer" }}
              >
                ▸ {dayLabel(day)}
                <span style={{ float: "right", color: sam.comment, fontWeight: 400 }}>
                  [{rows.length}] {expanded ? "▴" : "▾"} · {netByCurrency}
                </span>
              </div>
              {visibleRows.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    const tx =
                      r.type === "expense"
                        ? state.expenses.find((e) => e.id === r.id)
                        : state.incomeTx.find((e) => e.id === r.id);
                    if (tx) openSheet({ kind: "tx", tx });
                  }}
                  style={{ marginTop: 10, fontSize: 13, cursor: "pointer", padding: "4px 6px", marginLeft: -6, marginRight: -6 }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <Mono c={r.type === "income" ? sam.green : sam.red} b>
                      {r.type === "income" ? "[+]" : "[-]"}
                    </Mono>
                    <Mono c={r.c}>{r.icon}</Mono>
                    <Mono c={sam.text} b>{r.name}</Mono>
                    <span style={{ flex: 1 }} />
                    <Mono c={r.type === "income" ? sam.green : sam.red} b>
                      {r.type === "income" ? "+" : "-"}{currencySymbol(r.currency)}{r.amount.toFixed(2)}
                    </Mono>
                  </div>
                  <div style={{ paddingLeft: 26, color: sam.comment, fontSize: 11 }}>{`// ${r.tag}`}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
