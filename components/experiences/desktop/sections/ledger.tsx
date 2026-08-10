"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Filter } from "lucide-react";
import { accountName, allTransactions, formatMoney, transactionCurrency } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

type Period = "all" | "week" | "month" | "quarter" | "custom";

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysAgo(days: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return date.getTime();
}

export function LedgerSection({ state, section, currency, onSelect, onAction, copy, locale }: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const [limit, setLimit] = useState(30);
  const [account, setAccount] = useState("all");
  const [category, setCategory] = useState("all");
  const [period, setPeriod] = useState<Period>("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const tx of allTransactions(state, currency)) {
      if (tx.category) map.set(tx.catKey || tx.category, tx.category);
    }
    for (const budget of state.budgets) map.set(budget.key, budget.name);
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [currency, state]);

  const rows = useMemo(() => {
    let from = 0;
    let to = Number.POSITIVE_INFINITY;
    if (period === "week") from = daysAgo(7);
    else if (period === "month") from = daysAgo(30);
    else if (period === "quarter") from = daysAgo(90);
    else if (period === "custom") {
      from = fromDate ? startOfDay(new Date(`${fromDate}T00:00:00`)) : 0;
      to = toDate ? startOfDay(new Date(`${toDate}T00:00:00`)) + 86_400_000 - 1 : Number.POSITIVE_INFINITY;
    }

    return allTransactions(state)
      .filter((tx) => transactionCurrency(state, tx) === currency)
      .filter((tx) => account === "all" || tx.accountId === account)
      .filter((tx) => category === "all" || tx.catKey === category || tx.category === category)
      .filter((tx) => {
        const stamp = new Date(tx.occurred_at).getTime();
        return stamp >= from && stamp <= to;
      });
  }, [account, category, currency, fromDate, period, state, toDate]);

  const title = section === "activity" ? copy.activity : copy.transactions;

  return (
    <div className="desk-section">
      <div className="desk-section-heading">
        <div><span className="desk-eyebrow">ledger / {section}</span><h1>{title}</h1></div>
        <div className="desk-heading-actions">
          <button type="button" className="desk-secondary-button" onClick={() => onAction("income")}><ArrowDownLeft size={15} /> {copy.addIncome}</button>
          <button type="button" className="desk-primary-button" onClick={() => onAction("expense")}><ArrowUpRight size={15} /> {copy.addExpense}</button>
        </div>
      </div>
      <div className="desk-filter-line">
        <Filter size={14} aria-hidden="true" />
        <label>{copy.account} <select value={account} onChange={(event) => setAccount(event.target.value)}><option value="all">{copy.allAccounts}</option>{state.accounts.filter((item) => item.currency === currency).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>{copy.category} <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">{copy.allCategories}</option>{categories.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
        <label>{copy.period} <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
          <option value="all">{copy.periodAll}</option>
          <option value="week">{copy.periodWeek}</option>
          <option value="month">{copy.periodMonth}</option>
          <option value="quarter">{copy.periodQuarter}</option>
          <option value="custom">{copy.periodCustom}</option>
        </select></label>
        {period === "custom" ? (
          <>
            <label>{copy.dateFrom} <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
            <label>{copy.dateTo} <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          </>
        ) : null}
        <span>{rows.length} entries · {currency}</span>
      </div>
      <section className="desk-panel desk-ledger-panel" aria-label={title}>
        {rows.length ? (
          <div className="desk-table-wrap">
            <table className="desk-ledger-table">
              <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Account</th><th>Status</th><th>Amount</th></tr></thead>
              <tbody>{rows.slice(0, limit).map((tx) => (
                <tr key={tx.id}>
                  <td><time dateTime={tx.occurred_at}>{new Date(tx.occurred_at).toLocaleDateString(locale, { month: "short", day: "2-digit", year: "2-digit" })}</time></td>
                  <th scope="row"><button type="button" className="desk-table-link" onClick={() => onSelect({ kind: "transaction", id: tx.id })}><i style={{ color: tx.catColor }}>{tx.icon}</i>{tx.name}</button></th>
                  <td>{tx.category}</td><td>{accountName(state, tx.accountId)}</td><td><span className={`desk-status desk-status--${tx.status ?? "confirmed"}`}>{tx.status ?? "confirmed"}</span></td>
                  <td className={tx.kind === "income" ? "is-positive desk-money" : "desk-money"}>{tx.kind === "income" ? "+" : "−"}{formatMoney(tx.amount, currency, locale)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : <div className="desk-empty desk-empty--large"><span>$ _</span><div><strong>{copy.noTransactions}</strong><p>{copy.noTransactionsHint}</p></div></div>}
        {limit < rows.length && <button type="button" className="desk-load-more" onClick={() => setLimit((value) => value + 30)}>load --more ({rows.length - limit})</button>}
      </section>
    </div>
  );
}
