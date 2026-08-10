import { db } from "@/lib/db";
import {
  integrationAuthors,
  integrationReviews,
  integrationVersions,
  integrations,
  user,
} from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { parseManifest, type IntegrationManifest } from "./manifest";
import { putIntegrationAsset } from "./storage";
import { writeIntegrationAudit } from "./audit";

export async function ensureAuthorProfile(input: {
  userId: string;
  displayName: string;
  bio?: string;
  website?: string;
}) {
  const [existing] = await db
    .select()
    .from(integrationAuthors)
    .where(eq(integrationAuthors.userId, input.userId))
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(integrationAuthors)
      .set({
        displayName: input.displayName,
        bio: input.bio ?? existing.bio,
        website: input.website ?? existing.website,
        updatedAt: new Date(),
      })
      .where(eq(integrationAuthors.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(integrationAuthors)
    .values({
      userId: input.userId,
      displayName: input.displayName,
      bio: input.bio ?? null,
      website: input.website ?? null,
    })
    .returning();
  return created;
}

export async function submitIntegrationVersion(input: {
  userId: string;
  manifest: unknown;
  changelog?: string;
}) {
  const manifest = parseManifest(input.manifest);
  if (manifest.runtime === "worker") {
    const [author] = await db
      .select()
      .from(integrationAuthors)
      .where(eq(integrationAuthors.userId, input.userId))
      .limit(1);
    if (!author?.verifiedAt) {
      throw new Error("worker runtime requires a verified author (Phase 2)");
    }
  }

  const author = await ensureAuthorProfile({
    userId: input.userId,
    displayName: manifest.author.displayName,
    website: manifest.author.url,
  });

  const [existing] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.slug, manifest.id))
    .limit(1);

  let integration = existing;
  if (!integration) {
    const [created] = await db
      .insert(integrations)
      .values({
        slug: manifest.id,
        name: manifest.name,
        summary: manifest.description,
        authorId: author.id,
        status: "pending_review",
        runtime: manifest.runtime,
        iconKey: manifest.icon ?? null,
      })
      .returning();
    integration = created;
  } else if (integration.authorId !== author.id) {
    throw new Error("slug already owned by another author");
  } else {
    const [updated] = await db
      .update(integrations)
      .set({
        name: manifest.name,
        summary: manifest.description,
        runtime: manifest.runtime,
        iconKey: manifest.icon ?? integration.iconKey,
        status: "pending_review",
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, integration.id))
      .returning();
    integration = updated;
  }

  const r2Key = `manifests/${manifest.id}/${manifest.version}.json`;
  await putIntegrationAsset(r2Key, JSON.stringify(manifest), "application/json");

  const [version] = await db
    .insert(integrationVersions)
    .values({
      integrationId: integration.id,
      version: manifest.version,
      manifestJson: manifest,
      manifestR2Key: r2Key,
      changelog: input.changelog ?? null,
      status: "pending_review",
    })
    .onConflictDoNothing()
    .returning();

  if (!version) {
    throw new Error("this version was already submitted");
  }

  await writeIntegrationAudit({
    userId: input.userId,
    action: "submit_version",
    meta: { integrationId: integration.id, version: manifest.version },
  });

  return { integration, version, manifest };
}

