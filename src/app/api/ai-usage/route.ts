import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAuth } from '@/lib/auth-middleware';

// POST /api/ai-usage - Log an AI usage event
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { functionType, modelName, inputTokens, outputTokens, totalTokens, latencyMs, status, errorMessage } = body;

    if (!functionType) {
      return NextResponse.json({ error: 'functionType is required' }, { status: 400 });
    }

    const validFunctions = [
      'insight', 'ai-table', 'ai-field', 'ai-formula',
      'nl2dashboard', 'data-story', 'metric-ai', 'industry-detect',
      'analysis-planner', 'chat', 'image-gen', 'speech'
    ];
    if (!validFunctions.includes(functionType)) {
      return NextResponse.json({ error: 'Invalid functionType' }, { status: 400 });
    }

    // Check user quota
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, quota: null });
    }
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('ai_calls_used, ai_calls_limit, plan_key')
      .eq('user_id', authResult.user!.id)
      .single();

    if (subscription) {
      const limit = subscription.ai_calls_limit;
      if (limit !== -1 && subscription.ai_calls_used >= limit) {
        return NextResponse.json({
          error: 'AI call quota exceeded',
          quota: { used: subscription.ai_calls_used, limit, plan: subscription.plan_key }
        }, { status: 429 });
      }
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    // Insert usage log
    const { error: insertError } = await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: authResult.user!.id,
        function_type: functionType,
        model_name: modelName || null,
        input_tokens: inputTokens || 0,
        output_tokens: outputTokens || 0,
        total_tokens: totalTokens || 0,
        latency_ms: latencyMs || null,
        status: status || 'success',
        error_message: errorMessage || null,
        ip_address: ip,
      });

    if (insertError) {
      console.error('AI usage log insert error:', insertError);
    }

    // Increment user quota usage
    if (subscription) {
      await supabase
        .from('user_subscriptions')
        .update({ ai_calls_used: subscription.ai_calls_used + 1 })
        .eq('user_id', authResult.user!.id);
    }

    return NextResponse.json({
      success: true,
      quota: subscription ? {
        used: subscription.ai_calls_used + 1,
        limit: subscription.ai_calls_limit,
        plan: subscription.plan_key,
        remaining: subscription.ai_calls_limit === -1 ? -1 : subscription.ai_calls_limit - subscription.ai_calls_used - 1
      } : null
    });
  } catch (error) {
    console.error('AI usage log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/ai-usage - Get current user's AI usage quota
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, quota: { plan: 'free', aiCallsUsed: 0, aiCallsLimit: 50, remaining: 50 }, byFunction: {}, totalCalls: 0 });
    }
    const { data: subscription } = await supabase
      .from('user_subscriptions')
      .select('plan_key, ai_calls_used, ai_calls_limit, storage_used_mb, storage_limit_mb, period_start, period_end')
      .eq('user_id', authResult.user!.id)
      .single();

    // Get usage by function type for current period
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentUsage } = await supabase
      .from('ai_usage_logs')
      .select('function_type, total_tokens, status, created_at')
      .eq('user_id', authResult.user!.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Aggregate by function type
    const byFunction: Record<string, { count: number; totalTokens: number; errors: number }> = {};
    (recentUsage || []).forEach((log: { function_type: string; total_tokens: number; status: string }) => {
      if (!byFunction[log.function_type]) {
        byFunction[log.function_type] = { count: 0, totalTokens: 0, errors: 0 };
      }
      byFunction[log.function_type].count++;
      byFunction[log.function_type].totalTokens += log.total_tokens || 0;
      if (log.status === 'error') byFunction[log.function_type].errors++;
    });

    return NextResponse.json({
      success: true,
      quota: subscription ? {
        plan: subscription.plan_key,
        aiCallsUsed: subscription.ai_calls_used,
        aiCallsLimit: subscription.ai_calls_limit,
        storageUsedMb: subscription.storage_used_mb,
        storageLimitMb: subscription.storage_limit_mb,
        periodStart: subscription.period_start,
        periodEnd: subscription.period_end,
        remaining: subscription.ai_calls_limit === -1 ? -1 : Math.max(0, subscription.ai_calls_limit - subscription.ai_calls_used)
      } : { plan: 'free', aiCallsUsed: 0, aiCallsLimit: 50, remaining: 50 },
      byFunction,
      totalCalls: (recentUsage || []).length
    });
  } catch (error) {
    console.error('AI usage get error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
