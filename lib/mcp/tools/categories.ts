import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as categories from "@/lib/domain/categories";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

export function registerCategoryTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_categories",
    description:
      "List budget categories with monthly cap, current-month spend, remaining and percent used.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => categories.listCategories(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_get_budget_status",
    description:
      "Get budget health: categories over budget and those near their cap (default >= 80% used).",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      nearThresholdPct: z.number().min(1).max(100).optional(),
    },
    handler: (ctx, args) => categories.getBudgetStatus(ctx, args.nearThresholdPct ?? 80),
  });

  defineTool(server, ctx, {
    name: "sam_create_category",
    description: "Create a budget category with an optional monthly cap, icon and color.",
    scope: SCOPES.categoriesWrite,
    inputSchema: {
      name: z.string().min(1).max(120),
      monthlyCap: z.number().nonnegative().optional(),
      icon: z.string().max(8).optional(),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    },
    handler: (ctx, args) => categories.createCategory(ctx, args),
  });

  defineTool(server, ctx, {
    name: "sam_update_category",
    description: "Update a category's name, monthly cap, icon and color.",
    scope: SCOPES.categoriesWrite,
    inputSchema: {
      id: z.string().uuid(),
      name: z.string().min(1).max(120),
      monthlyCap: z.number().nonnegative(),
      icon: z.string().max(8).optional(),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    },
    handler: (ctx, args) => categories.updateCategory(ctx, args),
  });

  defineTool(server, ctx, {
    name: "sam_update_category_cap",
    description: "Set the monthly cap for a category.",
    scope: SCOPES.categoriesWrite,
    inputSchema: {
      categoryId: z.string().uuid(),
      monthlyCap: z.number().nonnegative(),
    },
    handler: (ctx, args) => categories.setCategoryCap(ctx, args.categoryId, args.monthlyCap),
  });
}
