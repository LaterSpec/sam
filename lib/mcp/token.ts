/**
 * Personal MCP token format, hashing and verification.
 *
 * Token shape: sam_mcp_<public_prefix>_<secret>
 *   - public_prefix: short, non-secret lookup key (stored in plaintext)
 *   - secret: high-entropy random value (never stored)
 *
 * Only a salted SHA-256 hash of the secret is persisted. Verification looks up
 * by public_prefix, recomputes the hash and compares in constant time.
 *
 * Uses Web Crypto (crypto.subtle / crypto.getRandomValues) so it runs on
 * Cloudflare Workers without Node's `crypto` module.
 */

export const TOKEN_PREFIX = "sam_mcp";
const PREFIX_BYTES = 6; // -> 12 hex chars
const SECRET_BYTES = 32; // 256 bits

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function randomHex(byteLength: number): string {
  const buf = new Uint8Array(byteLength);
  crypto.getRandomValues(buf);
  return toHex(buf);
}

function pepper(): string {
  return process.env.MCP_TOKEN_PEPPER ?? "";
}

export async function hashSecret(secret: string): Promise<string> {
  const data = new TextEncoder().encode(`${pepper()}:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

/** Constant-time comparison of two equal-length hex strings. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type GeneratedToken = {
  token: string;
  publicPrefix: string;
  tokenHash: string;
};

export async function generateToken(): Promise<GeneratedToken> {
  const publicPrefix = randomHex(PREFIX_BYTES);
  const secret = randomHex(SECRET_BYTES);
  const token = `${TOKEN_PREFIX}_${publicPrefix}_${secret}`;
  const tokenHash = await hashSecret(secret);
  return { token, publicPrefix, tokenHash };
}

export type ParsedToken = { publicPrefix: string; secret: string };

export function parseToken(raw: string): ParsedToken | null {
  if (!raw) return null;
  const value = raw.startsWith("Bearer ") ? raw.slice(7).trim() : raw.trim();
  const parts = value.split("_");
  // sam, mcp, <prefix>, <secret>
  if (parts.length !== 4) return null;
  if (`${parts[0]}_${parts[1]}` !== TOKEN_PREFIX) return null;
  const [, , publicPrefix, secret] = parts;
  if (!publicPrefix || !secret) return null;
  return { publicPrefix, secret };
}
