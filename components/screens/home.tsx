"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BlockBar, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { formatDateLong, formatMonthYear } from "@/lib/utils";
import {
  hasTrendHistory,
  monthOverMonthFromTx,
  monthOverMonthPct,
} from "@/lib/finance/metrics";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function HomeScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const now = new Date();
  const totalIncome = (state.incomeSources || []).reduce((a, s) => a + s.amt, 0);
  const totalExpenses = state.expenses.reduce((a, e) => a + e.amount, 0);
  const balance = (state.accounts || []).reduce((a, x) => a + x.balance, 0);
  const totalCap = (state.budgets || []).reduce((a, b) => a + b.cap, 0) || 1;
  const budgetPct = Math.round((totalExpenses / totalCap) * 100);
  const accountCount = (state.accounts || []).length;
  const net = totalIncome - totalExpenses;
  const money = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString()}`;
  const recent = [...state.expenses]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 3);
  const daysLeft =
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const monthLabel = formatMonthYear(now).split(" ")[0];

  const canTrend = hasTrendHistory(state.user.member_since);
  const incomeMom = monthOverMonthFromTx(state.incomeTx || [], now);
  const expenseMom = monthOverMonthFromTx(state.expenses, now);
  const netCurrent = incomeMom.current - expenseMom.current;
  const netPrevious = incomeMom.previous - expenseMom.previous;
  const netPct = monthOverMonthPct(netCurrent, netPrevious);
  const showNetTrend =
    canTrend &&
    netPct !== null &&
    (incomeMom.previous > 0 || expenseMom.previous > 0 || incomeMom.current > 0 || expenseMom.current > 0);

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar
          tabs={["home", "activity", "accounts"]}
          active={state.homeTab}
          onChange={(t) => setState((s) => ({ ...s, homeTab: t }))}
        />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Sam" cmd="balance" />
        <Comment>
          good morning. tracking {accountCount} accounts, {state.expenses.length} tx this week.
        </Comment>
        <div style={{ marginTop: 18 }}>
          <div style={{ color: sam.comment, fontSize: 12, marginBottom: 4 }}>📅 {formatDateLong(now)}</div>
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "14px 14px 16px",
            border: `1px solid ${sam.border}`,
            background: sam.overlay,
          }}
        >
          <div style={{ color: sam.comment, fontSize: 11, marginBottom: 2 }}>
            <Mono c={sam.yellow}>$</Mono> total_balance <Mono c={sam.comment}>--all</Mono>
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: sam.yellow,
              letterSpacing: -0.5,
              lineHeight: 1.1,
              marginTop: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            ${Math.floor(balance).toLocaleString()}
            <span style={{ color: sam.comment, fontSize: 22 }}>
              .{(balance % 1).toFixed(2).slice(2)}
            </span>
          </div>
          <div style={{ fontSize: 11, color: sam.comment, marginTop: 4 }}>
            {showNetTrend ? (
              <span style={{ color: netPct! >= 0 ? sam.green : sam.red }}>
                {netPct! >= 0 ? "+" : ""}
                {netPct!.toFixed(1)}% <span style={{ color: sam.comment }}>// net cashflow vs last month</span>
              </span>
            ) : (
              <span>{`// keep using sam to calculate metrics`}</span>
            )}
          </div>
        </div>
        <div
          style={{ marginTop: 18, cursor: "pointer" }}
          onClick={() => setState((s) => ({ ...s, tab: "expenses", expTab: "budget" }))}
        >
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {monthLabel} budget
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{budgetPct}%] ▾</span>
          </div>
          <Comment>
            spent {totalExpenses.toFixed(0)} of {totalCap.toLocaleString()}
          </Comment>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            <BlockBar pct={budgetPct} width={22} c={budgetPct > 90 ? sam.red : sam.yellow} />
            <span style={{ color: sam.comment, marginLeft: 8 }}>
              {daysLeft} day{daysLeft === 1 ? "" : "s"} left
            </span>
          </div>
        </div>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { l: "income", v: `+$${totalIncome.toLocaleString()}`, c: sam.green },
            { l: "expenses", v: `-$${totalExpenses.toLocaleString()}`, c: sam.red },
            { l: "savings", v: money(net), c: net >= 0 ? sam.cyan : sam.red },
            { l: "pending", v: `${state.pending} tx`, c: sam.yellow },
          ].map((s, i) => (
            <div key={i} style={{ border: `1px solid ${sam.border}`, padding: "8px 10px", background: sam.surface }}>
              <div style={{ fontSize: 10, color: sam.comment }}>{`// ${s.l}`}</div>
              <div style={{ fontSize: 16, color: s.c, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ Recent
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{recent.length}] ▾</span>
          </div>
          <Comment>tap to view details</Comment>
          {recent.length === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: sam.comment }}>{`// no expenses yet`}</div>
          )}
          {recent.map((r) => (
            <div
              key={r.id}
              onClick={() => openSheet({ kind: "tx", tx: r })}
              style={{ marginTop: 10, fontSize: 13, cursor: "pointer", padding: "4px 6px", marginLeft: -6, marginRight: -6, borderRadius: 2, transition: "background 140ms" }}
              onMouseDown={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
              onMouseUp={(e) => { e.currentTarget.style.background = "transparent"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <Mono c={sam.red} b>[-]</Mono>
                <Mono c={r.catColor}>{r.icon}</Mono>
                <Mono c={sam.text} b>{r.name}</Mono>
                <span style={{ flex: 1 }} />
                <Mono c={sam.red} b>-${r.amount.toFixed(2)}</Mono>
              </div>
              <div style={{ paddingLeft: 26, color: sam.comment, fontSize: 11 }}>{`// ${r.category} · ${r.time}`}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
