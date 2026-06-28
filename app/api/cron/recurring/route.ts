import { NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron/auth";
import { processDueRecurring } from "@/lib/domain/recurring";

async function run(request: Request) {
  if (!(await verifyCronSecret(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await processDueRecurring();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "recurring processing failed";
    console.error(JSON.stringify({ message: "recurring cron failed", error: message }));
    return NextResponse.json({ error: "Recurring processing failed" }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
export const dynamic = "force-dynamic";
export const maxDuration = 300;
