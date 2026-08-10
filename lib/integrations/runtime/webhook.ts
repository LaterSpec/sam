import { z } from "zod";
import { addExpense } from "@/lib/domain/expenses";
import { SCOPES } from "@/lib/mcp/scopes";
import { db } from "@/lib/db";
import { userIntegrationInstalls, userIntegrationSecrets } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { writeIntegrationAudit } from "../audit";
import { integrationActor, requireInstallScope } from "../permissions";
import { decryptSecretPayload, hashWebhookToken } from "../secrets";
import { getInstallWithManifest } from "../install";
import { dispatchIntegrationWorker } from "./dispatch";
import type { IntegrationManifest } from "../manifest";

const webhookExpenseSchema = z.object({
  name: z.string().min(1).max(120),
  amount: z.number().positive(),
  catKey: z.string().min(1).default("misc"),
  accountId: z.string().uuid().optional(),
  occurredAt: z.string().optional(),
});

export async function handleWebhookIngress(input: {
  installId: string;
  token: string;
  body: unknown;
}) {
  const loaded = await getInstallWithManifest(input.installId);
  if (!loaded) return { ok: false as const, status: 404, error: "install not found" };
  const { install, manifest, email } = loaded;
  if (install.status !== "connected" && install.status !== "installed") {
    return { ok: false as const, status: 409, error: "install is not connected" };
  }
  if (!install.webhookTokenHash) {
    return { ok: false as const, status: 403, error: "webhook disabled" };
  }
  const hash = await hashWebhookToken(input.token);
  if (hash !== install.webhookTokenHash) {
    return { ok: false as const, status: 401, error: "invalid webhook token" };
  }

  if (manifest.runtime === "worker") {
    try {
      await dispatchIntegrationWorker({
        installId: install.id,
        workerEntry: manifest.workerEntry ?? "",
        payload: input.body,
      });
    } catch (error) {
      return {
        ok: false as const,
        status: 501,
        error: error instanceof Error ? error.message : "worker runtime unavailable",
      };
    }
  }

  try {
    const result = await applyWebhookPayload({
      userId: install.userId,
      email,
      installId: install.id,
      scopes: install.scopesGranted ?? [],
      body: input.body,
    });
    await db
      .update(userIntegrationInstalls)
      .set({ lastSyncAt: new Date(), lastError: null, status: "connected", updatedAt: new Date() })
      .where(eq(userIntegrationInstalls.id, install.id));
    await writeIntegrationAudit({
      userId: install.userId,
      installId: install.id,
      action: "webhook",
      meta: result,
    });
    return { ok: true as const, status: 200, result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "webhook failed";
    await db
      .update(userIntegrationInstalls)
      .set({ lastError: message, status: "error", updatedAt: new Date() })
      .where(eq(userIntegrationInstalls.id, install.id));
    await writeIntegrationAudit({
      userId: install.userId,
      installId: install.id,
      action: "webhook",
      resultStatus: "error",
      errorMessage: message,
    });
    return { ok: false as const, status: 400, error: message };
  }
}

async function applyWebhookPayload(input: {
  userId: string;
  email: string;
  installId: string;
  scopes: string[];
  body: unknown;
}) {
  const ctx = integrationActor(input.userId, input.email, input.scopes, input.installId);
  requireInstallScope(ctx, SCOPES.expensesWrite);

  const payload = Array.isArray(input.body)
    ? input.body
    : (input.body as { expenses?: unknown })?.expenses
      ? (input.body as { expenses: unknown[] }).expenses
      : [input.body];

  const created: string[] = [];
  for (const item of payload) {
    const parsed = webhookExpenseSchema.parse(item);
    const row = await addExpense(ctx, {
      name: parsed.name,
      amount: parsed.amount,
      catKey: parsed.catKey,
      accountId: parsed.accountId,
      occurredAt: parsed.occurredAt,
    });
    created.push(row.tx.id);
  }
  return { createdCount: created.length, ids: created };
}

export async function runHttpPullSync(installId: string) {
  const loaded = await getInstallWithManifest(installId);
  if (!loaded) throw new Error("install not found");
  const { install, manifest, email } = loaded;
  if (install.status !== "connected") throw new Error("install not connected");

  const handler = manifest.capabilities.sync?.handler ?? "builtin:webhook-echo";
  if (handler === "builtin:webhook-echo") {
    await db
      .update(userIntegrationInstalls)
      .set({ lastSyncAt: new Date(), lastError: null, updatedAt: new Date() })
      .where(eq(userIntegrationInstalls.id, install.id));
    await writeIntegrationAudit({
      userId: install.userId,
      installId: install.id,
      action: "sync",
      meta: { handler, skipped: true },
    });
    return { skipped: true };
  }

  if (handler !== "builtin:http-pull") {
    throw new Error(`unsupported sync handler: ${handler}`);
  }

  const pullUrl = manifest.capabilities.sync?.pullUrl;
  if (!pullUrl) throw new Error("pullUrl missing from manifest");

  const headers: Record<string, string> = { accept: "application/json" };
  const [secretRow] = await db
    .select()
    .from(userIntegrationSecrets)
    .where(eq(userIntegrationSecrets.installId, install.id))
    .limit(1);
  if (secretRow) {
    const secrets = await decryptSecretPayload<{ apiKey?: string; accessToken?: string }>(
      secretRow.ciphertext,
      secretRow.iv
    );
    if (secrets.accessToken) headers.authorization = `Bearer ${secrets.accessToken}`;
    else if (secrets.apiKey) headers.authorization = `Bearer ${secrets.apiKey}`;
  }

  const response = await fetch(pullUrl, { headers });
  if (!response.ok) {
    throw new Error(`pull failed: HTTP ${response.status}`);
  }
  const body = await response.json();
  const result = await applyWebhookPayload({
    userId: install.userId,
    email,
    installId: install.id,
    scopes: install.scopesGranted ?? [],
    body,
  });
  await db
    .update(userIntegrationInstalls)
    .set({ lastSyncAt: new Date(), lastError: null, updatedAt: new Date() })
    .where(eq(userIntegrationInstalls.id, install.id));
  await writeIntegrationAudit({
    userId: install.userId,
    installId: install.id,
    action: "sync",
    meta: { handler, ...result },
  });
  return result;
}

export async function syncConnectedInstalls() {
  const rows = await db
    .select({ id: userIntegrationInstalls.id })
    .from(userIntegrationInstalls)
    .where(eq(userIntegrationInstalls.status, "connected"));
  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const row of rows) {
    try {
      await runHttpPullSync(row.id);
      results.push({ id: row.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "sync failed";
      await db
        .update(userIntegrationInstalls)
        .set({ lastError: message, status: "error", updatedAt: new Date() })
        .where(eq(userIntegrationInstalls.id, row.id));
      results.push({ id: row.id, ok: false, error: message });
    }
  }
  return results;
}

export function oauthAuthorizeUrl(
  manifest: IntegrationManifest,
  state: string,
  redirectUri: string
): string | null {
  if (manifest.auth.type !== "oauth2") return null;
  const clientIdEnv = manifest.auth.clientIdEnv ?? "INTEGRATION_OAUTH_CLIENT_ID";
  const clientId = process.env[clientIdEnv] ?? process.env.INTEGRATION_OAUTH_CLIENT_ID ?? "";
  if (!clientId) return null;
  const url = new URL(manifest.auth.authorizationUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  if (manifest.auth.scopes.length) url.searchParams.set("scope", manifest.auth.scopes.join(" "));
  return url.toString();
}
