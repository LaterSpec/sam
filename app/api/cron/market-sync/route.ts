import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/auth";

/** Market sync disabled — kept so old schedulers get a clear response. */
export async function GET(request: Request) {
  if (!(await verifyCronSecret(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { disabled: true, message: "market sync is disconnected" },
    { status: 410 }
  );
}

export const dynamic = "force-dynamic";
