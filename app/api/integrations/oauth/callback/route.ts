import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userIntegrationInstalls } from "@/lib/db/schema";
import { requireSession } from "@/lib/auth/session";
import { getPublishedIntegration } from "@/lib/integrations/catalog";
import { connectInstall } from "@/lib/integrations/install";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.redirect(new URL("/onboarding", origin));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json({ error: "code and state required" }, { status: 400 });
  }

  let parsed: { installId: string; userId: string };
  try {
    parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as {
      installId: string;
      userId: string;
    };
  } catch {
    return NextResponse.json({ error: "invalid state" }, { status: 400 });
  }
  if (parsed.userId !== session.user.id) {
    return NextResponse.json({ error: "state mismatch" }, { status: 403 });
  }

  const [install] = await db
    .select()
    .from(userIntegrationInstalls)
    .where(
      and(
        eq(userIntegrationInstalls.id, parsed.installId),
        eq(userIntegrationInstalls.userId, session.user.id)
      )
    )
    .limit(1);
  if (!install) return NextResponse.json({ error: "install not found" }, { status: 404 });

  const detail = await getPublishedIntegration(install.integrationId);
  if (!detail || detail.manifest.auth.type !== "oauth2") {
    return NextResponse.json({ error: "oauth not supported" }, { status: 400 });
  }

  const clientIdEnv = detail.manifest.auth.clientIdEnv ?? "INTEGRATION_OAUTH_CLIENT_ID";
  const clientId = process.env[clientIdEnv] ?? process.env.INTEGRATION_OAUTH_CLIENT_ID ?? "";
  const clientSecret =
    process.env[`${clientIdEnv}_SECRET`] ?? process.env.INTEGRATION_OAUTH_CLIENT_SECRET ?? "";
  const redirectUri = `${origin}/api/integrations/oauth/callback`;

  const tokenRes = await fetch(detail.manifest.auth.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ error: `token exchange failed (${tokenRes.status})` }, { status: 400 });
  }
  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!tokens.access_token) {
    return NextResponse.json({ error: "no access_token" }, { status: 400 });
  }

  await connectInstall({
    userId: session.user.id,
    installId: install.id,
    secretPayload: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
    },
  });

  return NextResponse.redirect(new URL("/app/settings?integrations=connected", origin));
}
