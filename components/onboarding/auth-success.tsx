"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono } from "@/components/ui/sam-primitives";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import type { AuthLogLine } from "./onboarding-app";

export function AuthSuccess({
  isNewUser,
  userName,
  logLines,
}: {
  isNewUser: boolean;
  userName: string;
  logLines: AuthLogLine[];
}) {
  const { sam } = useSam();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(reducedMotion ? logLines.length : 0);
  const colorOf = (c: AuthLogLine["c"]) => sam[c];

  useEffect(() => {
    if (reducedMotion) {
      setVisible(logLines.length);
      return;
    }
    setVisible(0);
    const ids = logLines.map((_, i) => window.setTimeout(() => setVisible(i + 1), 180 + i * 260));
    return () => ids.forEach(window.clearTimeout);
  }, [logLines, reducedMotion]);

  const enter = () => {
    router.push("/app");
    router.refresh();
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-[22px]"
      style={{
        background: sam.bg,
        color: sam.text,
        fontFamily: sam.font,
        paddingTop: "max(18px, calc(env(safe-area-inset-top, 0px) + 10px))",
        paddingBottom: "max(18px, calc(env(safe-area-inset-bottom, 0px) + 10px))",
      }}
    >
      <div
        className="sam-pop"
        style={{
          fontSize: 48,
          color: sam.green,
          textShadow: `0 0 24px ${sam.green}55`,
        }}
      >
        ✓
      </div>
      <h2
        style={{
          margin: "14px 0 0",
          fontSize: 24,
          fontWeight: 700,
          color: sam.text,
          textAlign: "center",
          letterSpacing: -0.5,
        }}
      >
        {isNewUser ? "vault created" : "welcome back"}
      </h2>
      <div style={{ marginTop: 6, fontSize: 12, color: sam.comment, textAlign: "center" }}>
        {isNewUser ? `// starting fresh · ${userName}` : `// session restored · ${userName}`}
      </div>
      <div
        style={{
          marginTop: 18,
          width: "100%",
          maxWidth: 420,
          padding: 12,
          background: sam.bgAlt,
          border: `1px solid ${sam.border}`,
          fontSize: 11,
          lineHeight: 1.7,
          minHeight: 104,
          boxSizing: "border-box",
        }}
      >
        {logLines.slice(0, visible).map((l, i) => (
          <div key={`${l.text}-${i}`} className={reducedMotion ? undefined : "sam-fade-in"}>
            <Mono c={colorOf(l.c)}>{l.text}</Mono>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={enter}
        style={{
          marginTop: 22,
          padding: "12px 28px",
          background: sam.green,
          color: sam.bg,
          fontFamily: sam.font,
          fontSize: 13,
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
        }}
      >
        [enter sam ▸]
      </button>
      <div
        style={{
          marginTop: 14,
          fontFamily: sam.font,
          fontSize: 10,
          color: sam.comment,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        <Mono c={sam.comment}>accounts linked · categories ready</Mono>
        <br />
        <Mono c={sam.comment}>market data synced</Mono>
      </div>
    </div>
  );
}
