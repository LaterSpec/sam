# Integration runtime

## Lifecycle

1. **Install** — creates `user_integration_installs`, grants scopes, issues webhook token (shown once)
2. **Connect** — for `api_key` / `oauth2`, encrypts secrets into `user_integration_secrets`
3. **Sync / webhook** — validates install + scopes, writes via `lib/domain`
4. **Disconnect** — deletes secrets, status `disconnected`
5. **Uninstall** — removes install + secrets

## Webhook

```http
POST /api/integrations/hooks/{installId}
Authorization: Bearer sam_hook_...
Content-Type: application/json

{ "name": "Uber", "amount": 24.5, "catKey": "transport" }
```

Also accepts `{ "expenses": [ ... ] }` or a raw array.

## Sync cron

```http
POST /api/integrations/cron/sync
Authorization: Bearer $CRON_SECRET
```

Runs `builtin:http-pull` (when configured) or no-ops `builtin:webhook-echo`.

## Secrets

- Algorithm: AES-GCM, key from `INTEGRATION_SECRETS_KEY`
- Never logged; audit meta must not include ciphertext or plaintext tokens
- Webhook tokens stored only as salted hashes

## Actor context

Integrations call domain services with:

```ts
{ userId, email, authMethod: "integration", scopes, tokenId: installId }
```
