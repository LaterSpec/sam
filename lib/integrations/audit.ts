import { db } from "@/lib/db";
import { integrationAuditLogs } from "@/lib/db/schema";

export async function writeIntegrationAudit(input: {
  userId: string;
  installId?: string | null;
  action: string;
  meta?: unknown;
  resultStatus?: string;
  errorMessage?: string | null;
}) {
  await db.insert(integrationAuditLogs).values({
    userId: input.userId,
    installId: input.installId ?? null,
    action: input.action,
    meta: input.meta ?? null,
    resultStatus: input.resultStatus ?? "ok",
    errorMessage: input.errorMessage ?? null,
  });
}
