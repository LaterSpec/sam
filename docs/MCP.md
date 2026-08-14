# SAM MCP — Client & Agent Guide

Connect LLM assistants (Cursor, Claude Desktop, Claude Code, Hermes Agent, OpenClaw, and any MCP-compatible client) to your personal SAM finance data.

**Endpoint:** `{APP_URL}/api/mcp`  
**Transport:** MCP Streamable HTTP (stateless, JSON responses)  
**Auth:** Personal bearer token (`sam_mcp_…`)  
**Architecture / internals:** [MCP-ARCHITECTURE.md](./MCP-ARCHITECTURE.md)

---

## Quick start

### 1. Get a token

1. Log in to SAM at `/app`.
2. Open **Profile** → **Connect MCP**.
3. Create a token with a label and the scopes you need.
4. Copy the token immediately — SAM only shows it once.

Token format:

```text
sam_mcp_<public_prefix>_<secret>
```

### 2. Verify connectivity

```bash
curl -s -X POST "$APP_URL/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $SAM_MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke-test","version":"1.0.0"}}}'
```

Expected: HTTP `200` with `result.serverInfo.name` = `"sam"`.

### 3. Configure your agent

Copy [`.cursor/mcp.json.example`](../.cursor/mcp.json.example) or see [client configuration snippets](../.agents/skills/sam-mcp/client-configs.md) for Cursor, Claude, Hermes, OpenClaw, and others.

Store the token in an environment variable — never commit it:

```bash
export SAM_MCP_TOKEN="sam_mcp_..."
```

---

## What agents can do

SAM exposes **36 typed tools** scoped to the authenticated user. Natural-language requests are translated by the agent into tool calls; SAM validates input, enforces scopes, and returns structured JSON.

| User intent | Suggested tools |
| --- | --- |
| "What are my expenses this month?" | `sam_get_spending_summary`, `sam_list_transactions` |
| "Add a $24 Uber expense" | `sam_add_expense` |
| "How much is left in my food budget?" | `sam_list_categories`, `sam_get_budget_status` |
| "What's my net worth?" | `sam_get_net_worth`, `sam_list_accounts` |
| "Move $200 from Checking to Savings" | `sam_list_accounts` → `sam_transfer_between_accounts` (needs `confirm: true`) |
| "Pay rent every month" | `sam_create_recurring_rule` (expense + account + category) |
| "Why did my subscription fail?" | `sam_list_recurring_occurrences` → `sam_retry_recurring_occurrence` |
| "Show my savings goals" | `sam_list_goals` |

Full catalog: [tools-reference.md](../.agents/skills/sam-mcp/tools-reference.md).

---

## Protocol details

### Transport

SAM MCP is **stateless** JSON-RPC over HTTP (OpenNext / Cloudflare Workers):

- One HTTP `POST` per JSON-RPC message (no session id).
- Responses are plain `application/json` via an in-memory transport (avoids SDK `enableJsonResponse` hangs on Workers).
- `GET` / `DELETE` return **405** (no server-initiated SSE — those streams hang and get the Worker killed).
- Keep-alives (`initialize`, `ping`, `tools/list`, `notifications/*`) cache auth for 15 minutes and do not write `last_used_at`, so a connected client cannot keep Neon compute awake. Tool calls still hit Postgres.

### Required headers

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `Accept` | `application/json, text/event-stream` |
| `Authorization` | `Bearer sam_mcp_<prefix>_<secret>` |

Missing `Accept` returns:

```json
{"jsonrpc":"2.0","error":{"code":-32000,"message":"Not Acceptable: Client must accept both application/json and text/event-stream"},"id":null}
```

### JSON-RPC methods

| Method | Purpose |
| --- | --- |
| `initialize` | Handshake; returns `serverInfo` and server instructions |
| `tools/list` | Discover all tools and JSON Schemas |
| `tools/call` | Execute a tool: `{ "name": "sam_list_transactions", "arguments": { … } }` |

### Tool response shape

Successful calls return MCP `content` with a single text block containing JSON:

```json
{
  "result": {
    "content": [
      { "type": "text", "text": "{\"count\":12,\"total\":573.5,\"transactions\":[...]}" }
    ]
  },
  "jsonrpc": "2.0",
  "id": 4
}
```

Parse `result.content[0].text` as JSON. On domain errors:

