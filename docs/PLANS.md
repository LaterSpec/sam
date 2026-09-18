# SAM plans

This is the product and enforcement contract for Free, Pro, Agent and the
seven-day Pro trial. The runtime source of truth is `lib/plans/catalog.ts`;
this document explains its behavior. There is no payment provider yet.

Paid access is activated manually in Neon after the user contacts
`manuel@devnyro.com`. SAM must never ask for a card or wallet until a billing
provider is deliberately integrated.

## Prices and limits

| | **Free · $0** | **Pro · $5/month** | **Agent · $10/month** |
| --- | --- | --- | --- |
| Samy AI | 0/month after trial | 150/month | 500/month |
| Transactions | 100/month | 500/month | Unlimited (fair use) |
| Accounts | 2 | 8 | Unlimited |
| Currencies | 1 (USD or PEN) | 2 | 2 |
| Recurring / PWA / all themes | No | Yes | Yes |
| MCP scopes | Read only | Read + write | Read + write + transfer |
| MCP tokens | 1 | 3 | Unlimited |
| MCP tool calls | 100/month | 5,000/month | 25,000/month |
| Integrations | 0 | 3 | Unlimited |
| Internal transfer | No | No | Yes |

Calendar-month quotas use the user's `metering_timezone`. Historical data is
never deleted when a plan expires or is downgraded.

## Seven-day trial

Every newly bootstrapped profile receives one trial. The cutover migration
also grants the trial once to existing profiles whose old `plan = 'pro'` value
was only a UI placeholder.

- Duration: exactly seven days from `trial_started_at` to `trial_ends_at`.
- Effective capabilities: Pro, except internal transfers.
- Samy: 50 messages total, hard maximum 10/day and 20/minute.
- MCP: one token, Pro read/write scopes, 100 tool calls total.
- Trial expiry is evaluated on every server-side capability check; no cron is
  required to downgrade the user.
- The trial is not extended or restarted by a later paid-plan change.

## Resolution precedence

`resolveEntitlements()` is the only plan resolver:

1. A non-Free assigned plan is active only between `plan_started_at` and
   `plan_expires_at`.
2. Otherwise an unexpired trial is active.
3. Otherwise access is Free.

The client receives a `PlanSnapshot` from the server. It does not infer plans,
use mock values, or treat missing values as Pro. The Settings/Profile panel
shows effective plan, access mode, end time, limits and current usage.

## Downgrade behavior

Data is preserved. Excess resources become read-only/inactive:

- On Free, the user chooses one currency and up to two accounts to keep
  editable. Other accounts and all their history remain visible.
- The oldest allowed active MCP tokens and integration installs remain usable;
  excess rows are locked but not revoked or deleted.
- Existing recurring rules can be paused or archived, but cannot resume or
  execute without Trial/Pro/Agent.
- Existing themes are preserved, but selecting another theme requires
  Trial/Pro/Agent.
- The PWA install prompt is shown only when the server reports PWA access.

## MCP scopes

| Scope | Free | Trial/Pro | Agent |
| --- | --- | --- | --- |
| `sam:read` | Yes | Yes | Yes |
| expense/category/income/recurring/savings/goal/account/profile writes | No | Yes | Yes |
| `sam:accounts.transfer` | No | No | Yes |

Requested token scopes are intersected with current plan scopes at
authentication. `tools/call` consumes both a per-token burst bucket (60 read
or 20 write calls/minute) and a user plan bucket atomically. Setup and
keep-alive methods (`initialize`, `ping`, `tools/list`, notifications) do not
consume tool-call quota.

## Metering and concurrency

`plan_usage_buckets` stores Samy and MCP counters. The
`reserve_plan_usage(jsonb)` Postgres function takes stable advisory locks,
validates all supplied buckets, and increments them in one transaction. This
prevents concurrent requests from exceeding a counter.

Transactions, accounts, tokens, integrations and selected Free resources are
calculated from their owning rows. Domain guards run before mutation. Plan
errors carry a stable code (`plan_required`, `trial_expired`,
`quota_exceeded`, `rate_limited`, `resource_limit_reached`, or
`resource_locked`) and optional limit/reset metadata.

## Manual activation

See [PLAN-OPERATIONS.md](./PLAN-OPERATIONS.md). The supported command is
`npm run plan:set -- ...`; it requires an explicit expiry, operator and reason,
locks exactly one profile, increments `entitlement_version`, and writes an
append-only `plan_change_events` record. Always run `--dry-run` first.

## Implementation map

| Concern | Location |
| --- | --- |
| Catalog | `lib/plans/catalog.ts` |
| Resolution / UI snapshot | `lib/plans/resolve.ts` |
| Domain feature guards | `lib/plans/guard.ts` |
| Atomic Samy/MCP metering | `lib/plans/usage.ts` |
| Schema and migration | `lib/db/schema.ts`, `drizzle/migrations/plans_and_entitlements.sql` |
| Manual operations | `scripts/plans/set-plan.ts` |
| UI | `components/plans/plan-overview.tsx` |

Related: [Business & AI Model](./BUSINESS-PLAN-SAMY-AI.md),
[Neon compute](./NEON-COMPUTE.md), [MCP](./MCP.md).
