# Phase 2 — Workers for Platforms

Not enabled in production yet. Stub: `lib/integrations/runtime/dispatch.ts`.

## Goal

Allow verified authors to ship a Cloudflare Worker that SAM dispatches per install, talking only to a signed **Integration API** (domain subset), never raw SQL.

## Prerequisites

- Cloudflare **Workers for Platforms** / dispatch namespace
- Author row with `verified_at` set
- Manifest `runtime: "worker"` + `workerEntry`
- Review policy: verified authors only

## Integration API (design)

Install-scoped HTTP endpoints under `/api/integrations/runtime/{installId}/...` with HMAC or short-lived JWT bound to install id + scopes. Map 1:1 to existing MCP/domain operations (`addExpense`, `listAccounts`, …).

## Current behavior

Submitting or installing `runtime: "worker"` fails closed until dispatch is implemented.
