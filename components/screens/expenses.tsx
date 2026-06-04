"use client";

import { useMemo } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BlockBar, TabBar } from "@/components/ui/sam-primitives";
import { dayOfMonth, formatMonthYear } from "@/lib/utils";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function ExpensesScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const cats = (state.budgets || []).map((b) => ({
    key: b.key,
    icon: b.icon,
    name: b.name,
    budget: b.cap,
    c: b.c,
  }));

  const byCat: Record<string, number> = {};
  const txByCat: Record<string, number> = {};
  state.expenses.forEach((e) => {
    byCat[e.catKey] = (byCat[e.catKey] || 0) + e.amount;
    txByCat[e.catKey] = (txByCat[e.catKey] || 0) + 1;
  });

  const totalSpent = state.expenses.reduce((a, e) => a + e.amount, 0);
  const monthTarget = (state.budgets || []).reduce((a, b) => a + b.cap, 0) || 1;

  const { days, filteredTx } = useMemo(() => {
    const spendByDay: Record<number, number> = {};
    state.expenses.forEach((e) => {
      const d = new Date(e.occurred_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        spendByDay[day] = (spendByDay[day] || 0) + e.amount;
      }
    });
    const maxSpend = Math.max(...Object.values(spendByDay), 1);

    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const dayNum = state.selectedDay - 3 + i;
      const date = new Date(year, month, dayNum);
      const inMonth = date.getMonth() === month;
      const n = date.getDate();
      const spent = inMonth ? spendByDay[n] || 0 : 0;
      return {
        d: date.toLocaleDateString("en", { weekday: "short" }).slice(0, 3),
        n,
        pct: inMonth ? Math.round((spent / maxSpend) * 100) : 0,
        inMonth,
      };
    });

    const tx = [...state.expenses]
      .filter((e) => dayOfMonth(e.occurred_at) === state.selectedDay)
      .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

    return { days: weekDays, filteredTx: tx };
  }, [state.expenses, state.selectedDay, year, month]);

  const allTxSorted = useMemo(
    () =>
      [...state.expenses].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      ),
    [state.expenses]
  );

  const listTx = filteredTx.length > 0 ? filteredTx : allTxSorted;

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <TabBar tabs={["expenses", "income", "budget"]} active={state.expTab} onChange={(t) => setState((s) => ({ ...s, expTab: t }))} />
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Expenses" cmd="list --month" />
        <Comment>
          {totalSpent.toFixed(0)} logged across {state.expenses.length} tx. on pace.
        </Comment>
        <div style={{ marginTop: 12, color: sam.comment, fontSize: 12 }}>📊 {formatMonthYear(now)}</div>
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
                onClick={() => d.inMonth && setState((s) => ({ ...s, selectedDay: d.n }))}
                style={{
                  flex: 1,
                  textAlign: "center",
                  cursor: d.inMonth ? "pointer" : "default",
                  padding: "4px 0",
                  opacity: d.inMonth ? 1 : 0.35,
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
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ Transactions
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>
              [{listTx.length}] ▾
            </span>
          </div>
          <Comment>
            {filteredTx.length > 0 ? `day ${state.selectedDay} · tap to view` : "all expenses · tap to view"}
          </Comment>
          {listTx.length === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: sam.comment }}>{`// no transactions`}</div>
          )}
          {listTx.map((e, i) => {
            const isLast = i === listTx.length - 1;
            return (
              <div
                key={e.id}
                onClick={() => openSheet({ kind: "tx", tx: e })}
                style={{ marginTop: 10, fontSize: 13, cursor: "pointer", padding: "4px 6px", marginLeft: -6, marginRight: -6 }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <Mono c={sam.comment}>{isLast ? "└─" : "├─"}</Mono>
                  <Mono c={e.catColor}>{e.icon}</Mono>
                  <Mono c={sam.text} b>
                    {e.name}
                  </Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={sam.red} b>
                    -${e.amount.toFixed(2)}
                  </Mono>
                </div>
                <div style={{ paddingLeft: 26, color: sam.comment, fontSize: 11 }}>{`// ${e.category} · ${e.time}`}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-expense" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>[+ new expense]</Mono>
          </span>
          <Mono c={sam.comment}> · </Mono>
          <Mono c={sam.comment} style={{ opacity: 0.6 }}>
            [import]
          </Mono>
          <span style={{ fontSize: 10, color: sam.comment, marginLeft: 4 }}>{`// coming soon`}</span>
        </div>
      </div>
    </div>
  );
}
