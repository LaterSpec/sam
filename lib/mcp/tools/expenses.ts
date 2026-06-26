import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as expenses from "@/lib/domain/expenses";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

export function registerExpenseTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_transactions",
    description:
      "List transactions with optional filters: date range (from/to ISO), kind (expense|income), categoryKey, accountId, free-text search. Newest first, paginated. Use this for 'spending between dates' and 'latest transactions'.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      from: z.string().optional(),
      to: z.string().optional(),
      kind: z.enum(["expense", "income"]).optional(),
      categoryKey: z.string().max(120).optional(),
      accountId: z.string().uuid().optional(),
      search: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(500).optional(),
      offset: z.number().int().min(0).optional(),
    },
    handler: (ctx, args) => expenses.listTransactions(ctx, args),
  });

  defineTool(server, ctx, {
    name: "sam_add_expense",
    description:
      "Add an expense. Resolves account by id or default priority, category by key (falls back to misc), and updates the account balance.",
    scope: SCOPES.expensesWrite,
    inputSchema: {
      amount: z.number().positive(),
      name: z.string().min(1).max(120),
      categoryKey: z.string().min(1).max(120).default("misc"),
      accountId: z.string().uuid().optional(),
    },
    handler: (ctx, args) =>
      expenses.addExpense(ctx, {
        amount: args.amount,
        name: args.name,
        catKey: args.categoryKey,
        accountId: args.accountId,
      }),
  });

  defineTool(server, ctx, {
    name: "sam_update_expense",
    description: "Update an expense's amount, name, category, account or notes.",
    scope: SCOPES.expensesWrite,
    inputSchema: {
      id: z.string().uuid(),
      amount: z.number().positive().optional(),
      name: z.string().min(1).max(120).optional(),
      categoryKey: z.string().min(1).max(120).optional(),
      accountId: z.string().uuid().optional(),
      notes: z.string().max(2000).optional(),
    },
    handler: (ctx, args) =>
      expenses.updateExpense(ctx, {
        id: args.id,
        amount: args.amount,
        name: args.name,
        catKey: args.categoryKey,
        accountId: args.accountId,
        notes: args.notes,
      }),
  });

  defineTool(server, ctx, {
    name: "sam_delete_expense",
    description: "Delete an expense by id and restore the affected account balance.",
    scope: SCOPES.expensesWrite,
    annotations: { destructiveHint: true },
    inputSchema: {
      id: z.string().uuid(),
    },
    handler: (ctx, args) => expenses.deleteExpense(ctx, args.id),
  });
}
