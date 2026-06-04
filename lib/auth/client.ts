import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
});

export const { signIn, signUp, signOut, useSession } = authClient;

export function signInWithGoogle() {
  return signIn.social({
    provider: "google",
    callbackURL: "/onboarding?auth=success",
  });
}
