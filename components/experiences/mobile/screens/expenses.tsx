"use client";

import { useMemo, useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono, Comment, Prompt, BlockBar, TabBar, ScreenHeader, userHandleFromState } from "@/components/ui/sam-primitives";
import { useI18n, useT } from "@/lib/i18n/i18n-context";
import { currencySymbol, normalizeCurrency } from "@/lib/finance/currency";
import { filterCurrentMonth } from "@/lib/finance/metrics";
import { formatMonthYear } from "@/lib/utils";
import type { ScreenProps } from "./types";
import { SCREEN_PAD } from "./types";

export function ExpensesScreen({ state, setState, openSheet }: ScreenProps) {
  const { sam } = useSam();
  const t = useT();
  const { lang } = useI18n();
  const now = new Date();
  const displayCurrency = normalizeCurrency(state.prefs.defaultCurrency);
  const monthExpenses = useMemo(
    () =>
      filterCurrentMonth(state.expenses, new Date(), state.prefs.timezone).filter(
        (expense) =>
          normalizeCurrency(
            expense.currency ??
              state.accounts.find((account) => account.id === expense.accountId)?.currency
          ) === displayCurrency
      ),
    [displayCurrency, state.accounts, state.expenses, state.prefs.timezone]
  );
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [txExpanded, setTxExpanded] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const cats = (state.budgets || []).filter((b) => b.currency === displayCurrency).map((b) => ({
    key: b.key,
    icon: b.icon,
    name: b.name,
    budget: b.cap,
    c: b.c,
    currency: b.currency,
  }));

  const byCat = useMemo(() => {
    const spent: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      spent[e.catKey] = (spent[e.catKey] || 0) + e.amount;
    });
    return spent;
  }, [monthExpenses]);

  const txByCat = useMemo(() => {
    const counts: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      counts[e.catKey] = (counts[e.catKey] || 0) + 1;
    });
    return counts;
  }, [monthExpenses]);

  const totalSpent = monthExpenses.reduce((a, e) => a + e.amount, 0);
  const monthTarget = (state.budgets || []).reduce((a, b) => a + b.cap, 0) || 1;
  const acctCurrency = (id?: string) =>
    normalizeCurrency((state.accounts || []).find((a) => a.id === id)?.currency ?? state.prefs?.defaultCurrency);

  const visibleCats = useMemo(() => {
    if (categoriesExpanded) return cats;
    return cats.filter((cat) => (txByCat[cat.key] || 0) > 0);
  }, [cats, categoriesExpanded, txByCat]);

  const listTx = useMemo(
    () =>
      [...state.expenses].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      ),
    [state.expenses]
  );
  const visibleTx = txExpanded ? listTx : listTx.slice(0, 3);

  return (
    <div style={{ padding: SCREEN_PAD }}>
      <ScreenHeader>
        <TabBar tabs={["expenses", "income", "recurring", "budget"]} active={state.expTab} onChange={(t) => setState((s) => ({ ...s, expTab: t }))} />
      </ScreenHeader>
      <div style={{ marginTop: 20 }}>
        <Prompt user={userHandleFromState(state)} host="init.Expenses" cmd="list --month" />
        <Comment>
          {t("{a} logged across {b} tx. on pace.", { a: totalSpent.toFixed(0), b: monthExpenses.length })}
        </Comment>
        <div style={{ marginTop: 12, color: sam.comment, fontSize: 12 }}>📊 {formatMonthYear(now, lang)}</div>
        <div style={{ fontSize: 13, marginTop: 2 }}>
          <Mono c={sam.red} b>-{currencySymbol(displayCurrency)}{totalSpent.toFixed(0)}</Mono>
          <Mono c={sam.comment}> {t("of")} </Mono>
          <Mono c={sam.yellow}>{currencySymbol(displayCurrency)}{monthTarget.toLocaleString()}</Mono>
          <Mono c={sam.comment}> · </Mono>
          <Mono c={sam.green}>{currencySymbol(displayCurrency)}{Math.max(0, monthTarget - totalSpent).toFixed(0)} {t("left")}</Mono>
        </div>
        <div style={{ marginTop: 20 }}>
          <div
            onClick={() => setCategoriesExpanded((v) => !v)}
            style={{ fontSize: 13, color: sam.cyan, fontWeight: 600, cursor: "pointer" }}
          >
            ▸ {t("Categories")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>
              [{visibleCats.length}] {categoriesExpanded ? "▴" : "▾"}
            </span>
          </div>
          <Comment>{categoriesExpanded ? t("tap to collapse") : t("tap to expand")}</Comment>
          {visibleCats.length === 0 && !categoriesExpanded && (
            <div style={{ marginTop: 12, fontSize: 12, color: sam.comment }}>{`// ${t("no categories with spend yet")}`}</div>
          )}
          {visibleCats.map((cat, i) => {
            const spent = byCat[cat.key] || 0;
            const pct = cat.budget > 0 ? Math.round((spent / cat.budget) * 100) : spent > 0 ? 100 : 0;
            const over = pct > 90;
            const isLast = i === visibleCats.length - 1;
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
                    {currencySymbol(displayCurrency)}{spent.toFixed(0)}
                  </Mono>
                  <Mono c={sam.comment}>/{currencySymbol(displayCurrency)}{cat.budget}</Mono>
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
          <div
            onClick={() => setTxExpanded((v) => !v)}
            style={{ fontSize: 13, color: sam.cyan, fontWeight: 600, cursor: "pointer" }}
          >
            ▸ {t("Transactions")}
            <span style={{ float: "right", color: sam.textDim, fontWeight: 400 }}>
              [{listTx.length}] {txExpanded ? "▴" : "▾"}
            </span>
          </div>
          <Comment>{txExpanded ? t("all expenses · tap to view") : t("latest 3 · tap title to expand")}</Comment>
          {listTx.length === 0 && (
            <div style={{ marginTop: 12, fontSize: 12, color: sam.comment }}>{`// ${t("no transactions")}`}</div>
          )}
          {visibleTx.map((e, i) => {
            const isLast = i === visibleTx.length - 1;
            const isExpanded = expandedTxId === e.id;
            const accountName = state.accounts.find((account) => account.id === e.accountId)?.name ?? "—";
            return (
              <div key={e.id} style={{ marginTop: 10 }}>
                <div
                  onClick={() => setExpandedTxId((value) => (value === e.id ? null : e.id))}
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
                    -{currencySymbol(acctCurrency(e.accountId))}{e.amount.toFixed(2)}
                  </Mono>
                </div>
                <div style={{ paddingLeft: 26, color: sam.comment, fontSize: 11 }}>{`// ${e.category} · ${e.time}`}</div>
              </div>
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: "10px",
                      border: `1px solid ${sam.border}`,
                      background: sam.surface,
                      marginLeft: 8,
                      marginRight: 8,
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Mono c={sam.comment}>
                        <b>{e.time}</b> · {e.category}
                      </Mono>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openSheet({ kind: "tx", tx: e });
                      }}
                      style={{
                        border: `1px solid ${sam.cyan}`,
                        color: sam.cyan,
                        background: "transparent",
                          fontFamily: sam.font,
                          fontSize: 10,
                          padding: "2px 6px",
                          cursor: "pointer",
                      }}
                    >
                        {t("tap for detail")}
                      </button>
                    </div>
                    <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                      <Mono c={sam.text}>· {accountName}</Mono>
                      <Mono c={sam.text}>· {e.time}</Mono>
                      <Mono c={sam.red}>· -{currencySymbol(acctCurrency(e.accountId))}{e.amount.toFixed(2)}</Mono>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 20, fontSize: 14 }}>
          <span onClick={() => openSheet({ kind: "new-expense" })} style={{ cursor: "pointer" }}>
            <Mono c={sam.green} b>{t("[+ new expense]")}</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}
