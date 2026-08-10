/**
 * Optional R2 helpers for integration assets.
 * Manifest JSON is always persisted in Neon; R2 stores icons/release blobs when bound.
 */

export type IntegrationsR2 = {
  put: (key: string, value: string | ArrayBuffer | ArrayBufferView, options?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  get: (key: string) => Promise<{ arrayBuffer: () => Promise<ArrayBuffer>; text: () => Promise<string> } | null>;
  delete: (key: string) => Promise<unknown>;
};

export function getIntegrationsR2(): IntegrationsR2 | null {
  const env = (globalThis as { process?: { env?: Record<string, unknown> } }).process?.env;
  const binding = (env as { INTEGRATIONS_R2?: IntegrationsR2 } | undefined)?.INTEGRATIONS_R2;
  if (binding && typeof binding.put === "function") return binding;
  // OpenNext may expose bindings via cloudflare:workers in production; keep null-safe for local.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require("@opennextjs/cloudflare") as {
      getCloudflareContext?: () => { env?: { INTEGRATIONS_R2?: IntegrationsR2 } };
    };
    const ctx = getCloudflareContext?.();
    return ctx?.env?.INTEGRATIONS_R2 ?? null;
  } catch {
    return null;
  }
}

export async function putIntegrationAsset(
  key: string,
  body: string,
  contentType = "application/json"
): Promise<string | null> {
  const r2 = getIntegrationsR2();
  if (!r2) return null;
  await r2.put(key, body, { httpMetadata: { contentType } });
  return key;
}

export async function getIntegrationAssetText(key: string): Promise<string | null> {
  const r2 = getIntegrationsR2();
  if (!r2) return null;
  const object = await r2.get(key);
  if (!object) return null;
  return object.text();
}
