"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Filter } from "lucide-react";
import { accountName, allTransactions, formatMoney, transactionCurrency } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

export function LedgerSection({ state, section, currency, query, onSelect, onAction, copy, locale }: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const [limit, setLimit] = useState(30);
  const [account, setAccount] = useState("all");
  const rows = useMemo(() => allTransactions(state)
    .filter((tx) => section === "income" ? tx.kind === "income" : section === "expenses" ? tx.kind === "expense" : true)
    .filter((tx) => transactionCurrency(state, tx) === currency)
    .filter((tx) => account === "all" || tx.accountId === account)
    .filter((tx) => `${tx.name} ${tx.category} ${tx.source ?? ""}`.toLowerCase().includes(query.toLowerCase())), [account, currency, query, section, state]);
  const title = section === "income" ? copy.income : section === "expenses" ? copy.expenses : section === "activity" ? copy.activity : copy.transactions;

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
        <label>Account <select value={account} onChange={(event) => setAccount(event.target.value)}><option value="all">All accounts</option>{state.accounts.filter((item) => item.currency === currency).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
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
