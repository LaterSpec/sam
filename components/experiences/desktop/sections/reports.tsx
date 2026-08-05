import { Activity, Gauge, Route } from "lucide-react";
import { BudgetPressure } from "../charts/budget-pressure";
import { GoalRunway } from "../charts/goal-runway";
import { currentMonthTransactions, desktopSummary, formatMoney } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

export function ReportsSection({ state, currency, onSelect, copy, locale }: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const summary = desktopSummary(state, currency);
  const days = new Map<string, { income: number; expense: number }>();
  for (const tx of currentMonthTransactions(state, currency)) {
    const key = tx.occurred_at.slice(0, 10);
    const point = days.get(key) ?? { income: 0, expense: 0 };
    point[tx.kind === "income" ? "income" : "expense"] += tx.amount;
    days.set(key, point);
  }
  const series = [...days.entries()].sort(([a], [b]) => a.localeCompare(b));
  const max = Math.max(1, ...series.flatMap(([, value]) => [value.income, value.expense]));
  const line = (kind: "income" | "expense") => series.map(([, value], index) => `${series.length === 1 ? 50 : 12 + index * (976 / (series.length - 1))},${148 - (value[kind] / max) * 118}`).join(" ");

  return <div className="desk-section">
    <div className="desk-section-heading"><div><span className="desk-eyebrow">reports / current month</span><h1>{copy.reports}</h1></div><span className="desk-sync"><i /> live ledger</span></div>
    <dl className="desk-strip-metrics"><div><dt>Net flow</dt><dd className={summary.income - summary.expenses >= 0 ? "is-positive" : "is-negative"}>{formatMoney(summary.income - summary.expenses, currency, locale)}</dd></div><div><dt>Save rate</dt><dd>{summary.income ? Math.round(summary.saved / summary.income * 100) : 0}%</dd></div><div><dt>Scheduled outflow</dt><dd>{formatMoney(summary.upcomingExpense, currency, locale)}</dd></div><div><dt>Projected position</dt><dd>{formatMoney(summary.projected, currency, locale)}</dd></div></dl>
    <section className="desk-panel desk-report-flow"><div className="desk-panel-heading"><div className="desk-inline-title"><Activity size={16} /><h2>Daily pulse</h2></div><span className="desk-panel-note">income / expense</span></div>{series.length ? <figure><figcaption className="sr-only">Daily income and expenses in the current month</figcaption><div className="desk-report-legend"><span><i className="is-income" />income</span><span><i className="is-expense" />expense</span></div><svg viewBox="0 0 1000 170" role="img"><line x1="10" y1="150" x2="990" y2="150" className="desk-chart-grid"/><polyline points={line("income")} className="desk-report-line is-income" pathLength="1"/><polyline points={line("expense")} className="desk-report-line is-expense" pathLength="1"/></svg></figure> : <p className="desk-empty-inline">No activity in the current month.</p>}</section>
    <div className="desk-report-grid"><section className="desk-panel"><div className="desk-panel-heading"><div className="desk-inline-title"><Gauge size={16}/><h2>{copy.budgetPressure}</h2></div></div><BudgetPressure state={state} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "budget", id })}/></section><section className="desk-panel"><div className="desk-panel-heading"><div className="desk-inline-title"><Route size={16}/><h2>Goal runway</h2></div></div><GoalRunway goals={state.goals} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "goal", id })}/></section></div>
  </div>;
}
