# SAM MCP Architecture

> **Client / agent setup:** see [MCP.md](./MCP.md) for connection, tokens, tool catalog, and Cursor / Hermes / OpenClaw configuration.  
> **Agent skill:** [`.agents/skills/sam-mcp/SKILL.md`](../.agents/skills/sam-mcp/SKILL.md)

This document describes the Model Context Protocol (MCP) architecture for SAM. The goal is to let LLM assistants connect to SAM on behalf of a logged-in user, safely query that user's financial data, and execute controlled actions such as adding expenses, creating categories, or summarizing budgets.

## Implementation Status

The first build is implemented inside the existing Cloudflare Worker (Option A).

- Transport: official `@modelcontextprotocol/sdk` `WebStandardStreamableHTTPServerTransport`, stateless mode (`sessionIdGenerator: undefined`, `enableJsonResponse: true`). Runs natively on `workerd` with Web `Request`/`Response`.
- Endpoint: `app/api/mcp/route.ts` (`runtime = "nodejs"`), handles POST/GET/DELETE.
- Auth: personal bearer tokens (`sam_mcp_<public_prefix>_<secret>`). Only a salted SHA-256 hash is stored (Web Crypto). Verified in `lib/mcp/auth.ts`.
- Domain layer: reusable, session-agnostic services in `lib/domain/*` consumed by both Server Actions and MCP tools via an `ActorContext`.
- Tables: `mcp_tokens`, `mcp_audit_logs` (see below). Focused SQL migration in `drizzle/migrations/mcp_tables.sql`; canonical sync is `npm run db:push`.
- Token management UI: a "connect mcp" entry at the bottom of the Profile screen opens a sheet to generate/copy/revoke tokens and pick scopes.
- Secret: set `MCP_TOKEN_PEPPER` as a Wrangler secret (`wrangler secret put MCP_TOKEN_PEPPER`). The pepper salts token hashes.

Implemented tool catalog (read = `sam:read`; writes scoped):

- Profile/prefs: `sam_get_profile`, `sam_update_username`, `sam_update_prefs`
- Accounts: `sam_list_accounts`, `sam_get_net_worth`, `sam_create_account`, `sam_update_account`, `sam_transfer_between_accounts` (requires `confirm: true`)
- Expenses/transactions: `sam_list_transactions` (date range / kind / category / account / search / pagination), `sam_add_expense`, `sam_update_expense`, `sam_delete_expense`
- Categories/budgets: `sam_list_categories`, `sam_get_budget_status`, `sam_create_category`, `sam_update_category`, `sam_update_category_cap`
- Summaries: `sam_get_spending_summary` (groupBy category/day/month), `sam_get_cashflow`
- Goals: `sam_list_goals`, `sam_create_goal`, `sam_update_goal`, `sam_set_goal_saved`
- Income: `sam_list_income_sources`, `sam_add_income`
- Recurring: `sam_list_recurring_rules`, `sam_create_recurring_rule`, `sam_update_recurring_rule`, `sam_pause_recurring_rule`, `sam_resume_recurring_rule`, `sam_archive_recurring_rule`, `sam_delete_recurring_rule`, `sam_list_recurring_occurrences`, `sam_retry_recurring_occurrence`
- Savings: `sam_list_savings_buckets`, `sam_set_bucket_balance`

Not exposed via MCP: account deletion and credential changes.

The remainder of this document is the original design rationale.

## Goal

Enable assistants to handle natural-language requests like:

- "Add a 24 dollar Uber expense for today."
- "Create a Pets category with a monthly cap of 120."
- "How much did I spend on food this month?"
- "Move 200 from Checking to Savings."
- "Show my budget categories that are close to the limit."

The LLM performs language understanding. SAM exposes typed MCP tools with strict schemas, authorization, and user-scoped database access.

## Non-Goals

- Do not expose raw SQL to assistants.
- Do not expose all Server Actions directly as public tools.
- Do not let agents bypass Better Auth or user-level authorization.
- Do not execute real broker trades.
- Do not reintroduce Supabase as an active dependency.

