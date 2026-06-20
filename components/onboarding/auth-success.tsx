"use client";

import { useRouter } from "next/navigation";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono } from "@/components/ui/sam-primitives";

export function AuthSuccess({
  isNewUser,
  userName,
}: {
  isNewUser: boolean;
  userName: string;
}) {
  const { sam } = useSam();
  const router = useRouter();

  const enter = () => {
    router.push("/app");
    router.refresh();
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col items-center justify-center px-[22px]"
      style={{ background: sam.bg, color: sam.text, fontFamily: sam.font }}
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
      <button
        type="button"
        onClick={enter}
        style={{
          marginTop: 28,
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
          marginTop: 18,
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
