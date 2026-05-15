import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

const PLAN_LIMITS: Record<string, Record<string, number>> = {
  free: { ai_call: 20, export: 10, dashboard: 1, table: 3, ai_field: 0, ai_formula: 0, data_story: 0, nl2dashboard: 0, custom_metric: 0, data_cleaning: 0, sql_lab: 0 },
  pro: { ai_call: 500, export: 100, dashboard: 10, table: 50, ai_field: 200, ai_formula: 100, data_story: 10, nl2dashboard: 10, custom_metric: 20, data_cleaning: 50, sql_lab: 1 },
  business: { ai_call: -1, export: -1, dashboard: -1, table: -1, ai_field: -1, ai_formula: -1, data_story: -1, nl2dashboard: -1, custom_metric: -1, data_cleaning: -1, sql_lab: -1 },
};

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let feature: string;
  try {
    const body = await request.json();
    feature = body.feature;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!feature) {
    return NextResponse.json({ error: 'Missing feature' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const userId = auth.user.id;

  // Get active subscription
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('plan_key, status, current_period_end')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const planKey =
    subscription?.status === 'active' &&
    subscription?.current_period_end &&
    new Date(subscription.current_period_end) > new Date()
      ? subscription.plan_key
      : 'free';

  const planLimits = PLAN_LIMITS[planKey] ?? PLAN_LIMITS.free;
  const limit = planLimits[feature] ?? 0;

  if (limit < 0) {
    return NextResponse.json({ allowed: true, unlimited: true, planKey });
  }

  if (limit === 0) {
    return NextResponse.json({
      allowed: false,
      unlimited: false,
      planKey,
      message: 'This feature is not available on your current plan. Please upgrade.',
    });
  }

  // Get current month usage
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data: usage } = await supabase
    .from('usage_stats')
    .select(feature)
    .eq('user_id', userId)
    .gte('period_start', monthStart)
    .maybeSingle();

  const used = (usage as any)?.[feature] ?? 0;

  if (used >= limit) {
    return NextResponse.json({
      allowed: false,
      unlimited: false,
      used,
      limit,
      planKey,
      message: 'Monthly quota reached. Please upgrade or wait until next month.',
    });
  }

  return NextResponse.json({ allowed: true, unlimited: false, used, limit, planKey });
}
