# SAM — Financial Terminal

Personal financial terminal PWA: onboarding, budget, goals, and simulated invest with real market data.

**Stack:** Next.js 15 · React 19 · TypeScript · Tailwind CSS · Drizzle ORM · Neon Postgres · Better Auth · PWA (Serwist) · Vercel

## Quick start

```bash
cp .env.example .env.local
# Set DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL

npm install
npm run db:push        # apply schema to Neon
npm run db:seed        # 85 market symbols (from Supabase migration)
npm run db:seed:demo   # demo user alex@sam.app / sam12345
npm run market:sync    # Yahoo quotes + daily bars
npm run dev          # http://localhost:3000
```

## Routes

| Route | Purpose |
|-------|---------|
| `/onboarding` | Landing slides + Google sign-in |
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
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth (see below)
- `BETTER_AUTH_EMAIL_ENABLED` — set `"true"` only to allow email login for demo seed user
- `CRON_SECRET` — Vercel Cron auth for `/api/cron/market-sync`

## Google OAuth (GCP)

Configura el cliente OAuth como **Aplicación web** con estos valores (local):

| Campo en GCP | Valor |
|--------------|--------|
| Orígenes autorizados de JavaScript | `http://localhost:3000` |
| URIs de redireccionamiento autorizados | `http://localhost:3000/api/auth/callback/google` |

Pasos:

1. [Google Cloud Console](https://console.cloud.google.com/) → proyecto → **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth → Aplicación web**.
2. Añade los orígenes y URIs de la tabla (y los mismos con tu dominio de producción en Vercel).
3. Copia **ID de cliente** y **Secreto** a `.env.local`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
4. `BETTER_AUTH_URL` y `NEXT_PUBLIC_APP_URL` deben ser exactamente `http://localhost:3000` en local (sin barra final). Eso evita `redirect_uri_mismatch`.

Tras login, Google redirige a `/api/auth/callback/google` (Better Auth); luego la app muestra éxito en `/onboarding?auth=success` y entras a `/app`.

Los usuarios nuevos reciben bootstrap automático (perfil, cuentas, categorías, watchlist).

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
