import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as summaries from "@/lib/domain/summaries";
import { SCOPES } from "../scopes";
import { defineTool, type AnyToolDef } from "./helpers";

export const summaryToolDefs: AnyToolDef[] = [
  {
    name: "sam_get_spending_summary",
    description:
      "SQL sum and count of ALL matching expenses, not a page. Optional category and category/day/month grouping (day/month buckets are UTC). Inclusive from/to require ISO datetimes with timezone offset. Omitted bounds mean all recorded history. Separate totals per currency; never combine currencies.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      from: z.string().optional(),
      to: z.string().optional(),
      category: z.string().max(120).optional(),
      groupBy: z.enum(["category", "day", "month"]).optional(),
    },
    handler: (ctx, args) => summaries.spendingSummary(ctx, args),
  },
  {
    name: "sam_get_cashflow",
    description: "SQL income/expense sums and counts over ALL matching records, with net per currency. Inclusive from/to require ISO datetimes with timezone offset. Omitted bounds mean all recorded history. Never combine currencies.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      from: z.string().optional(),
      to: z.string().optional(),
    },
    handler: (ctx, args) => summaries.cashflow(ctx, args),
  },
];

export function registerSummaryTools(server: McpServer, ctx: ActorContext) {
  for (const def of summaryToolDefs) defineTool(server, ctx, def);
}
