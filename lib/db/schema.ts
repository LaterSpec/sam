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
  primaryKey,
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
      notifications: true,
      biometric: true,
      theme: "ayu-mirage",
      rollover: false,
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
    monthlyCap: numeric("monthly_cap", { precision: 14, scale: 2 }).notNull().default("0"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("categories_user_id_idx").on(t.userId),
    uniqueIndex("categories_user_key_idx").on(t.userId, t.key),
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
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("transactions_user_id_idx").on(t.userId),
    index("transactions_category_id_idx").on(t.categoryId),
    index("transactions_occurred_at_idx").on(t.occurredAt),
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

export const marketSymbols = pgTable("market_symbols", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull().default(""),
  assetId: integer("asset_id"),
  source: text("source").notNull().default("ibkr"),
  curated: boolean("curated").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const marketQuotes = pgTable(
  "market_quotes",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    symbol: text("symbol")
      .notNull()
      .references(() => marketSymbols.symbol, { onDelete: "cascade" }),
    source: text("source").notNull().default("live"),
    sessionDate: date("session_date").notNull().defaultNow(),
    price: numeric("price", { precision: 18, scale: 4 }),
    bid: numeric("bid", { precision: 18, scale: 4 }),
    ask: numeric("ask", { precision: 18, scale: 4 }),
    prevClose: numeric("prev_close", { precision: 18, scale: 4 }),
    dayOpen: numeric("day_open", { precision: 18, scale: 4 }),
    changePct: numeric("change_pct", { precision: 10, scale: 4 }),
    capturedAt: timestamp("captured_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("market_quotes_sym_src_date_idx").on(t.symbol, t.source, t.sessionDate),
    index("market_quotes_symbol_idx").on(t.symbol),
    index("market_quotes_session_idx").on(t.sessionDate),
  ]
);

export const marketDailyBars = pgTable(
  "market_daily_bars",
  {
    symbol: text("symbol")
      .notNull()
      .references(() => marketSymbols.symbol, { onDelete: "cascade" }),
    barDate: date("bar_date").notNull(),
    close: numeric("close", { precision: 18, scale: 4 }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.symbol, t.barDate] }),
    index("market_daily_bars_symbol_idx").on(t.symbol),
  ]
);

export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    name: text("name").notNull().default(""),
    qty: numeric("qty", { precision: 18, scale: 6 }).notNull().default("0"),
    avgCost: numeric("avg_cost", { precision: 18, scale: 4 }).notNull().default("0"),
    openedAt: timestamp("opened_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("holdings_user_id_idx").on(t.userId),
    uniqueIndex("holdings_user_symbol_idx").on(t.userId, t.symbol),
  ]
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    name: text("name").notNull().default(""),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("watchlist_user_id_idx").on(t.userId),
    uniqueIndex("watchlist_user_symbol_idx").on(t.userId, t.symbol),
  ]
);

export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    symbol: text("symbol").notNull(),
    side: text("side").notNull(),
    qty: numeric("qty", { precision: 18, scale: 6 }).notNull(),
    price: numeric("price", { precision: 18, scale: 4 }).notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("trades_user_id_idx").on(t.userId)]
);

export const portfolioSnapshots = pgTable(
  "portfolio_snapshots",
  {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    value: numeric("value", { precision: 18, scale: 2 }).notNull(),
    capturedAt: timestamp("captured_at").notNull().defaultNow(),
  },
  (t) => [index("portfolio_snapshots_user_idx").on(t.userId, t.capturedAt)]
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

export type UserPrefs = {
  notifications: boolean;
  biometric: boolean;
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
  rollover: boolean;
  accentHue?: number;
};
