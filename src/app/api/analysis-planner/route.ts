import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';

export interface FieldStatSummary {
  field: string;
  type: string;
  totalRows: number;
  nullCount: number;
  nullRate: number;
  uniqueCount: number;
  uniqueRate: number;
  min?: number;
  max?: number;
  mean?: number;
  std?: number;
  topValues?: Array<{ value: string; count: number }>;
}

export interface AnalysisPlanRequest {
  fieldStats: FieldStatSummary[];
  userIntent?: string; // 用户原始问题，如"销售额为什么下降"
}

export interface AnalysisPlanResponse {
  success: boolean;
  plan: {
    goal: string; // 分析目标，如"分析销售额下滑原因"
    businessContext: string; // 业务背景，如"电商月度销售数据"
    relevantFields: string[]; // 关键分析字段
    recommendedDimensions: Array<{
      field: string;
      reason: string;
    }>;
    keyMetrics: Array<{
      name: string;
      calculation: string;
      businessMeaning: string;
    }>;
    analysisSequence: Array<{
      module: string;
      priority: 'high' | 'medium' | 'low';
      expectedOutcome: string;
    }>;
    skipFields: string[]; // 跳过不分析的字段及原因
    warnings?: string[]; // 数据层面的警告
  };
  error?: string;
}

const ANALYSIS_MODULES = [
  'distribution',      // 分布分析
  'correlation',      // 相关性分析
  'trend',           // 趋势分析
  'outlier',         // 异常检测
  'grouping',        // 分组对比
  'attribution',     // 归因分析
  'quality',         // 质量报告
];



export async function POST(req: NextRequest) {
  try {
    const body: AnalysisPlanRequest = await req.json();

    if (!body.fieldStats || !Array.isArray(body.fieldStats)) {
      return NextResponse.json(
        { success: false, error: '缺少 fieldStats 参数' },
        { status: 400 }
      );
    }

    // 构建轻量级数据概要（避免 token 爆炸）
    const compactStats = body.fieldStats.map(f => ({
      field: f.field,
      type: f.type,
      nullRate: `${f.nullRate.toFixed(1)}%`,
      uniqueRate: `${f.uniqueRate.toFixed(1)}%`,
      mean: f.mean !== undefined ? Number(f.mean.toFixed(2)) : undefined,
      range: f.min !== undefined && f.max !== undefined
        ? `${f.min} ~ ${f.max}`
        : undefined,
      topValue: f.topValues?.[0]?.value,
    }));

    const userIntentContext = body.userIntent
      ? `\n用户意图: "${body.userIntent}"`
      : '\n用户意图: 未指定，请根据数据特征推断通用分析目标';

    const prompt = `你是数据分析规划专家。根据给定的表格字段统计信息，制定精准的分析计划。

【数据概要】
${JSON.stringify(compactStats, null, 2)}
${userIntentContext}

【可选分析模块】
${ANALYSIS_MODULES.map(m => `- ${m}`).join('\n')}

请输出以下JSON格式的分析计划（严格JSON，无Markdown包裹）：
{
  "goal": "一句话描述分析目标，如'分析X指标的变化原因'",
  "businessContext": "推断的业务场景，如'电商销售数据'",
  "relevantFields": ["需要重点分析的关键字段列表"],
  "recommendedDimensions": [
    {"field": "字段名", "reason": "为什么选这个维度"}
  ],
  "keyMetrics": [
    {"name": "指标名", "calculation": "如何计算", "businessMeaning": "这个指标的的业务意义"}
  ],
  "analysisSequence": [
    {"module": "模块名", "priority": "high/medium/low", "expectedOutcome": "预期产出"}
  ],
  "skipFields": [
    {"field": "字段名", "reason": "为什么要跳过"}
  ],
  "warnings": ["数据层面的警告，如某字段缺失率过高等"]
}

注意：
1. 只选择与目标最相关的2-4个模块组成分析序列，不需要全部跑完
2. relevantFields 应该包含数值字段 + 关键的分组维度
3. skipFields 应包含ID字段、高缺失率字段、常量字段
4. analysisSequence 的优先级要客观，重要结论用 high

请直接输出JSON，不要包含任何其他文字：`.trim();

    // 获取模型配置
    const apiKey = req.headers.get('x-api-key');
    const baseUrl = req.headers.get('x-base-url');
    const modelName = req.headers.get('x-model-name');

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '缺少 API Key 配置，请在设置中配置 AI 模型' },
        { status: 401 }
      );
    }

    const result = await callLLM(
      {
        apiKey,
        baseUrl: baseUrl || '',
        model: modelName || 'gpt-4o',
      },
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, max_tokens: 2048 }
    );

    // 解析 JSON 响应
    let plan: AnalysisPlanResponse['plan'];
    try {
      // 尝试提取 JSON（处理可能的 markdown 包裹）
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || result.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : result;
      plan = JSON.parse(jsonStr);
    } catch {
      // JSON 解析失败，返回降级计划
      plan = generateFallbackPlan(body.fieldStats);
    }

    // 验证必需字段
    if (!plan.goal || !plan.relevantFields || !plan.analysisSequence) {
      plan = generateFallbackPlan(body.fieldStats);
    }

    return NextResponse.json({
      success: true,
      plan,
    });
  } catch (error) {
    console.error('[analysis-planner] Error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * 降级计划：当模型调用失败时，使用规则生成分析计划
 */
function generateFallbackPlan(fieldStats: FieldStatSummary[]): AnalysisPlanResponse['plan'] {
  const numericFields = fieldStats.filter(f => f.type === 'number');
  const stringFields = fieldStats.filter(f => f.type === 'string');
  const topGroupField = stringFields.find(f => f.uniqueRate > 10 && f.uniqueRate < 80);
  const topMetricField = numericFields[0];

  return {
    goal: '对数据进行全面深度分析',
    businessContext: '通用表格数据',
    relevantFields: numericFields.slice(0, 3).map(f => f.field),
    recommendedDimensions: topGroupField
      ? [{ field: topGroupField.field, reason: '适合作为分组维度' }]
      : [],
    keyMetrics: topMetricField
      ? [{
          name: topMetricField.field,
          calculation: `总和: ${topMetricField.mean !== undefined ? (topMetricField.mean * fieldStats[0]?.totalRows).toFixed(0) : 'N/A'}`,
          businessMeaning: '核心指标',
        }]
      : [],
    analysisSequence: [
      { module: 'distribution', priority: 'high', expectedOutcome: '了解数据分布特征' },
      { module: 'correlation', priority: 'medium', expectedOutcome: '发现字段间关联关系' },
      { module: 'outlier', priority: 'medium', expectedOutcome: '识别异常数据点' },
    ],
    skipFields: fieldStats
      .filter(f => f.uniqueRate > 90 || f.nullRate > 50)
      .map(f => f.field),
    warnings: fieldStats
      .filter(f => f.nullRate > 20)
      .map(f => `"${f.field}" 缺失率达 ${f.nullRate.toFixed(1)}%，可能影响分析准确性`),
  };
}