## Recommended Shape

```text
MCP Client / LLM Assistant
       │
       │ Streamable HTTP + Authorization: Bearer <token>
       ▼
SAM MCP Endpoint
Cloudflare Worker / Next route
       │
       ├── validate token
       ├── derive userId + scopes
       ├── validate tool input with Zod
       ├── call SAM domain service
       ├── write audit log
       ▼
Neon Postgres
user-scoped SAM data
```

## Transport

Use remote MCP over HTTP.

Preferred protocol:

- MCP Streamable HTTP
- `Authorization: Bearer <access_token>`
- JSON tool inputs and outputs
- explicit user-scoped service context

References:

- MCP authorization: `https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization`
- MCP transports: `https://modelcontextprotocol.io/specification/2025-06-18/basic/transports`
- Cloudflare remote MCP: `https://developers.cloudflare.com/agents/model-context-protocol/guides/remote-mcp-server/`

## Deployment Options

### Option A: MCP Inside The Existing Next/Cloudflare App

Add a route such as:

```text
app/api/mcp/route.ts
```

Pros:

- Reuses current Cloudflare deployment.
- Reuses current environment and Neon connection.
- Easier to share domain services.

Cons:

- Must be careful with package/runtime compatibility.
- App and MCP deployments are tied together.

### Option B: Separate Cloudflare Worker For MCP

Create a sibling Worker dedicated to MCP.

Pros:

- Independent deploy cadence.
- Cleaner public API boundary.
- Easier to apply separate rate limits and observability.

Cons:

- More infrastructure.
- Shared code must be packaged or duplicated carefully.

### Recommended Initial Choice

Start with Option A for speed, then split to Option B if MCP traffic, security policy, or client compatibility needs grow.

## Auth Model

SAM currently uses Better Auth for app sessions. MCP clients should not reuse browser cookies as their primary integration credential. Use a dedicated MCP credential model.

### Phase 1: Personal MCP Tokens

Add user-generated tokens inside SAM:

- user logs into `/app`
- user creates an MCP token
- SAM shows the token once
- SAM stores only a hash
- MCP clients use `Authorization: Bearer sam_mcp_...`

Suggested token properties:

- belongs to one `userId`
- has scopes
- can expire
- can be revoked
- stores last-used metadata
- never stored in plaintext

### Phase 2: OAuth For MCP

For broader compatibility, add an OAuth authorization flow where the MCP client redirects the user to SAM, obtains consent, and receives an access token with scopes.

This is the better long-term model for third-party assistants and public integrations.

## Proposed Tables

### `mcp_tokens`

Stores hashed personal tokens.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid PK | Token id |
| `user_id` | text FK | References `user.id` |
| `name` | text | User-facing token label |
| `token_hash` | text unique | Hash of the secret token |
| `scopes` | text[] or jsonb | Allowed capabilities |
| `expires_at` | timestamp nullable | Expiration |
| `revoked_at` | timestamp nullable | Revocation |
| `last_used_at` | timestamp nullable | Last successful use |
| `last_used_ip` | text nullable | Last caller IP |
| `created_at` | timestamp | Created timestamp |

### `mcp_audit_logs`

Append-only log of MCP tool calls.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | bigint identity PK | Audit row |
| `user_id` | text FK | User owner |
| `token_id` | uuid nullable FK | Token used |
| `tool_name` | text | MCP tool |
| `input` | jsonb | Redacted/validated input |
| `result_status` | text | `ok`, `error`, `denied` |
| `error_message` | text nullable | Safe error summary |
| `request_id` | text nullable | Request correlation id |
| `created_at` | timestamp | Created timestamp |

### Optional Later Tables

For OAuth:

- `mcp_oauth_clients`
- `mcp_oauth_authorization_codes`
- `mcp_oauth_access_tokens`
- `mcp_oauth_refresh_tokens`
- `mcp_consents`

## Token Format

Use a token format that is identifiable but not guessable:

```text
sam_mcp_<public_prefix>_<secret>
```

Store:

- `public_prefix` for lookup/debugging
- `token_hash` for verification

