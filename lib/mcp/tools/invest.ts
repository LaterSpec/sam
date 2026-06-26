import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ActorContext } from "@/lib/domain/types";
import * as invest from "@/lib/domain/invest";
import { SCOPES } from "../scopes";
import { defineTool } from "./helpers";

export function registerInvestTools(server: McpServer, ctx: ActorContext) {
  defineTool(server, ctx, {
    name: "sam_list_holdings",
    description: "List the user's simulated holdings (symbol, quantity, average cost).",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => invest.listHoldings(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_list_watchlist",
    description: "List the user's watchlist symbols.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    handler: (ctx) => invest.listWatchlist(ctx),
  });

  defineTool(server, ctx, {
    name: "sam_get_quote",
    description: "Get the latest market quote for a symbol.",
    scope: SCOPES.read,
    annotations: { readOnlyHint: true },
    inputSchema: {
      symbol: z.string().min(1).max(16),
    },
    handler: (ctx, args) => invest.getQuote(ctx, args.symbol),
  });

  defineTool(server, ctx, {
    name: "sam_buy_holding",
    description: "Simulated buy: add to a holding using a dollar amount at a given price.",
    scope: SCOPES.investWrite,
    inputSchema: {
      symbol: z.string().min(1).max(16),
      name: z.string().max(120).optional(),
      amount: z.number().positive(),
      price: z.number().positive(),
    },
    handler: (ctx, args) =>
      invest.buyHolding(ctx, {
        symbol: args.symbol,
        name: args.name ?? args.symbol,
        amount: args.amount,
        price: args.price,
      }),
  });

  defineTool(server, ctx, {
    name: "sam_sell_holding",
    description:
      "Simulated sell: reduce a holding by quantity or dollar amount at a given price.",
    scope: SCOPES.investWrite,
    annotations: { destructiveHint: true },
    inputSchema: {
      symbol: z.string().min(1).max(16),
      qty: z.number().positive().optional(),
      amount: z.number().positive().optional(),
      price: z.number().positive(),
    },
    handler: (ctx, args) =>
      invest.sellHolding(ctx, {
        symbol: args.symbol,
        qty: args.qty,
        amount: args.amount,
        price: args.price,
      }),
  });

  defineTool(server, ctx, {
    name: "sam_add_watch",
    description: "Add a symbol to the watchlist.",
    scope: SCOPES.investWrite,
    inputSchema: {
      symbol: z.string().min(1).max(16),
      name: z.string().max(120).optional(),
    },
    handler: (ctx, args) => invest.addWatch(ctx, args.symbol, args.name ?? args.symbol),
  });

  defineTool(server, ctx, {
    name: "sam_remove_watch",
    description: "Remove a symbol from the watchlist.",
    scope: SCOPES.investWrite,
    inputSchema: {
      symbol: z.string().min(1).max(16),
    },
    handler: (ctx, args) => invest.removeWatch(ctx, args.symbol),
  });
}
