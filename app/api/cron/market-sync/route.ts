import { NextResponse } from "next/server";
import { syncMarketData } from "@/lib/market/yahoo-sync";
import { verifyCronSecret } from "@/lib/cron/auth";

export async function GET(request: Request) {
  if (!(await verifyCronSecret(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await syncMarketData();
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 300;
