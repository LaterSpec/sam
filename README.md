# SAM — Financial Terminal

Personal financial terminal PWA: onboarding, budget, goals, and simulated invest with real market data.

**Stack:** Next.js 15 · React 19 · TypeScript · Tailwind CSS · Drizzle ORM · Neon Postgres · Better Auth · PWA (Serwist) · Vercel

## Quick start

```bash
cp .env.example .env.local
# Set DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL

npm install
npm run db:push      # or db:migrate against Neon
npm run db:seed      # market symbols
npm run market:sync  # Yahoo quotes + daily bars
npm run dev          # http://localhost:3000
```

## Routes

| Route | Purpose |
|-------|---------|
| `/onboarding` | Landing + sign up / sign in |
| `/app` | Main app (auth required) |
| `/canvas` | Design reference (legacy) |

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run db:generate
npm run db:migrate
npm run db:seed
npm run market:sync
```

## Environment

See [`.env.example`](.env.example):

- `DATABASE_URL` — Neon Postgres connection string
- `BETTER_AUTH_SECRET` — session signing secret
- `BETTER_AUTH_URL` — app URL (e.g. `http://localhost:3000`)
- `CRON_SECRET` — Vercel Cron auth for `/api/cron/market-sync`

## Deploy (Vercel)

1. Connect repo to Vercel
2. Set env vars from `.env.example`
3. Add Neon `DATABASE_URL`
4. Optional: Vercel Cron → `GET /api/cron/market-sync` with `Authorization: Bearer $CRON_SECRET`

## PWA

Install from Chrome (Android) or Safari → Add to Home Screen (iOS). See [`docs/PWA.md`](docs/PWA.md).

## Legacy

Previous HTML/CDN app archived in [`docs/legacy/`](docs/legacy/). Supabase SQL in [`docs/database/supabase-archive/`](docs/database/supabase-archive/).

## Docs

- [Database schema](docs/database/schema-summary.md)
- [Supabase migration notes](docs/database/supabase-migration-notes.md)
- [PWA](docs/PWA.md)
- [Architecture (legacy)](docs/ARCHITECTURE.md)

## Disclaimer

Demo / development project. Not financial advice. Trades are simulated.
