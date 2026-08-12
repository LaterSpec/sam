"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BlockBar, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useI18n, useT } from "@/lib/i18n/i18n-context";
import { currencySymbol, formatGroupedTotals, normalizeCurrency } from "@/lib/finance/currency";
import { Eye, EyeOff } from "lucide-react";
import { updatePrefsAction } from "@/lib/actions/data-actions";
import { formatDateLong, formatMonthYear } from "@/lib/utils";
import {
  hasTrendHistory,
  filterCurrentMonth,
  monthOverMonthFromTx,
  monthOverMonthPct,
} from "@/lib/finance/metrics";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function HomeScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const { lang } = useI18n();
  const now = new Date();
  const monthIncomeTx = filterCurrentMonth(state.incomeTx || [], now, state.prefs.timezone);
  const monthExpenses = filterCurrentMonth(state.expenses, now, state.prefs.timezone);
  const totalIncome = monthIncomeTx.reduce((a, tx) => a + tx.amount, 0);
  const totalExpenses = monthExpenses.reduce((a, tx) => a + tx.amount, 0);
  const balance = (state.accounts || []).reduce((a, x) => a + x.balance, 0);
  const accountCurrencies = Array.from(new Set((state.accounts || []).map((a) => a.currency)));
  const mixedCurrency = accountCurrencies.length > 1;
  const primaryCurrency = normalizeCurrency(accountCurrencies[0] ?? state.prefs?.defaultCurrency);
  const accountCurrencyById = (id?: string) =>
    normalizeCurrency((state.accounts || []).find((a) => a.id === id)?.currency ?? primaryCurrency);
  const totalCap = (state.budgets || []).reduce((a, b) => a + b.cap, 0) || 1;
  const budgetSpent = monthExpenses
    .filter((tx) => accountCurrencyById(tx.accountId) === primaryCurrency)
    .reduce((sum, tx) => sum + tx.amount, 0);
  const budgetPct = Math.round((budgetSpent / totalCap) * 100);
  const accountCount = (state.accounts || []).length;
  const net = totalIncome - totalExpenses;
  const money = (n: number) =>
    `${n < 0 ? "-" : ""}${currencySymbol(primaryCurrency)}${Math.abs(n).toLocaleString()}`;
  const groupedIncome = formatGroupedTotals(
    monthIncomeTx.map((tx) => ({ amount: tx.amount, currency: accountCurrencyById(tx.accountId) })),
    { decimals: 0 }
  );
  const groupedExpenses = formatGroupedTotals(
    monthExpenses.map((tx) => ({ amount: tx.amount, currency: accountCurrencyById(tx.accountId) })),
    { decimals: 0 }
  );
  const groupedNet = formatGroupedTotals(
    [
      ...monthIncomeTx.map((tx) => ({ amount: tx.amount, currency: accountCurrencyById(tx.accountId) })),
      ...monthExpenses.map((tx) => ({ amount: -tx.amount, currency: accountCurrencyById(tx.accountId) })),
    ],
    { decimals: 0 }
  );
  const hideBalance = Boolean(state.prefs?.hideBalance);
  const maskedValue = "••••••";
  const displayMoney = (value: string) => (hideBalance ? maskedValue : value);
  const netSign = net < 0 ? "-" : "";
  const absoluteBalance = Math.abs(balance);
  const absIntegerBalance = Math.floor(absoluteBalance);
  const absoluteCents = (Math.round((absoluteBalance - absIntegerBalance) * 100) + "").padStart(2, "0");
  const displayPrimaryBalance = hideBalance
    ? maskedValue
    : `${balance < 0 ? "-" : ""}${currencySymbol(primaryCurrency)}${absIntegerBalance.toLocaleString()}`;
  const balanceMaskStyle = hideBalance ? { filter: "blur(6px)" } : undefined;
  const summaryMoneyStyle = {
    filter: "blur(6px)",
    color: sam.textDim,
  };
  const recent = [...state.expenses]
    .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime())
    .slice(0, 3);
  const daysLeft =
    new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
  const monthLabel = formatMonthYear(now, lang).split(" ")[0];

  const canTrend = hasTrendHistory(state.user.member_since);
  const incomeMom = monthOverMonthFromTx(state.incomeTx || [], now, state.prefs.timezone);
  const expenseMom = monthOverMonthFromTx(state.expenses, now, state.prefs.timezone);
  const netCurrent = incomeMom.current - expenseMom.current;
  const netPrevious = incomeMom.previous - expenseMom.previous;
  const netPct = monthOverMonthPct(netCurrent, netPrevious);
  const showNetTrend =
    !mixedCurrency &&
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
          {t("good morning. tracking {accounts} accounts, {tx} tx this week.", {
            accounts: accountCount,
            tx: [...state.expenses, ...(state.incomeTx || [])].filter(
              (tx) => Date.now() - new Date(tx.occurred_at).getTime() < 7 * 86400000
            ).length,
          })}
        </Comment>
        <div style={{ marginTop: 18 }}>
          <div style={{ color: sam.comment, fontSize: 12, marginBottom: 4 }}>📅 {formatDateLong(now, lang)}</div>
        </div>
        <div
          style={{
            marginTop: 16,
            padding: "14px 14px 16px",
            border: `1px solid ${sam.border}`,
            background: sam.overlay,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <div style={{ color: sam.comment, fontSize: 11 }}>
              <Mono c={sam.yellow}>$</Mono> total_balance <Mono c={sam.comment}>--all</Mono>
            </div>
            <button
              type="button"
              aria-label={hideBalance ? "mostrar saldo" : "ocultar saldo"}
              title={hideBalance ? "mostrar saldo" : "ocultar saldo"}
              onClick={() => {
                setState((current) => {
                  const nextPrefs = {
                    ...(current.prefs ?? {}),
                    hideBalance: !current.prefs?.hideBalance,
                  };
                  void updatePrefsAction(nextPrefs);
                  return { ...current, prefs: nextPrefs };
                });
              }}
              style={{
                width: 28,
                height: 28,
                borderRadius: 999,
                border: `1px solid ${sam.border}`,
                background: sam.surface,
                color: sam.text,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {hideBalance ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {mixedCurrency ? (
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: sam.yellow,
                letterSpacing: -0.5,
                lineHeight: 1.2,
                marginTop: 4,
                fontVariantNumeric: "tabular-nums",
                ...(hideBalance ? summaryMoneyStyle : {}),
              }}
            >
              {displayMoney(
                formatGroupedTotals(
                  (state.accounts || []).map((a) => ({ amount: a.balance, currency: a.currency })),
                  { decimals: 0 }
                )
              )}
            </div>
          ) : (
            <div
              style={{
                fontSize: 30,
                fontWeight: 700,
                color: sam.yellow,
                letterSpacing: -0.5,
                lineHeight: 1.1,
                marginTop: 4,
                fontVariantNumeric: "tabular-nums",
                ...(hideBalance ? summaryMoneyStyle : {}),
              }}
            >
              <span>{displayPrimaryBalance}</span>
              {!hideBalance && (
                <span style={{ color: sam.comment, fontSize: 22 }}>
                  .{absoluteCents}
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, color: sam.comment, marginTop: 4 }}>
            {showNetTrend ? (
              <span style={{ color: netPct! >= 0 ? sam.green : sam.red }}>
                {netPct! >= 0 ? "+" : ""}
                {netPct!.toFixed(1)}% <span style={{ color: sam.comment }}>{`// ${t("net cashflow vs last month")}`}</span>
              </span>
            ) : (
              <span>{`// ${t("keep using sam to calculate metrics")}`}</span>
            )}
          </div>
        </div>
        <div
          style={{ marginTop: 18, cursor: "pointer" }}
          onClick={() => setState((s) => ({ ...s, tab: "expenses", expTab: "budget" }))}
        >
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {monthLabel} {t("budget")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{budgetPct}%] ▾</span>
          </div>
          <Comment>
            {t("spent {a} of {b}", { a: budgetSpent.toFixed(0), b: totalCap.toLocaleString() })}
          </Comment>
          <div style={{ marginTop: 6, fontSize: 12 }}>
            <BlockBar pct={budgetPct} width={22} c={budgetPct > 90 ? sam.red : sam.yellow} />
            <span style={{ color: sam.comment, marginLeft: 8 }}>
              {t("{n} days left", { n: daysLeft })}
            </span>
          </div>
        </div>
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { l: "income", v: mixedCurrency ? displayMoney(groupedIncome) : displayMoney(`+${money(totalIncome)}`), c: sam.green },
            { l: "expenses", v: mixedCurrency ? displayMoney(groupedExpenses) : displayMoney(`-${money(totalExpenses)}`), c: sam.red },
            {
              l: "savings",
              v: mixedCurrency
                ? displayMoney(groupedNet)
                : displayMoney(`${netSign}${money(net).replace("-", "")}`),
              c: net >= 0 ? sam.cyan : sam.red,
            },
            { l: "accounts", v: `${state.accounts.length}`, c: sam.yellow },
          ].map((s, i) => (
            <div key={i} style={{ border: `1px solid ${sam.border}`, padding: "8px 10px", background: sam.surface }}>
              <div style={{ fontSize: 10, color: sam.comment }}>{`// ${t(s.l)}`}</div>
              <div style={{
                fontSize: 16,
                color: s.c,
                fontWeight: 600,
                fontVariantNumeric: "tabular-nums",
                ...(hideBalance && s.l !== "accounts" ? balanceMaskStyle : undefined),
              }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {t("Recent")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{recent.length}] ▾</span>
          </div>
          <Comment>{t("tap to view details")}</Comment>
          {recent.length === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: sam.comment }}>{`// ${t("no expenses yet")}`}</div>
          )}
          {recent.map((r) => (
            <div
              key={r.id}
              onClick={() => openSheet({ kind: "tx", tx: r })}
              style={{ marginTop: 10, fontSize: 13, cursor: "pointer", padding: "4px 6px", marginLeft: -6, marginRight: -6, borderRadius: 2, transition: "background 140ms" }}
              onMouseDown={(e) => { e.currentTarget.style.background = sam.hover; }}
              onMouseUp={(e) => { e.currentTarget.style.background = "transparent"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <Mono c={sam.red} b>[-]</Mono>
                <Mono c={r.catColor}>{r.icon}</Mono>
                <Mono c={sam.text} b>{r.name}</Mono>
                <span style={{ flex: 1 }} />
                <Mono c={sam.red} b>-{currencySymbol(accountCurrencyById(r.accountId))}{r.amount.toFixed(2)}</Mono>
              </div>
              <div style={{ paddingLeft: 26, color: sam.comment, fontSize: 11 }}>{`// ${r.category} · ${r.time}`}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
