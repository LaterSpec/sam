import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getPublishedIntegration } from "@/lib/integrations/catalog";
import { oauthAuthorizeUrl } from "@/lib/integrations/runtime/webhook";
import { db } from "@/lib/db";
import { userIntegrationInstalls } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

/** Begin OAuth: /api/integrations/oauth/start?installId= */
export async function GET(request: Request) {
  const session = await requireSession().catch(() => null);
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  if (!session) return NextResponse.redirect(new URL("/onboarding", origin));

  const installId = new URL(request.url).searchParams.get("installId");
  if (!installId) return NextResponse.json({ error: "installId required" }, { status: 400 });

  const [install] = await db
    .select()
    .from(userIntegrationInstalls)
    .where(
      and(eq(userIntegrationInstalls.id, installId), eq(userIntegrationInstalls.userId, session.user.id))
    )
    .limit(1);
  if (!install) return NextResponse.json({ error: "install not found" }, { status: 404 });

  const detail = await getPublishedIntegration(install.integrationId);
  if (!detail) return NextResponse.json({ error: "integration not found" }, { status: 404 });

  const redirectUri = `${origin}/api/integrations/oauth/callback`;
  const state = Buffer.from(
    JSON.stringify({ installId: install.id, userId: session.user.id }),
    "utf8"
  ).toString("base64url");
  const authorize = oauthAuthorizeUrl(detail.manifest, state, redirectUri);
  if (!authorize) {
    return NextResponse.json({ error: "oauth not configured" }, { status: 501 });
  }
  return NextResponse.redirect(authorize);
}
