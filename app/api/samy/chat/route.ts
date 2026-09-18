import { getSession } from "@/lib/auth/session";
import { sessionActor } from "@/lib/domain/session-context";
import { getProfile } from "@/lib/domain/profile";
import { runSamyChat, type SamyChatBody } from "@/lib/samy/run-chat";
import { PlanError } from "@/lib/plans/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: SamyChatBody;
  try {
    body = (await request.json()) as SamyChatBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const actor = sessionActor(session);
  const profile = await getProfile(actor);
  const language = profile?.prefs.language === "en" ? "en" : "es";

  try {
    return await runSamyChat({
      sessionUser: { id: session.user.id, email: session.user.email, name: session.user.name },
      fullName: profile?.fullName || session.user.name || "there",
      language,
      currency: profile?.prefs.defaultCurrency ?? profile?.currency ?? "USD",
      timezone: profile?.prefs.timezone ?? "America/Lima",
      body,
      abortSignal: request.signal,
    });
  } catch (error) {
    if (error instanceof PlanError) {
      const status = error.code === "quota_exceeded" || error.code === "rate_limited" ? 429 : 403;
      return Response.json({ error: error.code, ...error.toPayload() }, { status });
    }
    const message = error instanceof Error ? error.message : "chat_failed";
    if (message.includes("OPENAI_")) {
      return Response.json({ error: "openai_not_configured" }, { status: 503 });
    }
    return Response.json({ error: "chat_failed" }, { status: 500 });
  }
}
