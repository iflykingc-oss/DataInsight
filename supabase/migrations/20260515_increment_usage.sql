-- Creates the usage_stats table and increment_usage RPC function
-- Called by /api/quota/increment to track per-user monthly feature usage

CREATE TABLE IF NOT EXISTS usage_stats (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end   TIMESTAMPTZ NOT NULL,
  ai_call      INTEGER NOT NULL DEFAULT 0,
  export       INTEGER NOT NULL DEFAULT 0,
  dashboard    INTEGER NOT NULL DEFAULT 0,
  "table"      INTEGER NOT NULL DEFAULT 0,
  ai_field     INTEGER NOT NULL DEFAULT 0,
  ai_formula   INTEGER NOT NULL DEFAULT 0,
  data_story   INTEGER NOT NULL DEFAULT 0,
  nl2dashboard INTEGER NOT NULL DEFAULT 0,
  custom_metric INTEGER NOT NULL DEFAULT 0,
  data_cleaning INTEGER NOT NULL DEFAULT 0,
  sql_lab      INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS usage_stats_user_period ON usage_stats (user_id, period_start);

-- Increments a single feature counter for the current billing period.
-- Uses INSERT ... ON CONFLICT to upsert atomically.
CREATE OR REPLACE FUNCTION increment_usage(
  p_user_id     INTEGER,
  p_feature     TEXT,
  p_period_start TIMESTAMPTZ,
  p_period_end   TIMESTAMPTZ
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validate feature name to prevent SQL injection via dynamic column reference
  IF p_feature NOT IN (
    'ai_call','export','dashboard','table','ai_field','ai_formula',
    'data_story','nl2dashboard','custom_metric','data_cleaning','sql_lab'
  ) THEN
    RAISE EXCEPTION 'Unknown feature: %', p_feature;
  END IF;

  INSERT INTO usage_stats (user_id, period_start, period_end)
  VALUES (p_user_id, p_period_start, p_period_end)
  ON CONFLICT (user_id, period_start) DO NOTHING;

  EXECUTE format(
    'UPDATE usage_stats SET %I = %I + 1, updated_at = NOW()
     WHERE user_id = $1 AND period_start = $2',
    p_feature, p_feature
  ) USING p_user_id, p_period_start;
END;
$$;
