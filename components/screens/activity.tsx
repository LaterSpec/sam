"use client";

import { useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar } from "@/components/ui/sam-primitives";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function ActivityScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const income = (state.incomeTx || []).map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    type: "income" as const,
    icon: e.icon || "⬢",
    c: sam.green,
    tag: "income",
    day: e.time,
  }));
  const expenses = state.expenses.map((e) => ({
    id: e.id,
    name: e.name,
    amount: e.amount,
    type: "expense" as const,
    icon: e.icon,
    c: e.catColor,
    tag: e.category,
    day: e.time,
  }));
  let all = [...income, ...expenses];
  if (filter !== "all") all = all.filter((r) => r.type === filter.slice(0, -1));
  if (query) all = all.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()));

  const counts = {
    all: income.length + expenses.length,
    income: income.length,
    expenses: expenses.length,
  };

  const groups: Record<string, typeof all> = {};
  all.forEach((r) => {
    (groups[r.day] = groups[r.day] || []).push(r);
  });
  const orderedDays = Object.keys(groups);

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <TabBar tabs={["home", "activity", "accounts"]} active="activity" onChange={(t) => setState((s) => ({ ...s, homeTab: t }))} />
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Activity" cmd="log --all" />
        <Comment>{counts.all} tx · filter live · tap to view</Comment>
        <div style={{ marginTop: 14, display: "flex", gap: 8, fontSize: 12, flexWrap: "wrap" }}>
          {(["all", "income", "expenses"] as const).map((f) => (
            <span key={f} onClick={() => setFilter(f)} style={{ cursor: "pointer" }}>
              <Mono c={filter === f ? sam.yellow : sam.comment} b={filter === f}>
                [{f}]
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
            placeholder="grep tx ..."
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
            {`// no matches for "${query}"`}
          </div>
        )}
        {orderedDays.map((day) => {
          const rows = groups[day];
          const net = rows.reduce((a, r) => a + (r.type === "income" ? r.amount : -r.amount), 0);
          return (
            <div key={day} style={{ marginTop: 18 }}>
              <div style={{ fontSize: 12, color: sam.cyan, fontWeight: 600 }}>
                ▸ {day}
                <span style={{ float: "right", color: net >= 0 ? sam.green : sam.comment, fontWeight: 400 }}>
                  {net >= 0 ? "+" : "-"}${Math.abs(net).toFixed(0)}
                </span>
              </div>
              {rows.map((r) => (
                <div
                  key={r.id}
                  onClick={() =>
                    r.type === "expense"
                      ? openSheet({ kind: "tx", tx: state.expenses.find((e) => e.id === r.id)! })
                      : openSheet({ kind: "income-src", src: r })
                  }
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
                      {r.type === "income" ? "+" : "-"}${r.amount.toFixed(2)}
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
