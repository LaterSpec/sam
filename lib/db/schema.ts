import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  integer,
  numeric,
  jsonb,
  date,
  bigint,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Better Auth tables ──────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ── Domain tables (user_id → user.id) ───────────────────────

export const profiles = pgTable("profiles", {
  id: text("id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull().default("there"),
  username: text("username"),
  plan: text("plan").notNull().default("pro"),
  streak: integer("streak").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  prefs: jsonb("prefs")
    .notNull()
    .default({
      theme: "ayu-mirage",
      language: "es",
      defaultCurrency: "USD",
      timezone: "America/Lima",
      hideBalance: false,
    }),
  memberSince: date("member_since").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("cash"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    currency: text("currency").notNull().default("USD"),
    creditLimit: numeric("credit_limit", { precision: 14, scale: 2 }),
    last4: text("last4"),
    icon: text("icon").notNull().default("◉"),
    color: text("color").notNull().default("#58a6ff"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)]
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("●"),
    color: text("color").notNull().default("#8b949e"),
    currency: text("currency").notNull().default("USD"),
    monthlyCap: numeric("monthly_cap", { precision: 14, scale: 2 }).notNull().default("0"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("categories_user_id_idx").on(t.userId),
    uniqueIndex("categories_user_key_idx").on(t.userId, t.key),
  ]
);

export const accountTransfers = pgTable(
  "account_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    fromAccountId: uuid("from_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    toAccountId: uuid("to_account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    status: text("status").notNull().default("posted"),
    reversedAt: timestamp("reversed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("account_transfers_user_created_idx").on(t.userId, t.createdAt),
  ]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: uuid("account_id").references(() => accounts.id, { onDelete: "set null" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    kind: text("kind").notNull().default("expense"),
    icon: text("icon"),
    notes: text("notes"),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("confirmed"),
    source: text("source").notNull().default("manual"),
    recurringOccurrenceId: uuid("recurring_occurrence_id"),
    transferId: uuid("transfer_id"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_id_idx").on(t.userId),
    index("transactions_category_id_idx").on(t.categoryId),
    index("transactions_occurred_at_idx").on(t.occurredAt),
    uniqueIndex("transactions_recurring_occurrence_idx").on(t.recurringOccurrenceId),
  ]
);

export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    frequencyUnit: text("frequency_unit").notNull(),
    frequencyInterval: integer("frequency_interval").notNull().default(1),
    startDate: date("start_date").notNull(),
    nextOccurrenceDate: date("next_occurrence_date").notNull(),
    endDate: date("end_date"),
    timezone: text("timezone").notNull().default("America/Lima"),
    status: text("status").notNull().default("active"),
    needsReview: boolean("needs_review").notNull().default(false),
    legacyIncomeSourceId: uuid("legacy_income_source_id"),
    lastProcessedAt: timestamp("last_processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("recurring_rules_user_status_idx").on(t.userId, t.status),
    index("recurring_rules_due_idx").on(t.status, t.nextOccurrenceDate),
    uniqueIndex("recurring_rules_legacy_income_source_idx").on(t.legacyIncomeSourceId),
  ]
);

export const recurringOccurrences = pgTable(
  "recurring_occurrences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ruleId: uuid("rule_id")
      .notNull()
      .references(() => recurringRules.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scheduledDate: date("scheduled_date").notNull(),
    status: text("status").notNull().default("processing"),
    transactionId: uuid("transaction_id").references(() => transactions.id, {
      onDelete: "set null",
    }),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    attempts: integer("attempts").notNull().default(1),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("recurring_occurrences_rule_date_idx").on(t.ruleId, t.scheduledDate),
    index("recurring_occurrences_user_status_idx").on(t.userId, t.status),
    index("recurring_occurrences_scheduled_idx").on(t.scheduledDate),
  ]
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("◆"),
    color: text("color").notNull().default("#58a6ff"),
    target: numeric("target", { precision: 14, scale: 2 }).notNull().default("0"),
    saved: numeric("saved", { precision: 14, scale: 2 }).notNull().default("0"),
    eta: text("eta"),
    done: boolean("done").notNull().default(false),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("goals_user_id_idx").on(t.userId)]
);

export const incomeSources = pgTable(
  "income_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
    icon: text("icon").notNull().default("◆"),
    color: text("color").notNull().default("#56d364"),
    freq: text("freq").notNull().default("monthly"),
    nextDate: text("next_date"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("income_sources_user_id_idx").on(t.userId)]
);

export const savingsBuckets = pgTable(
  "savings_buckets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon").notNull().default("◼"),
    color: text("color").notNull().default("#58a6ff"),
    balance: numeric("balance", { precision: 14, scale: 2 }).notNull().default("0"),
    target: numeric("target", { precision: 14, scale: 2 }).notNull().default("0"),
    apy: numeric("apy", { precision: 5, scale: 2 }).notNull().default("4.2"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("savings_buckets_user_id_idx").on(t.userId)]
);

// ── MCP integration tables ──────────────────────────────────

export const mcpTokens = pgTable(
  "mcp_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    publicPrefix: text("public_prefix").notNull(),
    tokenHash: text("token_hash").notNull(),
    scopes: text("scopes").array().notNull().default([]),
    expiresAt: timestamp("expires_at"),
    revokedAt: timestamp("revoked_at"),
    lastUsedAt: timestamp("last_used_at"),
    lastUsedIp: text("last_used_ip"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("mcp_tokens_user_id_idx").on(t.userId),
    uniqueIndex("mcp_tokens_public_prefix_idx").on(t.publicPrefix),
    uniqueIndex("mcp_tokens_token_hash_idx").on(t.tokenHash),
  ]
);

export const mcpAuditLogs = pgTable(
  "mcp_audit_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    tokenId: uuid("token_id").references(() => mcpTokens.id, { onDelete: "set null" }),
    toolName: text("tool_name").notNull(),
    input: jsonb("input"),
    resultStatus: text("result_status").notNull(),
    errorMessage: text("error_message"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("mcp_audit_logs_user_idx").on(t.userId, t.createdAt)]
);

// ── Integrations marketplace ────────────────────────────────

export const integrationAuthors = pgTable(
  "integration_authors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    bio: text("bio"),
    website: text("website"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("integration_authors_user_id_idx").on(t.userId),
  ]
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    summary: text("summary").notNull().default(""),
    authorId: uuid("author_id")
      .notNull()
      .references(() => integrationAuthors.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("draft"),
    runtime: text("runtime").notNull().default("connector"),
    currentVersion: text("current_version"),
    iconKey: text("icon_key"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("integrations_slug_idx").on(t.slug),
    index("integrations_status_idx").on(t.status),
    index("integrations_author_id_idx").on(t.authorId),
  ]
);

export const integrationVersions = pgTable(
  "integration_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    manifestJson: jsonb("manifest_json").notNull(),
    manifestR2Key: text("manifest_r2_key"),
    changelog: text("changelog"),
    status: text("status").notNull().default("pending_review"),
    submittedAt: timestamp("submitted_at").notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
    reviewerNote: text("reviewer_note"),
  },
  (t) => [
    uniqueIndex("integration_versions_integration_version_idx").on(t.integrationId, t.version),
    index("integration_versions_status_idx").on(t.status),
  ]
);

export const integrationReviews = pgTable(
  "integration_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => integrationVersions.id, { onDelete: "cascade" }),
    reviewerUserId: text("reviewer_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    decision: text("decision").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("integration_reviews_version_id_idx").on(t.versionId)]
);

export const userIntegrationInstalls = pgTable(
  "user_integration_installs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    integrationId: uuid("integration_id")
      .notNull()
      .references(() => integrations.id, { onDelete: "cascade" }),
    version: text("version").notNull(),
    status: text("status").notNull().default("installed"),
    configJson: jsonb("config_json").notNull().default({}),
    scopesGranted: text("scopes_granted").array().notNull().default([]),
    webhookTokenHash: text("webhook_token_hash"),
    syncCursor: jsonb("sync_cursor"),
    connectedAt: timestamp("connected_at"),
    lastSyncAt: timestamp("last_sync_at"),
    lastError: text("last_error"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("user_integration_installs_user_integration_idx").on(t.userId, t.integrationId),
    index("user_integration_installs_user_id_idx").on(t.userId),
    index("user_integration_installs_status_idx").on(t.status),
  ]
);

export const userIntegrationSecrets = pgTable(
  "user_integration_secrets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    installId: uuid("install_id")
      .notNull()
      .references(() => userIntegrationInstalls.id, { onDelete: "cascade" }),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    keyVersion: integer("key_version").notNull().default(1),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_integration_secrets_install_id_idx").on(t.installId)]
);

export const integrationAuditLogs = pgTable(
  "integration_audit_logs",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    installId: uuid("install_id").references(() => userIntegrationInstalls.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    meta: jsonb("meta"),
    resultStatus: text("result_status").notNull().default("ok"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("integration_audit_logs_user_idx").on(t.userId, t.createdAt)]
);

export type UserPrefs = {
  theme:
    | "solarized-cream"
    | "ayu-mirage"
    | "catppuccin-latte"
    | "github-light"
    | "kanagawa"
    | "ansi-dark"
    | "ayu-light"
    | "dark"
    | "light";
  accentHue?: number;
  language?: "en" | "es";
  defaultCurrency?: "USD" | "PEN";
  timezone?: string;
  hideBalance?: boolean;
};
