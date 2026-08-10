import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as expenses from "@/lib/domain/expenses";
import * as categories from "@/lib/domain/categories";
import { SCOPES } from "../scopes";
import { presentTransaction } from "../presenters";
import { occurredAtSchema } from "../occurred-at";
import { defineTool } from "./helpers";

export function registerExpenseTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_transactions",
    description:
      "List transactions with optional filters: date range (from/to ISO), kind (expense|income), category display name, accountId, free-text search. Category inputs and outputs use user-facing text, never internal keys. Newest first, paginated.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      from: z.string().optional(),
      to: z.string().optional(),
      kind: z.enum(["expense", "income"]).optional(),
      category: z.string().max(120).optional(),
      accountId: z.string().uuid().optional(),
      search: z.string().max(120).optional(),
      limit: z.number().int().min(1).max(500).optional(),
      offset: z.number().int().min(0).optional(),
    },
    handler: async (ctx, args) => {
      const result = await expenses.listTransactions(ctx, args);
      return {
        ...result,
        transactions: result.transactions.map(presentTransaction),
      };
    },
  });

  defineTool(server, ctx, {
    name: "sam_add_expense",
    description:
      "Add an expense using the category's user-facing name. Call sam_list_categories when the name is unknown. Resolves the account by id or default priority and updates its balance. Optional occurredAt (YYYY-MM-DD or ISO datetime with Z/offset) assigns the expense to that date/month's category budget; if omitted, uses the current time.",
    scope: SCOPES.expensesWrite,
    inputSchema: {
      amount: z.number().positive(),
      name: z.string().min(1).max(120),
      category: z.string().min(1).max(120).optional(),
      accountId: z.string().uuid().optional(),
      occurredAt: occurredAtSchema.optional(),
    },
    handler: async (ctx, args) => {
      const catKey =
        args.category === undefined
          ? "misc"
          : await categories.resolveCategoryKeyByName(ctx, args.category);
      const result = await expenses.addExpense(ctx, {
        amount: args.amount,
        name: args.name,
        catKey,
        accountId: args.accountId,
        occurredAt: args.occurredAt,
      });
      return { ...result, tx: presentTransaction(result.tx) };
    },
  });

  defineTool(server, ctx, {
    name: "sam_update_expense",
    description:
      "Update an expense's amount, name, category display name, account or notes. Category text must match a name returned by sam_list_categories.",
    scope: SCOPES.expensesWrite,
    inputSchema: {
      id: z.string().uuid(),
      amount: z.number().positive().optional(),
      name: z.string().min(1).max(120).optional(),
      category: z.string().min(1).max(120).optional(),
      accountId: z.string().uuid().optional(),
      notes: z.string().max(2000).optional(),
    },
    handler: async (ctx, args) => {
      const catKey =
        args.category === undefined
          ? undefined
          : await categories.resolveCategoryKeyByName(ctx, args.category);
      const result = await expenses.updateExpense(ctx, {
        id: args.id,
        amount: args.amount,
        name: args.name,
        catKey,
        accountId: args.accountId,
        notes: args.notes,
      });
      return { ...result, tx: presentTransaction(result.tx) };
    },
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
