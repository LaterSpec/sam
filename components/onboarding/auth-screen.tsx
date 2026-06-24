"use client";

import { useState } from "react";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono } from "@/components/ui/sam-primitives";
import { useTypewriter } from "./hooks/use-typewriter";
import { Cursor } from "./cursor";
import { signInWithGoogle } from "@/lib/auth/client";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";
import { AuthForm } from "./auth-form";

type AuthView = "picker" | "login" | "signup";

export function AuthScreen({
  onBack,
  onEmailSuccess,
}: {
  onBack: () => void;
  onEmailSuccess: (mode: "login" | "signup", displayName?: string) => void;
}) {
  const [view, setView] = useState<AuthView>("picker");

  if (view === "login") {
    return (
      <AuthForm
        mode="login"
        onBack={() => setView("picker")}
        onSwitchMode={() => setView("signup")}
        onSuccess={onEmailSuccess}
      />
    );
  }

  if (view === "signup") {
    return (
      <AuthForm
        mode="signup"
        onBack={() => setView("picker")}
        onSwitchMode={() => setView("login")}
        onSuccess={onEmailSuccess}
      />
    );
  }

  return <AuthPicker onBack={onBack} onPick={(m) => setView(m)} />;
}

function AuthPicker({
  onBack,
  onPick,
}: {
  onBack: () => void;
  onPick: (mode: "login" | "signup") => void;
}) {
  const { sam } = useSam();
  const skipMotion = useReducedMotion();
  const tagline = useTypewriter("init.Sam · authenticate to continue", 1400, 0, skipMotion);
  const [hover, setHover] = useState<"login" | "signup" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleGoogle = async () => {
    setBusy(true);
    setError("");
    try {
      await signInWithGoogle();
    } catch (e) {
      setError(e instanceof Error ? e.message : "sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-[18px]"
      style={{
        background: sam.bg,
        color: sam.text,
        fontFamily: sam.font,
        paddingTop: "max(18px, calc(env(safe-area-inset-top, 0px) + 10px))",
        paddingBottom: "max(18px, calc(env(safe-area-inset-bottom, 0px) + 10px))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: sam.comment }}>
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          style={{
            cursor: "pointer",
            background: "none",
            border: "none",
            color: sam.comment,
            fontFamily: sam.font,
            fontSize: 11,
          }}
        >
          ◂ back
        </button>
        <span style={{ flex: 1 }} />
        <Mono c={sam.yellow} b>
          SAM
        </Mono>
      </div>

      <div style={{ marginTop: 26 }}>
        <div style={{ fontSize: 11, color: sam.comment }}>
          <Mono c={sam.green}>$</Mono> {tagline}
          {!skipMotion && <Cursor c={sam.green} />}
        </div>
        <h1
          style={{
            margin: "12px 0 0",
            fontFamily: sam.font,
            fontSize: 30,
            fontWeight: 700,
            lineHeight: 1.1,
            color: sam.text,
            letterSpacing: -0.5,
          }}
        >
          welcome to <span style={{ color: sam.yellow }}>SAM</span>
        </h1>
        <div style={{ marginTop: 8, fontSize: 13, color: sam.textDim, lineHeight: 1.5 }}>
          <span style={{ color: sam.comment }}>// </span>
          your money, in plain text.
        </div>
      </div>

      <div
        style={{
          marginTop: 22,
          padding: "14px 16px",
          border: `1px dashed ${sam.border}`,
          background: sam.overlay,
        }}
      >
        <div style={{ fontSize: 11, color: sam.comment, marginBottom: 6 }}>{`// pick one to continue`}</div>
        <pre
          style={{
            margin: 0,
            fontFamily: sam.font,
            fontSize: 11,
            color: sam.cyan,
            lineHeight: 1.3,
          }}
        >{`  ╭─[ session ]
  ├─ ${hover === "login" ? "▸" : " "} returning      → log in
  ├─ ${hover === "signup" ? "▸" : " "} new to sam     → sign up
  └─ ▸ google oauth      → vault access`}</pre>
      </div>

      <div style={{ height: "clamp(20px, 4dvh, 42px)", flex: "0 0 auto" }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => onPick("login")}
          onMouseEnter={() => setHover("login")}
          onMouseLeave={() => setHover(null)}
          style={{
            padding: "14px 16px",
            cursor: busy ? "default" : "pointer",
            background: sam.yellow,
            color: sam.bg,
            fontFamily: sam.font,
            fontSize: 14,
            fontWeight: 700,
            border: "none",
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 10,
            letterSpacing: 0.3,
          }}
        >
          <span>›</span>
          <span>[ log in ]</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, opacity: 0.6 }}>returning</span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={() => onPick("signup")}
          onMouseEnter={() => setHover("signup")}
          onMouseLeave={() => setHover(null)}
          style={{
            padding: "14px 16px",
            cursor: busy ? "default" : "pointer",
            background: "transparent",
            color: sam.cyan,
            fontFamily: sam.font,
            fontSize: 14,
            fontWeight: 700,
            border: `1px solid ${sam.cyan}`,
            textAlign: "left",
            display: "flex",
            alignItems: "center",
            gap: 10,
            letterSpacing: 0.3,
          }}
        >
          <span>›</span>
          <span>[ sign up ]</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, opacity: 0.7, color: sam.comment }}>new account</span>
        </button>

        <div
          style={{
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 11,
            color: sam.comment,
          }}
        >
          <div style={{ flex: 1, height: 1, background: sam.border }} />
          <span>or</span>
          <div style={{ flex: 1, height: 1, background: sam.border }} />
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={handleGoogle}
          style={{
            width: "100%",
            padding: "14px 16px",
            cursor: busy ? "wait" : "pointer",
            background: "transparent",
            color: sam.text,
            fontFamily: sam.font,
            fontSize: 14,
            fontWeight: 700,
            border: `1px solid ${sam.border}`,
            letterSpacing: 0.3,
            opacity: busy ? 0.7 : 1,
          }}
        >
          {busy ? "[ redirecting to google... ]" : "[ log in with google ▸ ]"}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 10, fontSize: 11, color: sam.red, textAlign: "center" }}>{error}</div>
      )}

      <div style={{ marginTop: 16, fontSize: 10, color: sam.comment, textAlign: "center", lineHeight: 1.4 }}>
        {`// by continuing you agree to terms · privacy`}
      </div>
    </div>
  );
}
