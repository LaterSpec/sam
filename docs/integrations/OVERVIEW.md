# Integrations overview

SAM Integrations is a marketplace of connectors that extend the ledger with automated flows (bank APIs, webhooks, scheduled pulls).

## Hybrid model (A → B)

| Phase | Runtime | What authors ship |
| --- | --- | --- |
| **1 (current)** | `connector` | Declarative **manifest** + optional external webhook/HTTP pull. SAM owns execution via `lib/integrations/runtime`. |
| **2 (planned)** | `worker` | Sandboxed Cloudflare Workers (Workers for Platforms). Authors must be **verified**. See [PHASE-2-WORKERS.md](./PHASE-2-WORKERS.md). |

Third-party arbitrary code does **not** run inside SAM in Phase 1.

## Trust model

1. Author submits a version → status `pending_review`
2. Reviewer approves → `published` (listed in marketplace) or rejects
3. Users install published integrations and grant scopes (same vocabulary as MCP)
4. Connect stores encrypted secrets; disconnect deletes them
5. Sync/webhooks call `lib/domain/*` with an `ActorContext` (`authMethod: "integration"`)

## Data placement

| Concern | Store |
| --- | --- |
| Catalog, installs, audit, encrypted secrets | Neon Postgres |
| Icons / manifest blobs (optional) | Cloudflare R2 `sam-integrations` |
| Encryption key | Wrangler secret `INTEGRATION_SECRETS_KEY` |

## Author visibility

Every catalog card and install row shows the **author display name** from `integration_authors` (and manifest `author.displayName`).

## Related code

- Schema: `lib/db/schema.ts` (integration_* tables)
- Domain: `lib/integrations/*`
- Actions: `lib/actions/integration-actions.ts`
- Routes: `app/api/integrations/**`
