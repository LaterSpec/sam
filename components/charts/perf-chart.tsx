"use client";

import { useSam } from "@/lib/theme/sam-theme";

export type PerfPoint = { t: string; v: number };

type PerfChartProps = {
  points: PerfPoint[];
  height?: number;
  color?: string;
  intraday?: boolean;
};

export function fmtMoneyShort(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(1)}k`;
  return `$${v.toFixed(a < 10 ? 2 : 0)}`;
}

export function PerfChart({ points, height = 156, color, intraday }: PerfChartProps) {
  const { sam } = useSam();
  if (!points || points.length < 2) return null;

  const W = 340;
  const H = height;
  const padL = 52;
  const padR = 12;
  const padT = 12;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const vals = points.map((p) => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const rng = max - min || Math.abs(max) || 1;
  const lo = min - rng * 0.1;
  const hi = max + rng * 0.1;
  const span = hi - lo || 1;

  const xStep = innerW / (points.length - 1);
  const xy = points.map((p, i) => [
    padL + i * xStep,
    padT + innerH * (1 - (p.v - lo) / span),
  ] as const);
  const up = points[points.length - 1].v >= points[0].v;
  const c = color || (up ? sam.green : sam.red);

  const line = xy
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xy[xy.length - 1][0].toFixed(1)},${(padT + innerH).toFixed(1)} L${xy[0][0].toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
  const gid = `perf-grad-${c.replace("#", "")}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => lo + span * (1 - t));
  const tickGap = span / (yTicks.length - 1);
  const fmtAxis = (v: number) => {
    const a = Math.abs(v);
    if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (a >= 1e4) return `$${(v / 1e3).toFixed(1)}k`;
    const dec = tickGap >= 50 ? 0 : tickGap >= 5 ? 1 : 2;
    return `$${v.toFixed(dec)}`;
  };
  const fmtDate = (s: string) => {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return intraday
      ? d.toLocaleTimeString("en", { hour: "numeric", minute: "2-digit" })
      : d.toLocaleDateString("en", { month: "short", day: "numeric" });
  };
  const xIdx = Array.from(
    new Set([0, Math.round((points.length - 1) / 2), points.length - 1])
  );

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.30" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((v, i) => {
        const y = padT + (innerH / (yTicks.length - 1)) * i;
        return (
          <g key={`y${i}`}>
            <line
              x1={padL}
              y1={y}
              x2={W - padR}
              y2={y}
              stroke={sam.border}
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <text
              x={padL - 6}
              y={y + 3}
              fill={sam.comment}
              fontSize="9"
              fontFamily={sam.font}
              textAnchor="end"
            >
              {fmtAxis(v)}
            </text>
          </g>
        );
      })}

      {xIdx.map((idx, i) => {
        const x = xy[idx][0];
        return (
          <text
            key={`x${i}`}
            x={x}
            y={H - 5}
            fill={sam.comment}
            fontSize="9"
            fontFamily={sam.font}
            textAnchor={i === 0 ? "start" : i === xIdx.length - 1 ? "end" : "middle"}
          >
            {fmtDate(points[idx].t)}
          </text>
        );
      })}

      <line x1={padL} y1={padT} x2={padL} y2={padT + innerH} stroke={sam.border} strokeWidth="1" />
      <line
        x1={padL}
        y1={padT + innerH}
        x2={W - padR}
        y2={padT + innerH}
        stroke={sam.border}
        strokeWidth="1"
      />

      <path d={area} fill={`url(#${gid})`} stroke="none" />
      <path
        d={line}
        fill="none"
        stroke={c}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={xy[xy.length - 1][0]}
        cy={xy[xy.length - 1][1]}
        r="3.2"
        fill={c}
        stroke={sam.bg}
        strokeWidth="1.5"
      />
    </svg>
  );
}
