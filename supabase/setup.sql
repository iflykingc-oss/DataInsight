-- DataInsight — Full Supabase Setup
-- Run in Supabase SQL Editor. Safe to re-run.

-- ============================================================
-- usage_stats (quota tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS usage_stats (
  id            BIGSERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL,
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  ai_call       INTEGER NOT NULL DEFAULT 0,
  export        INTEGER NOT NULL DEFAULT 0,
  dashboard     INTEGER NOT NULL DEFAULT 0,
  "table"       INTEGER NOT NULL DEFAULT 0,
  ai_field      INTEGER NOT NULL DEFAULT 0,
  ai_formula    INTEGER NOT NULL DEFAULT 0,
  data_story    INTEGER NOT NULL DEFAULT 0,
  nl2dashboard  INTEGER NOT NULL DEFAULT 0,
  custom_metric INTEGER NOT NULL DEFAULT 0,
  data_cleaning INTEGER NOT NULL DEFAULT 0,
  sql_lab       INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, period_start)
);

CREATE INDEX IF NOT EXISTS usage_stats_user_period ON usage_stats (user_id, period_start);

-- ============================================================
-- user_subscriptions
-- ============================================================
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id                    SERIAL PRIMARY KEY,
  user_id               INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_key              VARCHAR(50) DEFAULT 'free',
  ai_calls_used         INTEGER DEFAULT 0,
  ai_calls_limit        INTEGER DEFAULT 20,
  storage_used_mb       INTEGER DEFAULT 0,
  storage_limit_mb      INTEGER DEFAULT 5,
  billing_cycle         VARCHAR(20) DEFAULT 'monthly',
  payment_provider      VARCHAR(50),
  payment_reference_id  VARCHAR(255),
  period_start          TIMESTAMPTZ,
  period_end            TIMESTAMPTZ,
  status                VARCHAR(20) DEFAULT 'active',
  created_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at            TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- pricing_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS pricing_plans (
  id                       SERIAL PRIMARY KEY,
  plan_key                 VARCHAR(50) NOT NULL,
  name                     VARCHAR(100) NOT NULL,
  name_en                  VARCHAR(100),
  description              TEXT,
  description_en           TEXT,
  price_monthly            INTEGER DEFAULT 0,
  price_yearly             INTEGER DEFAULT 0,
  currency                 VARCHAR(10) DEFAULT 'USD',
  features                 JSONB DEFAULT '{}',
  highlight_features       JSONB DEFAULT '[]',
  is_popular               BOOLEAN DEFAULT false,
  sort_order               INTEGER DEFAULT 0,
  status                   VARCHAR(20) DEFAULT 'active',
  promotion_type           VARCHAR(30),
  promotion_label          VARCHAR(100),
  promotion_label_en       VARCHAR(100),
  promotion_price_monthly  INTEGER,
  promotion_price_yearly   INTEGER,
  promotion_start_at       TIMESTAMPTZ,
  promotion_end_at         TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at               TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pricing_plans_plan_key_unique UNIQUE (plan_key)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "svc_usage_stats" ON usage_stats;
DROP POLICY IF EXISTS "svc_user_subscriptions" ON user_subscriptions;
DROP POLICY IF EXISTS "svc_pricing_plans" ON pricing_plans;
DROP POLICY IF EXISTS "anon_read_pricing" ON pricing_plans;

CREATE POLICY "svc_usage_stats" ON usage_stats FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "svc_user_subscriptions" ON user_subscriptions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "svc_pricing_plans" ON pricing_plans FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_pricing" ON pricing_plans FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- increment_usage RPC
-- ============================================================
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

-- ============================================================
-- Default pricing plans
-- ============================================================
INSERT INTO pricing_plans (plan_key, name, name_en, description, description_en, price_monthly, price_yearly, currency, features, highlight_features, is_popular, sort_order)
VALUES
  ('free', '免费版', 'Free', '个人探索，永久免费', 'Personal exploration, forever free',
   0, 0, 'USD',
   '{"maxRows":10000,"maxTables":3,"aiCallLimit":20,"chartTypes":"basic","exportFormats":false,"sqlLab":false,"nl2dashboard":false,"aiField":false,"aiFormula":false,"customMetrics":false,"industryTemplates":false,"dataCleaning":false,"dataStory":false}',
   '[]', false, 1),
  ('pro', '专业版', 'Pro', '个人/小团队专业分析', 'Professional analytics for individuals & small teams',
   2900, 24900, 'USD',
   '{"maxRows":500000,"maxTables":20,"aiCallLimit":500,"chartTypes":"all","exportFormats":true,"sqlLab":true,"nl2dashboard":true,"aiField":true,"aiFormula":true,"customMetrics":false,"industryTemplates":true,"dataCleaning":true,"dataStory":true}',
   '["sql_lab","ai_field","echarts_10","data_story","unlimited_tables"]', true, 2),
  ('business', '商业版', 'Business', '企业级深度分析与协作', 'Enterprise-grade analytics & collaboration',
   9900, 84900, 'USD',
   '{"maxRows":999999999,"maxTables":999,"aiCallLimit":999999,"chartTypes":"all","exportFormats":true,"sqlLab":true,"nl2dashboard":true,"aiField":true,"aiFormula":true,"customMetrics":true,"industryTemplates":true,"dataCleaning":true,"dataStory":true}',
   '["unlimited_ai","nl2dashboard","metric_semantic","deep_analysis","priority_support"]', false, 3)
ON CONFLICT (plan_key) DO NOTHING;
