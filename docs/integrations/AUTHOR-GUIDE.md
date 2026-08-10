# Author guide

## Become an author

1. Read **[SAM for Developers](/developers)** (especially Author guide + Manifest)
2. Open **Settings → Integrations → Create integration** (or mobile Profile → Settings → Integrations → Create)
3. Set display name (shown on every listing)
4. Paste a valid manifest JSON and optional changelog
5. Submit → status `pending_review`

## Review checklist (reviewers)

- Manifest parses and scopes are minimal
- Auth URLs / pull URLs look legitimate (HTTPS)
- Description matches behavior
- `runtime: worker` rejected unless author `verifiedAt` is set (Phase 2)
- No request for `sam:accounts.transfer` unless justified

Reviewers are Better Auth user ids listed in `INTEGRATION_REVIEWER_IDS`. If unset, non-production allows any signed-in user to review (dev only).

## After publish

Users see the listing with **your display name**. New versions require another review round.

## First-party example

`sam-webhook-echo` is bootstrapped from the Integrations UI (“Ensure webhook echo”). It accepts POSTed expenses on the install webhook URL.
