# SAM Integrations

Marketplace of connectors that automate SAM (bank sync, webhooks, future sandboxed workers).

| Doc | Purpose |
| --- | --- |
| [integrations/OVERVIEW.md](./integrations/OVERVIEW.md) | Vision, trust model, hybrid A→B |
| [integrations/MANIFEST.md](./integrations/MANIFEST.md) | Manifest schema and scopes |
| [integrations/AUTHOR-GUIDE.md](./integrations/AUTHOR-GUIDE.md) | How to submit and what review checks |
| [integrations/RUNTIME.md](./integrations/RUNTIME.md) | Install, connect, sync, webhooks, secrets |
| [integrations/PHASE-2-WORKERS.md](./integrations/PHASE-2-WORKERS.md) | Workers for Platforms roadmap |

## Quick links

- Catalog / installs UI: **Settings → Integrations** (desktop) and **Profile → Settings → Integrations** (mobile)
- Webhook ingress: `POST /api/integrations/hooks/{installId}` with `Authorization: Bearer <webhookToken>`
- Sync cron: `POST /api/integrations/cron/sync` with `Authorization: Bearer $CRON_SECRET`
- OAuth start: `GET /api/integrations/oauth/start?installId=...`
- OAuth callback: `GET /api/integrations/oauth/callback`

## Secrets

```bash
wrangler secret put INTEGRATION_SECRETS_KEY   # AES-GCM key (openssl rand -base64 32)
# Optional reviewers (comma-separated Better Auth user ids):
# INTEGRATION_REVIEWER_IDS=user_xxx
```

R2 bucket binding: `INTEGRATIONS_R2` → `sam-integrations` (see `wrangler.jsonc`).

## Online docs

Public developer site: **[/developers](/developers)** (“SAM for Developers”).

| Path | Source |
| --- | --- |
| `/developers` | Index |
| `/developers/overview` | `docs/integrations/OVERVIEW.md` |
| `/developers/manifest` | `docs/integrations/MANIFEST.md` |
| `/developers/author-guide` | `docs/integrations/AUTHOR-GUIDE.md` |
| `/developers/runtime` | `docs/integrations/RUNTIME.md` |
| `/developers/phase-2-workers` | `docs/integrations/PHASE-2-WORKERS.md` |

Authors create integrations from **Settings → Integrations → Create integration** (desktop) or **Profile → Settings → Integrations → Create** (mobile), after reading the docs.