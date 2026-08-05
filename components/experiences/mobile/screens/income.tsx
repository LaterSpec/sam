"use client";

import { useMemo } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import {
  hasTrendHistory,
  monthlyTotals,
  monthOverMonthFromTx,
} from "@/lib/finance/metrics";
import { currencySymbol, normalizeCurrency } from "@/lib/finance/currency";
import { useT } from "@/lib/i18n/i18n-context";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function IncomeScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const now = new Date();
  const memberSince = state.user.member_since;
  const canTrend = hasTrendHistory(memberSince);
  const currency = normalizeCurrency(state.prefs.defaultCurrency);
  const incomeTx = useMemo(
    () =>
      (state.incomeTx || []).filter((tx) => {
        const account = state.accounts.find((candidate) => candidate.id === tx.accountId);
        return normalizeCurrency(account?.currency ?? currency) === currency;
      }),
    [currency, state.accounts, state.incomeTx]
  );

  const monthIncomeFromTx = useMemo(
    () => monthlyTotals(incomeTx, 6, new Date(), state.prefs.timezone),
    [incomeTx, state.prefs.timezone]
  );
  const hasAnyIncomeHistory = monthIncomeFromTx.some((m) => m.value > 0);
  const chartMonths = monthIncomeFromTx;
  const max = Math.max(1, ...chartMonths.map((m) => m.value));

  const mom = monthOverMonthFromTx(incomeTx, now, state.prefs.timezone);
  const showMomTrend = canTrend && mom.pct !== null;

  const displayTotal = mom.current;
  const recentIncome = [...incomeTx].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["expenses", "income", "recurring", "budget"]} active="income" onChange={(t) => setState((s) => ({ ...s, expTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Income" cmd="sources" />
        <Comment>
          {t("{n} income transactions · {x} this month", {
            n: incomeTx.length,
            x: `${currencySymbol(currency)}${displayTotal.toLocaleString()}`,
          })}
        </Comment>
        <div
          style={{
            marginTop: 16,
            padding: 14,
            border: `1px solid ${sam.green}33`,
            background: sam.overlay,
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
            +{currencySymbol(currency)}{displayTotal.toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: sam.comment, marginTop: 4 }}>
            {showMomTrend ? (
              <>
                {mom.pct! >= 0 ? "+" : ""}
                {mom.pct!.toFixed(1)}%{" "}
                <Mono c={mom.pct! >= 0 ? sam.green : sam.red}>{mom.pct! >= 0 ? "▲" : "▼"}</Mono> {t("vs last month")}
              </>
            ) : (
              <>{`// ${t("keep using sam to unlock month-over-month trends")}`}</>
            )}
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, color: sam.cyan, fontWeight: 600 }}>▸ {t("last 6 months")}</div>
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
              {`// ${t("no income logged yet · add a source to start tracking")}`}
            </div>
          )}
        </div>
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {t("Transactions")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{recentIncome.length}] ▾</span>
          </div>
          <Comment>{t("tap to view details")}</Comment>
          {recentIncome.length === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: sam.comment }}>{`// ${t("no income logged yet")}`}</div>
          )}
          {recentIncome.map((income, i) => {
            const isLast = i === recentIncome.length - 1;
            return (
              <div
                key={income.id}
                onClick={() => openSheet({ kind: "tx", tx: income })}
                style={{ marginTop: 12, padding: "6px 8px", marginLeft: -8, marginRight: -8, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 13 }}>
                  <Mono c={sam.comment}>{isLast ? "└─" : "├─"}</Mono>
                  <Mono c={sam.green}>{income.icon}</Mono>
                  <Mono c={sam.text} b>
                    {income.name}
                  </Mono>
                  <span style={{ flex: 1 }} />
                  <Mono c={sam.green} b>
                    +{currencySymbol(currency)}{income.amount.toLocaleString()}
                  </Mono>
                </div>
                <div style={{ paddingLeft: 22, fontSize: 11, color: sam.comment, marginTop: 2 }}>
                  {`// ${income.time}`}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-income" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>{t("[+ new income]")}</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}
