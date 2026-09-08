-- Samy in-app assistant: conversations, messages and user memories.
--
-- This project syncs schema with `npm run db:push`. This file is a focused,
-- idempotent migration so the change can be applied and reviewed independently.
-- Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "samy_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "title" text DEFAULT 'New chat' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "samy_conversations_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "samy_conversations_user_updated_idx"
  ON "samy_conversations" ("user_id", "updated_at");

CREATE TABLE IF NOT EXISTS "samy_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL,
  "role" text NOT NULL,
  "content" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "samy_messages_conversation_id_samy_conversations_id_fk"
    FOREIGN KEY ("conversation_id") REFERENCES "samy_conversations"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "samy_messages_conversation_created_idx"
  ON "samy_messages" ("conversation_id", "created_at");

CREATE TABLE IF NOT EXISTS "samy_memories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "kind" text NOT NULL,
  "key" text NOT NULL,
  "content" text NOT NULL,
  "importance" integer DEFAULT 3 NOT NULL,
  "source_conversation_id" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp,
  CONSTRAINT "samy_memories_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "samy_memories_source_conversation_id_samy_conversations_id_fk"
    FOREIGN KEY ("source_conversation_id") REFERENCES "samy_conversations"("id") ON DELETE set null
);

CREATE UNIQUE INDEX IF NOT EXISTS "samy_memories_user_key_idx"
  ON "samy_memories" ("user_id", "key");

CREATE INDEX IF NOT EXISTS "samy_memories_user_importance_idx"
  ON "samy_memories" ("user_id", "importance");
