"use client";

import { useState } from "react";
import { SamThemeProvider } from "@/lib/theme/sam-theme";
import { LandingCarousel } from "./slides/landing-carousel";
import { AuthScreen } from "./auth-screen";
import { AuthSuccess } from "./auth-success";

type Stage = "landing" | "auth" | "success";

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
          background: "var(--sam-bg)",
          color: "#c9d1d9",
        }}
      >
        {stage === "landing" && <LandingCarousel onDone={() => setStage("auth")} />}
        {stage === "auth" && (
          <AuthScreen
            onBack={() => setStage("landing")}
            onEmailSuccess={(mode) => {
              setSuccessMode(mode);
              setStage("success");
            }}
          />
        )}
        {stage === "success" && (
          <AuthSuccess isNewUser={isNewUser} userName={userName} />
        )}
      </div>
    </SamThemeProvider>
  );
}
