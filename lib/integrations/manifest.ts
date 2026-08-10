import { z } from "zod";
import { ALL_SCOPES, isValidScope, type Scope } from "@/lib/mcp/scopes";

export const INTEGRATION_RUNTIMES = ["connector", "worker"] as const;
export type IntegrationRuntime = (typeof INTEGRATION_RUNTIMES)[number];

export const INTEGRATION_STATUSES = [
  "draft",
  "pending_review",
  "published",
  "rejected",
  "suspended",
] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export const INSTALL_STATUSES = [
  "installed",
  "connected",
  "error",
  "disconnected",
] as const;
export type InstallStatus = (typeof INSTALL_STATUSES)[number];

export const VERSION_STATUSES = [
  "pending_review",
  "published",
  "rejected",
] as const;

const scopeSchema = z.string().refine(isValidScope, { message: "invalid scope" });

export const integrationAuthSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("api_key"),
    label: z.string().min(1).max(80).default("API key"),
  }),
  z.object({
    type: z.literal("oauth2"),
    authorizationUrl: z.string().url(),
    tokenUrl: z.string().url(),
    scopes: z.array(z.string()).default([]),
    clientIdEnv: z.string().optional(),
  }),
]);

export const integrationCapabilitiesSchema = z.object({
  sync: z
    .object({
      schedule: z.string().optional(),
      handler: z.enum(["builtin:http-pull", "builtin:webhook-echo"]).default("builtin:webhook-echo"),
      pullUrl: z.string().url().optional(),
    })
    .optional(),
  webhook: z
    .object({
      enabled: z.boolean().default(true),
    })
    .optional(),
});

export const integrationManifestSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase kebab-case"),
  version: z.string().min(1).max(32),
  name: z.string().min(1).max(80),
  description: z.string().max(2000).default(""),
  author: z.object({
    displayName: z.string().min(1).max(80),
    url: z.string().url().optional(),
  }),
  runtime: z.enum(INTEGRATION_RUNTIMES).default("connector"),
  icon: z.string().max(256).optional(),
  scopes: z.array(scopeSchema).min(1),
  auth: integrationAuthSchema.default({ type: "none" }),
  capabilities: integrationCapabilitiesSchema.default({
    webhook: { enabled: true },
    sync: { handler: "builtin:webhook-echo" },
  }),
  configSchema: z.record(z.string(), z.unknown()).optional(),
  /** Phase 2 only — ignored for connector runtime. */
  workerEntry: z.string().max(256).optional(),
});

export type IntegrationManifest = z.infer<typeof integrationManifestSchema>;

export function parseManifest(input: unknown): IntegrationManifest {
  return integrationManifestSchema.parse(input);
}

export function sanitizeManifestScopes(scopes: string[]): Scope[] {
  const valid = scopes.filter(isValidScope);
  return valid.length ? Array.from(new Set(valid)) : [ALL_SCOPES[0]];
}
