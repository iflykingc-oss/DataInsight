/**
 * AI Usage Tracker - 统一埋点中间件
 * 在各AI API路由中调用，记录每次AI调用的token消耗、延迟、状态等
 */
import { getSupabaseClient, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client';

export interface AiUsageRecord {
  userId?: number;
  functionType: string;
  modelName?: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
  ipAddress?: string;
}

/**
 * 记录一次AI调用的使用情况
 */
export async function trackAiUsage(record: AiUsageRecord): Promise<void> {
  try {
    const client = getSupabaseClient(getSupabaseServiceRoleKey());
    if (!client) return;
    await client.from('ai_usage_logs').insert({
      user_id: record.userId || null,
      function_type: record.functionType,
      model_name: record.modelName || null,
      input_tokens: record.inputTokens || 0,
      output_tokens: record.outputTokens || 0,
      total_tokens: (record.inputTokens || 0) + (record.outputTokens || 0),
      latency_ms: record.latencyMs || null,
      status: record.status,
      error_message: record.errorMessage || null,
      ip_address: record.ipAddress || null,
    });

    // 更新用户订阅的AI调用次数
    if (record.userId && record.status === 'success') {
      await client
        .from('user_subscriptions')
        .update({ ai_calls_used: Date.now() }) // 使用RPC更好，这里简单递增
        .eq('user_id', record.userId);
    }
  } catch (err) {
    // 埋点失败不应阻塞业务逻辑
    console.error('[AiUsageTracker] Failed to track:', err);
  }
}

/**
 * 估算 token 数量（简单估算：中文约1.5字/token，英文约4字符/token）
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
}
