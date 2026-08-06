import type { Transport, TransportSendOptions } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage, MessageExtraInfo, RequestId } from "@modelcontextprotocol/sdk/types.js";

type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: RequestId | null;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
};

/**
 * One-shot in-memory MCP transport for Cloudflare Workers.
 *
 * WebStandardStreamableHTTPServerTransport + enableJsonResponse returns a
 * Promise that only settles via resolveJson. If cleanup/close runs first, or
 * the Workers runtime drops the floating onmessage promise, the client hangs
 * until timeout. This transport makes the wait explicit and awaitable.
 */
export class JsonRpcTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;

  private readonly pending = new Map<
    string,
    { resolve: (message: JSONRPCMessage) => void; reject: (error: Error) => void }
 >();

  async start(): Promise<void> {}

  async send(message: JSONRPCMessage, _options?: TransportSendOptions): Promise<void> {
    if (!("id" in message) || message.id === null || message.id === undefined) {
      return;
    }
    const key = String(message.id);
    const waiter = this.pending.get(key);
    if (!waiter) return;
    this.pending.delete(key);
    waiter.resolve(message);
  }

  async close(): Promise<void> {
    for (const [, waiter] of this.pending) {
      waiter.reject(new Error("transport_closed"));
    }
    this.pending.clear();
    this.onclose?.();
  }

  /**
   * Deliver one JSON-RPC message and wait for its response (if it is a request).
   * Notifications (no id) return null after dispatch.
   */
  async exchange(
    raw: unknown,
    extra?: MessageExtraInfo,
    timeoutMs = 20_000
  ): Promise<JSONRPCMessage | null> {
    const message = raw as JsonRpcRequest;
    const isRequest = message != null && typeof message === "object" && "method" in message && "id" in message
      && message.id !== null && message.id !== undefined;

    if (!isRequest) {
      this.onmessage?.(message as JSONRPCMessage, extra);
      return null;
    }

    const key = String(message.id);
    const responsePromise = new Promise<JSONRPCMessage>((resolve, reject) => {
      this.pending.set(key, { resolve, reject });
    });

    this.onmessage?.(message as JSONRPCMessage, extra);

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        responsePromise,
        new Promise<JSONRPCMessage>((_, reject) => {
          timer = setTimeout(() => reject(new Error("mcp_handler_timeout")), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
      this.pending.delete(key);
    }
  }
}
