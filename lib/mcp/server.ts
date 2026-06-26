import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ActorContext } from "@/lib/domain/types";
import { registerAccountTools } from "./tools/accounts";
import { registerExpenseTools } from "./tools/expenses";
import { registerCategoryTools } from "./tools/categories";
import { registerSummaryTools } from "./tools/summaries";
import { registerGoalTools } from "./tools/goals";
import { registerIncomeTools } from "./tools/income";
import { registerSavingsTools } from "./tools/savings";
import { registerInvestTools } from "./tools/invest";
import { registerProfileTools } from "./tools/profile";

export const MCP_SERVER_INFO = {
  name: "sam",
  version: "1.0.0",
} as const;

/**
 * Builds a fresh stateless MCP server bound to a single authenticated actor.
 * A new instance is created per request (no shared session state).
 */
export function buildMcpServer(ctx: ActorContext): McpServer {
  const server = new McpServer(MCP_SERVER_INFO, {
    instructions:
      "SAM personal finance assistant. Use these tools to read and act on the authenticated user's financial data: accounts, transactions, budgets, goals, income, savings and simulated investing. All data is scoped to the current user. Money is in the user's account currency.",
  });

  registerProfileTools(server, ctx);
  registerAccountTools(server, ctx);
  registerExpenseTools(server, ctx);
  registerCategoryTools(server, ctx);
  registerSummaryTools(server, ctx);
  registerGoalTools(server, ctx);
  registerIncomeTools(server, ctx);
  registerSavingsTools(server, ctx);
  registerInvestTools(server, ctx);

  return server;
}
