"use client";

import { useEffect, useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono } from "@/components/ui/sam-primitives";
import { useCountUp } from "../hooks/use-count-up";
import { useProgress } from "../hooks/use-progress";
import { Cursor } from "../cursor";

type SlideProps = {
  active: boolean;
  slideKey: number;
  skipMotion?: boolean;
};

export function SlideTrack({ active, slideKey, skipMotion }: SlideProps) {
  const { sam } = useSam();
  const lines = [
    { t: 800, text: "you@sam $ tx --add", c: sam.cyan },
    { t: 1200, text: "› starbucks · -$6.50", c: sam.text, indent: true },
    { t: 1600, text: "you@sam $ tx --add", c: sam.cyan },
    { t: 2000, text: "› uber · -$14.20", c: sam.text, indent: true },
    { t: 2400, text: "you@sam $ tx --add", c: sam.cyan },
    { t: 2800, text: "› payroll · +$3,200", c: sam.green, indent: true },
    { t: 3200, text: "✓ logged · synced · categorized", c: sam.green },
  ];
  const k = active ? slideKey : -1;
  const [t, setT] = useState(skipMotion ? 5000 : 0);

  useEffect(() => {
    if (!active) {
      setT(0);
      return;
    }
    if (skipMotion) {
      setT(5000);
      return;
    }
    setT(0);
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      setT(now - start);
      if (now - start < 4000) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [k, active, skipMotion]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: sam.bgAlt,
        border: `1px solid ${sam.border}`,
        padding: "14px 16px",
        fontFamily: sam.font,
        fontSize: 13,
        color: sam.text,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: sam.red }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: sam.yellow }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: sam.green }} />
        <span style={{ flex: 1, textAlign: "center", fontSize: 11, color: sam.comment }}>~/sam — bash</span>
      </div>
      <div style={{ flex: 1, lineHeight: 1.7 }}>
        {lines.map(
          (line, i) =>
            t >= line.t && (
              <div
                key={i}
                className="sam-fade-in"
                style={{ paddingLeft: line.indent ? 14 : 0 }}
              >
                <Mono c={line.c} b={!line.indent}>
                  {line.text}
                </Mono>
              </div>
            )
        )}
        {t > 4000 ? <Cursor /> : <Cursor c={sam.text} />}
      </div>
    </div>
  );
}

