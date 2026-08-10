import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/auth";
import { syncConnectedInstalls } from "@/lib/integrations/runtime/webhook";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await verifyCronSecret(request))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const results = await syncConnectedInstalls();
  return NextResponse.json({
    ok: true,
    synced: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  });
}
