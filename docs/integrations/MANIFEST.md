# Integration manifest

Validated by Zod in `lib/integrations/manifest.ts`.

## Example (Phase 1 connector)

```json
{
  "id": "banco-x-sync",
  "version": "1.0.0",
  "name": "Banco X",
  "description": "Pulls card transactions into SAM expenses.",
  "author": { "displayName": "Manuel", "url": "https://example.com" },
  "runtime": "connector",
  "icon": "🏦",
  "scopes": ["sam:read", "sam:expenses.write"],
  "auth": { "type": "api_key", "label": "Banco X API key" },
  "capabilities": {
    "sync": {
      "schedule": "0 */6 * * *",
      "handler": "builtin:http-pull",
      "pullUrl": "https://api.bancox.example/v1/transactions"
    },
    "webhook": { "enabled": true }
  }
}
```

## Fields

| Field | Notes |
| --- | --- |
| `id` | Lowercase kebab slug; unique catalog key |
| `version` | Semver-ish string; unique per integration |
| `runtime` | `connector` (Phase 1) or `worker` (Phase 2 only) |
| `scopes` | Subset of MCP scopes (`sam:read`, `sam:expenses.write`, …) |
| `auth.type` | `none` \| `api_key` \| `oauth2` |
| `capabilities.sync.handler` | `builtin:webhook-echo` \| `builtin:http-pull` |
| `workerEntry` | Phase 2 only |

## Auth variants

- **none** — install becomes `connected` immediately (webhook-only tools)
- **api_key** — user pastes a key; stored AES-GCM encrypted
- **oauth2** — redirect via `/api/integrations/oauth/start`

## Versioning

Each submit creates an `integration_versions` row. Publishing sets `integrations.current_version` and `status = published`.
