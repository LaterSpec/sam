import { Plus, ScanLine } from "lucide-react";
import { BudgetPressure } from "../charts/budget-pressure";
import { budgetRows, formatMoney } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

export function BudgetsSection({ state, currency, query, onSelect, onAction, copy, locale }: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const rows = budgetRows(state, currency).filter((row) => row.name.toLowerCase().includes(query.toLowerCase()));
  const cap = rows.reduce((sum, row) => sum + row.cap, 0);
  const spent = rows.reduce((sum, row) => sum + row.spent, 0);
  return <div className="desk-section">
    <div className="desk-section-heading"><div><span className="desk-eyebrow">budget / guardrails</span><h1>{copy.budgets}</h1></div><button type="button" className="desk-primary-button" onClick={() => onAction("budget")}><Plus size={15} /> {copy.addBudget}</button></div>
    <div className="desk-budget-header"><span><ScanLine size={18} /> monthly envelope</span><strong>{formatMoney(spent, currency, locale)} <small>/ {formatMoney(cap, currency, locale)}</small></strong><div className="desk-wide-track"><i style={{ width: `${Math.min(100, cap ? (spent / cap) * 100 : 0)}%` }} /></div></div>
    <section className="desk-panel"><div className="desk-panel-heading"><div><span className="desk-command">budget.pressure --currency={currency}</span><h2>{copy.budgetPressure}</h2></div></div><BudgetPressure state={{ ...state, budgets: rows }} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "budget", id })} /></section>
    <section className="desk-panel"><div className="desk-panel-heading"><h2>Category envelopes</h2><span className="desk-panel-note">remaining / cap</span></div><div className="desk-envelope-grid">{rows.map((row) => <button key={row.id} type="button" className="desk-envelope" onClick={() => onSelect({ kind: "budget", id: row.id })}><span style={{ color: row.c }}>{row.icon}</span><strong>{row.name}</strong><b className={row.remaining < 0 ? "is-negative" : ""}>{formatMoney(row.remaining, currency, locale)}</b><small>{Math.round(row.ratio * 100)}% used</small><i><em style={{ width: `${Math.min(100, row.ratio * 100)}%`, background: row.ratio >= 1 ? "var(--desk-risk)" : row.ratio >= .8 ? "var(--desk-pending)" : row.c }} /></i></button>)}</div></section>
  </div>;
}
