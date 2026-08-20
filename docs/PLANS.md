# SAM plans

Locked product limits for Free / Pro / Agent. Enforcement and billing are
**not** implemented yet: `profiles.plan` exists (default `"pro"`) and is
display-only in Settings.

This is the source of truth for later metering, paywalls, and Stripe (or
equivalent). Related: [Neon compute](./NEON-COMPUTE.md), [MCP](./MCP.md),
[MCP architecture](./MCP-ARCHITECTURE.md).

## Prices

| Plan | Price |
| --- | --- |
| **Free** | $0 |
| **Pro** | $5 / month |
| **Agent** | $10 / month |

## Limits

| | **Free** | **Pro · $5** | **Agent · $10** |
| --- | --- | --- | --- |
| Transactions | 100 / month | 500 / month | Unlimited (fair use) |
| Accounts | 2 | 8 | Unlimited |
| Currencies | 1 (USD **or** PEN) | USD + PEN | USD + PEN |
| Recurring payments | No | Yes | Yes |
| PWA | No | Yes | Yes |
| Themes | 1 (default) | Multi-theme | Multi-theme |
| MCP | Read only | Read + write | Read + write |
| MCP tokens | 1 | 3 | Unlimited |
| `sam:accounts.transfer` | No | **No** | Yes (`confirm: true`) |
| Tool calls / month | 100 (read only) | 5 000 | 25 000 |
| Integrations | 0 | 3 | Unlimited (Phase 1 connectors) |

Free transactions are **100 per month** (same window as Pro), not a lifetime
cap on rows in the ledger.

## What each plan includes

### Free

Manual ledger for trying the app and a single read-only MCP token.

**Includes**

- Capture: expenses, 2 accounts, categories, goals, reports
- One active currency (USD or PEN)
- MCP `sam:read` only, 1 token, 100 tool calls / month
- Single default theme, browser-only (no PWA install)

**Excluded**

- Recurring rules / scheduled posting
- PWA
- Multi-theme
- MCP write scopes
- `sam:accounts.transfer`
- Second currency, more than 2 accounts, extra MCP tokens
- Integrations

### Pro — $5 / month

Daily Living Ledger plus a useful agent.

**Includes**

- 500 new transactions / month, 8 accounts, USD + PEN
- Recurring payments (when production cron is re-enabled; not on Free)
- PWA (installable iOS/Android)
- All themes
- MCP read + write, 3 tokens, 5 000 tool calls / month
- Writes: expenses, categories, income, recurring, goals, savings, create/update accounts
- Up to 3 Phase 1 integrations

**Excluded**

- High-risk transfers: `sam:accounts.transfer` (app and MCP)

### Agent — $10 / month

Full MCP backend for people who live in Cursor / Claude / Hermes / OpenClaw.

**Includes**

- Everything in Pro
- Unlimited accounts, transactions (fair use), MCP tokens, Phase 1 integrations
- 25 000 tool calls / month
- `sam:accounts.transfer` with existing `confirm: true` gate

## MCP scopes vs plans

Token scopes stay as implemented in `lib/mcp/scopes.ts`. Plans gate **whether
those scopes may be granted**, not a second permission system.

| Scope | Free | Pro | Agent |
| --- | --- | --- | --- |
| `sam:read` | Yes | Yes | Yes |
| `sam:expenses.write` | No | Yes | Yes |
| `sam:categories.write` | No | Yes | Yes |
| `sam:income.write` | No | Yes | Yes |
| `sam:recurring.write` | No | Yes | Yes |
| `sam:savings.write` | No | Yes | Yes |
| `sam:goals.write` | No | Yes | Yes |
| `sam:accounts.write` | No | Yes | Yes |
| `sam:accounts.transfer` | No | No | Yes |
| `sam:profile.write` | No | Yes | Yes |

Free default token: `sam:read` only (today new tokens also get expense and
category write; that must change when plans are enforced).

Keep-alives (`initialize`, `ping`, `tools/list`, `notifications/*`) **do not**
count as tool calls. Only `tools/call` counts, via `mcp_audit_logs`.

## Metering (when built)

| Limit | Source of truth |
| --- | --- |
| Tool calls | `mcp_audit_logs` rows with a real tool name (not keep-alives) |
| Transactions / month | `transactions` with `occurred_at` in the user’s timezone month |
| MCP tokens | Non-revoked rows in `mcp_tokens` |
| Accounts | `accounts` for `user_id` |
| Integrations | `user_integration_installs` with status installed/connected |
| Recurring | Creating rules + running cron: Pro/Agent only |
| PWA | Product gate (install prompt / manifest), not infra |
| Transfer | Deny `sam:accounts.transfer` unless plan is `agent` |

`profiles.plan` should become an enum-like text: `free` \| `pro` \| `agent`.
New users default to **`free`** (today the schema default is `"pro"`).

## Explicitly out of scope

These are **not** plan SKUs and must not be promised on any tier:

- Bank aggregation (Plaid / Open Banking) as a SAM-operated core
- Households / teams / orgs (one `userId` per ledger)
- Embedded LLM inside the Worker (the user’s agent is the model)
- Investments / trading (removed; see `docs/migrations/investments-removal.md`)
- Marketplace take rate / Phase 2 sandboxed workers (connectors Phase 1 only)

## Implementation status

| Item | Status |
| --- | --- |
| This document | Source of truth |
| `profiles.plan` column | Exists; unused for gating |
| Stripe / Polar / Lemon | Not integrated |
| Quotas in domain / MCP | Not enforced |
| Recurring cron | Off in production |
| MCP keep-alive Neon pin | Mitigated; see [NEON-COMPUTE.md](./NEON-COMPUTE.md) |

Do not ship billing until tool-call metering and MCP rate limits exist. A
connected Agent plan without those limits can hold Neon compute awake
whenever the user actually calls tools (expected) **and** must not hold it
awake on ping/list (already the keep-alive contract).
