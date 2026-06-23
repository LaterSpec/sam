"use client";

import type { CSSProperties, ReactNode } from "react";
import { useSam } from "@/lib/theme/sam-theme";

export function Mono({
  children,
  c,
  b,
  style,
}: {
  children: ReactNode;
  c?: string;
  b?: boolean;
  style?: CSSProperties;
}) {
  const { sam } = useSam();
  return (
    <span style={{ color: c || sam.text, fontWeight: b ? 600 : 400, ...style }}>{children}</span>
  );
}

export function Comment({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const { sam } = useSam();
  return (
    <div style={{ color: sam.comment, fontSize: 12, lineHeight: 1.5, ...style }}>
      {"// "}
      {children}
    </div>
  );
}

export function Prompt({ user, host, cmd }: { user?: string; host: string; cmd: string }) {
  const { sam } = useSam();
  return (
    <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6, wordBreak: "break-word" }}>
      <Mono c={sam.text} b>
        {user || "you"}
      </Mono>
      <Mono c={sam.text} b>
        @{host}
      </Mono>
      <Mono c={sam.yellow} b>
        {" "}
        ${" "}
      </Mono>
      <Mono c={sam.cyan} b>
        {cmd}
      </Mono>
    </div>
  );
}

export function userHandleFromState(state: {
  user?: { username?: string | null; full_name?: string | null; email?: string | null };
}) {
  const user = state.user;
  const base = user?.username || user?.full_name || user?.email?.split("@")[0] || "you";
  return String(base).trim().split(/\s+/)[0].replace(/\s/g, "").toLowerCase() || "you";
}

export function ScreenHeader({ children }: { children: ReactNode }) {
  const { sam } = useSam();
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        paddingTop: 0,
        background: sam.bg,
        borderBottom: `1px solid ${sam.border}`,
      }}
    >
      {children}
    </div>
  );
}

export function BlockBar({
  pct,
  width = 10,
  c,
}: {
  pct: number;
  width?: number;
  c?: string;
}) {
  const { sam } = useSam();
  const color = c || sam.green;
  const safePct = Number.isFinite(pct) ? pct : 0;
  const filled = Math.max(0, Math.min(width, Math.round((safePct / 100) * width)));
  const empty = Math.max(0, width - filled);
  return (
    <span
      aria-label={`${Math.max(0, Math.min(100, Math.round(safePct)))}%`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "1px 2px",
        border: `1px solid ${sam.progressBorder}`,
        background: sam.progressTrack,
        boxShadow: `inset 0 0 0 1px ${sam.overlay}`,
        color,
        letterSpacing: -1,
        lineHeight: 1,
        fontFamily: sam.font,
        verticalAlign: "middle",
      }}
    >
      <span>{filled > 0 ? "█".repeat(filled) : ""}</span>
      <span style={{ color: sam.progressEmpty }}>{empty > 0 ? "░".repeat(empty) : ""}</span>
    </span>
  );
}

export function BarH({ pct, c }: { pct: number; c?: string }) {
  const { sam } = useSam();
  const color = c || sam.yellow;
  const safePct = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
  return (
    <div
      aria-label={`${Math.round(safePct)}%`}
      style={{
        width: "100%",
        height: 8,
        padding: 1,
        background: sam.progressTrack,
        border: `1px solid ${sam.progressBorder}`,
        boxShadow: `inset 0 0 0 1px ${sam.overlay}`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${safePct}%`,
          height: "100%",
          background: color,
          transition: "width 420ms cubic-bezier(.2,.9,.2,1)",
        }}
      />
    </div>
  );
}

export function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange?: (t: string) => void;
}) {
  const { sam } = useSam();
  const idx = Math.max(0, tabs.indexOf(active));
  const pct = 100 / tabs.length;
  return (
    <div
      style={{
        display: "flex",
        fontSize: 15,
        padding: "0 0 12px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {tabs.map((t) => {
        const isActive = t === active;
        return (
          <div
            key={t}
            onClick={() => onChange?.(t)}
            style={{
              flex: 1,
              textAlign: "center",
              cursor: "pointer",
              color: isActive ? sam.accent : sam.comment,
              fontWeight: isActive ? 600 : 400,
              position: "relative",
              paddingBottom: 4,
              transition: "color 200ms ease-out",
            }}
          >
            {t}
          </div>
        );
      })}
      <div
        style={{
          position: "absolute",
          bottom: -1,
          height: 2,
          width: `${pct * 0.6}%`,
          left: `${pct * idx + pct * 0.2}%`,
          background: sam.accent,
          boxShadow: `0 0 8px ${sam.accent}66`,
          transition: "left 300ms cubic-bezier(.2,.9,.2,1)",
        }}
      />
    </div>
  );
}
