"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { accounts, planResourceSelections } from "@/lib/db/schema";
import { PlanError } from "@/lib/plans/errors";
import { getPlanSnapshot, resolveEntitlements } from "@/lib/plans/resolve";

const selectionSchema = z.object({
  activeCurrency: z.enum(["USD", "PEN"]),
  activeAccountIds: z.array(z.string().uuid()).min(1).max(2),
});

export async function getPlanSnapshotAction() {
  const session = await requireSession();
  return getPlanSnapshot(session.user.id);
}

export async function selectFreeResourcesAction(input: {
  activeCurrency: "USD" | "PEN";
  activeAccountIds: string[];
}) {
  const session = await requireSession();
  const parsed = selectionSchema.parse(input);
  const entitlement = await resolveEntitlements(session.user.id);
  if (entitlement.accessMode !== "free") {
    throw new PlanError({
      code: "resource_locked",
      feature: "free_resource_selection",
      message: "Free resource selection is only available after trial or plan expiry.",
    });
  }
  const owned = await db
    .select({ id: accounts.id, currency: accounts.currency })
    .from(accounts)
    .where(eq(accounts.userId, session.user.id));
  const chosen = owned.filter((row) => parsed.activeAccountIds.includes(row.id));
  if (
    chosen.length !== parsed.activeAccountIds.length ||
    chosen.some((row) => row.currency !== parsed.activeCurrency)
  ) {
    throw new Error("selected accounts must belong to the user and share the active currency");
  }

  await db
    .insert(planResourceSelections)
    .values({
      userId: session.user.id,
      entitlementVersion: entitlement.entitlementVersion,
      activeCurrency: parsed.activeCurrency,
      activeAccountIds: parsed.activeAccountIds,
    })
    .onConflictDoUpdate({
      target: [planResourceSelections.userId, planResourceSelections.entitlementVersion],
      set: {
        activeCurrency: parsed.activeCurrency,
        activeAccountIds: parsed.activeAccountIds,
        finalizedAt: new Date(),
      },
    });
  revalidatePath("/app");
  return getPlanSnapshot(session.user.id);
}
