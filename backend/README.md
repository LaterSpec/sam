# Backend Archive

The active SAM runtime does not use this `backend/` folder.

Production currently runs on:

- Cloudflare Workers via OpenNext
- Next.js App Router
- Neon Postgres
- Better Auth
- Drizzle ORM
- TypeScript market sync in `lib/market/yahoo-sync.ts`

## Historical Context

This folder previously held Python experiments for market data:

| Legacy module | Historical purpose |
| --- | --- |
| `market.yahoo_sync` | Write Yahoo quotes and daily bars |
| `live_data.connect` | Connect to an IBKR Gateway live stream |

Those flows were part of the old local architecture and are not the active production path.

## Current Market Sync

Use the TypeScript sync instead:

```bash
npm run market:sync
```

Or call the protected route in the deployed Cloudflare app:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-worker-or-domain>/api/cron/market-sync
```

See `docs/LIVE-DATA.md` for current market-data documentation.
