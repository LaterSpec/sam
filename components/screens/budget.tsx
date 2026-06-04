"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BlockBar, TabBar } from "@/components/ui/sam-primitives";
import { updatePrefsAction } from "@/lib/actions/data-actions";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function BudgetScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const byCat: Record<string, number> = {};
  state.expenses.forEach((e) => {
    byCat[e.catKey] = (byCat[e.catKey] || 0) + e.amount;
  });

  const budgets = state.budgets;
  const totalCap = budgets.reduce((a, b) => a + b.cap, 0);
  const totalSpent = budgets.reduce((a, b) => a + (byCat[b.key] || 0), 0);

  const toggleRollover = () => {
    const rollover = !state.prefs.rollover;
    setState((s) => ({ ...s, prefs: { ...s.prefs, rollover } }));
    void updatePrefsAction({ ...state.prefs, rollover });
  };

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <TabBar tabs={["expenses", "income", "budget"]} active="budget" onChange={(t) => setState((s) => ({ ...s, expTab: t }))} />
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Budget" cmd="config --month" />
        <Comment>
          {budgets.length} envelopes · ${Math.max(0, totalCap - totalSpent).toLocaleString()} unallocated · rollover:{" "}
          {state.prefs.rollover ? "on" : "off"}
        </Comment>
        <div style={{ marginTop: 16, padding: 14, border: `1px solid ${sam.border}` }}>
          <div style={{ fontSize: 11, color: sam.comment }}>{`// budget · spent · remaining`}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            <Mono c={sam.yellow} b style={{ fontSize: 18 }}>
              ${totalCap.toLocaleString()}
            </Mono>
            <Mono c={sam.comment}>·</Mono>
            <Mono c={sam.red} b style={{ fontSize: 14 }}>
              ${totalSpent.toFixed(0)}
            </Mono>
            <Mono c={sam.comment}>·</Mono>
            <Mono c={sam.green} b style={{ fontSize: 14 }}>
              ${Math.max(0, totalCap - totalSpent).toFixed(0)}
            </Mono>
          </div>
          <div style={{ marginTop: 10 }}>
            <BlockBar pct={Math.min(100, Math.round((totalSpent / totalCap) * 100))} width={24} c={sam.yellow} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ Envelopes
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{budgets.length}] ▾</span>
          </div>
          <Comment>tap to adjust cap</Comment>
          {budgets.map((b) => {
            const spent = byCat[b.key] || 0;
            const pct = Math.min(200, Math.round((spent / b.cap) * 100));
            const warn = pct > 90;
            const over = pct > 100;
            const left = b.cap - spent;
            return (
              <div
                key={b.key}
                onClick={() => openSheet({ kind: "edit-budget", budget: b, spent })}
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  border: `1px solid ${over ? sam.red : sam.border}`,
                  background: warn ? "rgba(248,81,73,0.04)" : "transparent",
                  transition: "all 140ms",
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
                  <Mono>{b.icon}</Mono>
                  <Mono c={b.c} b>
                    {b.name}
                  </Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={over ? sam.red : left > 0 ? sam.green : sam.yellow} b>
                    ${Math.abs(left).toFixed(0)}
                  </Mono>
                  <Mono c={sam.comment}>{over ? "over" : "left"}</Mono>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
                  <BlockBar pct={Math.min(100, pct)} width={14} c={over ? sam.red : warn ? sam.yellow : b.c} />
                  <span style={{ color: sam.comment }}>
                    ${spent.toFixed(0)} / ${b.cap} · {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, display: "flex", alignItems: "baseline", gap: 8, fontSize: 13 }}>
          <Mono c={sam.comment}>├─</Mono>
          <Mono c={sam.text}>rollover unspent</Mono>
          <span style={{ flex: 1 }} />
          <span onClick={toggleRollover} style={{ cursor: "pointer" }}>
            <Mono c={state.prefs.rollover ? sam.cyan : sam.comment} b={state.prefs.rollover}>
              [{state.prefs.rollover ? "on" : "off"}]
            </Mono>
          </span>
        </div>
        <div style={{ marginTop: 16, fontSize: 14 }}>
          <Mono c={sam.green} b>[+ new envelope]</Mono>
        </div>
      </div>
    </div>
  );
}
