"use client";

import { compactMoney, currentMonthTransactions, formatMoney } from "../desktop-data";
import type { AppState } from "@/lib/db/queries/load-user-data";
import type { Currency } from "@/lib/finance/currency";

type CashFlowTapeProps = {
  state: AppState;
  income: number;
  obligations: number;
  expenses: number;
  projected: number;
  balance: number;
  currency: Currency;
  locale: string;
  labels: {
    income: string;
    expenses: string;
    projected: string;
    empty: string;
    balance: string;
  };
};

/** Trading-tape style cash flow: daily net bars + running balance line. */
export function CashFlowBraid({
  state,
  income,
  obligations,
  expenses,
  projected,
  balance,
  currency,
  locale,
  labels,
}: CashFlowTapeProps) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const today = now.getDate();
  const monthTx = currentMonthTransactions(state, currency);
  const byDay = new Map<number, { income: number; expense: number }>();
  for (const tx of monthTx) {
    const day = new Date(tx.occurred_at).getDate();
    const point = byDay.get(day) ?? { income: 0, expense: 0 };
    if (tx.kind === "income") point.income += tx.amount;
    else point.expense += tx.amount;
    byDay.set(day, point);
  }

  const points: Array<{ day: number; net: number; balance: number; income: number; expense: number }> = [];
  let running = balance - income + expenses;
  for (let day = 1; day <= daysInMonth; day++) {
    const bucket = byDay.get(day) ?? { income: 0, expense: 0 };
    if (day <= today) running += bucket.income - bucket.expense;
    points.push({
      day,
      net: bucket.income - bucket.expense,
      balance: day <= today ? running : projected,
      income: bucket.income,
      expense: bucket.expense,
    });
  }

  const hasFlow = monthTx.length > 0 || obligations > 0;
  const values = points.flatMap((p) => (p.day <= today ? [p.balance, p.net] : [projected]));
  const min = Math.min(...values, 0);
  const max = Math.max(...values, projected, 1);
  const span = Math.max(1, max - min);
  const padL = 44;
  const padR = 88;
  const padT = 18;
  const padB = 28;
  const w = 1000;
  const h = 210;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const xFor = (day: number) => padL + ((day - 0.5) / daysInMonth) * plotW;
  const yFor = (value: number) => padT + plotH - ((value - min) / span) * plotH;
  const barW = Math.max(3, (plotW / daysInMonth) * 0.55);
  const line = points
    .filter((p) => p.day <= today)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.day).toFixed(1)} ${yFor(p.balance).toFixed(1)}`)
    .join(" ");
  const futureStart = points.find((p) => p.day === today) ?? points[points.length - 1];
  const gridLevels = [0, 0.25, 0.5, 0.75, 1].map((t) => min + span * t);

  return (
    <figure className="desk-tape" aria-labelledby="cash-flow-tape-title">
      <figcaption id="cash-flow-tape-title" className="sr-only">
        {labels.projected}: {compactMoney(projected, currency)}
      </figcaption>
      <div className="desk-tape__legend" aria-hidden="true">
        <span><i className="is-income" />{labels.income}</span>
        <span><i className="is-expense" />{labels.expenses}</span>
        <span><i className="is-balance" />{labels.balance}</span>
        <span><i className="is-projected" />{labels.projected}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${labels.projected}: ${formatMoney(projected, currency, locale)}`}>
        {gridLevels.map((level) => (
          <g key={level}>
            <line x1={padL} x2={w - padR} y1={yFor(level)} y2={yFor(level)} className="desk-chart-grid" />
            <text x={padL - 8} y={yFor(level) + 3} textAnchor="end" className="desk-chart-label">{compactMoney(level, currency)}</text>
          </g>
        ))}
        {hasFlow && points.map((point) => {
          const x = xFor(point.day);
          const zero = yFor(0);
          const netY = yFor(point.net);
          const top = Math.min(zero, netY);
          const height = Math.max(2, Math.abs(zero - netY));
          const future = point.day > today;
          return (
            <rect
              key={point.day}
              x={x - barW / 2}
              y={point.net === 0 ? zero - 1 : top}
              width={barW}
              height={point.net === 0 ? 2 : height}
              className={`desk-tape__bar ${point.net >= 0 ? "is-income" : "is-expense"}${future ? " is-future" : ""}`}
            />
          );
        })}
        {hasFlow && line && <path d={line} className="desk-tape__line" fill="none" />}
        {hasFlow && futureStart && (
          <line
            x1={xFor(today)}
            y1={yFor(futureStart.balance)}
            x2={w - padR}
            y2={yFor(projected)}
            className="desk-tape__projected"
          />
        )}
        <line x1={xFor(today)} x2={xFor(today)} y1={padT} y2={h - padB} className="desk-chart-now" />
        <circle cx={w - padR} cy={yFor(projected)} r={4.5} className="desk-tape__mark" />
        <text x={w - padR + 10} y={yFor(projected) - 6} className="desk-chart-label">{labels.projected}</text>
        <text x={w - padR + 10} y={yFor(projected) + 12} className="desk-chart-value">{compactMoney(projected, currency)}</text>
        {!hasFlow && <text x={padL} y={h / 2} className="desk-chart-empty">{labels.empty}</text>}
      </svg>
    </figure>
  );
}
