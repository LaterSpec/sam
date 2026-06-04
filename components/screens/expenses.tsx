"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BlockBar, TabBar } from "@/components/ui/sam-primitives";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function ExpensesScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const cats = (state.budgets || []).map((b) => ({
    key: b.key,
    icon: b.icon,
    name: b.name,
    budget: b.cap,
    c: b.c,
  }));
  const byCat: Record<string, number> = {};
  state.expenses.forEach((e) => {
    byCat[e.catKey] = (byCat[e.catKey] || 0) + e.amount;
  });
  const txByCat: Record<string, number> = {};
  state.expenses.forEach((e) => {
    txByCat[e.catKey] = (txByCat[e.catKey] || 0) + 1;
  });

  const totalSpent = state.expenses.reduce((a, e) => a + e.amount, 0);
  const monthTarget = (state.budgets || []).reduce((a, b) => a + b.cap, 0) || 1;
  const days = [
    { d: "Mon", n: 13, pct: 30 },
    { d: "Tue", n: 14, pct: 70 },
    { d: "Wed", n: 15, pct: 45 },
    { d: "Thu", n: 16, pct: 90 },
    { d: "Fri", n: 17, pct: 60 },
    { d: "Sat", n: 18, pct: 20 },
    { d: "Sun", n: 19, pct: 55 },
  ];

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <TabBar tabs={["expenses", "income", "budget"]} active={state.expTab} onChange={(t) => setState((s) => ({ ...s, expTab: t }))} />
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Expenses" cmd="list --month" />
        <Comment>
          {totalSpent.toFixed(0)} logged across {state.expenses.length} tx. on pace.
        </Comment>
        <div style={{ marginTop: 12, color: sam.comment, fontSize: 12 }}>📊 April 2026</div>
        <div style={{ fontSize: 13, marginTop: 2 }}>
          <Mono c={sam.red} b>-${totalSpent.toFixed(0)}</Mono>
          <Mono c={sam.comment}> of </Mono>
          <Mono c={sam.yellow}>${monthTarget.toLocaleString()}</Mono>
          <Mono c={sam.comment}> · </Mono>
          <Mono c={sam.green}>${Math.max(0, monthTarget - totalSpent).toFixed(0)} left</Mono>
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 4, alignItems: "flex-end", fontSize: 11 }}>
          <div style={{ color: sam.comment, alignSelf: "center" }}>◂</div>
          {days.map((d, i) => {
            const isActive = d.n === state.selectedDay;
            return (
              <div
                key={i}
                onClick={() => setState((s) => ({ ...s, selectedDay: d.n }))}
                style={{
                  flex: 1,
                  textAlign: "center",
                  cursor: "pointer",
                  padding: "4px 0",
                  background: isActive ? "rgba(227,179,65,0.15)" : "transparent",
                  border: isActive ? `1px solid ${sam.yellow}` : "1px solid transparent",
                  transition: "background 140ms",
                }}
              >
                <div style={{ color: isActive ? sam.yellow : sam.comment, fontWeight: isActive ? 600 : 400 }}>{d.d}</div>
                <div style={{ color: isActive ? sam.yellow : sam.text, fontWeight: 600, fontSize: 12, marginTop: 1 }}>
                  {isActive ? `*${d.n}` : d.n}
                </div>
                <div style={{ height: 20, width: 4, margin: "4px auto 0", background: "rgba(255,255,255,0.04)", position: "relative" }}>
                  <div
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: `${d.pct}%`,
                      background: isActive ? sam.yellow : sam.textDim,
                    }}
                  />
                </div>
              </div>
            );
          })}
          <div style={{ color: sam.comment, alignSelf: "center" }}>▸</div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ Categories
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{cats.length}] ▾</span>
          </div>
          <Comment>by spend, descending</Comment>
          {cats.map((cat, i) => {
            const spent = byCat[cat.key] || 0;
            const pct = Math.round((spent / cat.budget) * 100);
            const over = pct > 90;
            const isLast = i === cats.length - 1;
            return (
              <div
                key={cat.key}
                onClick={() => openSheet({ kind: "category", cat, spent, pct })}
                style={{ marginTop: 12, cursor: "pointer", padding: "2px 0" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
                  <Mono c={sam.comment}>{isLast ? "└─" : "├─"}</Mono>
                  <Mono>{cat.icon}</Mono>
                  <Mono c={cat.c} b>
                    {cat.name}
                  </Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={over ? sam.red : sam.text} b>
                    ${spent.toFixed(0)}
                  </Mono>
                  <Mono c={sam.comment}>/{cat.budget}</Mono>
                </div>
                <div style={{ paddingLeft: 22, marginTop: 3, fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
                  <BlockBar pct={pct} width={16} c={over ? sam.red : cat.c} />
                  <span style={{ color: sam.comment }}>
                    {pct}% · {txByCat[cat.key] || 0} tx
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-expense" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>[+ new expense]</Mono>
          </span>
          <Mono c={sam.comment}> · </Mono>
          <Mono c={sam.cyan}>[import]</Mono>
        </div>
      </div>
    </div>
  );
}
