# Investment subsystem removal

## Decision

SAM no longer includes simulated investing, holdings, watchlists, market
quotes, portfolio analytics or live market data. The feature is removed from
phone/PWA, desktop web, onboarding, MCP, scheduled work and Neon.

This note is the required migration record before deleting legacy code. The
archived Supabase SQL under `docs/database/supabase-archive/` remains untouched.

## Runtime inventory

- UI screens: invest, market and portfolio analysis.
- UI sheets: trade, ticker detail and add ticker.
- Onboarding: investment feature slide.
- Client runtime: quote polling and portfolio snapshot recording.
- Server actions: quote fetch, snapshot, buy, sell and watchlist mutations.
- Domain and MCP: investment domain plus seven public MCP tools.
- Background work: Yahoo sync code, market seed and the retired market cron
  route.
- Legacy backend: Python market/live-data helpers.

## Data inventory

The destructive migration removes these tables after the runtime no longer
references them:

1. `portfolio_snapshots`
2. `trades`
3. `watchlist`
4. `holdings`
5. `market_daily_bars`
6. `market_quotes`
7. `market_symbols`

Existing Drizzle and archived Supabase migrations are historical records and
must not be rewritten or deleted.

## MCP compatibility

The following tools are intentionally removed and old calls receive the MCP
standard unknown-tool response:

- `sam_list_holdings`
- `sam_list_watchlist`
- `sam_get_quote`
- `sam_buy_holding`
- `sam_sell_holding`
- `sam_add_watch`
- `sam_remove_watch`

The `sam:invest.write` scope is retired. Existing personal MCP tokens keep all
other scopes; stale investment scope values are ignored during authorization.

## Deployment sequence

1. Deploy application code without investment reads, writes, polling, tools or
   bootstrap behavior.
2. Verify core accounts, transactions, budgets, goals, savings, recurring rules
   and MCP tools.
3. Create a Neon branch or snapshot from production.
4. Apply `drizzle/migrations/remove_investments.sql`.
5. Verify the seven tables are absent and run the finance reliability checks.

## Rollback

Application rollback is safe before the database migration. After the migration
the database must be restored from the Neon branch/snapshot before deploying an
older application build because old builds query the removed tables.