function reviewerIds(): Set<string> {
  const raw = process.env.INTEGRATION_REVIEWER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function canReviewIntegrations(userId: string): boolean {
  const ids = reviewerIds();
  if (ids.size === 0) {
    // Dev convenience: any authenticated user can review when unset.
    return process.env.NODE_ENV !== "production";
  }
  return ids.has(userId);
}

export async function listPendingReviews() {
  return db
    .select({
      versionId: integrationVersions.id,
      version: integrationVersions.version,
      changelog: integrationVersions.changelog,
      submittedAt: integrationVersions.submittedAt,
      integrationId: integrations.id,
      slug: integrations.slug,
      name: integrations.name,
      runtime: integrations.runtime,
      authorName: integrationAuthors.displayName,
      authorUserId: integrationAuthors.userId,
      manifestJson: integrationVersions.manifestJson,
    })
    .from(integrationVersions)
    .innerJoin(integrations, eq(integrationVersions.integrationId, integrations.id))
    .innerJoin(integrationAuthors, eq(integrations.authorId, integrationAuthors.id))
    .where(eq(integrationVersions.status, "pending_review"))
    .orderBy(desc(integrationVersions.submittedAt));
}

export async function reviewIntegrationVersion(input: {
  reviewerUserId: string;
  versionId: string;
  decision: "published" | "rejected";
  notes?: string;
}) {
  if (!canReviewIntegrations(input.reviewerUserId)) {
    throw new Error("not authorized to review integrations");
  }

  const [version] = await db
    .select()
    .from(integrationVersions)
    .where(eq(integrationVersions.id, input.versionId))
    .limit(1);
  if (!version || version.status !== "pending_review") {
    throw new Error("version is not pending review");
  }

  const now = new Date();
  await db.insert(integrationReviews).values({
    versionId: version.id,
    reviewerUserId: input.reviewerUserId,
    decision: input.decision,
    notes: input.notes ?? null,
  });

  await db
    .update(integrationVersions)
    .set({
      status: input.decision,
      reviewedAt: now,
      reviewerNote: input.notes ?? null,
    })
    .where(eq(integrationVersions.id, version.id));

  if (input.decision === "published") {
    const manifest = parseManifest(version.manifestJson) as IntegrationManifest;
    await db
      .update(integrations)
      .set({
        status: "published",
        currentVersion: version.version,
        name: manifest.name,
        summary: manifest.description,
        runtime: manifest.runtime,
        iconKey: manifest.icon ?? null,
        updatedAt: now,
      })
      .where(eq(integrations.id, version.integrationId));
  } else {
    const published = await db
      .select()
      .from(integrationVersions)
      .where(
        and(
          eq(integrationVersions.integrationId, version.integrationId),
          eq(integrationVersions.status, "published")
        )
      )
      .limit(1);
    await db
      .update(integrations)
      .set({
        status: published[0] ? "published" : "rejected",
        updatedAt: now,
      })
      .where(eq(integrations.id, version.integrationId));
  }

  await writeIntegrationAudit({
    userId: input.reviewerUserId,
    action: `review_${input.decision}`,
    meta: { versionId: version.id, notes: input.notes ?? null },
  });

  return version;
}

export async function listAuthorIntegrations(userId: string) {
  const [author] = await db
    .select()
    .from(integrationAuthors)
    .where(eq(integrationAuthors.userId, userId))
    .limit(1);
  if (!author) return [];
  return db
    .select()
    .from(integrations)
    .where(eq(integrations.authorId, author.id))
    .orderBy(desc(integrations.updatedAt));
}

/** Ensure a first-party webhook-echo connector exists and is published (idempotent). */
export async function ensureFirstPartyWebhookEcho(ownerUserId: string) {
  const [owner] = await db.select().from(user).where(eq(user.id, ownerUserId)).limit(1);
  if (!owner) return null;

  const manifest: IntegrationManifest = {
    id: "sam-webhook-echo",
    version: "1.0.0",
    name: "Webhook Echo",
    description:
      "First-party connector for testing. Install, connect, then POST expenses to your webhook URL.",
    author: { displayName: "SAM", url: undefined },
    runtime: "connector",
    icon: "🔌",
    scopes: ["sam:read", "sam:expenses.write"],
    auth: { type: "none" },
    capabilities: {
      webhook: { enabled: true },
      sync: { handler: "builtin:webhook-echo" },
    },
  };

  const author = await ensureAuthorProfile({
    userId: ownerUserId,
    displayName: "SAM",
  });

  const [existing] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.slug, manifest.id))
    .limit(1);

  let integrationId = existing?.id;
  if (!existing) {
    const [created] = await db
      .insert(integrations)
      .values({
        slug: manifest.id,
        name: manifest.name,
        summary: manifest.description,
        authorId: author.id,
        status: "published",
        runtime: "connector",
        currentVersion: manifest.version,
        iconKey: manifest.icon ?? null,
      })
      .returning();
    integrationId = created.id;
    await db.insert(integrationVersions).values({
      integrationId: created.id,
      version: manifest.version,
      manifestJson: manifest,
      status: "published",
      reviewedAt: new Date(),
      reviewerNote: "first-party bootstrap",
    });
  } else if (existing.status !== "published") {
    await db
      .update(integrations)
      .set({
        status: "published",
        currentVersion: manifest.version,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, existing.id));
  }

  return integrationId ?? null;
}
