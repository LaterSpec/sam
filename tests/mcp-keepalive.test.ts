import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { hasSessionCookie } from "../lib/auth/session-cookie";
import {
  clearMcpAuthMemoryCache,
  getCachedMcpAuth,
  setCachedMcpAuth,
} from "../lib/mcp/auth-cache";
import { isMcpKeepaliveMethod, jsonRpcMethod } from "../lib/mcp/rpc-method";

describe("jsonRpcMethod", () => {
  it("reads method from a JSON-RPC object", () => {
    assert.equal(jsonRpcMethod({ jsonrpc: "2.0", id: 1, method: "ping" }), "ping");
  });

  it("returns null for batches, arrays and non-objects", () => {
    assert.equal(jsonRpcMethod([{ method: "ping" }]), null);
    assert.equal(jsonRpcMethod(null), null);
    assert.equal(jsonRpcMethod("ping"), null);
  });
});

describe("isMcpKeepaliveMethod", () => {
  it("treats initialize, ping and tools/list as keep-alives", () => {
    assert.equal(isMcpKeepaliveMethod("initialize"), true);
    assert.equal(isMcpKeepaliveMethod("ping"), true);
    assert.equal(isMcpKeepaliveMethod("tools/list"), true);
    assert.equal(isMcpKeepaliveMethod("notifications/initialized"), true);
  });

  it("does not treat tools/call as a keep-alive", () => {
    assert.equal(isMcpKeepaliveMethod("tools/call"), false);
    assert.equal(isMcpKeepaliveMethod(null), false);
    assert.equal(isMcpKeepaliveMethod("resources/read"), false);
  });
});

describe("hasSessionCookie", () => {
  it("detects Better Auth session cookies including the Secure prefix", () => {
    assert.equal(hasSessionCookie(null), false);
    assert.equal(hasSessionCookie(""), false);
    assert.equal(hasSessionCookie("theme=dark"), false);
    assert.equal(hasSessionCookie("better-auth.session_token=abc"), true);
    assert.equal(hasSessionCookie("__Secure-better-auth.session_token=abc"), true);
    assert.equal(hasSessionCookie("foo=1; better-auth.session_token=abc; bar=2"), true);
  });
});

describe("mcp auth memory cache", () => {
  beforeEach(() => {
    clearMcpAuthMemoryCache();
  });

  it("round-trips a result and expires when ttl is 0", async () => {
    const token = "Bearer sam_mcp_abc_secret";
    const ok = {
      ok: true as const,
      ctx: {
        userId: "u1",
        email: "a@b.c",
        authMethod: "mcp_token" as const,
        scopes: ["sam:read"],
        tokenId: "t1",
      },
    };
    await setCachedMcpAuth(token, ok);
    const hit = await getCachedMcpAuth(token);
    assert.deepEqual(hit, ok);

    await setCachedMcpAuth(token, ok, 0);
    assert.equal(await getCachedMcpAuth(token), null);
  });

  it("caches negative auth so revoked keep-alives skip Neon", async () => {
    const token = "Bearer sam_mcp_revoked_secret";
    await setCachedMcpAuth(token, { ok: false, status: 401, error: "token_revoked" });
    assert.deepEqual(await getCachedMcpAuth(token), {
      ok: false,
      status: 401,
      error: "token_revoked",
    });
  });
});
