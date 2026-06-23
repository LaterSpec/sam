"use client";

import { useState } from "react";
import { SAM_PALETTES, SamThemeProvider } from "@/lib/theme/sam-theme";
import { LandingCarousel } from "./slides/landing-carousel";
import { AuthScreen } from "./auth-screen";
import { AuthSuccess } from "./auth-success";

type Stage = "landing" | "auth" | "success";
export type AuthLogLine = { text: string; c: "cyan" | "comment" | "green" | "yellow" | "red" };
const ONBOARDING_THEME = SAM_PALETTES["ayu-mirage"];

export function OnboardingApp({
  authSuccess = false,
  userName = "there",
  userCreatedAt,
}: {
  authSuccess?: boolean;
  userName?: string;
  userCreatedAt?: Date | string | null;
}) {
  const [stage, setStage] = useState<Stage>(authSuccess ? "success" : "landing");
  const [successMode, setSuccessMode] = useState<"login" | "signup">("login");
  const [successName, setSuccessName] = useState(userName);
  const [successLogs, setSuccessLogs] = useState<AuthLogLine[]>(
    authSuccess
      ? [
          { text: "› oauth callback received", c: "cyan" },
          { text: "✓ session granted", c: "green" },
          { text: "✓ vault unlocked", c: "green" },
          { text: "➜ ready when you are", c: "yellow" },
        ]
      : []
  );

  const isNewUser = (() => {
    if (!userCreatedAt) return successMode === "signup";
    const created = new Date(userCreatedAt).getTime();
    return Date.now() - created < 120_000 || successMode === "signup";
  })();

  return (
    <SamThemeProvider theme="dark">
      <div
        className="sam-pwa-shell onboarding-shell"
        data-app-shell="onboarding"
        style={{
          ["--sam-bg" as string]: ONBOARDING_THEME.bg,
          ["--sam-nav-bg" as string]: ONBOARDING_THEME.bg,
          ["--sam-text" as string]: ONBOARDING_THEME.text,
          ["--sam-comment" as string]: ONBOARDING_THEME.comment,
          ["--sam-accent" as string]: ONBOARDING_THEME.accent,
          background: ONBOARDING_THEME.bg,
          color: ONBOARDING_THEME.text,
        }}
      >
        {stage === "landing" && <LandingCarousel onDone={() => setStage("auth")} />}
        {stage === "auth" && (
          <AuthScreen
            onBack={() => setStage("landing")}
            onEmailSuccess={(mode, displayName) => {
              setSuccessMode(mode);
              setSuccessName(displayName || userName);
              setSuccessLogs(
                mode === "signup"
                  ? [
                      { text: "› POST /signup", c: "cyan" },
                      { text: "› hashing password...", c: "comment" },
                      { text: "✓ vault created", c: "green" },
                      { text: "✓ workspace provisioned", c: "green" },
                      { text: "➜ ready when you are", c: "yellow" },
                    ]
                  : [
                      { text: "› POST /login", c: "cyan" },
                      { text: "› verifying credentials...", c: "comment" },
                      { text: "✓ session granted", c: "green" },
                      { text: "✓ vault unlocked", c: "green" },
                      { text: "➜ ready when you are", c: "yellow" },
                    ]
              );
              setStage("success");
            }}
          />
        )}
        {stage === "success" && (
          <AuthSuccess isNewUser={isNewUser} userName={successName} logLines={successLogs} />
        )}
      </div>
    </SamThemeProvider>
  );
}
