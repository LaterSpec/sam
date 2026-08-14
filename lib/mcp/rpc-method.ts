/** JSON-RPC methods that MCP clients send as keep-alives / session setup. */
const KEEPALIVE_METHODS = new Set([
  "initialize",
  "ping",
  "notifications/initialized",
  "notifications/cancelled",
  "tools/list",
  "resources/list",
  "prompts/list",
  "logging/setLevel",
]);

export function jsonRpcMethod(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const method = (body as { method?: unknown }).method;
  return typeof method === "string" ? method : null;
}

/** True for initialize / ping / tools/list / notifications — not tools/call. */
export function isMcpKeepaliveMethod(method: string | null | undefined): boolean {
  if (!method) return false;
  return KEEPALIVE_METHODS.has(method) || method.startsWith("notifications/");
}
