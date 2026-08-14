import { authenticate } from "@/lib/mcp/auth";
import { isMcpKeepaliveMethod, jsonRpcMethod } from "@/lib/mcp/rpc-method";
import { buildMcpServer } from "@/lib/mcp/server";
import { JsonRpcTransport } from "@/lib/mcp/json-rpc-transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function clientIp(request: Request): string | null {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null
  );
}

function jsonRpcError(status: number, code: number, message: string, headers?: HeadersInit): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code, message },
      id: null,
    }),
    {
      status,
      headers: {
        "content-type": "application/json",
        ...headers,
      },
    }
  );
}

function unauthorized(error: string): Response {
  return jsonRpcError(401, -32001, error, {
    "www-authenticate": 'Bearer realm="sam-mcp"',
  });
}

/**
 * Stateless MCP: no server-initiated SSE. Clients often GET /api/mcp after
 * initialize; opening that hanging stream on Cloudflare Workers gets the
 * isolate killed (surface as HTTP 500). Spec allows 405 when SSE is unsupported.
 */
function methodNotAllowed(): Response {
  return jsonRpcError(405, -32000, "Method Not Allowed: SAM MCP is stateless; use POST only", {
    Allow: "POST, OPTIONS",
  });
}

function acceptOk(request: Request): boolean {
  const accept = request.headers.get("accept") ?? "";
  return accept.includes("application/json") && accept.includes("text/event-stream");
}

async function handlePost(request: Request): Promise<Response> {
  if (!acceptOk(request)) {
    return jsonRpcError(
      406,
      -32000,
      "Not Acceptable: Client must accept both application/json and text/event-stream"
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return jsonRpcError(415, -32000, "Unsupported Media Type: Content-Type must be application/json");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonRpcError(400, -32700, "Parse error: Invalid JSON");
  }

  if (Array.isArray(body)) {
    return jsonRpcError(400, -32600, "Invalid Request: batch JSON-RPC is not supported");
  }

  const keepalive = isMcpKeepaliveMethod(jsonRpcMethod(body));

  let auth;
  try {
    auth = await authenticate(request.headers.get("authorization"), clientIp(request), {
      useCache: keepalive,
      touchLastUsed: !keepalive,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "authentication_failed";
    return jsonRpcError(500, -32603, `auth_error: ${message}`);
  }
  if (!auth.ok) return unauthorized(auth.error);

  const transport = new JsonRpcTransport();
  const server = buildMcpServer(auth.ctx);
  await server.connect(transport);

  try {
    const result = await transport.exchange(body, {
      requestInfo: {
        headers: Object.fromEntries(request.headers.entries()),
      },
    });

    // Notifications have no JSON-RPC response body.
    if (result == null) {
      return new Response(null, { status: 202 });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal_error";
    const code = message === "mcp_handler_timeout" ? -32000 : -32603;
    const status = message === "mcp_handler_timeout" ? 504 : 500;
    return jsonRpcError(status, code, message);
  } finally {
    await transport.close().catch(() => undefined);
    await server.close().catch(() => undefined);
  }
}

export async function POST(request: Request): Promise<Response> {
  return handlePost(request);
}

export async function GET(): Promise<Response> {
  return methodNotAllowed();
}

export async function DELETE(): Promise<Response> {
  return methodNotAllowed();
}
