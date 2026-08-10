/**
 * AES-GCM encryption for per-install integration secrets.
 * Key: INTEGRATION_SECRETS_KEY (base64-encoded 32 bytes).
 */

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) out += b.toString(16).padStart(2, "0");
  return out;
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

function toBytes(source: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(source.byteLength);
  copy.set(source);
  return copy;
}

async function importKey(): Promise<CryptoKey> {
  const raw = process.env.INTEGRATION_SECRETS_KEY ?? "";
  if (!raw) {
    throw new Error("INTEGRATION_SECRETS_KEY is not configured");
  }
  let keyBytes: Uint8Array;
  try {
    keyBytes = fromBase64(raw);
  } catch {
    keyBytes = new TextEncoder().encode(raw.padEnd(32, "0").slice(0, 32));
  }
  if (keyBytes.length !== 32) {
    const digest = await crypto.subtle.digest("SHA-256", toBytes(keyBytes));
    keyBytes = new Uint8Array(digest);
  }
  return crypto.subtle.importKey("raw", toBytes(keyBytes), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptSecretPayload(payload: unknown): Promise<{
  ciphertext: string;
  iv: string;
  keyVersion: number;
}> {
  const key = await importKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: toBytes(iv) }, key, encoded);
  return {
    ciphertext: toBase64(new Uint8Array(cipher)),
    iv: toHex(iv),
    keyVersion: 1,
  };
}

export async function decryptSecretPayload<T = Record<string, unknown>>(
  ciphertext: string,
  iv: string
): Promise<T> {
  const key = await importKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toBytes(fromHex(iv)) },
    key,
    toBytes(fromBase64(ciphertext))
  );
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

export async function hashWebhookToken(token: string): Promise<string> {
  const pepper = process.env.INTEGRATION_SECRETS_KEY ?? "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${pepper}:webhook:${token}`)
  );
  return toHex(new Uint8Array(digest));
}

export function generateWebhookToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return `sam_hook_${toHex(bytes)}`;
}
