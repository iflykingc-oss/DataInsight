import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Decode user ID from JWT token (simplified - use your auth middleware)
    const token = authHeader.replace('Bearer ', '');
    const jwtPayload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const userId = jwtPayload.userId || jwtPayload.id;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 503 });
    }

    // Get user subscription
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get plan details
    const { data: plans } = await supabase
      .from('pricing_plans')
      .select('*')
      .eq('status', 'active')
      .order('sort_order');

    // Determine current plan
    const currentPlanKey = subscription?.status === 'active' ? subscription.plan_key : 'free';
    const currentPlan = plans?.find((p: any) => p.plan_key === currentPlanKey);
    const freePlan = plans?.find((p: any) => p.plan_key === 'free');

    // Get AI usage for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: usageData } = await supabase
      .from('usage_stats')
      .select('ai_calls_count')
      .eq('user_id', userId)
      .gte('period_start', monthStart)
      .maybeSingle();

    const aiCallsUsed = usageData?.ai_calls_count || 0;
    const aiCallLimit = currentPlan?.features?.aiCallLimit || freePlan?.features?.aiCallLimit || 20;

    return NextResponse.json({
      success: true,
      data: {
        subscription: subscription || null,
        currentPlan: currentPlan || freePlan,
        currentPlanKey,
        plans: plans || [],
        usage: {
          aiCallsUsed,
          aiCallLimit,
          aiCallsRemaining: Math.max(0, aiCallLimit - aiCallsUsed),
          percentage: Math.min(100, Math.round((aiCallsUsed / aiCallLimit) * 100)),
        },
      },
    });
  } catch (error: any) {
    console.error('Subscription API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get subscription' },
      { status: 500 }
    );
  }
}
