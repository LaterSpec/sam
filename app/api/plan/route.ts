import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { getPlanSnapshot } from "@/lib/plans/resolve";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const plan = await getPlanSnapshot(session.user.id);
  return NextResponse.json(
    {
      label: plan.label,
      accessMode: plan.accessMode,
      pwa: plan.limits.pwa,
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}
