import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { bootstrapNewUser } from "@/lib/auth/onboarding-bootstrap";

/** Must match GCP "Authorized JavaScript origins" (e.g. http://localhost:3000) */
const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: process.env.BETTER_AUTH_EMAIL_ENABLED !== "false",
    minPasswordLength: 8,
  },
  ...(googleClientId && googleClientSecret
    ? {
        socialProviders: {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        },
      }
    : {}),
  user: {
    additionalFields: {},
  },
  databaseHooks: {
    user: {
      create: {
        after: async (u) => {
          await bootstrapNewUser(u.id, u.name, u.email);
        },
      },
    },
  },
  trustedOrigins: [
    baseURL,
    process.env.NEXT_PUBLIC_APP_URL || baseURL,
  ].filter((v, i, a) => v && a.indexOf(v) === i),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
});

export type Session = typeof auth.$Infer.Session;
