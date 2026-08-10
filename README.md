# SAM - Financial Terminal

SAM is a personal financial terminal for accounts, transactions, budgets, goals, savings and recurring payments. Desktop browsers use the Living Ledger workspace; phones use the installable native-like PWA experience.

**Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Drizzle ORM, Neon Postgres, Better Auth, Serwist PWA, OpenNext for Cloudflare, Cloudflare Workers.

## Current Architecture

- The app is deployed as a Cloudflare Worker using `@opennextjs/cloudflare`.
- Neon Postgres is the production database.
- Better Auth owns app authentication and sessions.
- Drizzle owns schema definition and typed database access.
- Server Actions and Route Handlers own app mutations and API endpoints.
- Supabase is archived only as migration history; it is not an active runtime dependency.

## Quick Start

```bash
cp .env.example .env.local
# Set DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL

npm install
npm run db:push
npm run db:seed:demo
npm run dev
```

Local app: `http://localhost:3000`

**Production (Cloudflare Workers):** `https://sam-app.its-manuel-caceres.workers.dev`

| Environment | App | MCP endpoint |
| --- | --- | --- |
| Local | `http://localhost:3000` | `http://localhost:3000/api/mcp` |
| Production | `https://sam-app.its-manuel-caceres.workers.dev` | `https://sam-app.its-manuel-caceres.workers.dev/api/mcp` |

Agents and MCP clients should use the **production MCP URL** when not running SAM locally.

## Routes

| Route | Purpose |
| --- | --- |
| `/onboarding` | Landing and authentication flow |
| `/app` | Device-aware authenticated entry: desktop workspace or phone UI |
| `/app/[section]` | Desktop workspace sections with phone-safe mobile mapping |
| `/canvas` | Design reference / legacy visual sandbox |
| `/~offline` | PWA offline fallback |
| `/api/auth/[...all]` | Better Auth route handler |
| `/api/mcp` | MCP Streamable HTTP endpoint (personal finance tools for AI agents) |
| `/developers` | SAM for Developers — integration marketplace docs |
| `/api/integrations/hooks/[installId]` | Integration webhook ingress |
| `/api/integrations/cron/sync` | Integration sync cron (Bearer `CRON_SECRET`) |

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Local Next.js development |
| `npm run build` | Standard Next.js build |
| `npm run build:cloudflare` | Build for Cloudflare Workers with OpenNext |
| `npm run preview:cloudflare` | Build and preview the Cloudflare Worker locally |
| `npm run deploy:cloudflare` | Build and deploy to Cloudflare Workers |
| `npm run db:generate` | Generate Drizzle migrations |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:push` | Push current schema to Neon |
| `npm run db:seed:demo` | Seed demo user `alex@sam.app / sam12345` |
| `npm run icons:generate` | Regenerate PWA icon PNGs |

## Environment

See [`.env.example`](.env.example).

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |
| `BETTER_AUTH_SECRET` | Better Auth signing secret |
| `BETTER_AUTH_URL` | App origin, for example `http://localhost:3000` or the Cloudflare Workers URL |
| `NEXT_PUBLIC_APP_URL` | Public app origin used by the frontend |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional Google OAuth credentials |
| `BETTER_AUTH_EMAIL_ENABLED` | Enable email/password auth, normally `true` in local/demo |
| `CRON_SECRET` | Bearer secret retained for the disconnected recurring cron endpoint |
| `MCP_TOKEN_PEPPER` | Salts MCP personal token hashes (required in production) |

For Cloudflare production secrets, use Wrangler secrets for sensitive values:

```bash
wrangler secret put DATABASE_URL
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put CRON_SECRET
```

`wrangler.jsonc` stores non-secret public app URLs and the Worker build settings.

## Google OAuth

Create a Google OAuth client as a **Web application**.

Local values:

| GCP field | Value |
| --- | --- |
| Authorized JavaScript origins | `http://localhost:3000` |
| Authorized redirect URIs | `http://localhost:3000/api/auth/callback/google` |

Cloudflare production values (`sam-app.its-manuel-caceres.workers.dev`):

| GCP field | Value |
| --- | --- |
| Authorized JavaScript origins | `https://sam-app.its-manuel-caceres.workers.dev` |
| Authorized redirect URIs | `https://sam-app.its-manuel-caceres.workers.dev/api/auth/callback/google` |

`BETTER_AUTH_URL` and `NEXT_PUBLIC_APP_URL` must match the active origin without a trailing slash.

New users receive automatic bootstrap data: profile, default accounts and default categories.

## Deploy To Cloudflare

```bash
npm run build:cloudflare
npm run deploy:cloudflare
```

Production deployment target: Cloudflare Workers.

Database target: Neon Postgres.

## PWA

SAM is PWA-ready for Android and iOS install flows. See [docs/PWA.md](docs/PWA.md).

## MCP (AI agents)

Connect Cursor, Claude, Hermes Agent, OpenClaw, or any MCP client to your SAM data.

**Production MCP URL:** `https://sam-app.its-manuel-caceres.workers.dev/api/mcp`

1. Log in at [https://sam-app.its-manuel-caceres.workers.dev/app](https://sam-app.its-manuel-caceres.workers.dev/app) → Profile → **Connect MCP** → create a token.
2. Copy [`.cursor/mcp.json.example`](.cursor/mcp.json.example) to `.cursor/mcp.json`, set `url` to the production MCP URL above, and set `SAM_MCP_TOKEN`.
3. See [docs/MCP.md](docs/MCP.md) for protocol details, the current finance tools, and client-specific setup.

Example Cursor config (production):

```json
{
  "mcpServers": {
    "sam": {
      "url": "https://sam-app.its-manuel-caceres.workers.dev/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:SAM_MCP_TOKEN}"
      }
    }
  }
}
```

Agent skill for this repo: [`.agents/skills/sam-mcp/SKILL.md`](.agents/skills/sam-mcp/SKILL.md)

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Database](docs/DATABASE.md)
- [Schema summary](docs/database/schema-summary.md)
- [Supabase migration notes](docs/database/supabase-migration-notes.md)
- [Investment removal migration](docs/migrations/investments-removal.md)
- [PWA](docs/PWA.md)
- [MCP client guide](docs/MCP.md)
- [Priority 0 financial reliability plan](docs/FINANCIAL-RELIABILITY-PLAN.md)
- [MCP architecture](docs/MCP-ARCHITECTURE.md)

## Legacy And Migration Notes

Supabase was used during the migration path and is now archived under `docs/database/supabase-archive/`. It must not be reintroduced as an active dependency. Legacy files should remain until their migration notes are complete.

`sam-demo/` is intentionally ignored for the main SAM migration.

## Disclaimer

SAM is a demo/development project. It is not financial advice.
