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
- `goals`
- `income_sources`
- `savings_buckets`
- `holdings`
- `watchlist`
- `trades`
- `portfolio_snapshots`

Application code must filter these tables by the authenticated Better Auth user id.

## Global Market Tables

Shared market reference and pricing tables:

- `market_symbols`
- `market_quotes`
- `market_daily_bars`

## Security

Supabase RLS has been replaced by application-layer `userId` filtering in Server Actions and query helpers. MCP/API work should reuse the same scoped domain services instead of issuing broad table queries.

## Source Files

- Schema: `lib/db/schema.ts`
- Drizzle config: `drizzle.config.ts`
- Full database docs: `docs/DATABASE.md`
- Original Supabase SQL archive: `docs/database/supabase-archive/`
