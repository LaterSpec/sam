"use server";

import { z } from "zod";
import { requireSession } from "@/lib/auth/session";
import { listPublishedIntegrations, getPublishedIntegration } from "@/lib/integrations/catalog";
import {
  connectInstall,
  disconnectInstall,
  installIntegration,
  listUserInstalls,
  uninstallIntegration,
} from "@/lib/integrations/install";
import {
  canReviewIntegrations,
  ensureAuthorProfile,
  ensureFirstPartyWebhookEcho,
  listAuthorIntegrations,
  listPendingReviews,
  reviewIntegrationVersion,
  submitIntegrationVersion,
} from "@/lib/integrations/publish";
import { runHttpPullSync } from "@/lib/integrations/runtime/webhook";

export async function listIntegrationCatalogAction() {
  await requireSession();
  return listPublishedIntegrations();
}

export async function getIntegrationAction(slugOrId: string) {
  await requireSession();
  return getPublishedIntegration(slugOrId);
}

export async function listMyIntegrationInstallsAction() {
  const session = await requireSession();
  return listUserInstalls(session.user.id);
}

export async function installIntegrationAction(input: {
  integrationId: string;
  scopes?: string[];
}) {
  const session = await requireSession();
  const result = await installIntegration({
    userId: session.user.id,
    integrationId: input.integrationId,
    scopes: input.scopes,
  });
  return {
    installId: result.install.id,
    status: result.install.status,
    webhookToken: result.webhookToken,
    webhookPath: `/api/integrations/hooks/${result.install.id}`,
    authType: result.manifest.auth.type,
  };
}

export async function uninstallIntegrationAction(installId: string) {
  const session = await requireSession();
  await uninstallIntegration(session.user.id, installId);
  return { ok: true };
}

export async function connectIntegrationAction(input: {
  installId: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
}) {
  const session = await requireSession();
  const secretPayload: Record<string, unknown> = {};
  if (input.apiKey) secretPayload.apiKey = input.apiKey;
  if (input.accessToken) secretPayload.accessToken = input.accessToken;
  if (input.refreshToken) secretPayload.refreshToken = input.refreshToken;
  const result = await connectInstall({
    userId: session.user.id,
    installId: input.installId,
    secretPayload,
  });
  return { installId: result.install.id, status: result.install.status };
}

export async function disconnectIntegrationAction(installId: string) {
  const session = await requireSession();
  const row = await disconnectInstall(session.user.id, installId);
  return { installId: row.id, status: row.status };
}

export async function syncIntegrationAction(installId: string) {
  const session = await requireSession();
  const installs = await listUserInstalls(session.user.id);
  if (!installs.some((item) => item.id === installId)) {
    throw new Error("install not found");
  }
  return runHttpPullSync(installId);
}

export async function upsertIntegrationAuthorAction(input: {
  displayName: string;
  bio?: string;
  website?: string;
}) {
  const session = await requireSession();
  const displayName = z.string().trim().min(1).max(80).parse(input.displayName);
  return ensureAuthorProfile({
    userId: session.user.id,
    displayName,
    bio: input.bio,
    website: input.website,
  });
}

export async function submitIntegrationAction(input: {
  manifest: unknown;
  changelog?: string;
}) {
  const session = await requireSession();
  const result = await submitIntegrationVersion({
    userId: session.user.id,
    manifest: input.manifest,
    changelog: input.changelog,
  });
  return {
    integrationId: result.integration.id,
    slug: result.integration.slug,
    versionId: result.version.id,
    version: result.version.version,
    status: result.version.status,
  };
}

export async function listMySubmittedIntegrationsAction() {
  const session = await requireSession();
  const rows = await listAuthorIntegrations(session.user.id);
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    currentVersion: row.currentVersion,
    runtime: row.runtime,
  }));
}

export async function listPendingIntegrationReviewsAction() {
  const session = await requireSession();
  if (!canReviewIntegrations(session.user.id)) {
    return { canReview: false as const, items: [] };
  }
  const items = await listPendingReviews();
  return {
    canReview: true as const,
    items: items.map((item) => ({
      versionId: item.versionId,
      version: item.version,
      changelog: item.changelog,
      submittedAt: item.submittedAt.toISOString(),
      integrationId: item.integrationId,
      slug: item.slug,
      name: item.name,
      runtime: item.runtime,
      authorName: item.authorName,
    })),
  };
}

export async function reviewIntegrationAction(input: {
  versionId: string;
  decision: "published" | "rejected";
  notes?: string;
}) {
  const session = await requireSession();
  await reviewIntegrationVersion({
    reviewerUserId: session.user.id,
    versionId: input.versionId,
    decision: input.decision,
    notes: input.notes,
  });
  return { ok: true };
}

export async function bootstrapFirstPartyIntegrationsAction() {
  const session = await requireSession();
  const id = await ensureFirstPartyWebhookEcho(session.user.id);
  return { integrationId: id };
}
