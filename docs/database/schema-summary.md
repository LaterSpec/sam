# SAM Database Schema Summary

SAM currently uses Neon Postgres + Drizzle ORM.

## Auth Tables

Better Auth owns:

- `user`
- `session`
- `account`
- `verification`

## User-Scoped Domain Tables

Each table contains `user_id` or is keyed directly by the user id:

- `profiles`
- `accounts`
- `categories`
- `transactions`
- `account_transfers`
- `recurring_rules`
- `recurring_occurrences`
- `goals`
- `income_sources`
- `savings_buckets`
- `mcp_tokens`
- `mcp_audit_logs`

Application code must filter these tables by the authenticated Better Auth user id.

Transactions capture `currency`, `status`, and `source`. Recurring occurrences
are idempotent by `(rule_id, scheduled_date)`. Legacy `income_sources` remains
temporarily for migration history and is no longer the scheduling model.

## Security

Access control is enforced by application-layer `userId` filtering in Server Actions and query helpers. MCP/API work should reuse the same scoped domain services instead of issuing broad table queries.

## Source Files

- Schema: `lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Full database docs: `docs/DATABASE.md`
