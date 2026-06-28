# SAM Database

SAM uses Neon Postgres in production and Drizzle ORM for schema definition and typed queries. Supabase is archived as migration history only; it is not part of the runtime database stack.

## Ownership

| Concern | Current owner |
| --- | --- |
| Schema source of truth | `lib/db/schema.ts` |
| Drizzle config | `drizzle.config.ts` |
| Database client | `lib/db/index.ts` |
| Raw SQL client | `lib/db/sql.ts` |
| Main app query loader | `lib/db/queries/load-user-data.ts` |
| User bootstrap | `lib/auth/onboarding-bootstrap.ts` |
| Demo seed | `drizzle/seed-demo.ts` |
| Market symbol seed | `drizzle/seed.ts` |

## Local And Production Setup

Required environment variable:

```bash
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/sam?sslmode=require"
```

Common commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed
npm run db:seed:demo
```

Use `db:push` for rapid development against a controlled Neon database. Use generated migrations when a change must be reviewed and promoted consistently.

## Auth Tables

Better Auth owns these tables.

### `user`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | Better Auth user id |
| `name` | text | Display name |
| `email` | text unique | Login email |
| `email_verified` | boolean | Verification flag |
| `image` | text nullable | Avatar URL |
| `created_at` / `updated_at` | timestamp | Auth lifecycle |

### `session`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | Session id |
| `token` | text unique | Session token |
| `user_id` | text FK | References `user.id` |
| `expires_at` | timestamp | Expiration |
| `ip_address` / `user_agent` | text nullable | Session metadata |
| `created_at` / `updated_at` | timestamp | Session lifecycle |

### `account`

Stores credential and OAuth provider state.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK | Account id |
| `account_id` | text | Provider account id |
| `provider_id` | text | `credential`, `google`, etc. |
| `user_id` | text FK | References `user.id` |
| `access_token` / `refresh_token` / `id_token` | text nullable | OAuth tokens |
| `scope` | text nullable | OAuth scope |
| `password` | text nullable | Hashed credential password |

### `verification`

Generic verification table used by Better Auth.

## User-Scoped Domain Tables

These tables include `user_id` and must always be filtered by the authenticated user in application code. Row access is enforced by explicit `userId` checks in Server Actions and query helpers.

### `recurring_rules`

Stores active, paused, or archived income/expense schedules. Every rule belongs
to an account; expense rules also require a category. `next_occurrence_date`
drives the hourly processor and `timezone` is an IANA zone.

### `recurring_occurrences`

Stores each scheduled date and its outcome (`processing`, `posted`, `failed`,
`skipped`). `(rule_id, scheduled_date)` is unique, making cron replay
idempotent. Failed debits do not create transactions or change balances.

### `account_transfers`

Stores immutable same-currency transfers. A posted transfer creates paired
`transfer_out` and `transfer_in` transaction movements.

### `profiles`

One profile per auth user.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | text PK/FK | Same value as `user.id` |
| `full_name` | text | Display name |
| `username` | text nullable | Optional handle |
| `plan` | text | Defaults to `pro` |
| `streak` | integer | App streak |
| `currency` | text | Defaults to `USD` |
| `prefs` | jsonb | Theme and app preferences |
| `member_since` | date | Membership date |
| `created_at` | timestamp | Created timestamp |

### `accounts`

Simulated financial accounts.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Account id |
| `user_id` | text FK | Owner |
| `name` | text | Account name |
| `type` | text | `cash`, `checking`, `savings`, `card` |
| `balance` | numeric(14,2) | Current balance |
| `credit_limit` | numeric(14,2) nullable | Card limit |
| `last4` | text nullable | Display metadata |
| `icon` / `color` | text | UI metadata |
| `sort` | integer | Display order |

Indexes:

- `accounts_user_id_idx`

### `categories`

Expense categories and monthly budget caps.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Category id |
| `user_id` | text FK | Owner |
| `key` | text | Stable category key |
| `name` | text | Display name |
| `icon` / `color` | text | UI metadata |
| `monthly_cap` | numeric(14,2) | Budget cap |
| `sort` | integer | Display order |

Indexes:

- `categories_user_id_idx`
- `categories_user_key_idx` unique on `(user_id, key)`

Default categories are created in `lib/auth/onboarding-bootstrap.ts`: `food`, `housing`, `transport`, `subs`, `ent`, `misc`.

### `transactions`

Expenses and income entries.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Transaction id |
| `user_id` | text FK | Owner |
| `account_id` | uuid nullable FK | Account, set null on account delete |
| `category_id` | uuid nullable FK | Category, set null on category delete |
| `name` | text | Merchant/source/title |
| `amount` | numeric(14,2) | Positive amount |
| `kind` | text | `expense` or `income` |
| `icon` | text nullable | UI icon |
| `notes` | text nullable | Optional notes |
| `occurred_at` | timestamp | Transaction date |
| `created_at` | timestamp | Created timestamp |

Indexes:

- `transactions_user_id_idx`
- `transactions_category_id_idx`
- `transactions_occurred_at_idx`

### `goals`

Savings goals.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Goal id |
| `user_id` | text FK | Owner |
| `name` | text | Display name |
| `icon` / `color` | text | UI metadata |
| `target` | numeric(14,2) | Goal target |
| `saved` | numeric(14,2) | Saved amount |
| `eta` | text nullable | Display ETA |
| `done` | boolean | Completion flag |
| `sort` | integer | Display order |

### `income_sources`

Recurring or one-time income sources.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Income source id |
| `user_id` | text FK | Owner |
| `name` | text | Display name |
| `amount` | numeric(14,2) | Income amount |
| `icon` / `color` | text | UI metadata |
| `freq` | text | Frequency label |
| `next_date` | text nullable | Next expected date label |
| `sort` | integer | Display order |

### `savings_buckets`

Simulated savings buckets.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Bucket id |
| `user_id` | text FK | Owner |
| `name` | text | Display name |
| `icon` / `color` | text | UI metadata |
| `balance` | numeric(14,2) | Current balance |
| `target` | numeric(14,2) | Target balance |
| `apy` | numeric(5,2) | Simulated APY |
| `sort` | integer | Display order |

### `holdings`

Simulated investment positions.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Holding id |
| `user_id` | text FK | Owner |
| `symbol` | text | Ticker |
| `name` | text | Asset name |
| `qty` | numeric(18,6) | Quantity |
| `avg_cost` | numeric(18,4) | Average cost |
| `opened_at` / `updated_at` | timestamp | Position lifecycle |

Indexes:

- `holdings_user_id_idx`
- `holdings_user_symbol_idx` unique on `(user_id, symbol)`

### `watchlist`

User ticker watchlist.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Watchlist row id |
| `user_id` | text FK | Owner |
| `symbol` | text | Ticker |
| `name` | text | Asset name |
| `sort` | integer | Display order |
| `created_at` | timestamp | Created timestamp |

Indexes:

- `watchlist_user_id_idx`
- `watchlist_user_symbol_idx` unique on `(user_id, symbol)`

### `trades`

Simulated buy/sell audit log.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Trade id |
| `user_id` | text FK | Owner |
| `symbol` | text | Ticker |
| `side` | text | `buy` or `sell` |
| `qty` | numeric(18,6) | Quantity |
| `price` | numeric(18,4) | Execution price |
| `amount` | numeric(18,2) | Gross trade amount |
| `created_at` | timestamp | Created timestamp |

### `portfolio_snapshots`

Append-only portfolio value time series.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint identity PK | Snapshot id |
| `user_id` | text FK | Owner |
| `value` | numeric(18,2) | Portfolio value |
| `captured_at` | timestamp | Capture time |

Index:

- `portfolio_snapshots_user_idx` on `(user_id, captured_at)`

## Global Market Tables

These tables do not include `user_id`. They are shared market reference data used by authenticated app users.

### `market_symbols`

Ticker universe.

| Column | Type | Notes |
| --- | --- | --- |
| `symbol` | text PK | Ticker |
| `name` | text | Display name |
| `asset_id` | integer nullable | Legacy/live feed mapping |
| `source` | text | Defaults to `ibkr` |
| `curated` | boolean | Used for initial watchlist |
| `active` | boolean | Sync eligibility |
| `sort` | integer | Display/sync order |
| `created_at` | timestamp | Created timestamp |

### `market_quotes`

Latest quotes by symbol, source, and session date.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint identity PK | Quote id |
| `symbol` | text FK | References `market_symbols.symbol` |
| `source` | text | Example: `yahoo`, `live` |
| `session_date` | date | Market session date |
| `price` | numeric(18,4) nullable | Last price |
| `bid` / `ask` | numeric(18,4) nullable | Quote sides |
| `prev_close` | numeric(18,4) nullable | Previous close |
| `day_open` | numeric(18,4) nullable | Day open |
| `change_pct` | numeric(10,4) nullable | Daily change percentage |
| `captured_at` | timestamp | Capture time |

Indexes:

- `market_quotes_sym_src_date_idx` unique on `(symbol, source, session_date)`
- `market_quotes_symbol_idx`
- `market_quotes_session_idx`

### `market_daily_bars`

Daily close history used by charts and fallback pricing.

| Column | Type | Notes |
| --- | --- | --- |
| `symbol` | text FK | References `market_symbols.symbol` |
| `bar_date` | date | Bar date |
| `close` | numeric(18,4) | Close price |

Indexes:

- Primary key on `(symbol, bar_date)`
- `market_daily_bars_symbol_idx`

## User Bootstrap

New users are created through Better Auth. After creation, `lib/auth/onboarding-bootstrap.ts` inserts:

1. `profiles` row.
2. Default `Cash` and `Card` accounts.
3. Default categories.
4. Curated watchlist symbols from `market_symbols`.

New-user bootstrap is handled in application code at sign-up time.

## Demo Seed

Run:

```bash
npm run db:seed
npm run db:seed:demo
```

Demo credentials:

| Field | Value |
| --- | --- |
| Email | `alex@sam.app` |
| Password | `sam12345` |
| Name | `Alex Morris` |
| Username | `alex_morris` |

Demo seed includes accounts, categories, transactions, goals, income sources, and savings buckets. It does not execute real trades.

## Useful Queries

```sql
-- User accounts
select id, name, type, balance
from accounts
where user_id = '<better-auth-user-id>'
order by sort;