Do not store the raw token after creation.

Recommended verification:

1. Parse token shape.
2. Lookup by public prefix or hash.
3. Compare hash with timing-safe equality.
4. Reject expired or revoked tokens.
5. Return `{ userId, tokenId, scopes }`.

## Scopes

Start with coarse but meaningful scopes:

| Scope | Allows |
| --- | --- |
| `sam:read` | Read accounts, categories, summaries, transactions |
| `sam:expenses.write` | Create/update expense transactions |
| `sam:categories.write` | Create/update categories and budget caps |
| `sam:income.write` | Add income sources and income transactions |
| `sam:recurring.write` | Manage recurring rules and retry occurrences |
| `sam:accounts.write` | Create/update accounts |
| `sam:accounts.transfer` | Transfer between accounts |
| `sam:goals.write` | Create/update goals |

Recommended initial scopes:

- `sam:read`
- `sam:expenses.write`
- `sam:categories.write`

Add high-impact write scopes only when the audit and confirmation model is solid.

## Domain Service Layer

Current Server Actions mix three responsibilities:

- read browser session
- validate input
- mutate/query domain data

MCP needs the domain behavior without browser session coupling. Extract reusable services that receive an explicit actor context.

Suggested context:

```ts
export type ActorContext = {
  userId: string;
  authMethod: "session" | "mcp_token" | "oauth";
  scopes: string[];
  tokenId?: string;
};
```

Suggested service layout:

```text
lib/domain/
├── accounts.ts
├── categories.ts
├── expenses.ts
├── goals.ts
├── income.ts
├── summaries.ts
└── types.ts
```

Server Actions and MCP tools should call the same domain services.

## Initial MCP Tools

### `sam_get_profile`

Scope: `sam:read`

Returns user profile, currency, preferences subset, and available capabilities.

### `sam_list_accounts`

Scope: `sam:read`

Returns the user's accounts with balances and display metadata.

### `sam_list_categories`

Scope: `sam:read`

Returns category ids, user-facing names, caps, and current month spend. Internal keys remain a storage concern and are not exposed through MCP.

### `sam_add_expense`

Scope: `sam:expenses.write`

Input:

```ts
{
  amount: number;
  name: string;
  category?: string;
  accountId?: string;
  occurredAt?: string;
  notes?: string;
}
```

Behavior:

- validates amount as positive money
- resolves account by id or default account priority
- resolves the user-facing category name to its internal key
- inserts `transactions` row with `kind = expense`
- updates account balance
- returns the transaction with category text and the affected account balance

If `category` is omitted, SAM applies the user's miscellaneous category internally.

### `sam_create_category`

Scope: `sam:categories.write`

Input:

```ts
{
  name: string;
  monthlyCap?: number;
  icon?: string;
  color?: string;
}
```

Behavior:

- validates display fields
- creates unique category key
- inserts user-scoped category
- returns category

### `sam_update_category_cap`

Scope: `sam:categories.write`

Input:

```ts
{
  categoryId: string;
  monthlyCap: number;
}
```

### `sam_get_spending_summary`

Scope: `sam:read`

Input:

```ts
{
  from?: string;
  to?: string;
  category?: string;
  groupBy?: "category" | "day" | "month";
}
```

Returns totals and grouped breakdowns. Category filters and grouped category buckets use user-facing names.

### `sam_add_income`

Scope: `sam:income.write`

Records one income transaction and credits its account. Recurring income uses `sam_create_recurring_rule`.

### `sam_transfer_between_accounts`

Scope: `sam:accounts.transfer`

Transfers simulated balance between two user-owned accounts.

This tool should be opt-in because it changes two balances.

## Tool Design Rules

- Every tool must validate input with Zod.
- Every user-scoped query must filter by `ctx.userId`.
- Tools should return structured JSON, not prose.
- MCP category inputs and outputs use display text only; internal keys never cross the MCP boundary.
- Tools should avoid leaking internal ids unless the user needs them for follow-up actions.
- Mutating tools should return the created/updated row and an audit-friendly summary.
- Errors should be safe and clear: `category_not_found`, `account_not_found`, `scope_denied`, `invalid_amount`.

