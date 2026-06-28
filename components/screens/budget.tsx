"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BlockBar, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useT } from "@/lib/i18n/i18n-context";
import { filterCurrentMonth } from "@/lib/finance/metrics";
import { currencySymbol, normalizeCurrency } from "@/lib/finance/currency";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function BudgetScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const currency = normalizeCurrency(state.prefs.defaultCurrency);
  const symbol = currencySymbol(currency);
  const monthExpenses = filterCurrentMonth(state.expenses, new Date(), state.prefs.timezone).filter(
    (expense) =>
      normalizeCurrency(
        expense.currency ?? state.accounts.find((account) => account.id === expense.accountId)?.currency
      ) === currency
  );
  const byCat: Record<string, number> = {};
  monthExpenses.forEach((e) => {
    byCat[e.catKey] = (byCat[e.catKey] || 0) + e.amount;
  });

  const budgets = state.budgets.filter((budget) => budget.currency === currency);
  const totalCap = budgets.reduce((a, b) => a + b.cap, 0);
  const totalSpent = budgets.reduce((a, b) => a + (byCat[b.key] || 0), 0);

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["expenses", "income", "recurring", "budget"]} active="budget" onChange={(t) => setState((s) => ({ ...s, expTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Budget" cmd="config --month" />
        <Comment>
          {t("{n} envelopes · ${x} unallocated", {
            n: budgets.length,
            x: Math.max(0, totalCap - totalSpent).toLocaleString(),
          })}
        </Comment>
        <div style={{ marginTop: 16, padding: 14, border: `1px solid ${sam.border}` }}>
          <div style={{ fontSize: 11, color: sam.comment }}>{`// ${t("budget · spent · remaining")}`}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
            <Mono c={sam.yellow} b style={{ fontSize: 18 }}>
              {symbol}{totalCap.toLocaleString()}
            </Mono>
            <Mono c={sam.comment}>·</Mono>
            <Mono c={sam.red} b style={{ fontSize: 14 }}>
              {symbol}{totalSpent.toFixed(0)}
            </Mono>
            <Mono c={sam.comment}>·</Mono>
            <Mono c={sam.green} b style={{ fontSize: 14 }}>
              {symbol}{Math.max(0, totalCap - totalSpent).toFixed(0)}
            </Mono>
          </div>
          <div style={{ marginTop: 10 }}>
            <BlockBar pct={totalCap > 0 ? Math.min(100, Math.round((totalSpent / totalCap) * 100)) : 0} width={24} c={sam.yellow} />
          </div>
        </div>
        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 13, color: sam.cyan, fontWeight: 600 }}>
            ▸ {t("Envelopes")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>[{budgets.length}] ▾</span>
          </div>
          <Comment>{t("tap to adjust cap")}</Comment>
          {budgets.map((b) => {
            const spent = byCat[b.key] || 0;
            const pct = b.cap > 0 ? Math.min(200, Math.round((spent / b.cap) * 100)) : spent > 0 ? 200 : 0;
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
                  background: warn ? `${sam.red}10` : sam.surface,
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
                    {symbol}{Math.abs(left).toFixed(0)}
                  </Mono>
                  <Mono c={sam.comment}>{over ? t("over") : t("left")}</Mono>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
                  <BlockBar pct={Math.min(100, pct)} width={14} c={over ? sam.red : warn ? sam.yellow : b.c} />
                  <span style={{ color: sam.comment }}>
                    {symbol}{spent.toFixed(0)} / {symbol}{b.cap} · {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-budget" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>{t("[+ new envelope]")}</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}
