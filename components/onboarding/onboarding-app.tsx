"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SamThemeProvider } from "@/lib/theme/sam-theme";
import { Mono, Comment } from "@/components/ui/sam-primitives";
import { useSam } from "@/lib/theme/sam-theme";
import { signIn, signUp } from "@/lib/auth/client";

function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { sam } = useSam();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const pushLog = (line: string) => setLog((l) => [...l.slice(-4), line]);

  const submit = async () => {
    setBusy(true);
    setError("");
    pushLog(`$ auth --${mode} ${email || "…"}`);
    try {
      if (mode === "signup") {
        const res = await signUp.email({ email, password, name: name || email.split("@")[0] });
        if (res.error) throw new Error(res.error.message || "signup failed");
        pushLog("✓ account created");
      } else {
        const res = await signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message || "login failed");
        pushLog("✓ session established");
      }
      router.push("/app");
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "auth failed";
      setError(msg);
      pushLog(`✗ ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <div style={{ fontSize: 13, marginBottom: 16 }}>
        <Mono c={sam.cyan} b>
          $ auth --{mode}
        </Mono>
      </div>

      {mode === "signup" && (
        <label className="mb-4 block">
          <Comment>full name</Comment>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Morris"
            className="mt-1 w-full border bg-transparent px-3 py-2.5 text-sm outline-none"
            style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
          />
        </label>
      )}

      <label className="mb-4 block">
        <Comment>email</Comment>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@sam.app"
          className="mt-1 w-full border bg-transparent px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
        />
      </label>

      <label className="mb-4 block">
        <Comment>password</Comment>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="mt-1 w-full border bg-transparent px-3 py-2.5 text-sm outline-none"
          style={{ borderColor: sam.border, color: sam.text, fontFamily: sam.font }}
        />
      </label>

      {error && (
        <div style={{ color: sam.red, fontSize: 12, marginBottom: 12 }}>{error}</div>
      )}

      <button
        type="button"
        disabled={busy || !email || !password}
        onClick={submit}
        className="w-full border-0 py-3 text-sm font-bold"
        style={{
          background: sam.green,
          color: sam.bg,
          cursor: busy ? "wait" : "pointer",
          opacity: busy || !email || !password ? 0.6 : 1,
          fontFamily: sam.font,
        }}
      >
        [{mode === "signup" ? "create account" : "sign in"} ▸]
      </button>

      <div className="mt-4 space-y-1" style={{ fontSize: 11, color: sam.comment }}>
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}

function Landing({ onGetStarted }: { onGetStarted: () => void }) {
  const { sam } = useSam();
  const slides = [
    { title: "track everything", desc: "expenses, income, accounts — one terminal." },
    { title: "budget with intent", desc: "category caps, alerts, monthly rollover." },
    { title: "invest simulated", desc: "real market data. mock orders. zero risk." },
  ];
  const [idx, setIdx] = useState(0);

  return (
    <div className="flex min-h-dvh flex-col px-4 pb-8 pt-[max(2rem,env(safe-area-inset-top))]">
      <div style={{ fontFamily: sam.font }}>
        <Mono c={sam.yellow} b style={{ fontSize: 28 }}>
          SAM
        </Mono>
        <Comment>personal financial terminal</Comment>
      </div>

      <div
        className="mt-8 flex-1 border p-5"
        style={{ borderColor: sam.border, background: sam.bgAlt, fontFamily: sam.font }}
      >
        <Mono c={sam.cyan} b>
          {slides[idx].title}
        </Mono>
        <div style={{ marginTop: 8, fontSize: 13, color: sam.textDim, lineHeight: 1.6 }}>
          {slides[idx].desc}
        </div>
        <div className="mt-6 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              className="h-1.5 flex-1 border-0 p-0"
              style={{ background: i === idx ? sam.yellow : sam.track }}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onGetStarted}
        className="mt-6 w-full border-0 py-3.5 text-sm font-bold"
        style={{ background: sam.yellow, color: sam.bg, fontFamily: sam.font, cursor: "pointer" }}
      >
        [get started ▸]
      </button>
    </div>
  );
}

export function OnboardingApp() {
  const [stage, setStage] = useState<"landing" | "picker" | "login" | "signup">("landing");

  return (
    <SamThemeProvider theme="dark">
      <div
        className="min-h-dvh"
        style={{
          background: "radial-gradient(ellipse at top, #1a1f2e, #0a0e14 60%)",
          color: "#c9d1d9",
        }}
      >
        {stage === "landing" && <Landing onGetStarted={() => setStage("picker")} />}
        {stage === "picker" && (
          <PickerStage onLogin={() => setStage("login")} onSignup={() => setStage("signup")} />
        )}
        {stage === "login" && (
          <AuthStage back={() => setStage("picker")}>
            <AuthForm mode="login" />
          </AuthStage>
        )}
        {stage === "signup" && (
          <AuthStage back={() => setStage("picker")}>
            <AuthForm mode="signup" />
          </AuthStage>
        )}
      </div>
    </SamThemeProvider>
  );
}

function PickerStage({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const { sam } = useSam();
  return (
    <div className="flex min-h-dvh flex-col justify-center px-4 py-8">
      <Mono c={sam.yellow} b style={{ fontSize: 22, fontFamily: sam.font }}>
        welcome
      </Mono>
      <Comment>new here or returning?</Comment>
      <button
        type="button"
        onClick={onSignup}
        className="mt-8 w-full border-0 py-3.5 text-sm font-bold"
        style={{ background: sam.green, color: sam.bg, fontFamily: sam.font }}
      >
        [create account]
      </button>
      <button
        type="button"
        onClick={onLogin}
        className="mt-3 w-full border py-3.5 text-sm font-bold"
        style={{
          background: "transparent",
          borderColor: sam.border,
          color: sam.cyan,
          fontFamily: sam.font,
        }}
      >
        [sign in]
      </button>
    </div>
  );
}

function AuthStage({ back, children }: { back: () => void; children: ReactNode }) {
  const { sam } = useSam();
  return (
    <div className="min-h-dvh pt-[max(1rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={back}
        className="mx-4 border-0 bg-transparent p-0 text-xs"
        style={{ color: sam.comment, fontFamily: sam.font }}
      >
        [← back]
      </button>
      {children}
    </div>
  );
}
