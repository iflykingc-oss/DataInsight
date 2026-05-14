import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/admin/ai-usage - Admin dashboard for AI usage analytics
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error || authResult.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d'; // 1d, 7d, 30d, 90d
    const functionType = searchParams.get('functionType');
    const modelName = searchParams.get('modelName');

    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ success: true, data: { logs: [], summary: { totalCalls: 0, totalTokens: 0, avgLatency: 0, errorRate: 0 }, byFunction: {}, byModel: {} } });

    // Calculate date range
    const now = new Date();
    const rangeDays: Record<string, number> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };
    const days = rangeDays[range] || 7;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Build query
    let query = supabase
      .from('ai_usage_logs')
      .select('id, user_id, function_type, model_name, input_tokens, output_tokens, total_tokens, latency_ms, status, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (functionType) query = query.eq('function_type', functionType);
    if (modelName) query = query.eq('model_name', modelName);

    const { data: logs, error } = await query.limit(5000);

    if (error) {
      console.error('Admin AI usage query error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    // Aggregate statistics
    const totalCalls = (logs || []).length;
    const successCalls = (logs || []).filter((l: { status: string }) => l.status === 'success').length;
    const errorCalls = (logs || []).filter((l: { status: string }) => l.status === 'error').length;
    const timeoutCalls = (logs || []).filter((l: { status: string }) => l.status === 'timeout').length;
    const totalInputTokens = (logs || []).reduce((s: number, l: { input_tokens: number }) => s + (l.input_tokens || 0), 0);
    const totalOutputTokens = (logs || []).reduce((s: number, l: { output_tokens: number }) => s + (l.output_tokens || 0), 0);
    const avgLatency = totalCalls > 0
      ? Math.round((logs || []).reduce((s: number, l: { latency_ms: number }) => s + (l.latency_ms || 0), 0) / totalCalls)
      : 0;

    // By function type
    const byFunction: Record<string, { count: number; tokens: number; errors: number; avgLatency: number }> = {};
    (logs || []).forEach((l: { function_type: string; total_tokens: number; status: string; latency_ms: number }) => {
      if (!byFunction[l.function_type]) byFunction[l.function_type] = { count: 0, tokens: 0, errors: 0, avgLatency: 0 };
      byFunction[l.function_type].count++;
      byFunction[l.function_type].tokens += l.total_tokens || 0;
      if (l.status === 'error') byFunction[l.function_type].errors++;
      byFunction[l.function_type].avgLatency += l.latency_ms || 0;
    });
    Object.keys(byFunction).forEach(k => {
      byFunction[k].avgLatency = byFunction[k].count > 0 ? Math.round(byFunction[k].avgLatency / byFunction[k].count) : 0;
    });

    // By model
    const byModel: Record<string, { count: number; tokens: number }> = {};
    (logs || []).forEach((l: { model_name: string; total_tokens: number }) => {
      const model = l.model_name || 'unknown';
      if (!byModel[model]) byModel[model] = { count: 0, tokens: 0 };
      byModel[model].count++;
      byModel[model].tokens += l.total_tokens || 0;
    });

    // By user (top 10)
    const byUser: Record<number, { count: number; tokens: number }> = {};
    (logs || []).forEach((l: { user_id: number; total_tokens: number }) => {
      if (!l.user_id) return;
      if (!byUser[l.user_id]) byUser[l.user_id] = { count: 0, tokens: 0 };
      byUser[l.user_id].count++;
      byUser[l.user_id].tokens += l.total_tokens || 0;
    });
    const topUsers = Object.entries(byUser)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 10)
      .map(([uid, stats]) => ({ userId: parseInt(uid), ...stats }));

    // Daily trend (last N days)
    const dailyTrend: Record<string, { calls: number; tokens: number; errors: number }> = {};
    (logs || []).forEach((l: { created_at: string; total_tokens: number; status: string }) => {
      const day = l.created_at?.substring(0, 10);
      if (!day) return;
      if (!dailyTrend[day]) dailyTrend[day] = { calls: 0, tokens: 0, errors: 0 };
      dailyTrend[day].calls++;
      dailyTrend[day].tokens += l.total_tokens || 0;
      if (l.status === 'error') dailyTrend[day].errors++;
    });

    // Estimated cost (rough estimate: $0.002/1K input tokens, $0.008/1K output tokens for GPT-4 class)
    const estimatedCostCents = Math.round(
      (totalInputTokens / 1000) * 0.2 + (totalOutputTokens / 1000) * 0.8
    );

    return NextResponse.json({
      success: true,
      summary: {
        totalCalls,
        successCalls,
        errorCalls,
        timeoutCalls,
        errorRate: totalCalls > 0 ? Math.round((errorCalls / totalCalls) * 100) : 0,
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        avgLatency,
        estimatedCostCents,
        period: range,
        days
      },
      byFunction,
      byModel,
      topUsers,
      dailyTrend
    });
  } catch (error) {
    console.error('Admin AI usage error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
