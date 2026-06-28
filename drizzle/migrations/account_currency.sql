-- Add per-account currency (USD / PEN). No FX conversion is performed; each
-- account and its transactions are always shown in this currency.
-- Run via `npm run db:push` (schema is the source of truth) or apply directly.

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';
