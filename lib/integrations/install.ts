import { db } from "@/lib/db";
import {
  integrationAuthors,
  integrations,
  user,
  userIntegrationInstalls,
  userIntegrationSecrets,
} from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { sanitizeManifestScopes, type IntegrationManifest } from "./manifest";
import { scopesCoverRequested } from "./permissions";
import {
  encryptSecretPayload,
  generateWebhookToken,
  hashWebhookToken,
} from "./secrets";
import { writeIntegrationAudit } from "./audit";
import { loadPublishedManifest } from "./catalog";

export type InstallSummary = {
  id: string;
  integrationId: string;
  slug: string;
  name: string;
  version: string;
  status: string;
  scopesGranted: string[];
  authorName: string;
  authType: string;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  webhookPath: string | null;
};

export async function listUserInstalls(userId: string): Promise<InstallSummary[]> {
  const rows = await db
    .select({
      id: userIntegrationInstalls.id,
      integrationId: userIntegrationInstalls.integrationId,
      version: userIntegrationInstalls.version,
      status: userIntegrationInstalls.status,
      scopesGranted: userIntegrationInstalls.scopesGranted,
      connectedAt: userIntegrationInstalls.connectedAt,
      lastSyncAt: userIntegrationInstalls.lastSyncAt,
      lastError: userIntegrationInstalls.lastError,
      slug: integrations.slug,
      name: integrations.name,
      authorName: integrationAuthors.displayName,
    })
    .from(userIntegrationInstalls)
    .innerJoin(integrations, eq(userIntegrationInstalls.integrationId, integrations.id))
    .innerJoin(integrationAuthors, eq(integrations.authorId, integrationAuthors.id))
    .where(eq(userIntegrationInstalls.userId, userId))
    .orderBy(desc(userIntegrationInstalls.updatedAt));

  const out: InstallSummary[] = [];
  for (const row of rows) {
    const manifest = await loadPublishedManifest(row.integrationId, row.version);
    out.push({
      id: row.id,
      integrationId: row.integrationId,
      slug: row.slug,
      name: row.name,
      version: row.version,
      status: row.status,
      scopesGranted: row.scopesGranted ?? [],
      authorName: row.authorName,
      authType: manifest?.auth.type ?? "none",
      connectedAt: row.connectedAt?.toISOString() ?? null,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
      lastError: row.lastError,
      webhookPath: `/api/integrations/hooks/${row.id}`,
    });
  }
  return out;
}

export async function installIntegration(input: {
  userId: string;
  integrationId: string;
  scopes?: string[];
}) {
  const [integration] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.id, input.integrationId), eq(integrations.status, "published")))
    .limit(1);
  if (!integration || !integration.currentVersion) {
    throw new Error("integration not available");
  }
  const manifest = await loadPublishedManifest(integration.id, integration.currentVersion);
  if (!manifest) throw new Error("published manifest missing");
  if (manifest.runtime === "worker") {
    throw new Error("worker integrations are not enabled yet (Phase 2)");
  }

  const requested = sanitizeManifestScopes(input.scopes?.length ? input.scopes : manifest.scopes);
  if (!scopesCoverRequested(manifest.scopes, requested)) {
    throw new Error("requested scopes exceed the integration manifest");
  }

  const webhookToken = generateWebhookToken();
  const webhookTokenHash = await hashWebhookToken(webhookToken);

  const [install] = await db
    .insert(userIntegrationInstalls)
    .values({
      userId: input.userId,
      integrationId: integration.id,
      version: integration.currentVersion,
      status: manifest.auth.type === "none" ? "connected" : "installed",
      scopesGranted: requested,
      webhookTokenHash,
      connectedAt: manifest.auth.type === "none" ? new Date() : null,
      configJson: {},
    })
    .onConflictDoUpdate({
      target: [userIntegrationInstalls.userId, userIntegrationInstalls.integrationId],
      set: {
        version: integration.currentVersion,
        status: manifest.auth.type === "none" ? "connected" : "installed",
        scopesGranted: requested,
        webhookTokenHash,
        connectedAt: manifest.auth.type === "none" ? new Date() : null,
        lastError: null,
        updatedAt: new Date(),
      },
    })
    .returning();

  await writeIntegrationAudit({
    userId: input.userId,
    installId: install.id,
    action: "install",
    meta: { integrationId: integration.id, scopes: requested },
  });

  return {
    install,
    manifest,
    webhookToken: manifest.capabilities.webhook?.enabled === false ? null : webhookToken,
  };
}

