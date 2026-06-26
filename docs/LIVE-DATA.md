# Market Data

SAM stores market data in Neon Postgres. The active sync path is TypeScript and is designed to run either from the CLI or from a protected Cloudflare/Next route handler.

## Data Model

```text
Yahoo Finance
    │
    ▼
lib/market/yahoo-sync.ts
    │
    ├── market_quotes      source = yahoo
    └── market_daily_bars  daily closes
        │
        ▼
App market builder
live > yahoo > latest daily close > holding cost fallback
```

Market tables:

| Table | Purpose |
| --- | --- |
| `market_symbols` | Active ticker universe |
| `market_quotes` | Latest quotes by `symbol`, `source`, and `session_date` |
| `market_daily_bars` | Daily close history for charts and fallback pricing |

User invest tables:

| Table | Purpose |
| --- | --- |
| `holdings` | Simulated open positions |
| `watchlist` | User-specific watched tickers |
| `trades` | Simulated buy/sell log |
| `portfolio_snapshots` | Portfolio value time series |

## Sync Commands

Run the market sync locally:

```bash
npm run market:sync
```

Limit the number of symbols during testing:

```bash
MARKET_SYNC_LIMIT=5 npm run market:sync
```

The CLI wrapper is `scripts/market/yahoo-sync.ts`; the reusable sync implementation is `lib/market/yahoo-sync.ts`.

## Protected Sync Route

The route handler is:

```text
app/api/cron/market-sync/route.ts
```

It requires:

```http
Authorization: Bearer $CRON_SECRET
```

Example:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-worker-or-domain>/api/cron/market-sync
```

This route can be called by a Cloudflare scheduler, an external cron service, or a manually triggered deployment task.

## Runtime Requirements

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `CRON_SECRET` | Shared secret for the protected route |

For Cloudflare production, store both values with Wrangler secrets.

## How The App Consumes Market Data

The app loads market data through `lib/db/queries/load-user-data.ts` and market-building helpers in `lib/market/build-market.ts`.

The loader intentionally fetches daily bars only for relevant symbols:

- user holdings
- user watchlist
- `SPY` benchmark

This keeps payloads small and avoids loading the entire market universe into every app request.

## Pricing Priority

The market builder resolves prices in this order:

1. Recent `live` quote when present.
2. `yahoo` quote.
3. Latest close from `market_daily_bars`.
4. Holding average cost fallback for simulated portfolio views.

The current active sync writes Yahoo data. The schema still supports `source = live`, but there is no active production live-feed worker in the current Cloudflare stack.

## Simulated Trading

Invest actions are simulated inside SAM:

- buys update `holdings`, insert a `trades` row, and remove the symbol from `watchlist`
- sells update or remove `holdings` and insert a `trades` row
- no broker order is sent
- no custody or real-money transaction occurs

## Historical Notes

The legacy `backend/` folder documented Python/IBKR experiments and older Supabase-local flows. It is not the active production market-data path. Keep it as historical context unless a future live-market integration deliberately replaces it with a maintained Cloudflare-compatible service.
