import { trackAiUsage, estimateTokens } from '@/lib/ai-usage-tracker';
import { NextRequest, NextResponse } from 'next/server';
import { callLLM, validateModelConfig } from '@/lib/llm';
import { verifyAuth } from '@/lib/auth-middleware';
import type { LLMModelConfig } from '@/lib/llm';

export const runtime = 'nodejs';

const INDUSTRY_LIST = [
  { id: 'retail', name: '零售电商', keywords: '销售,商品,订单,客户,店铺,SKU,GMV,客单价,复购,库存' },
  { id: 'finance', name: '金融财务', keywords: '收入,支出,利润,资产,负债,预算,费用,凭证,现金流,毛利率' },
  { id: 'education', name: '教育培训', keywords: '成绩,学生,课程,班级,考试,分数,出勤,教师,学期,科目' },
  { id: 'healthcare', name: '医疗健康', keywords: '患者,门诊,住院,科室,医生,药品,诊断,治疗,床位,手术' },
  { id: 'manufacturing', name: '生产制造', keywords: '产量,良品,产线,设备,工艺,物料,库存,订单,交付,供应商' },
  { id: 'logistics', name: '物流运输', keywords: '运单,仓库,车辆,线路,时效,配送,签收,揽收,中转,分拣' },
];

export async function POST(request: NextRequest) {
  const callStart = Date.now();
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { data, modelConfig } = body as {
      data?: { headers: string[]; rows: Record<string, unknown>[] };
      modelConfig?: LLMModelConfig;
    };

    if (!data?.headers) {
      return NextResponse.json({ error: '缺少数据' }, { status: 400 });
    }

    // 模型配置验证
    if (modelConfig) {
      const validation = validateModelConfig(modelConfig);
      if (!validation.valid) {
        // 降级到关键词匹配
        return fallbackKeywordMatch(data.headers);
      }
    }

    const systemPrompt = `你是数据行业分类专家。根据数据的列名和样本数据，判断数据最可能属于哪个行业。
可选行业: ${INDUSTRY_LIST.map(i => `${i.id}(${i.name})`).join(', ')}

返回JSON格式: { "industries": ["行业id1", "行业id2"], "confidence": 0.9, "reasoning": "判断依据" }
最多返回3个行业，按可能性排序。`;

    const userPrompt = `数据列名: ${data.headers.join(', ')}
样本数据(前3行):
${(data.rows || []).slice(0, 3).map((row: Record<string, unknown>) =>
  data.headers.map((h: string) => `${h}:${row[h]}`).join(', ')
).join('\n')}

请判断数据所属行业。`;

    try {
      const result = await callLLM(
        modelConfig as LLMModelConfig,
        [
          { role: 'system' as const, content: systemPrompt },
          { role: 'user' as const, content: userPrompt },
        ],
      );

      // 解析 LLM 返回
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        // 异步记录AI使用
        trackAiUsage({
          userId: auth?.userId,
          functionType: 'industry-detect',
          modelName: modelConfig?.model,
          status: 'success',
          latencyMs: Date.now() - callStart,
        }).catch(() => {});
        return NextResponse.json({
          success: true,
          industries: parsed.industries || [],
          confidence: parsed.confidence || 0,
          reasoning: parsed.reasoning || '',
        });
      }
    } catch {
      // LLM 失败，降级到关键词匹配
    }

    return fallbackKeywordMatch(data.headers);
  } catch (error) {
    console.error('Industry detect error:', error);
    // 异步记录AI调用失败
    trackAiUsage({
      userId: auth?.userId,
      functionType: 'industry-detect',
      status: 'error',
      errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 500),
      latencyMs: Date.now() - callStart,
    }).catch(() => {});

    return NextResponse.json({ error: '行业识别失败' }, { status: 500 });
  }
}

function fallbackKeywordMatch(headers: string[]): NextResponse {
  const headerStr = headers.map((h: string) => h.toLowerCase()).join(' ');
  const scores: Array<{ id: string; score: number }> = INDUSTRY_LIST.map(ind => {
    let score = 0;
    for (const kw of ind.keywords.split(',')) {
      if (headerStr.includes(kw.trim())) score += 2;
    }
    return { id: ind.id, score };
  }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

  return NextResponse.json({
    success: true,
    industries: scores.map(s => s.id).slice(0, 3),
    confidence: 0.5,
    reasoning: '基于关键词匹配（AI模型不可用）',
  });
}
