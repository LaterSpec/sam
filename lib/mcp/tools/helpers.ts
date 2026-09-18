import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { DomainError, type ActorContext } from "@/lib/domain/types";
import { requireScope, hasScope, type Scope } from "../scopes";
import { writeAudit } from "../audit";
import { reserveMcpToolCall } from "@/lib/plans/usage";
import { PlanError } from "@/lib/plans/errors";

export type ToolAnnotations = {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
};

export type ToolDef<Shape extends ZodRawShape = ZodRawShape> = {
  name: string;
  title?: string;
  description: string;
  scope: Scope;
  inputSchema?: Shape;
  annotations?: ToolAnnotations;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (ctx: ActorContext, args: any) => Promise<unknown>;
};

export type AnyToolDef = ToolDef<ZodRawShape>;

function jsonResult(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data) }],
  };
}

function errorResult(code: string, message?: string) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify({ error: code, message: message ?? code }),
      },
    ],
    isError: true as const,
  };
}

/**
 * Registers a tool that:
 *  - enforces its required scope (denied -> audit + safe error)
 *  - runs the domain handler
 *  - returns structured JSON content
 *  - writes an audit log for every outcome (ok / denied / error)
 */
export function defineTool(server: McpServer, ctx: ActorContext, def: AnyToolDef): void {
  const config = {
    title: def.title,
    description: def.description,
    inputSchema: def.inputSchema,
    annotations: def.annotations,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cb = async (args: any, extra: any) => {
    const requestId = extra?.requestId != null ? String(extra.requestId) : null;

    if (!hasScope(ctx, def.scope)) {
      await writeAudit({
        ctx,
        toolName: def.name,
        input: args,
        resultStatus: "denied",
        errorMessage: `missing scope: ${def.scope}`,
        requestId,
      });
      return errorResult("scope_denied", `missing scope: ${def.scope}`);
    }

    try {
      requireScope(ctx, def.scope);
      if (ctx.authMethod === "mcp_token" && ctx.tokenId) {
        await reserveMcpToolCall({
          userId: ctx.userId,
          tokenId: ctx.tokenId,
          write: def.annotations?.readOnlyHint !== true,
        });
      }
      const data = await def.handler(ctx, (args ?? {}) as Record<string, unknown>);
      await writeAudit({ ctx, toolName: def.name, input: args, resultStatus: "ok", requestId });
      return jsonResult(data);
    } catch (e) {
      const code = e instanceof PlanError ? e.code : e instanceof DomainError ? e.code : "tool_error";
      const internalMessage =
        e instanceof PlanError || e instanceof DomainError
          ? e.message
          : e instanceof Error
            ? e.message
            : "tool failed";
      await writeAudit({
        ctx,
        toolName: def.name,
        input: args,
        resultStatus: "error",
        errorMessage: `${code}: ${internalMessage}`,
        requestId,
      });
      return errorResult(code, e instanceof PlanError || e instanceof DomainError ? e.message : "tool failed");
    }
  };

  // The SDK's registerTool overloads use a structural ZodRawShape-compatible
  // type; our generic Shape satisfies it but TS can't prove it across the
  // boundary, so we register through a narrow cast.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (server.registerTool as any)(def.name, config, cb);
}

export function registerToolDefs(server: McpServer, ctx: ActorContext, defs: AnyToolDef[]): void {
  for (const def of defs) defineTool(server, ctx, def);
}
