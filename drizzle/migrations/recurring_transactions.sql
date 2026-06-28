-- Recurring transactions: rules, idempotent occurrences, and transaction provenance.
-- This migration is additive. Legacy income_sources stays available for one
-- compatibility window while recurring sources are copied as paused rules.

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

ALTER TABLE profiles
  ALTER COLUMN prefs SET DEFAULT
  '{"theme":"ayu-mirage","language":"es","defaultCurrency":"USD","timezone":"America/Lima"}'::jsonb;

CREATE TABLE IF NOT EXISTS account_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  from_account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed')),
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT account_transfers_distinct_accounts CHECK (from_account_id <> to_account_id)
);
CREATE INDEX IF NOT EXISTS account_transfers_user_created_idx
  ON account_transfers (user_id, created_at);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES categories(id) ON DELETE RESTRICT,
  kind text NOT NULL CHECK (kind IN ('expense', 'income')),
  name text NOT NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount > 0),
  frequency_unit text NOT NULL CHECK (frequency_unit IN ('day', 'week', 'month', 'year')),
  frequency_interval integer NOT NULL DEFAULT 1 CHECK (frequency_interval BETWEEN 1 AND 365),
  start_date date NOT NULL,
  next_occurrence_date date NOT NULL,
  end_date date,
  timezone text NOT NULL DEFAULT 'America/Lima',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  needs_review boolean NOT NULL DEFAULT false,
  legacy_income_source_id uuid,
  last_processed_at timestamptz,
  last_error text,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT recurring_rules_category_kind_check
    CHECK (
      (kind = 'expense' AND category_id IS NOT NULL)
      OR (kind = 'income' AND category_id IS NULL)
    ),
  CONSTRAINT recurring_rules_end_date_check
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS recurring_rules_user_status_idx
  ON recurring_rules (user_id, status);
CREATE INDEX IF NOT EXISTS recurring_rules_due_idx
  ON recurring_rules (status, next_occurrence_date);
CREATE UNIQUE INDEX IF NOT EXISTS recurring_rules_legacy_income_source_idx
  ON recurring_rules (legacy_income_source_id)
  WHERE legacy_income_source_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS recurring_occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES recurring_rules(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'posted', 'failed', 'skipped')),
  transaction_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  error_code text,
  error_message text,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  posted_at timestamptz,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS recurring_occurrences_rule_date_idx
  ON recurring_occurrences (rule_id, scheduled_date);
CREATE INDEX IF NOT EXISTS recurring_occurrences_user_status_idx
  ON recurring_occurrences (user_id, status);
CREATE INDEX IF NOT EXISTS recurring_occurrences_scheduled_idx
  ON recurring_occurrences (scheduled_date);

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS recurring_occurrence_id uuid,
  ADD COLUMN IF NOT EXISTS transfer_id uuid,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

UPDATE transactions transaction_row
SET currency = account_row.currency
FROM accounts account_row
WHERE transaction_row.account_id = account_row.id
  AND transaction_row.currency IS DISTINCT FROM account_row.currency;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_recurring_occurrence_fk'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_recurring_occurrence_fk
      FOREIGN KEY (recurring_occurrence_id)
      REFERENCES recurring_occurrences(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_transfer_fk'
  ) THEN
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_transfer_fk
      FOREIGN KEY (transfer_id)
      REFERENCES account_transfers(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS transactions_transfer_idx
  ON transactions (transfer_id)
  WHERE transfer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_recurring_occurrence_idx
  ON transactions (recurring_occurrence_id)
  WHERE recurring_occurrence_id IS NOT NULL;

-- Existing recurring income sources do not identify an account, so choose the
-- user's first account and require review before activation. Sources without an
-- account remain in income_sources and are intentionally not guessed.
INSERT INTO recurring_rules (
  user_id,
  account_id,
  kind,
  name,
  amount,
  frequency_unit,
  frequency_interval,
  start_date,
  next_occurrence_date,
  timezone,
  status,
  needs_review,
  legacy_income_source_id
)
SELECT
  source.user_id,
  selected_account.id,
  'income',
  source.name,
  source.amount,
  CASE lower(source.freq)
    WHEN 'daily' THEN 'day'
    WHEN 'weekly' THEN 'week'
    WHEN 'yearly' THEN 'year'
    ELSE 'month'
  END,
  CASE WHEN lower(source.freq) = 'quarterly' THEN 3 ELSE 1 END,
  CASE
    WHEN source.next_date ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$'
      AND to_char(to_date(source.next_date, 'YYYY-MM-DD'), 'YYYY-MM-DD') = source.next_date
      THEN to_date(source.next_date, 'YYYY-MM-DD')
    ELSE CURRENT_DATE
  END,
  CASE
    WHEN source.next_date ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$'
      AND to_char(to_date(source.next_date, 'YYYY-MM-DD'), 'YYYY-MM-DD') = source.next_date
      THEN to_date(source.next_date, 'YYYY-MM-DD')
    ELSE CURRENT_DATE
  END,
  'America/Lima',
  'paused',
  true,
  source.id
FROM income_sources source
JOIN LATERAL (
  SELECT account_row.id
  FROM accounts account_row
  WHERE account_row.user_id = source.user_id
  ORDER BY account_row.sort, account_row.created_at, account_row.id
  LIMIT 1
) selected_account ON true
WHERE lower(source.freq) IN (
  'daily', 'weekly', 'monthly', 'yearly',
  'day', 'week', 'month', 'year', 'quarterly'
)
ON CONFLICT (legacy_income_source_id)
  WHERE legacy_income_source_id IS NOT NULL
  DO NOTHING;
