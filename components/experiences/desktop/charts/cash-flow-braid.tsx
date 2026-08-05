"use client";

import { compactMoney } from "../desktop-data";
import type { Currency } from "@/lib/finance/currency";

type CashFlowBraidProps = {
  income: number;
  obligations: number;
  flexible: number;
  savings: number;
  projected: number;
  currency: Currency;
  labels: {
    income: string;
    obligations: string;
    flexible: string;
    savings: string;
    projected: string;
    empty: string;
  };
};

export function CashFlowBraid({
  income,
  obligations,
  flexible,
  savings,
  projected,
  currency,
  labels,
}: CashFlowBraidProps) {
  const max = Math.max(1, income, obligations, flexible, savings);
  const hasFlow = income + obligations + flexible + savings > 0;
  const streams = [
    { label: labels.income, value: income, color: "var(--desk-positive)", y: 38, bend: 72 },
    { label: labels.obligations, value: obligations, color: "var(--desk-pending)", y: 68, bend: 58 },
    { label: labels.flexible, value: flexible, color: "var(--desk-risk)", y: 98, bend: 82 },
    { label: labels.savings, value: savings, color: "var(--desk-info)", y: 128, bend: 106 },
  ];

  return (
    <figure className="desk-braid" aria-labelledby="cash-flow-braid-title">
      <figcaption id="cash-flow-braid-title" className="sr-only">
        {labels.projected}: {compactMoney(projected, currency)}
      </figcaption>
      <div className="desk-braid__legend" aria-hidden="true">
        {streams.map((stream) => (
          <span key={stream.label}>
            <i style={{ background: stream.color }} />
            {stream.label}
          </span>
        ))}
      </div>
      <svg viewBox="0 0 1000 170" role="img" aria-label={`${labels.projected}: ${compactMoney(projected, currency)}`}>
        <line x1="0" x2="1000" y1="150" y2="150" className="desk-chart-grid" />
        {hasFlow && streams.map((stream, index) => {
          const width = Math.max(2, 2 + (stream.value / max) * 8);
          return (
            <path
              key={stream.label}
              className="desk-braid__path"
              d={`M 18 ${stream.y} C 220 ${stream.y - 18}, 310 ${stream.bend + index * 3}, 500 ${stream.bend} S 770 ${104 - index * 8}, 900 82`}
              fill="none"
              stroke={stream.color}
              strokeWidth={width}
              strokeLinecap="round"
              pathLength="1"
            />
          );
        })}
        <line x1="900" x2="900" y1="26" y2="145" className="desk-chart-now" />
        <circle cx="900" cy="82" r="5" fill="var(--desk-info)" />
        <text x="920" y="70" className="desk-chart-label">{labels.projected}</text>
        <text x="920" y="93" className="desk-chart-value">{compactMoney(projected, currency)}</text>
        {!hasFlow && <text x="18" y="88" className="desk-chart-empty">{labels.empty}</text>}
      </svg>
    </figure>
  );
}
