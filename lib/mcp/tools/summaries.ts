import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as summaries from "@/lib/domain/summaries";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

export function registerSummaryTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_get_spending_summary",
    description:
      "Summarize expense totals over a date range, optionally filtered by category, grouped by category / day / month.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      from: z.string().optional(),
      to: z.string().optional(),
      categoryKey: z.string().max(120).optional(),
      groupBy: z.enum(["category", "day", "month"]).optional(),
    },
    handler: (ctx, args) => summaries.spendingSummary(ctx, args),
  });

  defineTool(server, ctx, {
    name: "sam_get_cashflow",
    description: "Get income vs expense totals and net cashflow over a date range.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      from: z.string().optional(),
      to: z.string().optional(),
    },
    handler: (ctx, args) => summaries.cashflow(ctx, args),
  });
}
