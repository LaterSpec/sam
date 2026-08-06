import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticate } from "@/lib/mcp/auth";
import { buildMcpServer } from "@/lib/mcp/server";

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

async function handlePost(request: Request): Promise<Response> {
  let auth;
  try {
    auth = await authenticate(request.headers.get("authorization"), clientIp(request));
  } catch (e) {
    const message = e instanceof Error ? e.message : "authentication_failed";
    return jsonRpcError(500, -32603, `auth_error: ${message}`);
  }
  if (!auth.ok) return unauthorized(auth.error);

  const server = buildMcpServer(auth.ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
    enableJsonResponse: true,
  });

  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } catch (e) {
    const message = e instanceof Error ? e.message : "internal_error";
    return jsonRpcError(500, -32603, message);
  } finally {
    await transport.close();
    await server.close();
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
