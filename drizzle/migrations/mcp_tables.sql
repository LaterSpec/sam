-- MCP integration tables for SAM.
--
-- This project syncs schema with `npm run db:push`. This file is a focused,
-- idempotent migration for the two new MCP tables so the change can be applied
-- and reviewed independently. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "mcp_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "name" text NOT NULL,
  "public_prefix" text NOT NULL,
  "token_hash" text NOT NULL,
  "scopes" text[] DEFAULT '{}' NOT NULL,
  "expires_at" timestamp,
  "revoked_at" timestamp,
  "last_used_at" timestamp,
  "last_used_ip" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mcp_tokens_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "mcp_tokens_user_id_idx" ON "mcp_tokens" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_tokens_public_prefix_idx" ON "mcp_tokens" ("public_prefix");
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_tokens_token_hash_idx" ON "mcp_tokens" ("token_hash");

CREATE TABLE IF NOT EXISTS "mcp_audit_logs" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "token_id" uuid,
  "tool_name" text NOT NULL,
  "input" jsonb,
  "result_status" text NOT NULL,
  "error_message" text,
  "request_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "mcp_audit_logs_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "mcp_audit_logs_token_id_mcp_tokens_id_fk"
    FOREIGN KEY ("token_id") REFERENCES "mcp_tokens"("id") ON DELETE set null
);

CREATE INDEX IF NOT EXISTS "mcp_audit_logs_user_idx" ON "mcp_audit_logs" ("user_id", "created_at");
