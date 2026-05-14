import { trackAiUsage, estimateTokens } from '@/lib/ai-usage-tracker';
/**
 * AI字段执行API
 * 支持批量处理表格数据的AI字段
 */

import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { buildAIFieldPrompt, type AIField, type AIFieldExecuteContext } from '@/lib/ai-field-engine';
import type { CellValue } from '@/types';
import { verifyAuth } from '@/lib/auth-middleware';
import { checkQuota } from '@/lib/quota-check';

export async function POST(req: NextRequest) {
  const callStart = Date.now();
  const auth = await verifyAuth(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user?.permissions?.ai_analyze) return NextResponse.json({ error: '无AI分析权限' }, { status: 403 });

  // Quota check
  const planKey = auth.user?.subscription?.planKey || 'free';
  const quota = checkQuota(auth.user.id, planKey, 'ai_field');
  if (!quota.allowed) {
    return NextResponse.json({ error: quota.message || 'AI字段配额已用完' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { action, field, context, modelConfig } = body;

    if (action !== 'execute') {
      return NextResponse.json(
        { success: false, error: '不支持的操作类型' },
        { status: 400 }
      );
    }

    if (!modelConfig || !modelConfig.apiKey || !modelConfig.baseUrl || !modelConfig.model) {
      return NextResponse.json(
        { success: false, error: '模型配置不完整，请先配置AI模型' },
        { status: 400 }
      );
    }

    const aiField = field as AIField;
    const ctx = context as AIFieldExecuteContext;

    if (!aiField || !ctx || !ctx.rows || ctx.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: '字段配置或数据上下文缺失' },
        { status: 400 }
      );
    }

    // 批量处理每一行
    const results: Array<{ rowIndex: number; value: CellValue; confidence?: number }> = [];
    const errors: Array<{ rowIndex: number; error: string }> = [];

    // 最多并行处理5行，避免并发过大
    const BATCH_SIZE = 5;
    const rowIndices = ctx.rowIndices || Array.from({ length: ctx.rows.length }, (_, i) => i);

    for (let i = 0; i < rowIndices.length; i += BATCH_SIZE) {
      const batch = rowIndices.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (rowIndex) => {
        try {
          const prompt = buildAIFieldPrompt(aiField, ctx, rowIndex);

          const content = await callLLM(
            {
              apiKey: modelConfig.apiKey,
              baseUrl: modelConfig.baseUrl,
              model: modelConfig.model,
            },
            [
              {
                role: 'system',
                content: `你是一个数据处理助手。用户要求你对表格数据执行"${aiField.name}"操作。请严格按照要求处理，只返回处理结果，不要添加解释、说明或markdown格式。`,
              },
              { role: 'user', content: prompt },
            ],
            {
              temperature: 0.3, // 低温度，结果更稳定
              max_tokens: 500,
              timeout: 30000, // 单行30秒超时
              maxRetries: 1,
            }
          );

          // 清理结果：去除markdown标记、引号等
          const cleaned = content
            .replace(/^```[\s\S]*?```$/gm, '') // 去除代码块
            .replace(/^[\"']|[\"']$/g, '')   // 去除首尾引号
            .trim();

          return {
            rowIndex,
            value: cleaned as CellValue,
            confidence: 0.9,
          };
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : '处理失败';
          return {
            rowIndex,
            error: errorMsg,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);

      for (const result of batchResults) {
        if ('error' in result) {
          errors.push(result as { rowIndex: number; error: string });
          // 出错时保留原值或标记为处理失败
          const originalValue = ctx.rows[result.rowIndex]?.[aiField.sourceColumns[0]];
          // 对于分类任务，如果原值是数字，标记为"未分类"
          const value: CellValue = typeof originalValue === 'number' && aiField.type === 'classify' 
            ? '待分类' as CellValue 
            : (originalValue ?? null) as CellValue;
          results.push({
            rowIndex: result.rowIndex,
            value,
          });
        } else {
          results.push(result as { rowIndex: number; value: CellValue; confidence?: number });
        }
      }
    }

    // 异步记录AI使用
    trackAiUsage({
      userId: auth.userId,
      functionType: 'ai-field',
      modelName: modelConfig?.model,
      inputTokens: estimateTokens(JSON.stringify(context?.rows?.slice(0, 5) || '')),
      outputTokens: estimateTokens(JSON.stringify(results)),
      status: 'success',
      latencyMs: Date.now() - callStart,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        total: rowIndices.length,
        success: results.length - errors.length,
        failed: errors.length,
      },
    });
  } catch (error: unknown) {
    console.error('[AI Field API Error]', error);
    const message = error instanceof Error ? error.message : 'AI字段执行失败';
    // 异步记录AI调用失败
    trackAiUsage({
      userId: auth.userId,
      functionType: 'ai-field',
      status: 'error',
      errorMessage: message.slice(0, 500),
      latencyMs: Date.now() - callStart,
    }).catch(() => {});
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
