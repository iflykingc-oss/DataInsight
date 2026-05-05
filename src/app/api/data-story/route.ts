import { NextRequest, NextResponse } from 'next/server';
import { callLLMStreamWithFallback, validateModelConfig } from '@/lib/llm';
import { verifyAuth } from '@/lib/auth-middleware';
import type { LLMModelConfig } from '@/lib/llm';

export const runtime = 'nodejs';

/**
 * 数据故事生成 API
 * 参考 Adobe CJA Data Storytelling 模式：
 * - 标题幻灯片：主题+叙述概要
 * - 执行摘要：关键洞察排序
 * - 详细幻灯片：趋势/异常/相关性
 * - 分区分隔：逻辑划分
 * - 行动呼吁：决策建议
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.user?.permissions?.ai_analyze) {
    return NextResponse.json({ error: '无AI分析权限' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { data, fieldStats, modelConfig, storyOptions } = body as {
      data?: { headers: string[]; rows: Record<string, unknown>[] };
      fieldStats?: Array<{ field: string; type: string; stats?: Record<string, number> }>;
      modelConfig?: LLMModelConfig;
      storyOptions?: { emphasis?: string; maxSlides?: number; audience?: string };
    };

    if (!data?.headers || !data?.rows) {
      return NextResponse.json({ error: '缺少数据' }, { status: 400 });
    }

    // 生成统计摘要
    const statSummary = fieldStats?.slice(0, 15).map((f) => {
      if (f.type === 'number' && f.stats) {
        return `${f.field}: 均值=${f.stats.mean?.toFixed(2)}, 中位数=${f.stats.median?.toFixed(2)}, 标准差=${f.stats.std?.toFixed(2)}, 范围=[${f.stats.min}~${f.stats.max}]`;
      }
      return `${f.field} (${f.type})`;
    }).join('\n') || '';

    const emphasis = storyOptions?.emphasis || 'auto';
    const maxSlides = storyOptions?.maxSlides || 8;
    const audience = storyOptions?.audience || 'general';

    const systemPrompt = `你是一位专业的数据故事讲述者(Data Storyteller)。你的任务是将数据分析结果转化为引人入胜的叙事故事。

参考框架（每部分对应一页幻灯片）：
1. **标题幻灯片**：核心主题 + 一句话摘要
2. **执行摘要**：3-5个最关键洞察，按影响力排序
3. **趋势分析**：数据中的趋势变化、周期性、季节性
4. **异常发现**：偏离预期的数据点、异常值
5. **关联洞察**：维度/指标间的关联关系
6. **归因分析**：关键变化的驱动因素
7. **行动建议**：基于数据的具体决策建议

严格要求：
- 每页幻灯片用 ===SPLIT=== 分隔
- 每页格式：## 标题\n正文内容（含关键数据点）
- 用数据说话，每个结论必须有具体数字支撑
- 强调组件: ${emphasis === 'auto' ? '自动识别最重要的字段' : emphasis}
- 目标受众: ${audience === 'general' ? '一般业务人员' : audience === 'executive' ? '高管（简洁、结论导向）' : '数据分析师（详细、方法论导向）'}
- 最多${maxSlides}页幻灯片
- 使用Markdown格式`;

    const sampleRows = data.rows.slice(0, 5);
    const userPrompt = `请基于以下数据生成数据故事：

数据集: ${data.rows.length}行 × ${data.headers.length}列
字段: ${data.headers.join(', ')}

统计摘要:
${statSummary}

数据样本(前5行):
${sampleRows.map((row) => 
  data.headers.map((h) => `${h}:${row[h]}`).join(', ')
).join('\n')}

请生成一个完整的数据故事，包含标题、执行摘要、趋势、异常、关联和行动建议。`;

    // 模型配置验证
    const validation = validateModelConfig(modelConfig);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    // 流式生成
    const stream = await callLLMStreamWithFallback(modelConfig as LLMModelConfig, messages);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Data story generation error:', error);
    return NextResponse.json(
      { error: '数据故事生成失败' },
      { status: 500 }
    );
  }
}
