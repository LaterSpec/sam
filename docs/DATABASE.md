# SAM Database

SAM uses Neon Postgres in production and Drizzle ORM as the schema source of truth. Supabase SQL is archived under `docs/database/supabase-archive/` and is not a runtime dependency.

## Ownership

| Concern | Current owner |
| --- | --- |
| Schema | `lib/db/schema.ts` |
| Drizzle config | `drizzle.config.ts` |
| Database client | `lib/db/index.ts` |
| Raw SQL client | `lib/db/sql.ts` |
| App-state loader | `lib/db/queries/load-user-data.ts` |
| New-user bootstrap | `lib/auth/onboarding-bootstrap.ts` |
| Demo seed | `drizzle/seed-demo.ts` |

## Setup

```bash
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/sam?sslmode=require"
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:seed:demo
```

Use `db:push` only for controlled development. Reviewed deployments should use migrations.

## Auth tables

Better Auth owns:

- `user`: identity, display name, email and verification state.
- `session`: expiring session token and request metadata.
- `account`: credential and OAuth-provider state.
- `verification`: Better Auth verification records.

## User-scoped finance tables

Every query or mutation for these tables must include the authenticated user id.

### `profiles`

One row per Better Auth user. Stores full name, optional username, plan, streak, membership date and JSON preferences (`theme`, `language`, `defaultCurrency`, `timezone`).

### `accounts`

Cash, checking, savings and card accounts.

| Column | Notes |
| --- | --- |
| `id`, `user_id` | UUID primary key and owner |
| `name`, `type` | Display name and supported account type |
| `balance`, `currency` | Numeric balance with explicit USD/PEN currency |
| `credit_limit`, `last4` | Optional card metadata |
| `icon`, `color`, `sort` | Presentation metadata and order |

### `categories`

Expense categories also act as monthly budget envelopes. `key` is unique per user; `monthly_cap` and `currency` define the guardrail.

### `transactions`

Confirmed income and expense ledger entries. Transactions store account/category references, positive amount, kind, currency, status, source, notes, occurrence timestamp and optional recurring occurrence id.

### `account_transfers`

Immutable same-currency transfers. A posted transfer creates paired transfer movements and updates both accounts atomically.

### `recurring_rules`

Active, paused or archived income/expense schedules. Each rule owns a next occurrence date and IANA timezone; expense rules require a category.

### `recurring_occurrences`

Execution history with `processing`, `posted`, `failed` or `skipped` status. `(rule_id, scheduled_date)` is unique, so cron retries remain idempotent.

### `goals`

Savings targets with current saved amount, optional ETA, completion flag and presentation metadata.

### `savings_buckets`

Named reserves with current balance, target and optional simulated APY display value.

### `income_sources`

Legacy read-only income-source rows retained for migration compatibility. New schedules use `recurring_rules`.

## MCP tables

### `mcp_tokens`

Stores token prefix and hash, scopes, expiry, revocation and last-used metadata. Raw secrets are never persisted.

### `mcp_audit_logs`

Append-only record of scoped MCP calls and safe outcomes.

## User bootstrap

`lib/auth/onboarding-bootstrap.ts` creates:

1. A profile.
2. Default cash and card accounts.
3. Default expense/budget categories.

## Demo seed

```bash
npm run db:seed:demo
```

The demo seed enriches `alex@sam.app / sam12345` with accounts, categories, transactions, goals, income, recurring schedules and savings buckets.

## Removal migration

The previous investment and external-pricing subsystem was removed from active runtime and schema. Apply `drizzle/migrations/remove_investments.sql` after reviewing the preservation and rollback steps in `docs/migrations/investments-removal.md`.

## Useful queries

```sql
select id, name, type, balance, currency
from accounts
where user_id = '<better-auth-user-id>'
order by sort;

select name, amount, currency, occurred_at
from transactions
where user_id = '<better-auth-user-id>'
order by occurred_at desc
limit 20;

select name, status, next_occurrence_date
from recurring_rules
where user_id = '<better-auth-user-id>'
order by next_occurrence_date;
```

## Security notes

- Access control is enforced by application-layer `userId` filtering.
- Prefer shared domain services over ad hoc writes.
- Keep `DATABASE_URL` in `.env.local` or Cloudflare secrets.
- Do not reintroduce Supabase credentials, PostgREST or browser runtime clients.
