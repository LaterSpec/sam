-- Hotfix for the initial plan migration: the TABLE return field `metric`
-- shares a name with the conflict-target column. Make PL/pgSQL resolve an
-- ambiguous bare identifier as a table column.
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
