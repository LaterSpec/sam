# SAM Database Schema Summary

Migrated from Supabase Postgres to Neon + Drizzle.

## Auth (Better Auth)
- `user`, `session`, `account`, `verification`

## Domain (14 tables)
- `profiles` — 1:1 with user
- `accounts`, `categories`, `transactions`, `goals`, `income_sources`, `savings_buckets`
- `market_symbols`, `market_quotes`, `market_daily_bars` — global read
- `holdings`, `watchlist`, `trades`, `portfolio_snapshots` — per user

## Security
Supabase RLS replaced by application-layer `userId` filtering in Server Actions and queries.

## Original SQL
Archived in `docs/database/supabase-archive/`.
