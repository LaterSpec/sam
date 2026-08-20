# Neon compute — what actually hits Postgres

Neon bills **compute time**, not “having rows”. Compute stays awake for the
project’s auto-suspend window after the **last query** (often ~5 minutes).
Any traffic denser than that window keeps the instance billed.

This note is an audit of SAM’s database traffic. Related: [DATABASE.md](./DATABASE.md),
[MCP architecture](./MCP-ARCHITECTURE.md), [plans](./PLANS.md).

## Short answer

**Creating an MCP token does not keep Neon awake.** A token is a hashed row in
`mcp_tokens`. SAM has no cron, heartbeat, or job that scans tokens.

Neon wakes only when something **calls the Worker** (browser, MCP client, or
API). The design is: store the key; touch Postgres only on a real client
request. That is true for an idle token. It is not true for an MCP **host**
that stays connected with that token.

| State | Hits Neon? |
| --- | --- |
| Token created, no MCP client open | **No.** Neon can auto-suspend. |
| MCP client open (Cursor, Claude Desktop, Hermes, OpenClaw) | **HTTP yes.** Keep-alives used to query Postgres on every ping; they are cached now. |
| Agent `tools/call` | **Yes, on purpose:** auth + domain query + audit insert. |

## MCP: token vs connected client

### Idle token

- Table: `mcp_tokens` (`lib/db/schema.ts`).
- Secret is never stored; only a salted hash (`MCP_TOKEN_PEPPER`).
- No Worker cron (`wrangler.jsonc` `triggers.crons` is empty).
- Recurring route is disconnected (`RECURRING_CRON_ENABLED=false`).
- Integration sync runs only on `POST /api/integrations/cron/sync` with
  `CRON_SECRET` — nothing in Wrangler fires it.

A token that exists and is never used generates **zero** queries.

### Connected MCP host

Cursor, Claude Desktop, Hermes, and OpenClaw send protocol traffic while the
server is enabled, even if the user is not asking a finance question:

- `initialize`
- `ping`
- `tools/list`
- `notifications/*`

Those are keep-alives, not tool calls. Before the keep-alive patch, each one
did a `SELECT` on `mcp_tokens` and often an `UPDATE` of `last_used_at`, which
prevented auto-suspend for as long as the host stayed open.

Current behavior (`app/api/mcp/route.ts`, `lib/mcp/auth.ts`,
`lib/mcp/rpc-method.ts`, `lib/mcp/auth-cache.ts`):

- Keep-alives **do not** write `last_used_at`.
- Auth result is cached ~15 minutes (Worker isolate memory + Cache API).
- Invalid/revoked tokens are cached negatively ~30 minutes so a retry loop
  cannot pin compute.
- `tools/call` still hits Postgres (auth is **not** cached on that path).

How to check: Neon query log. If the token exists and there is no `POST /api/mcp`
and no `/app` traffic, there should be no queries. If Cursor still has SAM in
MCP config and the IDE is open, you will see requests without a chat.

**Operational rule:** leave the token created. Disable or disconnect the MCP
server in the client when you are not using it.

## What still hits Neon on MCP

### Keep-alives (mitigated)

First keep-alive in a 15-minute window still authenticates against Postgres.
If the isolate is cold and the Cache API entry for
`https://sam-mcp-auth.internal/…` is missing, more keep-alives can leak
`SELECT`s. This is residual, not the old “every ping writes `last_used_at`”
behavior.

### `tools/call` (always)

`useCache` is only set for keep-alive methods. Every tool call:

1. `SELECT` `mcp_tokens` ⨝ `user` (auth cache skipped).
2. Domain query/mutation (`lib/domain/*`).
3. `INSERT` into `mcp_audit_logs` (`lib/mcp/audit.ts` via `defineTool`).

(1) is avoidable with the same 15-minute auth cache. (2) is required. (3) is
required for metering/audit; it is a **write**, so it wakes compute. Read
tools could later be sampled or batched; writes should stay logged.

### `last_used_at` on real tools

Touched at most every 15 minutes (`LAST_USED_TOUCH_MS`). Acceptable.

There is no honest “MCP connected 24/7 + Neon always off”. A real question
must read the ledger. The goal is to skip Postgres for ping/list, which the
keep-alive path already does.

## App traffic (per visit, not 24/7)

These do not pin compute in the background. They are expensive **per
navigation** and will dominate once transaction volume grows.

### `loadUserData` — largest app-side cost

`lib/db/queries/load-user-data.ts` runs on every `/app` and `/app/[section]`
render (`dynamic = "force-dynamic"`). Nine parallel queries, including:

- **all** transactions for the user (no date window)
- all recurring rules (including archived)
- last 100 recurring occurrences
- legacy `income_sources`

PWA caching for `/app` is `NetworkOnly` (`app/sw.ts`), so each visit refetches
the full ledger. Fine at ~100 rows; wasteful at Pro/Agent scale.

### `getSession()` (Better Auth)

Every authenticated page reads the `session` table. `/` and `/onboarding`
**skip** `getSession()` when no Better Auth cookie is present
(`hasSessionCookie`). `/app` must hit session. There is no Next middleware, so
anonymous crawls of `/` do not open Postgres.

### Legacy `income_sources`

Still loaded into app state although recurring rules are the live model.

## Confirmed non-hits (no background pin)

| Path | Why it does not pin Neon |
| --- | --- |
| Idle MCP token | No reader |
| Recurring cron | Disabled; route returns 410 |
| Integration sync cron | Not scheduled in Wrangler |
| PWA | No `periodicSync` / poll; onboarding `setInterval` is UI only |
| `/developers` | Static markdown, no DB |
| Desktop feature carousel | Client timer, no server |

## Cost model (why a chatty agent is expensive)

SAM uses Neon **HTTP** (`lib/db/index.ts`), not a held TCP pool. Each query is
a request. Neon stays up for the auto-suspend window after the last one.

Examples:

- Token idle, nobody using the app → compute sleeps.
- Cursor open, only keep-alives, cache warm → should not query; compute can sleep.
- Agent runs a tool every 3–4 minutes → compute **never** sleeps.
- User browses `/app` all evening → `getSession` + full `loadUserData` on each
  navigation; sleeps after the last page once the suspend window elapses.

Plans should meter **MCP tool calls** (already in `mcp_audit_logs`) and
**new transactions**, not “token exists”.

## Follow-ups (not done; listed for later)

1. Reuse the 15-minute auth cache on `tools/call` (ledger query still required).
2. Page `loadUserData` (date window / section-specific queries) instead of
   loading every transaction on every `/app` render.
3. Stop selecting `income_sources` on the hot path once the UI does not need it.
4. Confirm Cache API persistence for MCP auth keys in production Workers; the
   in-memory `Map` dies with the isolate.

Do not re-enable recurring cron on Free; when it ships it belongs on Pro/Agent
([PLANS.md](./PLANS.md)) because a scheduled Worker is a guaranteed wake.
