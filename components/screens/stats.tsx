"use client";

import { useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useT, useI18n } from "@/lib/i18n/i18n-context";
import { currencySymbol, normalizeCurrency } from "@/lib/finance/currency";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function StatsScreen({ state, setState }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const { lang } = useI18n();
  const dateLocale = lang === "es" ? "es" : "en";
  const [period, setPeriod] = useState<"1w" | "6m" | "1y" | "ytd">("6m");
  const currency = normalizeCurrency(state.prefs.defaultCurrency);
  const symbol = currencySymbol(currency);
  const money = (n: number) => `${n < 0 ? "-" : ""}${symbol}${Math.abs(Math.round(n)).toLocaleString()}`;
  const belongsToCurrency = (tx: ScreenProps["state"]["expenses"][number]) => {
    if (tx.currency) return tx.currency === currency;
    return normalizeCurrency(state.accounts.find((account) => account.id === tx.accountId)?.currency) === currency;
  };
  const currencyExpenses = (state.expenses || []).filter(belongsToCurrency);
  const currencyIncome = (state.incomeTx || []).filter(belongsToCurrency);

  const now = new Date();
  const periodMonths: Record<string, number> = { "6m": 6, "1y": 12, ytd: now.getMonth() + 1 };
  const nMonths = periodMonths[period] || 6;
  const months: { key: string; label: string; net: number }[] = [];
  const monthIdx: Record<string, number> = {};
  for (let i = nMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.getFullYear() + "-" + d.getMonth();
    monthIdx[key] = months.length;
    months.push({ key, label: d.toLocaleDateString(dateLocale, { month: "short" }), net: 0 });
  }
  const bucket = (arr: ScreenProps["state"]["expenses"], sign: number) => {
    (arr || []).forEach((t) => {
      if (!t.occurred_at) return;
      const d = new Date(t.occurred_at);
      const k = d.getFullYear() + "-" + d.getMonth();
      if (monthIdx[k] !== undefined) months[monthIdx[k]].net += sign * t.amount;
    });
  };
  bucket(currencyIncome, 1);
  bucket(currencyExpenses, -1);

  const currentWallet = (state.accounts || [])
    .filter((account) => account.currency === currency)
    .reduce((a, x) => a + x.balance, 0);
  const weekDays = Array.from({ length: 8 }, (_, idx) => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (7 - idx));
    return d;
  });
  const snapshotByDay = new Map(
    (state.portfolioSnapshots || []).map((s) => [new Date(s.t).toISOString().slice(0, 10), s.v])
  );
  const weekValues = weekDays.map((day) => {
    const key = day.toISOString().slice(0, 10);
    const snap = snapshotByDay.get(key);
    if (snap != null) return snap;
    // Fallback: derive historical wallet trend from today's account total by reversing
    // later transactions. This keeps the 1w chart deterministic when no snapshots exist.
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    const laterTx = [...currencyIncome, ...currencyExpenses].reduce((sum, tx) => {
      if (!tx.occurred_at) return sum;
      const t = new Date(tx.occurred_at);
      if (t <= dayEnd) return sum;
      return sum + (tx.kind === "income" ? tx.amount : -tx.amount);
    }, 0);
    return currentWallet - laterTx;
  });

  const values = period === "1w" ? weekValues : months.map((m) => m.net);
  const labels =
    period === "1w"
      ? weekDays.map((d) => d.toLocaleDateString(dateLocale, { weekday: "short" }).slice(0, 1))
      : months.map((m) => (nMonths > 6 ? m.label[0] : m.label));
  const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
  const totalNet = period === "1w" ? values[values.length - 1] - values[0] : values.reduce((a, v) => a + v, 0);
  const periodStart =
    period === "1w"
      ? new Date(now.getTime() - 7 * 86400000)
      : period === "ytd"
        ? new Date(now.getFullYear(), 0, 1)
        : new Date(now.getFullYear(), now.getMonth() - nMonths + 1, 1);
  const periodExpenses = currencyExpenses.filter((tx) => new Date(tx.occurred_at) >= periodStart);
  const periodIncome = currencyIncome.filter((tx) => new Date(tx.occurred_at) >= periodStart);

  const byCat: Record<string, number> = {};
  periodExpenses.forEach((e) => {
    byCat[e.catKey] = (byCat[e.catKey] || 0) + e.amount;
  });
  const totalSpentRaw = periodExpenses.reduce((a, e) => a + e.amount, 0);
  const totalSpent = totalSpentRaw || 1;
  const totalIncome = periodIncome.reduce((a, tx) => a + tx.amount, 0);
  const saveRate =
    totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalSpent) / totalIncome) * 100)) : 0;
  const catSplit = (state.budgets || [])
    .map((b) => ({
      n: b.name.split(" ")[0],
      pct: Math.round(((byCat[b.key] || 0) / totalSpent) * 100),
      c: b.c,
    }))
    .filter((c) => c.pct > 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayCounts = new Array(28).fill(0);
  [...currencyExpenses, ...currencyIncome].forEach((t) => {
    if (!t.occurred_at) return;
    const d = new Date(t.occurred_at);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
    if (diff >= 0 && diff < 28) dayCounts[27 - diff] += 1;
  });
  const intensityOf = (c: number) => (c === 0 ? 0 : c === 1 ? 1 : c <= 3 ? 2 : 3);

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["profile", "stats", "help", "settings"]} active="stats" onChange={(t) => setState((s) => ({ ...s, profileTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Stats" cmd={`report --${period}`} />
        <Comment>
          {period === "1w"
            ? t("wallet moved {m} over 1 week · {n} tx tracked", {
                m: money(values[values.length - 1] - values[0]),
                n: periodExpenses.length + periodIncome.length,
              })
            : t("net {m} over {k} months · {n} tx tracked", {
                m: money(totalNet),
                k: nMonths,
                n: periodExpenses.length + periodIncome.length,
              })}
        </Comment>
        <div style={{ marginTop: 14, display: "flex", gap: 6, fontSize: 12 }}>
          {(["1w", "6m", "1y", "ytd"] as const).map((p) => (
            <span
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "4px 10px",
                cursor: "pointer",
                border: `1px solid ${period === p ? sam.yellow : sam.border}`,
                color: period === p ? sam.yellow : sam.comment,
                background: period === p ? sam.active : "transparent",
                fontWeight: period === p ? 600 : 400,
                transition: "all 140ms",
              }}
            >
              [{p}]
            </span>
          ))}
        </div>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { v: money(totalNet), l: `${t("net")} ${period}`, c: totalNet >= 0 ? sam.green : sam.red },
            { v: `${symbol}${Math.round(totalSpentRaw).toLocaleString()}`, l: t("spent"), c: sam.red },
            { v: `${symbol}${Math.round(totalIncome).toLocaleString()}`, l: t("income"), c: sam.cyan },
            { v: `${saveRate}%`, l: t("save rate"), c: sam.yellow },
          ].map((s, i) => (
            <div key={i} style={{ padding: "10px 12px", border: `1px solid ${sam.border}` }}>
              <div style={{ fontSize: 10, color: sam.comment }}>{`// ${s.l}`}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: s.c, fontVariantNumeric: "tabular-nums", marginTop: 2 }}>
                {s.v}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {t("Net cashflow")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>
              {period} ▾
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", gap: values.length > 6 ? 4 : 8, alignItems: "flex-end", height: 80 }}>
              {values.map((v, i) => {
                const h = Math.max(3, Math.round((Math.abs(v) / maxAbs) * 72));
                const active = i === values.length - 1;
                const pos = v >= 0;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                    <div
                      title={money(v)}
                      style={{
                        height: h,
                        background: pos ? sam.green : sam.red,
                        opacity: active ? 1 : 0.45,
                        borderTop: active ? `2px solid ${pos ? sam.green : sam.red}` : "none",
                        transition: "height 420ms cubic-bezier(.2,.9,.2,1)",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: values.length > 6 ? 4 : 8, marginTop: 6 }}>
              {labels.map((l, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontSize: values.length > 6 ? 9 : 10,
                    fontWeight: i === values.length - 1 ? 600 : 400,
                    color: i === values.length - 1 ? sam.text : sam.comment,
                  }}
                >
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {t("Where it went")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>
              {now.toLocaleDateString(dateLocale, { month: "short" })} ▾
            </span>
          </div>
          {catSplit.length === 0 ? (
            <div style={{ marginTop: 10, fontSize: 12, color: sam.comment }}>{`// ${t("no spending logged yet")}`}</div>
          ) : (
            <>
              <div style={{ marginTop: 10, display: "flex", height: 12, border: `1px solid ${sam.border}` }}>
                {catSplit.map((c, i) => (
                  <div key={i} style={{ width: `${c.pct}%`, background: c.c, opacity: 0.85 }} />
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                {catSplit.map((c, i) => {
                  const isLast = i === catSplit.length - 1;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12, marginTop: 4 }}>
                      <Mono c={sam.comment}>{isLast ? "└─" : "├─"}</Mono>
                      <div style={{ width: 8, height: 8, background: c.c, marginRight: 2 }} />
                      <Mono c={sam.text}>{c.n}</Mono>
                      <span style={{ flex: 1 }} />
                      <Mono c={sam.comment}>{c.pct}%</Mono>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>▸ {t("Activity · last 28d")}</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 3 }}>
            {dayCounts.map((cnt, i) => {
              const colors = [sam.track, `${sam.green}55`, `${sam.green}99`, sam.green];
              return (
                <div key={i} title={`${cnt} tx`} style={{ aspectRatio: "1", background: colors[intensityOf(cnt)] }} />
              );
            })}
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: sam.comment, display: "flex", alignItems: "center", gap: 4 }}>
            {t("less")}
            <div style={{ width: 8, height: 8, background: sam.track }} />
            <div style={{ width: 8, height: 8, background: `${sam.green}55` }} />
            <div style={{ width: 8, height: 8, background: `${sam.green}99` }} />
            <div style={{ width: 8, height: 8, background: sam.green }} />
            {t("more")}
          </div>
        </div>
      </div>
    </div>
  );
}