export async function uninstallIntegration(userId: string, installId: string) {
  const [install] = await db
    .select()
    .from(userIntegrationInstalls)
    .where(and(eq(userIntegrationInstalls.id, installId), eq(userIntegrationInstalls.userId, userId)))
    .limit(1);
  if (!install) throw new Error("install not found");

  await db.delete(userIntegrationSecrets).where(eq(userIntegrationSecrets.installId, install.id));
  await db.delete(userIntegrationInstalls).where(eq(userIntegrationInstalls.id, install.id));
  await writeIntegrationAudit({
    userId,
    installId: install.id,
    action: "uninstall",
  });
}

export async function connectInstall(input: {
  userId: string;
  installId: string;
  secretPayload?: Record<string, unknown>;
}) {
  const [install] = await db
    .select()
    .from(userIntegrationInstalls)
    .where(and(eq(userIntegrationInstalls.id, input.installId), eq(userIntegrationInstalls.userId, input.userId)))
    .limit(1);
  if (!install) throw new Error("install not found");

  const manifest = await loadPublishedManifest(install.integrationId, install.version);
  if (!manifest) throw new Error("manifest missing");

  if (manifest.auth.type === "api_key") {
    const apiKey = String(input.secretPayload?.apiKey ?? "").trim();
    if (!apiKey) throw new Error("api key required");
    const encrypted = await encryptSecretPayload({ apiKey, ...input.secretPayload });
    await db
      .insert(userIntegrationSecrets)
      .values({
        installId: install.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyVersion: encrypted.keyVersion,
      })
      .onConflictDoUpdate({
        target: [userIntegrationSecrets.installId],
        set: {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          keyVersion: encrypted.keyVersion,
          updatedAt: new Date(),
        },
      });
  } else if (manifest.auth.type === "oauth2") {
    if (!input.secretPayload?.accessToken) {
      throw new Error("oauth tokens required");
    }
    const encrypted = await encryptSecretPayload(input.secretPayload);
    await db
      .insert(userIntegrationSecrets)
      .values({
        installId: install.id,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        keyVersion: encrypted.keyVersion,
      })
      .onConflictDoUpdate({
        target: [userIntegrationSecrets.installId],
        set: {
          ciphertext: encrypted.ciphertext,
          iv: encrypted.iv,
          keyVersion: encrypted.keyVersion,
          updatedAt: new Date(),
        },
      });
  }

  const [updated] = await db
    .update(userIntegrationInstalls)
    .set({
      status: "connected",
      connectedAt: new Date(),
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(userIntegrationInstalls.id, install.id))
    .returning();

  await writeIntegrationAudit({
    userId: input.userId,
    installId: install.id,
    action: "connect",
    meta: { authType: manifest.auth.type },
  });

  return { install: updated, manifest };
}

export async function disconnectInstall(userId: string, installId: string) {
  const [install] = await db
    .select()
    .from(userIntegrationInstalls)
    .where(and(eq(userIntegrationInstalls.id, installId), eq(userIntegrationInstalls.userId, userId)))
    .limit(1);
  if (!install) throw new Error("install not found");

  await db.delete(userIntegrationSecrets).where(eq(userIntegrationSecrets.installId, install.id));
  const [updated] = await db
    .update(userIntegrationInstalls)
    .set({
      status: "disconnected",
      updatedAt: new Date(),
    })
    .where(eq(userIntegrationInstalls.id, install.id))
    .returning();

  await writeIntegrationAudit({
    userId,
    installId: install.id,
    action: "disconnect",
  });
  return updated;
}

export async function getInstallWithManifest(installId: string): Promise<{
  install: typeof userIntegrationInstalls.$inferSelect;
  manifest: IntegrationManifest;
  email: string;
} | null> {
  const [install] = await db
    .select()
    .from(userIntegrationInstalls)
    .where(eq(userIntegrationInstalls.id, installId))
    .limit(1);
  if (!install) return null;
  const manifest = await loadPublishedManifest(install.integrationId, install.version);
  if (!manifest) return null;
  const [owner] = await db.select().from(user).where(eq(user.id, install.userId)).limit(1);
  return { install, manifest, email: owner?.email ?? "" };
}
