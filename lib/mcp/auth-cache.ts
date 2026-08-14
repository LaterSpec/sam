import type { AuthResult } from "./auth-result";

/** Positive hits: 15 min. Revoked/invalid tokens: 30 min so a retry loop cannot pin Neon awake. */
export const MCP_AUTH_POSITIVE_TTL_MS = 15 * 60 * 1000;
export const MCP_AUTH_NEGATIVE_TTL_MS = 30 * 60 * 1000;

type MemoryEntry = { expiresAt: number; result: AuthResult };

const memory = new Map<string, MemoryEntry>();

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += byte.toString(16).padStart(2, "0");
  return out;
}

export async function mcpAuthCacheKey(authorization: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(authorization));
  return toHex(new Uint8Array(digest));
}

function ttlFor(result: AuthResult): number {
  return result.ok ? MCP_AUTH_POSITIVE_TTL_MS : MCP_AUTH_NEGATIVE_TTL_MS;
}

function cacheRequest(key: string): Request {
  return new Request(`https://sam-mcp-auth.internal/${key}`, { method: "GET" });
}

function defaultCache(): Cache | undefined {
  const extra = globalThis as { caches?: { default?: Cache } };
  return extra.caches?.default;
}

async function edgeGet(key: string): Promise<AuthResult | null> {
  try {
    const cache = defaultCache();
    if (!cache) return null;
    const hit = await cache.match(cacheRequest(key));
    if (!hit) return null;
    return (await hit.json()) as AuthResult;
  } catch {
    return null;
  }
}

async function edgeSet(key: string, result: AuthResult, ttlMs: number): Promise<void> {
  try {
    const cache = defaultCache();
    if (!cache) return;
    const maxAge = Math.max(1, Math.floor(ttlMs / 1000));
    await cache.put(
      cacheRequest(key),
      new Response(JSON.stringify(result), {
        headers: {
          "content-type": "application/json",
          "cache-control": `public, max-age=${maxAge}`,
        },
      })
    );
  } catch {
    // Cache API is optional (Node/local, unsupported runtimes).
  }
}

export async function getCachedMcpAuth(authorization: string): Promise<AuthResult | null> {
  const key = await mcpAuthCacheKey(authorization);
  const mem = memory.get(key);
  if (mem) {
    if (mem.expiresAt > Date.now()) return mem.result;
    memory.delete(key);
  }
  const edge = await edgeGet(key);
  if (!edge) return null;
  memory.set(key, { result: edge, expiresAt: Date.now() + ttlFor(edge) });
  return edge;
}

export async function setCachedMcpAuth(
  authorization: string,
  result: AuthResult,
  ttlMs = ttlFor(result)
): Promise<void> {
  const key = await mcpAuthCacheKey(authorization);
  if (ttlMs <= 0) {
    memory.delete(key);
    return;
  }
  memory.set(key, { result, expiresAt: Date.now() + ttlMs });
  await edgeSet(key, result, ttlMs);
}

export function clearMcpAuthMemoryCache(): void {
  memory.clear();
}
