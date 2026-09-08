import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as income from "@/lib/domain/income";
import { SCOPES } from "../scopes";
import { presentTransaction } from "../presenters";
import { occurredAtSchema } from "../occurred-at";
import { defineTool, type AnyToolDef } from "./helpers";

export const incomeToolDefs: AnyToolDef[] = [
  {
    name: "sam_list_income_sources",
    description:
      "Deprecated compatibility view of legacy income sources. Use sam_list_recurring_rules for schedules.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => income.listIncomeSources(ctx),
  },
  {
    name: "sam_add_income",
    description:
      "Record one income transaction and credit the selected account. Use sam_create_recurring_rule for recurring income. Optional occurredAt (YYYY-MM-DD or ISO datetime with Z/offset); if omitted, uses the current time.",
    scope: SCOPES.incomeWrite,
    inputSchema: {
      name: z.string().min(1).max(120),
      amount: z.number().positive(),
      accountId: z.string().uuid(),
      occurredAt: occurredAtSchema.optional(),
    },
    handler: async (ctx, args) => {
      const result = await income.addIncomeTransaction(ctx, {
        name: args.name,
        amount: args.amount,
        accountId: args.accountId,
        occurredAt: args.occurredAt,
      });
      return {
        ...result,
        tx: presentTransaction(result.tx),
      };
    },
  },
];

export function registerIncomeTools(server: McpServer, ctx: ActorContext) {
  for (const def of incomeToolDefs) defineTool(server, ctx, def);
}
