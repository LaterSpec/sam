# Priority 0 — Reliable Money

This is the implementation and rollout plan for making every money value in
SAM traceable, atomic, period-correct, and currency-safe.

## Invariants

1. A confirmed transaction and its account balance mutation happen atomically.
2. Replaying a recurring occurrence never changes money twice.
3. An expense never spends beyond available balance. Cards honor their credit
   limit; cards without a configured limit may go negative.
4. Transfers are same-currency only, create a durable transfer record and two
   paired ledger movements, and preserve total balance.
5. USD and PEN are never added together without an explicit FX source.
6. Transaction currency is captured when the transaction is posted and does
   not change when account settings change.
7. Month/period boundaries use the user's IANA timezone and half-open ranges
   `[start, nextStart)`.
8. Only `confirmed` transactions affect balances, budgets and reports.
9. Deletion/reversal must remain auditable; posted history is not silently
   rewritten.
10. Goals and savings buckets are not money until backed by a real account.

## Phase A — Transaction safety (implemented in this delivery)

- Shared expense/income/account domain services for browser and MCP paths.
- Conditional atomic debits with cash/card limit rules.
- Expense kind guards so income cannot be edited/deleted as an expense.
- Immutable transaction currency and confirmed/source provenance.
- Same-currency atomic transfers with `account_transfers` and paired movements.
- Grouped currency totals for net worth, cashflow, spending and budgets.
- User timezone in preferences and month filtering.
- Recurring occurrences with unique `(rule_id, scheduled_date)`, atomic posting,
  failure without balance mutation, and manual retry.

Acceptance:

- Two concurrent debits cannot both spend the same available balance.
- Replaying cron produces one transaction for one scheduled date.
- A cross-currency transfer is rejected before either account changes.
- The sum of both transfer account deltas is zero.

## Phase B — Append-only financial ledger

Add `financial_events`:

- `account_id`, `currency`, signed `delta`
- event type (`opening`, `transaction`, `transfer`, `reversal`, `allocation`)
- stable reference (`transaction_id`, `transfer_id`, allocation id)
- actor/source, metadata, timestamp

Backfill:

1. One event for every existing confirmed transaction.
2. One opening event per account:
   `current balance - SUM(existing event deltas)`.
3. Verify `SUM(financial_events.delta) = accounts.balance` for every account.
4. Keep account balance as a checked cache; the ledger is the audit source.

Acceptance:

- Rebuilding every account from events yields the stored balance exactly.
- Every balance change has one durable source reference.

## Phase C — Reversals and imports

- Replace physical transaction deletion with `reversed_at` plus compensating
  events.
- Transfers are immutable and gain an explicit reversal operation.
- Add transaction states `pending`, `confirmed`, `ignored`, `duplicate`.
- Add `external_id`, `import_hash`, `import_batch_id`, `imported_at`.
- Deduplicate imports by user/source/hash before confirmation.

Acceptance:

- Reversal restores balance without deleting the original record.
- Reimporting the same row creates no second confirmed transaction.

## Phase D — Account-backed goals and buckets

Add `allocation_movements` and require `account_id` for configured goals and
buckets.

- Reservation does not change account balance or net worth.
- `available_balance = balance - active reservations`.
- Contributions/withdrawals append allocation movements.
- Legacy unbacked goal/bucket amounts are marked `needs_setup` and excluded
  from real-money totals until the user selects an account.

Acceptance:

- Reserving money leaves net worth unchanged.
- Expenses and outgoing transfers cannot consume reserved funds.
- Allocation movement history reconstructs each goal/bucket balance.

## Phase E — Reconciliation and operations

- Hourly automated reconciliation compares balances, ledger and transfer pairs.
- Daily report records mismatches without silently correcting them.
- Structured Cloudflare logs include operation id, user id hash, source and
  error code; never notes or secrets.
- Alerts cover failed recurring runs, reconciliation mismatches and migration
  failures.

## Migration rollout

1. Capture pre-migration counts and a logical backup.
2. Validate SQL inside a transaction with rollback.
3. Apply additive DDL/backfill while recurring cron is disabled.
4. Run `npm run db:verify`; all missing/duplicate checks must be zero.
5. Deploy code, execute one manual recurring run, and reconcile.
6. Enable hourly cron and inspect the first production run.
7. Keep legacy columns/tables for one compatibility window; remove them only
   after documented verification.

## Required tests

- Concurrent debit and transfer attempts.
- Card with limit, card without limit, cash insufficient balance.
- Recurring catch-up, pause/resume, end date, day 29/30/31 and leap year.
- Failed occurrence retry and cron replay.
- Cross-currency rejection and grouped reporting.
- Timezone month boundaries.
- Transfer reversal and transaction reversal.
- Ledger reconstruction and opening-balance backfill.
- Account-backed reservation and available balance.
- User isolation and MCP scope denial/audit.
