"use client";

import { useMemo } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar } from "@/components/ui/sam-primitives";
import {
  hasTrendHistory,
  monthlyTotals,
  monthOverMonthFromTx,
} from "@/lib/finance/metrics";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function IncomeScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const sources = state.incomeSources;
  const now = new Date();
  const memberSince = state.user.member_since;
  const canTrend = hasTrendHistory(memberSince);

  const monthIncomeFromTx = useMemo(
    () => monthlyTotals(state.incomeTx || [], 6),
    [state.incomeTx]
  );
  const hasAnyIncomeHistory = monthIncomeFromTx.some((m) => m.value > 0);
  const chartMonths = monthIncomeFromTx;
  const max = Math.max(1, ...chartMonths.map((m) => m.value));

  const mom = monthOverMonthFromTx(state.incomeTx || [], now);
  const showMomTrend = canTrend && mom.pct !== null;

  const projected = sources.reduce((a, s) => a + s.amt, 0);
  const displayTotal = mom.current > 0 ? mom.current : projected;

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <TabBar tabs={["expenses", "income", "budget"]} active="income" onChange={(t) => setState((s) => ({ ...s, expTab: t }))} />
      <div style={{ marginTop: 20 }}>
        <Prompt host="init.Income" cmd="sources" />
        <Comment>
          {sources.length} sources · {sources.filter((s) => s.freq !== "one-time").length} recurring · projected +$
          {projected.toLocaleString()} this month
        </Comment>
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: `1px solid ${sam.green}33`,
            background: "rgba(86,211,100,0.04)",
          }}
        >
          <div style={{ fontSize: 11, color: sam.comment }}>
            <Mono c={sam.green}>+</Mono> total_income <Mono c={sam.comment}>--month</Mono>
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 700,
              color: sam.green,
              letterSpacing: -0.5,
              marginTop: 4,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            +${displayTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: sam.comment, marginTop: 4 }}>
            {showMomTrend ? (
              <>
                {mom.pct! >= 0 ? "+" : ""}
                {mom.pct!.toFixed(1)}%{" "}
                <Mono c={mom.pct! >= 0 ? sam.green : sam.red}>{mom.pct! >= 0 ? "▲" : "▼"}</Mono> vs last month
              </>
            ) : (
              <>{`// keep using sam to unlock month-over-month trends`}</>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: sam.cyan, fontWeight: 600 }}>▸ last 6 months</div>
          {hasAnyIncomeHistory ? (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 72 }}>
                {chartMonths.map((m, i) => {
                  const h = Math.max(m.value > 0 ? 6 : 2, Math.round((m.value / max) * 64));
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                      <div
                        style={{
                          height: h,
                          background: m.isCurrent ? sam.green : sam.textDim,
                          opacity: m.isCurrent ? 1 : m.value > 0 ? 0.45 : 0.15,
                          borderTop: m.isCurrent ? `2px solid ${sam.green}` : "none",
                          transition: "height 420ms cubic-bezier(.2,.9,.2,1)",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {chartMonths.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 10,
                      fontWeight: m.isCurrent ? 600 : 400,
                      color: m.isCurrent ? sam.green : sam.comment,
                    }}
                  >
                    {m.label}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                {chartMonths.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      fontSize: 9,
                      fontVariantNumeric: "tabular-nums",
                      color: m.isCurrent ? sam.text : sam.comment,
                      opacity: m.value > 0 ? 1 : 0.5,
                    }}
                  >
                    {m.value >= 1000 ? `${(m.value / 1000).toFixed(1)}k` : m.value > 0 ? `$${m.value.toFixed(0)}` : "—"}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, color: sam.comment }}>
              {`// no income logged yet · add a source to start tracking`}
            </div>
          )}
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ Sources
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{sources.length}] ▾</span>
          </div>
          <Comment>tap to view payment history</Comment>
          {sources.map((s, i) => {
            const isLast = i === sources.length - 1;
            return (
              <div
                key={s.id}
                onClick={() => openSheet({ kind: "income-src", src: s })}
                style={{ marginTop: 12, padding: "6px 8px", marginLeft: -8, marginRight: -8, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
                  <Mono c={sam.comment}>{isLast ? "└─" : "├─"}</Mono>
                  <Mono c={s.c}>{s.icon}</Mono>
                  <Mono c={sam.text} b>
                    {s.name}
                  </Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={sam.green} b>
                    +${s.amt.toLocaleString()}
                  </Mono>
                </div>
                <div style={{ paddingLeft: 22, fontSize: 11, color: sam.comment, marginTop: 2 }}>
                  {`// ${s.freq} · next ${s.next}`}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-income" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>[+ new source]</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}
