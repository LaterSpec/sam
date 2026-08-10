/**
 * Shared actor context for SAM domain services.
 *
 * Domain services are session-agnostic: both Server Actions (browser session)
 * and MCP tools (bearer token) build an ActorContext and call the same logic.
 */
export type AuthMethod = "session" | "mcp_token" | "oauth" | "integration";

export type ActorContext = {
  userId: string;
  email: string;
  authMethod: AuthMethod;
  scopes: string[];
  tokenId?: string;
};

/** Safe, typed domain errors. The `code` is surfaced to MCP clients. */
export class DomainError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = "DomainError";
    this.code = code;
  }
}

export const DomainErrorCodes = {
  accountNotFound: "account_not_found",
  categoryNotFound: "category_not_found",
  goalNotFound: "goal_not_found",
  budgetNotFound: "budget_not_found",
  bucketNotFound: "bucket_not_found",
  transactionNotFound: "transaction_not_found",
  invalidAmount: "invalid_amount",
  insufficientBalance: "insufficient_balance",
  sameAccount: "same_account",
  notHeld: "not_held",
  confirmationRequired: "confirmation_required",
  scopeDenied: "scope_denied",
} as const;
