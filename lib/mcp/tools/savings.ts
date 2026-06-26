import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as savings from "@/lib/domain/savings";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

export function registerSavingsTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_savings_buckets",
    description: "List savings buckets with balance, target and APY.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => savings.listSavingsBuckets(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_set_bucket_balance",
    description: "Set the balance of a savings bucket.",
    scope: SCOPES.savingsWrite,
    inputSchema: {
      bucketId: z.string().uuid(),
      balance: z.number().nonnegative(),
    },
    handler: (ctx, args) => savings.setBucketBalance(ctx, args.bucketId, args.balance),
  });
}