## Natural Language Boundary

SAM should not try to implement a full natural-language parser inside the app. The LLM client translates user intent into MCP tool calls.

SAM is responsible for:

- tool descriptions
- JSON schemas
- validation
- authorization
- deterministic business logic
- durable storage
- audit logs

The assistant is responsible for:

- interpreting user language
- asking follow-up questions when needed
- choosing the correct tool
- explaining results to the user

## Confirmation Policy

MCP itself can expose write tools, but SAM should classify risk:

| Risk | Examples | Policy |
| --- | --- | --- |
| Low | read summaries, list categories | Execute immediately |
| Medium | add expense, create category | Execute with valid token and scope |
| High | transfer money between accounts, delete data, simulated trades | Require stronger scope and client-side confirmation |
| Critical | delete account, change credentials | Do not expose initially |

Do not expose `deleteAccountAction` or `setCredentialsAction` through MCP in the first implementation.

## Rate Limiting

Apply rate limits at the MCP endpoint.

Suggested starting limits:

- read tools: 60 requests/minute/token
- write tools: 20 requests/minute/token
- failed auth: aggressive IP and token-prefix throttling

Cloudflare can enforce coarse limits at the edge. Application code should still reject abusive token behavior.

## Observability

Log every tool call to `mcp_audit_logs` with:

- user id
- token id
- tool name
- result status
- safe input summary
- error code
- request id

Avoid storing sensitive raw notes or full financial payloads when a summarized audit entry is enough.

## Implementation Plan

### Phase 0: Documentation And Boundaries

- Keep this architecture doc current.
- Identify initial MCP tools and scopes.
- Decide whether MCP lives in the existing Worker or a separate Worker.

### Phase 1: Domain Extraction

- Extract expense, category, account, and summary domain functions from `lib/actions/data-actions.ts`.
- Make Server Actions call those functions with `authMethod = session`.
- Keep UI behavior unchanged.

### Phase 2: Token Infrastructure

- Add `mcp_tokens` and `mcp_audit_logs` to Drizzle schema.
- Add migrations.
- Add token create/revoke/list actions for logged-in users.
- Store only hashed tokens.

### Phase 3: MCP Endpoint

- Add `/api/mcp` route or a dedicated Worker.
- Validate bearer token.
- Register initial read/write tools.
- Add Zod schemas and scope checks.
- Write audit logs.

### Phase 4: Client Testing

- Test with a local MCP-compatible client.
- Validate success and denial flows.
- Verify user isolation with at least two demo users.
- Verify Cloudflare deployment and Worker logs.

### Phase 5: OAuth Upgrade

- Add OAuth authorization if external clients need first-class consent and token exchange.
- Keep personal tokens available for private/internal integrations.

## Suggested File Layout

```text
lib/
├── domain/
│   ├── accounts.ts
│   ├── categories.ts
│   ├── expenses.ts
│   ├── summaries.ts
│   └── types.ts
├── mcp/
│   ├── auth.ts
│   ├── audit.ts
│   ├── scopes.ts
│   ├── server.ts
│   └── tools/
│       ├── accounts.ts
│       ├── categories.ts
│       ├── expenses.ts
│       └── summaries.ts
app/
└── api/
    └── mcp/
        └── route.ts
```

## Open Decisions

- Whether to start with `/api/mcp` inside the existing Cloudflare Worker or a separate Worker.
- Whether initial user token management lives in Settings/Profile or a dedicated Integrations screen.
- Whether high-risk write tools require a second confirmation token or UI approval flow.
- Whether MCP token scopes should be stored as `jsonb` or a Postgres text array.

## Recommended First Build

Build a private beta MCP with:

- personal MCP tokens
- `mcp_tokens`
- `mcp_audit_logs`
- `sam_list_accounts`
- `sam_list_categories`
- `sam_get_spending_summary`
- `sam_add_expense`
- `sam_create_category`

This provides useful assistant workflows while keeping risk bounded.
