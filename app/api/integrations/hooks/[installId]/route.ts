import { NextResponse } from "next/server";
import { handleWebhookIngress } from "@/lib/integrations/runtime/webhook";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ installId: string }> }
) {
  const { installId } = await context.params;
  const token =
    request.headers.get("x-sam-webhook-token") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const result = await handleWebhookIngress({ installId, token, body });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.result);
}
