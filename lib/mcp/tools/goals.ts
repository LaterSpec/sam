import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as goals from "@/lib/domain/goals";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

export function registerGoalTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_goals",
    description: "List savings goals with target, saved amount and completion status.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => goals.listGoals(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_create_goal",
    description: "Create a savings goal with a target amount.",
    scope: SCOPES.goalsWrite,
    inputSchema: {
      name: z.string().min(1).max(120),
      target: z.number().nonnegative(),
      icon: z.string().max(8).optional(),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    },
    handler: (ctx, args) => goals.createGoal(ctx, args),
  });

  defineTool(server, ctx, {
    name: "sam_update_goal",
    description: "Update a goal's name, target, icon or color.",
    scope: SCOPES.goalsWrite,
    inputSchema: {
      id: z.string().uuid(),
      name: z.string().min(1).max(120).optional(),
      target: z.number().nonnegative().optional(),
      icon: z.string().max(8).optional(),
      color: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
    },
    handler: (ctx, args) => goals.updateGoal(ctx, args),
  });

  defineTool(server, ctx, {
    name: "sam_set_goal_saved",
    description: "Set the saved amount on a goal (capped at the target).",
    scope: SCOPES.goalsWrite,
    inputSchema: {
      id: z.string().uuid(),
      saved: z.number().nonnegative(),
    },
    handler: (ctx, args) => goals.setGoalSaved(ctx, args.id, args.saved),
  });
}
