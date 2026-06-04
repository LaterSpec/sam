"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono } from "@/components/ui/sam-primitives";

const ITEMS = [
  { k: "home", label: "home", icon: "⌂" },
  { k: "expenses", label: "expenses", icon: "$" },
  { k: "invest", label: "invest", icon: "▲" },
  { k: "goals", label: "goals", icon: "◎" },
  { k: "profile", label: "profile", icon: "@" },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: string;
  onChange: (tab: string) => void;
}) {
  const { sam } = useSam();
  const activeIdx = Math.max(0, ITEMS.findIndex((it) => it.k === active));
  const pct = 100 / ITEMS.length;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2"
      style={{
        background: "var(--sam-bg, #0a0e14)",
        borderTop: `1px solid var(--sam-border-nav, rgba(240,246,252,0.08))`,
        fontFamily: sam.font,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -1,
          height: 2,
          width: `${pct}%`,
          left: `${pct * activeIdx}%`,
          background: sam.yellow,
          boxShadow: `0 0 10px ${sam.yellow}aa`,
          transition: "left 340ms cubic-bezier(.2,.9,.2,1)",
        }}
      />
      <div className="flex">
        {ITEMS.map((it) => {
          const isActive = it.k === active;
          return (
            <button
              key={it.k}
              type="button"
              onClick={() => onChange(it.k)}
              className="flex-1 border-0 bg-transparent p-0 text-center"
              style={{
                color: isActive ? sam.yellow : sam.comment,
                cursor: "pointer",
                transition: "color 200ms ease-out",
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  lineHeight: 1,
                  marginBottom: 2,
                  fontWeight: isActive ? 600 : 400,
                  transform: isActive ? "translateY(-2px) scale(1.12)" : "translateY(0) scale(1)",
                  transition: "transform 280ms cubic-bezier(.2,.9,.2,1)",
                  textShadow: isActive ? `0 0 12px ${sam.yellow}66` : "none",
                }}
              >
                {it.icon}
              </div>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: 0.2,
                  opacity: isActive ? 1 : 0.85,
                }}
              >
                {isActive ? `[${it.label}]` : it.label}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function BootScreen({ error, onRetry }: { error?: string; onRetry?: () => void }) {
  const { sam } = useSam();
  return (
    <div
      className="flex min-h-dvh items-center justify-center"
      style={{
        background: "var(--sam-page-bg)",
        fontFamily: sam.font,
        color: sam.text,
      }}
    >
      <div style={{ minWidth: 240 }}>
        <div style={{ fontSize: 13 }}>
          <Mono c={sam.text} b>
            sam
          </Mono>
          <Mono c={sam.text} b>
            @init.SAM
          </Mono>
          <Mono c={sam.yellow} b>
            {" "}
            ${" "}
          </Mono>
          <Mono c={sam.cyan} b>
            ./boot
          </Mono>
        </div>
        {error ? (
          <>
            <div style={{ marginTop: 12, fontSize: 13, color: sam.red }}>✗ {error}</div>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3.5 border-0 bg-transparent p-0 text-[13px]"
              style={{ color: sam.yellow, cursor: "pointer" }}
            >
              [retry ▸]
            </button>
          </>
        ) : (
          <div style={{ marginTop: 12, fontSize: 13, color: sam.green }}>▸ decrypting vault…</div>
        )}
      </div>
    </div>
  );
}
