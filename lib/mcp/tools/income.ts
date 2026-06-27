import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as income from "@/lib/domain/income";
import { SCOPES } from "../scopes";
import { presentTransaction } from "../presenters";
import { defineTool } from "./helpers";

export function registerIncomeTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_income_sources",
    description: "List recurring income sources with amount, frequency and next date.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => income.listIncomeSources(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_add_income",
    description:
      "Add an income source. If accountId is provided, also records an income transaction and credits that account.",
    scope: SCOPES.incomeWrite,
    inputSchema: {
      name: z.string().min(1).max(120),
      amount: z.number().positive(),
      freq: z.string().max(32).optional(),
      next: z.string().max(32).optional(),
      accountId: z.string().uuid().optional(),
    },
    handler: async (ctx, args) => {
      const result = await income.addIncome(ctx, {
        name: args.name,
        amt: args.amount,
        freq: args.freq,
        next: args.next,
        accountId: args.accountId,
      });
      return {
        ...result,
        incomeTx: result.incomeTx ? presentTransaction(result.incomeTx) : null,
      };
    },
  });
}
