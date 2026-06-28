"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import type { ActorContext } from "@/lib/domain/types";
import {
  archiveRecurringRule,
  createRecurringRule,
  listRecurringOccurrences,
  listRecurringRules,
  pauseRecurringRule,
  resumeRecurringRule,
  retryRecurringOccurrence,
  updateRecurringRule,
  type CreateRecurringRuleInput,
  type OccurrenceStatus,
  type RecurringKind,
  type RecurringStatus,
  type UpdateRecurringRuleInput,
} from "@/lib/domain/recurring";

async function sessionActor(): Promise<ActorContext> {
  const session = await requireSession();
  return {
    userId: session.user.id,
    email: session.user.email ?? "",
    authMethod: "session",
    scopes: ["*"],
  };
}

function refreshApp(): void {
  revalidatePath("/app");
}

export async function listRecurringRulesAction(
  input: { status?: RecurringStatus; kind?: RecurringKind; includeArchived?: boolean } = {}
) {
  return listRecurringRules(await sessionActor(), input);
}

export async function listRecurringOccurrencesAction(
  input: {
    ruleId?: string;
    status?: OccurrenceStatus;
    limit?: number;
    offset?: number;
  } = {}
) {
  return listRecurringOccurrences(await sessionActor(), input);
}

export async function createRecurringRuleAction(input: CreateRecurringRuleInput) {
  const result = await createRecurringRule(await sessionActor(), input);
  refreshApp();
  return result;
}

export async function updateRecurringRuleAction(input: UpdateRecurringRuleInput) {
  const result = await updateRecurringRule(await sessionActor(), input);
  refreshApp();
  return result;
}

export async function pauseRecurringRuleAction(id: string) {
  const result = await pauseRecurringRule(await sessionActor(), id);
  refreshApp();
  return result;
}

export async function resumeRecurringRuleAction(id: string) {
  const result = await resumeRecurringRule(await sessionActor(), id);
  refreshApp();
  return result;
}

export async function archiveRecurringRuleAction(id: string) {
  const result = await archiveRecurringRule(await sessionActor(), id);
  refreshApp();
  return result;
}

export async function retryRecurringOccurrenceAction(id: string) {
  const result = await retryRecurringOccurrence(await sessionActor(), id);
  refreshApp();
  return result;
}
