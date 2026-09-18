-- Plans, trial lifecycle and atomic usage metering.
-- Existing `profiles.plan = 'pro'` values are display-only placeholders. This
-- migration deliberately moves existing profiles to Free and grants a fresh
-- seven-day Pro trial, as agreed for the production cutover.

ALTER TABLE profiles
  ALTER COLUMN plan SET DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS entitlement_version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS metering_timezone text NOT NULL DEFAULT 'America/Lima';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_plan_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free', 'pro', 'agent'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS plan_change_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  from_plan text NOT NULL,
  to_plan text NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  operator text NOT NULL,
  reason text NOT NULL,
  source text NOT NULL DEFAULT 'manual_db',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plan_change_events_user_created_idx
  ON plan_change_events (user_id, created_at);

CREATE TABLE IF NOT EXISTS plan_usage_buckets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL,
  subject_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  metric text NOT NULL,
  window_key text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  used integer NOT NULL DEFAULT 0 CHECK (used >= 0),
  limit_snapshot integer NOT NULL CHECK (limit_snapshot > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS plan_usage_subject_metric_window_idx
  ON plan_usage_buckets (subject_type, subject_id, metric, window_key);
CREATE INDEX IF NOT EXISTS plan_usage_user_window_idx
  ON plan_usage_buckets (user_id, window_start);

CREATE TABLE IF NOT EXISTS plan_resource_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  entitlement_version integer NOT NULL,
  active_currency text NOT NULL CHECK (active_currency IN ('USD', 'PEN')),
  active_account_ids uuid[] NOT NULL DEFAULT '{}',
  finalized_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS plan_resource_selection_user_version_idx
  ON plan_resource_selections (user_id, entitlement_version);

CREATE OR REPLACE FUNCTION reserve_plan_usage(specs jsonb)
RETURNS TABLE(metric text, used integer, limit_snapshot integer, window_end timestamptz)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
DECLARE
  item jsonb;
  current_used integer;
  requested integer;
  requested_limit integer;
  lock_key text;
BEGIN
  IF jsonb_array_length(specs) = 0 THEN
    RETURN;
  END IF;

  -- Lock every subject in stable order. MCP reservations include both a token
  -- burst bucket and a user-wide monthly/trial bucket.
  FOR lock_key IN
    SELECT DISTINCT (value->>'subjectType') || ':' || (value->>'subjectId')
    FROM jsonb_array_elements(specs)
    ORDER BY 1
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(lock_key, 0));
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(specs)
  LOOP
    requested := COALESCE((item->>'amount')::integer, 1);
    requested_limit := (item->>'limit')::integer;
    SELECT b.used INTO current_used
      FROM plan_usage_buckets b
      WHERE b.subject_type = item->>'subjectType'
        AND b.subject_id = item->>'subjectId'
        AND b.metric = item->>'metric'
        AND b.window_key = item->>'windowKey'
      FOR UPDATE;
    IF COALESCE(current_used, 0) + requested > requested_limit THEN
      RAISE EXCEPTION 'plan_quota_exceeded:%', item->>'metric' USING ERRCODE = 'P0001';
    END IF;
  END LOOP;

  FOR item IN SELECT value FROM jsonb_array_elements(specs)
  LOOP
    requested := COALESCE((item->>'amount')::integer, 1);
    INSERT INTO plan_usage_buckets (
      subject_type, subject_id, user_id, metric, window_key,
      window_start, window_end, used, limit_snapshot, updated_at
    ) VALUES (
      item->>'subjectType', item->>'subjectId', item->>'userId', item->>'metric', item->>'windowKey',
      (item->>'windowStart')::timestamptz, (item->>'windowEnd')::timestamptz,
      requested, (item->>'limit')::integer, now()
    )
    ON CONFLICT (subject_type, subject_id, metric, window_key)
    DO UPDATE SET
      used = plan_usage_buckets.used + EXCLUDED.used,
      limit_snapshot = EXCLUDED.limit_snapshot,
      window_end = EXCLUDED.window_end,
      updated_at = now();
  END LOOP;

  RETURN QUERY
    SELECT b.metric, b.used, b.limit_snapshot, b.window_end
    FROM plan_usage_buckets b
    CROSS JOIN LATERAL jsonb_array_elements(specs) AS item(value)
    WHERE b.subject_type = item.value->>'subjectType'
      AND b.subject_id = item.value->>'subjectId'
      AND b.metric = item.value->>'metric'
      AND b.window_key = item.value->>'windowKey';
END;
$$;

WITH candidates AS (
  SELECT id, plan AS from_plan
  FROM profiles
  WHERE trial_started_at IS NULL
  FOR UPDATE
), migrated AS (
  UPDATE profiles p
  SET
    plan = 'free',
    trial_started_at = now(),
    trial_ends_at = now() + interval '7 days',
    plan_started_at = NULL,
    plan_expires_at = NULL,
    plan_updated_at = now(),
    entitlement_version = entitlement_version + 1,
    metering_timezone = COALESCE(NULLIF(prefs->>'timezone', ''), 'America/Lima')
  FROM candidates c
  WHERE p.id = c.id
  RETURNING p.id, c.from_plan
)
INSERT INTO plan_change_events (
  user_id, from_plan, to_plan, effective_at, expires_at, operator, reason, source
)
SELECT id, from_plan, 'free', now(), NULL, 'migration',
       'replace display-only Pro default and grant seven-day trial', 'migration'
FROM migrated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_paid_expiry_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_paid_expiry_check CHECK (
        plan = 'free'
        OR (plan_started_at IS NOT NULL AND plan_expires_at IS NOT NULL AND plan_expires_at > plan_started_at)
      );
  END IF;
END $$;
