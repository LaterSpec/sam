import { CandlestickChart, Gauge, Route } from "lucide-react";
import { BudgetPressure } from "../charts/budget-pressure";
import { GoalRunway } from "../charts/goal-runway";
import { currentMonthTransactions, desktopSummary, formatMoney } from "../desktop-data";
import type { DesktopCopy } from "../desktop-copy";
import type { DesktopSectionProps } from "../types";

export function ReportsSection({ state, currency, onSelect, copy, locale }: DesktopSectionProps & { copy: DesktopCopy; locale: string }) {
  const summary = desktopSummary(state, currency);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const byDay = new Map<number, { income: number; expense: number }>();
  for (const tx of currentMonthTransactions(state, currency)) {
    const day = new Date(tx.occurred_at).getDate();
    const point = byDay.get(day) ?? { income: 0, expense: 0 };
    if (tx.kind === "income") point.income += tx.amount;
    else point.expense += tx.amount;
    byDay.set(day, point);
  }
  const series = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    return { day, ...(byDay.get(day) ?? { income: 0, expense: 0 }) };
  });
  const max = Math.max(1, ...series.flatMap((value) => [value.income, value.expense]));
  const hasActivity = series.some((value) => value.income > 0 || value.expense > 0);
  const padL = 36;
  const padR = 16;
  const padT = 18;
  const padB = 28;
  const w = 1000;
  const h = 200;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const slot = plotW / daysInMonth;
  const barW = Math.max(2.5, slot * 0.32);

  return (
    <div className="desk-section">
      <div className="desk-section-heading">
        <div>
          <span className="desk-eyebrow">reports / current month</span>
          <h1>{copy.reports}</h1>
        </div>
        <span className="desk-sync"><i /> live ledger</span>
      </div>
      <dl className="desk-strip-metrics">
        <div><dt>Net flow</dt><dd className={summary.income - summary.expenses >= 0 ? "is-positive" : "is-negative"}>{formatMoney(summary.income - summary.expenses, currency, locale)}</dd></div>
        <div><dt>Save rate</dt><dd>{summary.income ? Math.round((summary.saved / summary.income) * 100) : 0}%</dd></div>
        <div><dt>Scheduled outflow</dt><dd>{formatMoney(summary.upcomingExpense, currency, locale)}</dd></div>
        <div><dt>Projected position</dt><dd>{formatMoney(summary.projected, currency, locale)}</dd></div>
      </dl>
      <section className="desk-panel desk-report-flow">
        <div className="desk-panel-heading">
          <div className="desk-inline-title"><CandlestickChart size={16} /><h2>Daily tape</h2></div>
          <span className="desk-panel-note">income / expense by day</span>
        </div>
        {hasActivity ? (
          <figure>
            <figcaption className="sr-only">Daily income and expenses in the current month</figcaption>
            <div className="desk-report-legend">
              <span><i className="is-income" />income</span>
              <span><i className="is-expense" />expense</span>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} role="img">
              {[0.25, 0.5, 0.75, 1].map((t) => {
                const y = padT + plotH - t * plotH;
                return <line key={t} x1={padL} x2={w - padR} y1={y} y2={y} className="desk-chart-grid" />;
              })}
              {series.map((point) => {
                const x = padL + (point.day - 0.5) * slot;
                const incomeH = (point.income / max) * plotH;
                const expenseH = (point.expense / max) * plotH;
                return (
                  <g key={point.day}>
                    <rect
                      className="desk-report-bar is-income"
                      x={x - barW - 1}
                      y={padT + plotH - incomeH}
                      width={barW}
                      height={Math.max(point.income > 0 ? 2 : 0, incomeH)}
                    />
                    <rect
                      className="desk-report-bar is-expense"
                      x={x + 1}
                      y={padT + plotH - expenseH}
                      width={barW}
                      height={Math.max(point.expense > 0 ? 2 : 0, expenseH)}
                    />
                    {(point.day === 1 || point.day === now.getDate() || point.day === daysInMonth || point.day % 5 === 0) && (
                      <text x={x} y={h - 8} textAnchor="middle" className="desk-chart-label">{point.day}</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </figure>
        ) : (
          <p className="desk-empty-inline">No activity in the current month.</p>
        )}
      </section>
      <div className="desk-report-grid">
        <section className="desk-panel">
          <div className="desk-panel-heading"><div className="desk-inline-title"><Gauge size={16} /><h2>{copy.budgetPressure}</h2></div></div>
          <BudgetPressure state={state} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "budget", id })} />
        </section>
        <section className="desk-panel">
          <div className="desk-panel-heading"><div className="desk-inline-title"><Route size={16} /><h2>Goal runway</h2></div></div>
          <GoalRunway goals={state.goals} currency={currency} locale={locale} onSelect={(id) => onSelect({ kind: "goal", id })} />
        </section>
      </div>
    </div>
  );
}
