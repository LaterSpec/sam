import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/auth";

/** Recurring cron disabled — kept so old schedulers get a clear response. */
async function run(request: Request) {
  if (!(await verifyCronSecret(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { disabled: true, message: "recurring cron is disconnected" },
    { status: 410 }
  );
}

export const GET = run;
export const POST = run;
export const dynamic = "force-dynamic";