export function SlideOverview({ active, slideKey, skipMotion }: SlideProps) {
  const { sam } = useSam();
  const k = active ? slideKey : -1;
  const balance = useCountUp(8420.5, 1000, k, skipMotion);
  const p = useProgress(1500, k, skipMotion);
  const cats = [
    { n: "Food", v: 380, c: sam.orange },
    { n: "Housing", v: 850, c: sam.cyan },
    { n: "Transport", v: 220, c: sam.magenta },
    { n: "Subs", v: 28, c: sam.yellow },
    { n: "Ent.", v: 112, c: sam.green },
  ];
  const max = Math.max(...cats.map((c) => c.v));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: sam.bgAlt,
        border: `1px solid ${sam.border}`,
        padding: "14px 16px",
        fontFamily: sam.font,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: sam.comment }}>
          <Mono c={sam.yellow}>$</Mono> total_balance
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: sam.yellow,
            letterSpacing: -0.5,
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          ${Math.floor(balance).toLocaleString()}
          <span style={{ color: sam.comment, fontSize: 18 }}>
            .{((balance % 1) * 100).toFixed(0).padStart(2, "0")}
          </span>
        </div>
        <div style={{ fontSize: 11, color: sam.green, marginTop: 2 }}>▲ 4.2% this month</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 12, color: sam.cyan, fontWeight: 600 }}>▸ April spend by category</div>
        {cats.map((c, i) => {
          const w = (c.v / max) * 100 * Math.min(1, p * 1.5 - i * 0.08);
          return (
            <div key={i} style={{ fontSize: 11 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                <Mono c={c.c}>{c.n}</Mono>
                <span style={{ flex: 1 }} />
                <Mono c={sam.text} style={{ fontVariantNumeric: "tabular-nums" }}>
                  ${c.v}
                </Mono>
              </div>
              <div style={{ height: 6, background: "rgba(255,255,255,0.04)" }}>
                <div style={{ width: `${Math.max(0, w)}%`, height: "100%", background: c.c }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SlideGoals({ active, slideKey, skipMotion }: SlideProps) {
  const { sam } = useSam();
  const k = active ? slideKey : -1;
  const p = useProgress(2000, k, skipMotion);
  const goals = [
    { name: "Emergency fund", icon: "🛡", target: 10000, saved: 6400, c: sam.yellow, delay: 0 },
    { name: "Trip to Japan", icon: "✈", target: 4500, saved: 1230, c: sam.cyan, delay: 0.15 },
    { name: "New MacBook", icon: "◼", target: 2400, saved: 2400, c: sam.green, delay: 0.3, done: true },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: sam.bgAlt,
        border: `1px solid ${sam.border}`,
        padding: "14px 16px",
        fontFamily: sam.font,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: sam.comment }}>
          <Mono c={sam.cyan}>◎</Mono> goals.status
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: sam.text, marginTop: 2 }}>3 active · 1 completed</div>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11 }}>
        {goals.map((g, i) => {
          const localP = Math.max(0, Math.min(1, (p - g.delay) / (1 - g.delay)));
          const pct = Math.round((g.saved / g.target) * 100 * localP);
          const done = g.done && pct >= 99;
          return (
            <div
              key={i}
              style={{
                padding: 10,
                border: `1px solid ${done ? sam.green + "55" : sam.border}`,
                background: done ? "rgba(86,211,100,0.04)" : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, fontSize: 12 }}>
                <Mono c={done ? sam.green : sam.comment} b>
                  {done ? "[✓]" : "[ ]"}
                </Mono>
                <Mono>{g.icon}</Mono>
                <Mono c={sam.text} b>
                  {g.name}
                </Mono>
                <span style={{ flex: 1 }} />
                <Mono c={done ? sam.green : g.c}>{pct}%</Mono>
              </div>
              <div style={{ marginTop: 6, fontSize: 10, fontFamily: sam.font, letterSpacing: -1 }}>
                {Array.from({ length: 18 }).map((_, j) => (
                  <span
                    key={j}
                    style={{
                      color:
                        j < (pct / 100) * 18 ? (done ? sam.green : g.c) : "rgba(240,246,252,0.1)",
                    }}
                  >
                    {j < (pct / 100) * 18 ? "█" : "░"}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SlidePlan({ active, slideKey, skipMotion }: SlideProps) {
  const { sam } = useSam();
  const k = active ? slideKey : -1;
  const p = useProgress(1600, k, skipMotion);
  const commitments = [
    { date: "29", name: "Rent", amount: "$850", c: sam.yellow },
    { date: "31", name: "Internet", amount: "$49", c: sam.cyan },
    { date: "02", name: "Card payment", amount: "$180", c: sam.magenta },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: sam.bgAlt,
        border: `1px solid ${sam.border}`,
        padding: "14px 16px",
        fontFamily: sam.font,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        overflow: "hidden",
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: sam.comment }}>
          <Mono c={sam.yellow}>◇</Mono> projected_close
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: sam.yellow,
            letterSpacing: -0.5,
            marginTop: 2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          $1,290.45
        </div>
        <div style={{ fontSize: 11, color: sam.green, marginTop: 2 }}>+$210 above your monthly plan</div>
      </div>
      <div style={{ position: "relative", height: 42, borderBottom: `1px solid ${sam.border}` }}>
        {[sam.green, sam.yellow, sam.cyan].map((color, i) => (
          <div key={color} style={{ position: "absolute", left: 0, right: `${Math.max(0, 100 - p * 100 + i * 7)}%`, top: 8 + i * 9, height: 2, background: color, transition: "right 500ms cubic-bezier(.2,.9,.2,1)" }} />
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ fontSize: 12, color: sam.cyan, fontWeight: 600 }}>▸ next commitments</div>
        {commitments.map((item, i) => {
          const show = p > i * 0.12;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
                fontSize: 12,
                opacity: show ? 1 : 0.2,
                transition: "opacity 240ms",
              }}
            >
              <Mono c={item.c} b>{item.date}</Mono>
              <Mono c={sam.comment} style={{ fontSize: 11 }}>
                {item.name}
              </Mono>
              <span style={{ flex: 1 }} />
              <Mono c={sam.text} b>{item.amount}</Mono>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SlidePrivacy({ active, slideKey, skipMotion }: SlideProps) {
  const { sam } = useSam();
  const k = active ? slideKey : -1;
  const p = useProgress(1800, k, skipMotion);
  const bullets = [
    { t: "AES-256 at rest", done: p > 0.25, c: sam.green },
    { t: "TLS 1.3 in transit", done: p > 0.45, c: sam.green },
    { t: "No data sold · ever", done: p > 0.65, c: sam.cyan },
    { t: "Read-only sync", done: p > 0.85, c: sam.yellow },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: sam.bgAlt,
        border: `1px solid ${sam.border}`,
        padding: "14px 16px",
        fontFamily: sam.font,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            fontFamily: sam.font,
            fontSize: 11,
            lineHeight: 1.1,
            color: sam.green,
            textAlign: "center",
            textShadow: `0 0 12px ${sam.green}55`,
            opacity: 0.4 + p * 0.6,
            transform: `scale(${0.85 + p * 0.15})`,
          }}
        >
          <pre style={{ margin: 0, fontFamily: sam.font }}>{` ╭───╮ 
 │   │ 
 │   │ 
╭┴───┴╮
│ ▓▓▓ │
│ ▓▓▓ │
╰─────╯`}</pre>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 12, color: sam.cyan, fontWeight: 600, marginBottom: 8 }}>▸ encryption.audit</div>
        {bullets.map((b, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 8,
              fontSize: 12,
              marginTop: 6,
              opacity: b.done ? 1 : 0.25,
              transition: "opacity 240ms",
            }}
          >
            <Mono c={b.done ? b.c : sam.comment} b>
              [{b.done ? "✓" : " "}]
            </Mono>
            <Mono c={sam.text}>{b.t}</Mono>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SlideMcp({ active, slideKey, skipMotion }: SlideProps) {
  const { sam } = useSam();
  const k = active ? slideKey : -1;
  const [t, setT] = useState(skipMotion ? 5000 : 0);

  useEffect(() => {
    if (!active) {
      setT(0);
      return;
    }
    if (skipMotion) {
      setT(5000);
      return;
    }
    setT(0);
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      setT(now - start);
      if (now - start < 4200) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [k, active, skipMotion]);

  const lines = [
    { t: 700, text: "cursor@ai $ mcp connect sam", c: sam.cyan },
    { t: 1200, text: "→ auth · Bearer sam_mcp_••••", c: sam.comment, indent: true },
    { t: 1700, text: "✓ connected · 34 tools ready", c: sam.green, indent: true },
    { t: 2300, text: "claude@ai $ sam expenses --month", c: sam.magenta },
    { t: 2800, text: "→ 42 tx · $1,820 spent", c: sam.text, indent: true },
    { t: 3400, text: "you stay in control · read or write", c: sam.yellow },
  ];

  const agents = [
    { n: "Cursor", on: t > 1200, c: sam.cyan },
    { n: "Claude", on: t > 2300, c: sam.magenta },
    { n: "Agents", on: t > 3400, c: sam.green },
  ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: sam.bgAlt,
        border: `1px solid ${sam.border}`,
        padding: "14px 16px",
        fontFamily: sam.font,
        fontSize: 13,
        color: sam.text,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Mono c={sam.yellow}>◇</Mono>
        <Mono c={sam.text} b>
          sam.mcp
        </Mono>
        <span style={{ flex: 1 }} />
        {agents.map((a, i) => (
          <Mono
            key={i}
            c={a.on ? a.c : sam.comment}
            style={{ fontSize: 10, opacity: a.on ? 1 : 0.4, transition: "opacity 240ms" }}
          >
            ● {a.n}
          </Mono>
        ))}
      </div>
      <div style={{ flex: 1, lineHeight: 1.7, fontSize: 12 }}>
        {lines.map(
          (line, i) =>
            t >= line.t && (
              <div key={i} className="sam-fade-in" style={{ paddingLeft: line.indent ? 14 : 0 }}>
                <Mono c={line.c} b={!line.indent}>
                  {line.text}
                </Mono>
              </div>
            )
        )}
        {t > 4000 ? <Cursor /> : <Cursor c={sam.text} />}
      </div>
    </div>
  );
}