```json
{
  "result": {
    "content": [{ "type": "text", "text": "{\"error\":\"scope_denied\",\"message\":\"missing scope: sam:expenses.write\"}" }],
    "isError": true
  }
}
```

### Recommended agent workflow

1. **`sam_get_profile`** — configured currency, language, timezone, and granted `capabilities` (scopes).
2. **Read before write** — e.g. `sam_list_accounts` / `sam_list_categories` before creating expenses.
3. **Date ranges** — use ISO dates (`2026-06-01` … `2026-06-30`) with summary/transaction tools.
4. **High-risk actions** — `sam_transfer_between_accounts` requires `confirm: true`; ask the user before setting it.
5. **Never bypass MCP** — agents must not query the database or call internal Server Actions when the user asked for MCP-only access.

More examples: [examples.md](../.agents/skills/sam-mcp/examples.md).

### Category text contract

- MCP tools exchange categories only through the `category` field using the user-facing name, such as `"Food & Dining"`, `"Alcohol"`, or `"Transport"`.
- Call `sam_list_categories` to discover valid names before filtering, adding, or updating expenses.
- Category matching is case-insensitive.
- Internal database keys are not accepted by MCP inputs and are not returned in transaction, category, budget, or summary responses.
- This replaces the previous `categoryKey` contract: clients must now send `category`; `categoryKey` and `catKey` are no longer part of MCP requests or responses.

---

## Authentication & scopes

### Token properties

- Belongs to one SAM user.
- Stored hashed server-side (SHA-256 + `MCP_TOKEN_PEPPER`); raw secret never persisted.
- Can expire and be revoked from Profile → Connect MCP.
- Records `last_used_at` / `last_used_ip` on each successful call.

### Scopes

| Scope | Allows |
| --- | --- |
| `sam:read` | Read accounts, categories, transactions, summaries and goals |
| `sam:expenses.write` | Create, update, delete expenses |
| `sam:categories.write` | Create/update categories and budget caps |
| `sam:income.write` | Record one-time income transactions |
| `sam:recurring.write` | Create/update/pause/archive recurring rules and retry failed occurrences |
| `sam:savings.write` | Update savings bucket balances |
| `sam:goals.write` | Create/update goals |
| `sam:accounts.write` | Create/update accounts |
| `sam:accounts.transfer` | Transfer between accounts (high risk) |
| `sam:profile.write` | Update username and preferences |

**Default scopes** on new tokens: `sam:read`, `sam:expenses.write`, `sam:categories.write`.

`sam_get_profile` returns the token's effective `capabilities` array — check it before calling write tools.

### Auth errors

| HTTP | `error` / message | Cause |
| --- | --- | --- |
| 401 | `missing_authorization` | No `Authorization` header |
| 401 | `invalid_token_format` | Malformed token |
| 401 | `invalid_token` | Unknown prefix or wrong secret |
| 401 | `token_revoked` | Revoked in Profile |
| 401 | `token_expired` | Past `expires_at` |

### Domain error codes (in tool responses)

| Code | Meaning |
| --- | --- |
| `scope_denied` | Token lacks required scope |
| `confirmation_required` | High-risk tool needs explicit confirmation (e.g. transfer without `confirm: true`) |
| `account_not_found` | Invalid `accountId` |
| `category_not_found` | Category display name was not found |
| `transaction_not_found` | Invalid expense id |
| `insufficient_balance` | Transfer or debit would overdraw |
| `invalid_amount` | Non-positive or invalid money value |

---

## Client configuration

### Cursor (project-level)

Create `.cursor/mcp.json` (see [example](../.cursor/mcp.json.example)):

```json
{
  "mcpServers": {
    "sam": {
      "url": "http://localhost:3000/api/mcp",
      "headers": {
        "Authorization": "Bearer ${env:SAM_MCP_TOKEN}"
      }
    }
  }
}
```

Set `SAM_MCP_TOKEN` in your shell or OS environment. Cursor hot-reloads MCP config.

### Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "sam": {
      "url": "https://your-sam-domain/api/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Restart Claude Desktop after changes.

### Claude Code

Project `.mcp.json` or user `~/.claude.json`:

```json
{
  "mcpServers": {
    "sam": {
      "type": "http",
      "url": "https://your-sam-domain/api/mcp",
      "headers": {
        "Authorization": "Bearer ${SAM_MCP_TOKEN}"
      }
    }
  }
}
```

### Hermes Agent

`~/.hermes/config.yaml`:

```yaml
mcp_servers:
  sam:
    url: "https://your-sam-domain/api/mcp"
    headers:
      Authorization: "Bearer ${SAM_MCP_TOKEN}"
    timeout: 120
    connect_timeout: 60
    tools:
      include:   # whitelist — avoids burning LLM quota on full tool rediscovery
        - sam_get_profile
        - sam_list_accounts
        - sam_list_categories
        - sam_list_transactions
        - sam_get_spending_summary
        - sam_get_budget_status
        - sam_add_expense
        - sam_update_expense
        - sam_delete_expense
```

`sam_add_expense` accepts optional `occurredAt` (`YYYY-MM-DD` or ISO datetime with `Z`/offset); omit to use now. (`sam_add_income` supports the same field when that tool is enabled.)

Reload: `/reload-mcp` in the Hermes chat. If Hermes says requests are exhausted, check the token and keep the whitelist (see skill `client-configs.md`).

Docs: [Hermes MCP guide](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp)

### OpenClaw

`~/.openclaw/openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "sam": {
        "url": "https://your-sam-domain/api/mcp",
        "transport": "streamable-http",
        "headers": {
          "Authorization": "Bearer ${SAM_MCP_TOKEN}"
        },
        "supportsParallelToolCalls": true
      }
    }
  }
}
```

OpenClaw namespaces tools as `sam:sam_list_transactions`. Use `openclaw mcp list` to verify.

Docs: [OpenClaw MCP CLI](https://documentation.openclaw.ai/cli/mcp)

### Generic HTTP MCP client

Any client supporting MCP Streamable HTTP over `POST` with custom headers:

- **URL:** `{APP_URL}/api/mcp`
- **Transport:** `streamable-http` (or `http` alias)
- **Auth header:** `Authorization: Bearer <token>`
- **Accept:** `application/json, text/event-stream`

---

## URLs by environment

| Environment | `APP_URL` | MCP endpoint |
| --- | --- | --- |
| Local dev | `http://localhost:3000` | `http://localhost:3000/api/mcp` |
| **Production (Cloudflare)** | `https://sam-app.its-manuel-caceres.workers.dev` | `https://sam-app.its-manuel-caceres.workers.dev/api/mcp` |

`NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` should match the origin (no trailing slash). Production values are set in `wrangler.jsonc`.

---

## Security checklist

- **Never commit tokens** — use env vars or secret managers.
- **Least privilege** — grant only scopes the agent needs.
- **Revoke unused tokens** from Profile → Connect MCP.
- **Set expiration** when creating tokens for experiments.
- **Audit trail** — every tool call is logged in `mcp_audit_logs` (server-side).
- **No account deletion or credential changes** via MCP (by design).

Production requires `MCP_TOKEN_PEPPER` (see [`.env.example`](../.env.example)):

```bash
wrangler secret put MCP_TOKEN_PEPPER
```

---

## Agent skill (for Cursor & compatible agents)

This repo ships a project skill agents can load for SAM MCP workflows:

```
.agents/skills/sam-mcp/SKILL.md
```

It includes tool selection guidance, protocol notes, and links to the full reference. Mention "use the sam-mcp skill" or configure your agent to auto-discover skills under `.agents/skills/`.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Not Acceptable` | Add `Accept: application/json, text/event-stream` |
| `Parse error: Invalid JSON` | Ensure valid JSON body; on Windows PowerShell use single-quoted JSON or `Invoke-WebRequest` |
| `scope_denied` | Regenerate token with required scope or call read-only tools |
| `confirmation_required` | Pass `confirm: true` on `sam_transfer_between_accounts` after user approval |
| Connection refused | Start dev server (`npm run dev`) or check production URL |
| 401 after deploy | Set `MCP_TOKEN_PEPPER` in Wrangler; tokens created locally won't verify if pepper differs |

---

## Related files

| Path | Purpose |
| --- | --- |
| `app/api/mcp/route.ts` | HTTP endpoint |
| `lib/mcp/server.ts` | Tool registration |
| `lib/mcp/scopes.ts` | Scope definitions |
| `lib/mcp/tools/*.ts` | Per-domain tools |
| `lib/actions/mcp-actions.ts` | Token CRUD (app UI) |
| `.cursor/mcp.json.example` | Cursor config template |
| `.agents/skills/sam-mcp/` | Agent skill + references |
| `docs/MCP-ARCHITECTURE.md` | Design & implementation notes |
