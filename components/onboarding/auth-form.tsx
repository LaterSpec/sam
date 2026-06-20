"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useSam } from "@/lib/theme/sam-theme";
import { Mono } from "@/components/ui/sam-primitives";
import { signIn, signUp } from "@/lib/auth/client";
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion";

function Field({
  label,
  hint,
  accent,
  children,
}: {
  label: string;
  hint?: string;
  accent: string;
  children: ReactNode;
}) {
  const { sam } = useSam();
  return (
    <div style={{ marginBottom: 16 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 600,
          marginBottom: 6,
          display: "flex",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        <Mono c={accent}>›</Mono>
        <Mono c={accent} b>
          {label}
        </Mono>
        {hint && (
          <Mono c={sam.comment} style={{ fontSize: 10, marginLeft: 6 }}>
            // {hint}
          </Mono>
        )}
      </div>
      {children}
    </div>
  );
}

export function AuthForm({
  mode,
  onBack,
  onSwitchMode,
  onSuccess,
}: {
  mode: "login" | "signup";
  onBack: () => void;
  onSwitchMode: () => void;
  onSuccess: (mode: "login" | "signup") => void;
}) {
  const { sam } = useSam();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const isSignup = mode === "signup";
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [logLines, setLogLines] = useState<Array<{ text: string; c: string }>>([]);
  const [error, setError] = useState("");
  const [forgotNote, setForgotNote] = useState(false);

  const accent = isSignup ? sam.cyan : sam.yellow;
  const minPw = 8;
  const valid = isSignup
    ? email.includes("@") && pw.length >= minPw && name.trim().length >= 2
    : email.includes("@") && pw.length >= minPw;

  const strength = (() => {
    let s = 0;
    if (pw.length >= minPw) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  })();
  const strengthLabels = ["too short", "weak", "ok", "good", "strong", "fortified"];
  const strengthLabel = strengthLabels[Math.min(strength, strengthLabels.length - 1)];
  const strengthColor = strength <= 1 ? sam.red : strength <= 2 ? sam.yellow : sam.green;

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "transparent",
    border: `1px solid ${sam.border}`,
    outline: "none",
    color: sam.text,
    fontFamily: sam.font,
    fontSize: 15,
    padding: "10px 12px",
  };

  const push = (text: string, c: string) => setLogLines((p) => [...p, { text, c }]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    setError("");
    setLogLines([]);

    if (!reducedMotion) {
      push(isSignup ? "› POST /signup" : "› POST /login", sam.cyan);
      await wait(280);
      push(isSignup ? "› hashing password..." : "› verifying credentials...", sam.comment);
      await wait(350);
    }

    try {
      if (isSignup) {
        const res = await signUp.email({
          email,
          password: pw,
          name: name.trim() || email.split("@")[0],
        });
        if (res.error) throw new Error(res.error.message || "signup failed");
        if (!reducedMotion) {
          push(`✓ vault created · ${email}`, sam.green);
          await wait(200);
          push("✓ workspace provisioned", sam.green);
        }
      } else {
        const res = await signIn.email({ email, password: pw });
        if (res.error) throw new Error(res.error.message || "login failed");
        if (!reducedMotion) {
          push("✓ session granted", sam.green);
          await wait(200);
          push("✓ vault unlocked", sam.green);
        }
      }
      if (!reducedMotion) {
        push(isSignup ? "➜ launching workspace..." : "➜ welcome back", sam.yellow);
        await wait(reducedMotion ? 0 : 400);
      }
      router.refresh();
      onSuccess(mode);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "auth failed";
      push(`✗ ${msg}`, sam.red);
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
      style={{ background: sam.bg, color: sam.text, fontFamily: sam.font }}
    >
      <div
        style={{
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          fontSize: 11,
          color: sam.comment,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          style={{
            cursor: submitting ? "default" : "pointer",
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
        <Mono c={accent} b>
          {isSignup ? "sign up" : "log in"}
        </Mono>
      </div>

      <div style={{ padding: "4px 22px 0", fontSize: 12 }}>
        <Mono c={sam.text} b>
          guest
        </Mono>
        <Mono c={sam.comment}>[anon]</Mono>
        <Mono c={sam.text} b>
          @init.Auth
        </Mono>
        <Mono c={sam.yellow} b>
          {" "}
          ${" "}
        </Mono>
        <Mono c={accent} b>
          ./{isSignup ? "signup" : "login"}
        </Mono>
      </div>

      <div style={{ padding: "14px 22px 0" }}>
        <h2
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 700,
            color: sam.text,
            letterSpacing: -0.5,
          }}
        >
          <Mono c={accent}>›</Mono> {isSignup ? "create your vault" : "unlock your vault"}
        </h2>
        <div style={{ fontSize: 11, color: sam.comment, marginTop: 4 }}>
          {`// ${isSignup ? "less than 30 seconds" : "email + password"}`}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: "20px 22px 0" }}
      >
        {isSignup && (
          <Field label="full_name" hint="how should we call you" accent={sam.magenta}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              style={inputStyle}
              disabled={submitting}
            />
          </Field>
        )}

        <Field label="email" hint="@" accent={sam.green}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@domain.com"
            type="email"
            autoComplete="email"
            style={inputStyle}
            disabled={submitting}
          />
          {email && (
            <div
              style={{
                marginTop: 4,
                fontSize: 10,
                color: email.includes("@") ? sam.green : sam.comment,
              }}
            >
              {email.includes("@") ? "✓ valid" : "// add @ to validate"}
            </div>
          )}
        </Field>

        <Field label="password" hint={`≥ ${minPw} chars`} accent={sam.yellow}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              border: `1px solid ${sam.border}`,
              padding: "0 10px",
            }}
          >
            <input
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type={showPw ? "text" : "password"}
              autoComplete={isSignup ? "new-password" : "current-password"}
              placeholder="••••••••"
              style={{ ...inputStyle, border: "none", padding: "10px 0", flex: 1 }}
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              style={{
                cursor: "pointer",
                fontSize: 11,
                color: sam.comment,
                background: "none",
                border: "none",
                fontFamily: sam.font,
              }}
            >
              [{showPw ? "hide" : "show"}]
            </button>
          </div>
          {isSignup && pw && (
            <div style={{ marginTop: 6 }}>
              <div style={{ display: "flex", gap: 3 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: 3,
                      background: i < strength ? strengthColor : "rgba(255,255,255,0.05)",
                      transition: "background 200ms",
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 10, color: strengthColor, marginTop: 4 }}>
                {`// strength: ${strengthLabel}`}
              </div>
            </div>
          )}
        </Field>

        {!isSignup && (
          <div style={{ marginTop: -4, marginBottom: 14, fontSize: 11, textAlign: "right" }}>
            <span style={{ cursor: "pointer" }} onClick={() => setForgotNote((v) => !v)}>
              <Mono c={sam.cyan}>forgot? ▸</Mono>
            </span>
            {forgotNote && (
              <div style={{ marginTop: 6, color: sam.comment, textAlign: "right" }}>
                {`// password reset coming soon`}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ fontSize: 11, color: sam.red, marginBottom: 8 }}>{error}</div>
        )}

        {logLines.length > 0 && (
          <div
            style={{
              marginTop: 6,
              padding: 10,
              background: sam.bgAlt,
              border: `1px solid ${sam.border}`,
              fontSize: 11,
              lineHeight: 1.7,
              minHeight: 90,
            }}
          >
            {logLines.map((l, i) => (
              <div key={i} className={reducedMotion ? undefined : "sam-fade-in"}>
                <Mono c={l.c}>{l.text}</Mono>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          padding: "14px 22px max(1.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <button
          type="button"
          onClick={submit}
          disabled={!valid || submitting}
          style={{
            width: "100%",
            padding: "14px 0",
            background: valid && !submitting ? accent : "rgba(255,255,255,0.05)",
            color: valid && !submitting ? sam.bg : sam.comment,
            fontFamily: sam.font,
            fontSize: 14,
            fontWeight: 700,
            border: "none",
            cursor: valid && !submitting ? "pointer" : "not-allowed",
            letterSpacing: 0.3,
          }}
        >
          {submitting ? "[authenticating...]" : `[${isSignup ? "create account" : "log in"} ▸]`}
        </button>
        <div style={{ marginTop: 10, fontSize: 11, color: sam.comment, textAlign: "center" }}>
          {isSignup ? "// already in?" : "// new here?"}{" "}
          <span
            style={{ cursor: submitting ? "default" : "pointer" }}
            onClick={() => !submitting && onSwitchMode()}
          >
            <Mono c={accent}>{isSignup ? "log in instead" : "create account"}</Mono>
          </span>
        </div>
      </div>
    </div>
  );
}
