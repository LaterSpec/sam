import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import type { AnyToolDef } from "@/lib/mcp/tools/helpers";
import { SCOPES } from "@/lib/mcp/scopes";
import { forgetMemory, recallMemories, rememberMemory } from "./memories";

export function memoryToolDefs(conversationId: string): AnyToolDef[] {
  return [
    {
      name: "samy_remember",
      description:
        "Store a stable user preference, fact, instruction or insight for future chats. Do not store ledger totals or transaction lists.",
      scope: SCOPES.read,
      annotations: { idempotentHint: true },
      inputSchema: {
        key: z.string().min(1).max(80),
        kind: z.enum(["preference", "fact", "instruction", "insight"]),
        content: z.string().min(1).max(500),
        importance: z.number().int().min(1).max(5).optional(),
      },
      handler: (ctx: ActorContext, args) =>
        rememberMemory({
          userId: ctx.userId,
          key: args.key,
          kind: args.kind,
          content: args.content,
          importance: args.importance,
          conversationId,
        }),
    },
    {
      name: "samy_forget",
      description: "Delete a stored memory by key.",
      scope: SCOPES.read,
      inputSchema: {
        key: z.string().min(1).max(80),
      },
      handler: (ctx: ActorContext, args) => forgetMemory(ctx.userId, args.key),
    },
    {
      name: "samy_recall",
      description: "Search stored memories by key or content when the injected memory block is not enough.",
      scope: SCOPES.read,
      annotations: { readOnlyHint: true },
      inputSchema: {
        query: z.string().min(1).max(120),
      },
      handler: (ctx: ActorContext, args) => recallMemories(ctx.userId, args.query),
    },
  ];
}