-- Recent user expenses
select name, amount, occurred_at
from transactions
where user_id = '<better-auth-user-id>'
  and kind = 'expense'
order by occurred_at desc
limit 20;

-- Latest quotes for one ticker
select source, price, change_pct, captured_at
from market_quotes
where symbol = 'AAPL'
order by captured_at desc
limit 5;

-- Portfolio snapshots
select value, captured_at
from portfolio_snapshots
where user_id = '<better-auth-user-id>'
order by captured_at;
```

## Security Notes

- Access control is enforced in application code, not at the database row level.
- Neon does not use Supabase Auth or Supabase RLS in this app.
- Do not query user-scoped tables without a `user_id` filter.
- Prefer shared domain helpers over ad hoc database writes.
- Keep `DATABASE_URL` in local `.env.local` or Cloudflare secrets.
- Do not add Supabase anon keys, service-role keys, PostgREST, or Supabase client runtime code back into the app.

## Applying additive migrations

Validate against the configured Neon database without persisting:

```bash
npx tsx scripts/db/apply-migration.ts --dry-run drizzle/migrations/recurring_transactions.sql
```

Apply and verify:

```bash
npm run db:apply -- drizzle/migrations/recurring_transactions.sql
npm run db:verify
```

The executor wraps the complete SQL file in a transaction. Do not use
`db:push` for this migration because it includes legacy income-source backfill.
