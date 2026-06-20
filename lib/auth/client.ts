import { createAuthClient } from "better-auth/react";

function getAuthBaseURL() {
  // Same-origin deploy: always use the live origin in the browser (avoids localhost baked at build).
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseURL(),
});

export const { signIn, signUp, signOut, useSession } = authClient;

export function signInWithGoogle() {
  return signIn.social({
    provider: "google",
    callbackURL: "/onboarding?auth=success",
  });
}
