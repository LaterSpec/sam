import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as categories from "@/lib/domain/categories";
import { SCOPES } from "../scopes";
import { presentCategory } from "../presenters";
import { defineTool, type AnyToolDef } from "./helpers";

export const categoryToolDefs: AnyToolDef[] = [
  {
    name: "sam_list_categories",
    description:
      "List budget categories with monthly cap, currency, current-month spend, remaining and percent used. Optional currency (USD or PEN) returns only that currency's budgets.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      currency: z.enum(["USD", "PEN"]).optional(),
    },
    handler: async (ctx, args) => (await categories.listCategories(ctx, args.currency)).map(presentCategory),
  },
  {
    name: "sam_get_budget_status",
    description:
      "Get budget health: categories over budget and those near their cap (default >= 80% used). Optional currency (USD or PEN) limits the status to that currency.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      nearThresholdPct: z.number().min(1).max(100).optional(),
      currency: z.enum(["USD", "PEN"]).optional(),
    },
    handler: async (ctx, args) => {
      const status = await categories.getBudgetStatus(ctx, args.nearThresholdPct ?? 80, args.currency);
      return {
        ...status,
        overBudget: status.overBudget.map(presentCategory),
        nearLimit: status.nearLimit.map(presentCategory),
        categories: status.categories.map(presentCategory),
      };
    },
  },
  {
    name: "sam_create_category",
    description:
      "Create a budget category in USD or PEN. Currency defaults to USD. Spend from the other currency does not count against this cap.",
    scope: SCOPES.categoriesWrite,
    inputSchema: {
      name: z.string().min(1).max(120),
      monthlyCap: z.number().nonnegative().optional(),
      currency: z.enum(["USD", "PEN"]).default("USD"),
      icon: z.string().max(8).optional(),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    },
    handler: async (ctx, args) => presentCategory(await categories.createCategory(ctx, args)),
  },
  {
    name: "sam_update_category",
    description: "Update a category's name, monthly cap, icon, color or currency (USD or PEN).",
    scope: SCOPES.categoriesWrite,
    inputSchema: {
      id: z.string().uuid(),
      name: z.string().min(1).max(120),
      monthlyCap: z.number().nonnegative(),
      currency: z.enum(["USD", "PEN"]).optional(),
      icon: z.string().max(8).optional(),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    },
    handler: async (ctx, args) => presentCategory(await categories.updateCategory(ctx, args)),
  },
  {
    name: "sam_update_category_cap",
    description: "Set the monthly cap for a category.",
    scope: SCOPES.categoriesWrite,
    inputSchema: {
      categoryId: z.string().uuid(),
      monthlyCap: z.number().nonnegative(),
    },
    handler: async (ctx, args) =>
      presentCategory(await categories.setCategoryCap(ctx, args.categoryId, args.monthlyCap)),
  },
];

export function registerCategoryTools(server: McpServer, ctx: ActorContext) {
  for (const def of categoryToolDefs) defineTool(server, ctx, def);
}
