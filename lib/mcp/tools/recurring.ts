import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import { DomainError, DomainErrorCodes } from "@/lib/domain/types";
import * as recurring from "@/lib/domain/recurring";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

const idInput = { id: z.string().uuid() };

export function registerRecurringTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_recurring_rules",
    description:
      "List recurring income and expense rules, including schedule, account, category, state and next occurrence.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      status: z.enum(["active", "paused", "archived"]).optional(),
      kind: z.enum(["expense", "income"]).optional(),
      includeArchived: z.boolean().default(false),
    },
    handler: (actor, args) => recurring.listRecurringRules(actor, args),
  });

  defineTool(server, ctx, {
    name: "sam_create_recurring_rule",
    description:
      "Create a recurring income or expense. Expense requires categoryId; income must omit it. Past/current schedules require confirmCatchUp=true and may post up to 100 due transactions immediately.",
    scope: SCOPES.recurringWrite,
    inputSchema: {
      kind: z.enum(["expense", "income"]),
      name: z.string().min(1).max(120),
      amount: z.number().positive(),
      accountId: z.string().uuid(),
      categoryId: z.string().uuid().optional(),
      frequencyUnit: z.enum(["day", "week", "month", "year"]),
      frequencyInterval: z.number().int().min(1).max(365).default(1),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      timezone: z.string().min(1).max(80).default("America/Lima"),
      confirmCatchUp: z.boolean().default(false),
    },
    handler: (actor, args) => recurring.createRecurringRule(actor, args),
  });

  defineTool(server, ctx, {
    name: "sam_update_recurring_rule",
    description:
      "Update a recurring rule. Changes affect future occurrences only and never rewrite posted transactions.",
    scope: SCOPES.recurringWrite,
    inputSchema: {
      id: z.string().uuid(),
      kind: z.enum(["expense", "income"]).optional(),
      name: z.string().min(1).max(120).optional(),
      amount: z.number().positive().optional(),
      accountId: z.string().uuid().optional(),
      categoryId: z.string().uuid().nullable().optional(),
      frequencyUnit: z.enum(["day", "week", "month", "year"]).optional(),
      frequencyInterval: z.number().int().min(1).max(365).optional(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
      timezone: z.string().min(1).max(80).optional(),
    },
    handler: (actor, args) => recurring.updateRecurringRule(actor, args),
  });

  defineTool(server, ctx, {
    name: "sam_pause_recurring_rule",
    description:
      "Pause a recurring rule. Dates elapsed while paused are skipped when the rule resumes.",
    scope: SCOPES.recurringWrite,
    inputSchema: idInput,
    handler: (actor, args) => recurring.pauseRecurringRule(actor, args.id),
  });

  defineTool(server, ctx, {
    name: "sam_resume_recurring_rule",
    description: "Resume a paused recurring rule from its first future scheduled date.",
    scope: SCOPES.recurringWrite,
    inputSchema: idInput,
    handler: (actor, args) => recurring.resumeRecurringRule(actor, args.id),
  });

  defineTool(server, ctx, {
    name: "sam_archive_recurring_rule",
    description:
      "Archive a recurring rule. Posted transaction history is preserved. Requires confirm=true.",
    scope: SCOPES.recurringWrite,
    annotations: { destructiveHint: true },
    inputSchema: { ...idInput, confirm: z.boolean().default(false) },
    handler: (actor, args) => {
      if (!args.confirm) {
        throw new DomainError(
          DomainErrorCodes.confirmationRequired,
          "set confirm=true to archive the recurring rule"
        );
      }
      return recurring.archiveRecurringRule(actor, args.id);
    },
  });

  defineTool(server, ctx, {
    name: "sam_delete_recurring_rule",
    description:
      "Compatibility alias for archiving a recurring rule; history is never physically deleted. Requires confirm=true.",
    scope: SCOPES.recurringWrite,
    annotations: { destructiveHint: true },
    inputSchema: { ...idInput, confirm: z.boolean().default(false) },
    handler: (actor, args) => {
      if (!args.confirm) {
        throw new DomainError(
          DomainErrorCodes.confirmationRequired,
          "set confirm=true to archive the recurring rule"
        );
      }
      return recurring.archiveRecurringRule(actor, args.id);
    },
  });

  defineTool(server, ctx, {
    name: "sam_list_recurring_occurrences",
    description:
      "List posted, failed, skipped or processing occurrences for recurring rules, with transaction references and retry details.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      ruleId: z.string().uuid().optional(),
      status: z.enum(["processing", "posted", "failed", "skipped"]).optional(),
      limit: z.number().int().min(1).max(500).default(100),
      offset: z.number().int().min(0).default(0),
    },
    handler: (actor, args) => recurring.listRecurringOccurrences(actor, args),
  });

  defineTool(server, ctx, {
    name: "sam_retry_recurring_occurrence",
    description:
      "Retry one failed occurrence. If funds are still insufficient it stays failed and no balance is changed.",
    scope: SCOPES.recurringWrite,
    inputSchema: idInput,
    handler: (actor, args) => recurring.retryRecurringOccurrence(actor, args.id),
  });
}
