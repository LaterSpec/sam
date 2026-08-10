import { db } from "@/lib/db";
import {
  integrationAuthors,
  integrationVersions,
  integrations,
} from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { parseManifest, type IntegrationManifest } from "./manifest";

export type CatalogItem = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  runtime: string;
  currentVersion: string | null;
  iconKey: string | null;
  author: {
    id: string;
    displayName: string;
    website: string | null;
    verified: boolean;
  };
  scopes: string[];
  authType: string;
};

export async function listPublishedIntegrations(): Promise<CatalogItem[]> {
  const rows = await db
    .select({
      id: integrations.id,
      slug: integrations.slug,
      name: integrations.name,
      summary: integrations.summary,
      runtime: integrations.runtime,
      currentVersion: integrations.currentVersion,
      iconKey: integrations.iconKey,
      authorId: integrationAuthors.id,
      authorName: integrationAuthors.displayName,
      authorWebsite: integrationAuthors.website,
      authorVerifiedAt: integrationAuthors.verifiedAt,
    })
    .from(integrations)
    .innerJoin(integrationAuthors, eq(integrations.authorId, integrationAuthors.id))
    .where(eq(integrations.status, "published"))
    .orderBy(desc(integrations.updatedAt));

  const items: CatalogItem[] = [];
  for (const row of rows) {
    const manifest = await loadPublishedManifest(row.id, row.currentVersion);
    items.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      summary: row.summary,
      runtime: row.runtime,
      currentVersion: row.currentVersion,
      iconKey: row.iconKey,
      author: {
        id: row.authorId,
        displayName: row.authorName,
        website: row.authorWebsite,
        verified: Boolean(row.authorVerifiedAt),
      },
      scopes: manifest?.scopes ?? [],
      authType: manifest?.auth.type ?? "none",
    });
  }
  return items;
}

export async function getPublishedIntegration(slugOrId: string): Promise<(CatalogItem & { manifest: IntegrationManifest }) | null> {
  const bySlug = await db
    .select({
      id: integrations.id,
      slug: integrations.slug,
      name: integrations.name,
      summary: integrations.summary,
      runtime: integrations.runtime,
      currentVersion: integrations.currentVersion,
      iconKey: integrations.iconKey,
      authorId: integrationAuthors.id,
      authorName: integrationAuthors.displayName,
      authorWebsite: integrationAuthors.website,
      authorVerifiedAt: integrationAuthors.verifiedAt,
    })
    .from(integrations)
    .innerJoin(integrationAuthors, eq(integrations.authorId, integrationAuthors.id))
    .where(and(eq(integrations.status, "published"), eq(integrations.slug, slugOrId)))
    .limit(1);

  let row = bySlug[0];
  if (!row) {
    const byId = await db
      .select({
        id: integrations.id,
        slug: integrations.slug,
        name: integrations.name,
        summary: integrations.summary,
        runtime: integrations.runtime,
        currentVersion: integrations.currentVersion,
        iconKey: integrations.iconKey,
        authorId: integrationAuthors.id,
        authorName: integrationAuthors.displayName,
        authorWebsite: integrationAuthors.website,
        authorVerifiedAt: integrationAuthors.verifiedAt,
      })
      .from(integrations)
      .innerJoin(integrationAuthors, eq(integrations.authorId, integrationAuthors.id))
      .where(and(eq(integrations.status, "published"), eq(integrations.id, slugOrId)))
      .limit(1);
    row = byId[0];
  }
  if (!row) return null;
  const manifest = await loadPublishedManifest(row.id, row.currentVersion);
  if (!manifest) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    runtime: row.runtime,
    currentVersion: row.currentVersion,
    iconKey: row.iconKey,
    author: {
      id: row.authorId,
      displayName: row.authorName,
      website: row.authorWebsite,
      verified: Boolean(row.authorVerifiedAt),
    },
    scopes: manifest.scopes,
    authType: manifest.auth.type,
    manifest,
  };
}

export async function loadPublishedManifest(
  integrationId: string,
  version: string | null
): Promise<IntegrationManifest | null> {
  if (!version) return null;
  const [row] = await db
    .select()
    .from(integrationVersions)
    .where(
      and(
        eq(integrationVersions.integrationId, integrationId),
        eq(integrationVersions.version, version),
        eq(integrationVersions.status, "published")
      )
    )
    .limit(1);
  if (!row) return null;
  try {
    return parseManifest(row.manifestJson);
  } catch {
    return null;
  }
}
