import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { tool, type ToolSet } from "ai";
import type { ActorContext } from "@/lib/domain/types";
import { DomainError } from "@/lib/domain/types";
import { getFinanceToolDefs } from "@/lib/tools/catalog";
import { SAMY_LIST_TRANSACTIONS_MAX, SAMY_TOOL_RESULT_MAX } from "./constants";
import { memoryToolDefs } from "./memory-tools";
import { truncateToolResult } from "./parse";
import type { Scope } from "@/lib/mcp/scopes";

function shapeToObject(def: {
  inputSchema?: Record<string, z.ZodTypeAny>;
  annotations?: { destructiveHint?: boolean };
}) {
  const base = def.inputSchema ?? {};
  if (def.annotations?.destructiveHint && !("confirm" in base)) {
    return z.object({ ...base, confirm: z.boolean().default(false) });
  }
  return z.object(base);
}

export function buildSamyToolSet(
  ctx: ActorContext,
  conversationId: string,
  allowedScopes: readonly Scope[]
): ToolSet {
  const tools: ToolSet = {};

  for (const def of getFinanceToolDefs()) {
    if (!allowedScopes.includes(def.scope)) continue;
    const inputSchema = shapeToObject(def);
    tools[def.name] = tool({
      description: def.description,
      inputSchema,
      execute: async (raw) => {
        const args = { ...(raw as Record<string, unknown>) };
        if (def.annotations?.destructiveHint && args.confirm !== true) {
          return {
            error: "confirmation_required",
            message: "Ask the user to confirm this action, then retry with confirm=true.",
          };
        }
        if (def.name === "sam_list_transactions") {
          const limit = typeof args.limit === "number" ? args.limit : SAMY_LIST_TRANSACTIONS_MAX;
          args.limit = Math.min(limit, SAMY_LIST_TRANSACTIONS_MAX);
        }
        try {
          const result = await def.handler(ctx, args);
          return truncateToolResult(result, SAMY_TOOL_RESULT_MAX);
        } catch (error) {
          if (error instanceof DomainError) {
            return { error: error.code, message: error.message };
          }
          return { error: "tool_error", message: "tool failed" };
        }
      },
    });
  }

  for (const def of memoryToolDefs(conversationId)) {
    const inputSchema = shapeToObject(def);
    tools[def.name] = tool({
      description: def.description,
      inputSchema,
      execute: async (raw) => {
        try {
          return truncateToolResult(
            await def.handler(ctx, raw as Record<string, unknown>),
            SAMY_TOOL_RESULT_MAX
          );
        } catch (error) {
          if (error instanceof DomainError) {
            return { error: error.code, message: error.message };
          }
          return { error: "tool_error", message: "tool failed" };
        }
      },
    });
  }

  return tools;
}

export function createSamyModel() {
  const apiKey = process.env.OPENAI_API_KEY;
  const modelId = process.env.OPENAI_MODEL || "gpt-5.6-luna";
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  const openai = createOpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  return openai(modelId);
}
