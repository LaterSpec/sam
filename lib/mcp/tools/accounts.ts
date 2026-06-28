import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import { DomainError, DomainErrorCodes } from "@/lib/domain/types";
import * as accounts from "@/lib/domain/accounts";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

export function registerAccountTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_accounts",
    description: "List the user's accounts with balances, type and display metadata.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => accounts.listAccounts(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_get_net_worth",
    description:
      "Get net worth grouped by currency. SAM never adds different currencies without an FX source.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => accounts.getNetWorth(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_create_account",
    description: "Create a new account (cash, checking, savings or card).",
    scope: SCOPES.accountsWrite,
    inputSchema: {
      name: z.string().min(1).max(120),
      type: z.enum(["cash", "checking", "savings", "card"]).default("cash"),
      icon: z.string().max(8).optional(),
      currency: z.enum(["USD", "PEN"]).default("USD"),
    },
    handler: (ctx, args) => accounts.createAccount(ctx, args),
  });

  defineTool(server, ctx, {
    name: "sam_update_account",
    description: "Update an existing account's name, type or icon.",
    scope: SCOPES.accountsWrite,
    inputSchema: {
      id: z.string().uuid(),
      name: z.string().min(1).max(120).optional(),
      type: z.enum(["cash", "checking", "savings", "card"]).optional(),
      icon: z.string().max(8).optional(),
      currency: z.enum(["USD", "PEN"]).optional(),
    },
    handler: (ctx, args) => accounts.updateAccount(ctx, args),
  });

  defineTool(server, ctx, {
    name: "sam_transfer_between_accounts",
    description:
      "Transfer balance between two of the user's accounts. High risk: requires confirm=true.",
    scope: SCOPES.accountsTransfer,
    annotations: { destructiveHint: true },
    inputSchema: {
      fromId: z.string().uuid(),
      toId: z.string().uuid(),
      amount: z.number().positive(),
      confirm: z.boolean().default(false),
    },
    handler: (ctx, args) => {
      if (!args.confirm) {
        throw new DomainError(
          DomainErrorCodes.confirmationRequired,
          "set confirm=true to execute this transfer"
        );
      }
      return accounts.transferBetweenAccounts(ctx, {
        fromId: args.fromId,
        toId: args.toId,
        amount: args.amount,
      });
    },
  });
}
