"use client";

import { useSam } from "@/lib/theme/sam-theme";
import { Mono } from "@/components/ui/sam-primitives";
import { useT } from "@/lib/i18n/i18n-context";
import { NavIcon } from "@/components/experiences/mobile/app/nav-icons";

const ITEMS = [
  { k: "home", label: "home", icon: "home" },
  { k: "expenses", label: "expenses", icon: "expenses" },
  { k: "accounts", label: "accounts", icon: "accounts" },
  { k: "goals", label: "goals", icon: "goals" },
  { k: "profile", label: "profile", icon: "profile" },
] as const;

export function BottomNav({
  active,
  onChange,
}: {
  active: string;
  onChange: (tab: string) => void;
}) {
  const { sam } = useSam();
  const t = useT();
  const activeIdx = Math.max(0, ITEMS.findIndex((it) => it.k === active));
  const pct = 100 / ITEMS.length;

  return (
    <nav
      className="bottom-nav"
      data-bottom-nav
      style={{
        fontFamily: sam.font,
        isolation: "isolate",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 h-0.5 overflow-hidden"
        style={{ isolation: "isolate" }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            height: 2,
            width: `${pct}%`,
            left: `${pct * activeIdx}%`,
            background: sam.yellow,
            boxShadow: `0 2px 8px ${sam.yellow}88`,
            transition: "left 340ms cubic-bezier(.2,.9,.2,1)",
          }}
        />
      </div>
      <div
        className="bottom-nav-inner grid items-center"
        data-bottom-nav-inner
      >
        {ITEMS.map((it) => {
          const isActive = it.k === active;
          return (
            <button
              key={it.k}
              type="button"
              onClick={() => onChange(it.k)}
              className="bottom-nav-item text-center"
              aria-current={isActive ? "page" : undefined}
              aria-label={t(it.label)}
              style={{
                color: isActive ? sam.yellow : sam.comment,
                cursor: "pointer",
                transition: "color 200ms ease-out",
              }}
            >
              <div
                className="bottom-nav-icon flex items-center justify-center"
                style={{
                  transform: isActive ? "scale(1.06)" : "scale(1)",
                  transition: "transform 280ms cubic-bezier(.2,.9,.2,1)",
                  filter: isActive ? `drop-shadow(0 0 10px ${sam.yellow}55)` : "none",
                }}
              >
                <NavIcon name={it.icon} active={isActive} />
              </div>
              <div
                className="bottom-nav-label"
                style={{
                  fontSize: 8,
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: 0.2,
                  opacity: isActive ? 1 : 0.85,
                }}
              >
                {isActive ? `[${t(it.label)}]` : t(it.label)}
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
      className="flex h-full min-h-0 items-center justify-center"
      style={{
        background: "var(--sam-bg)",
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
