-- SAM Integrations marketplace tables.
-- Canonical sync remains `npm run db:push`. This file is a focused, idempotent
-- migration for review and manual apply. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS "integration_authors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "display_name" text NOT NULL,
  "bio" text,
  "website" text,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "integration_authors_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "integration_authors_user_id_idx" ON "integration_authors" ("user_id");

CREATE TABLE IF NOT EXISTS "integrations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "slug" text NOT NULL,
  "name" text NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "author_id" uuid NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "runtime" text DEFAULT 'connector' NOT NULL,
  "current_version" text,
  "icon_key" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "integrations_author_id_integration_authors_id_fk"
    FOREIGN KEY ("author_id") REFERENCES "integration_authors"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "integrations_slug_idx" ON "integrations" ("slug");
CREATE INDEX IF NOT EXISTS "integrations_status_idx" ON "integrations" ("status");
CREATE INDEX IF NOT EXISTS "integrations_author_id_idx" ON "integrations" ("author_id");

CREATE TABLE IF NOT EXISTS "integration_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "integration_id" uuid NOT NULL,
  "version" text NOT NULL,
  "manifest_json" jsonb NOT NULL,
  "manifest_r2_key" text,
  "changelog" text,
  "status" text DEFAULT 'pending_review' NOT NULL,
  "submitted_at" timestamp DEFAULT now() NOT NULL,
  "reviewed_at" timestamp,
  "reviewer_note" text,
  CONSTRAINT "integration_versions_integration_id_integrations_id_fk"
    FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "integration_versions_integration_version_idx"
  ON "integration_versions" ("integration_id", "version");
CREATE INDEX IF NOT EXISTS "integration_versions_status_idx" ON "integration_versions" ("status");

CREATE TABLE IF NOT EXISTS "integration_reviews" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "version_id" uuid NOT NULL,
  "reviewer_user_id" text NOT NULL,
  "decision" text NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "integration_reviews_version_id_integration_versions_id_fk"
    FOREIGN KEY ("version_id") REFERENCES "integration_versions"("id") ON DELETE cascade,
  CONSTRAINT "integration_reviews_reviewer_user_id_user_id_fk"
    FOREIGN KEY ("reviewer_user_id") REFERENCES "user"("id") ON DELETE cascade
);
CREATE INDEX IF NOT EXISTS "integration_reviews_version_id_idx" ON "integration_reviews" ("version_id");

CREATE TABLE IF NOT EXISTS "user_integration_installs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "integration_id" uuid NOT NULL,
  "version" text NOT NULL,
  "status" text DEFAULT 'installed' NOT NULL,
  "config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "scopes_granted" text[] DEFAULT '{}' NOT NULL,
  "webhook_token_hash" text,
  "sync_cursor" jsonb,
  "connected_at" timestamp,
  "last_sync_at" timestamp,
  "last_error" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_integration_installs_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "user_integration_installs_integration_id_integrations_id_fk"
    FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_integration_installs_user_integration_idx"
  ON "user_integration_installs" ("user_id", "integration_id");
CREATE INDEX IF NOT EXISTS "user_integration_installs_user_id_idx" ON "user_integration_installs" ("user_id");
CREATE INDEX IF NOT EXISTS "user_integration_installs_status_idx" ON "user_integration_installs" ("status");

CREATE TABLE IF NOT EXISTS "user_integration_secrets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "install_id" uuid NOT NULL,
  "ciphertext" text NOT NULL,
  "iv" text NOT NULL,
  "key_version" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "user_integration_secrets_install_id_user_integration_installs_id_fk"
    FOREIGN KEY ("install_id") REFERENCES "user_integration_installs"("id") ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_integration_secrets_install_id_idx"
  ON "user_integration_secrets" ("install_id");

CREATE TABLE IF NOT EXISTS "integration_audit_logs" (
  "id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL,
  "install_id" uuid,
  "action" text NOT NULL,
  "meta" jsonb,
  "result_status" text DEFAULT 'ok' NOT NULL,
  "error_message" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "integration_audit_logs_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade,
  CONSTRAINT "integration_audit_logs_install_id_user_integration_installs_id_fk"
    FOREIGN KEY ("install_id") REFERENCES "user_integration_installs"("id") ON DELETE set null
);
CREATE INDEX IF NOT EXISTS "integration_audit_logs_user_idx"
  ON "integration_audit_logs" ("user_id", "created_at");
