# Plan operations runbook

SAM currently has no checkout, payment link or wallet integration. Users who
want Pro or Agent contact `manuel@devnyro.com`; an authorized operator then
changes their plan directly in Neon with the audited CLI below.

## Before rollout

1. Back up the database and record the cutover time.
2. Review `drizzle/migrations/plans_and_entitlements.sql`.
3. Apply it once in staging, then run onboarding, expiry, Samy and MCP smoke
   tests. The migration changes legacy display-only Pro profiles to Free and
   grants each a new seven-day trial.
4. Deploy code only after the migration is present; the new runtime reads the
   new profile columns and metering tables.
5. Repeat backup, migration, deploy and smoke checks in production.

The migration is not automatically applied by the application build.

## Activate Pro or Agent

Use an ISO-8601 timestamp with offset. First validate and roll back:

```bash
npm run plan:set -- \
  --email user@example.com \
  --plan pro \
  --expires-at 2026-10-18T23:59:59-05:00 \
  --operator manuel@devnyro.com \
  --reason "manual payment confirmed" \
  --dry-run
```

Run the same command without `--dry-run` only after checking the printed user
id, old plan and intended expiry. Use `--plan agent` for Agent.

## Return to Free

```bash
npm run plan:set -- \
  --email user@example.com \
  --plan free \
  --operator manuel@devnyro.com \
  --reason "manual subscription ended" \
  --dry-run
```

Repeat without `--dry-run` after review. Downgrade never deletes ledger data,
tokens, integrations or recurring rules.

## Verification

- Sign in as the user and open Settings/Profile. Confirm label, access mode,
  expiry and usage are server-derived.
- For paid plans, create only up to the advertised resources and verify the
  next mutation fails with a plan error.
- For expiry tests, use a short future expiry in staging and confirm access
  becomes Free without a cron job.
- Check `plan_change_events` for operator, reason, source and expiry.

Never update only `profiles.plan`: paid access also requires start/expiry,
versioning and an audit event. Never edit `plan_usage_buckets` to sell or
extend access.
