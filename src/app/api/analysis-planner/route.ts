import { trackAiUsage, estimateTokens } from '@/lib/ai-usage-tracker';
import { NextRequest, NextResponse } from 'next/server';
import { callLLM } from '@/lib/llm';
import { IndustryTemplateManager, BasicConstraint } from '@/lib/analysis/industry-templates';
import { verifyAuth } from '@/lib/auth-middleware';

const templateManager = new IndustryTemplateManager();
const basicConstraint = new BasicConstraint();

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
  const callStart = Date.now();
  const auth = await verifyAuth(req);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user?.permissions?.ai_analyze) return NextResponse.json({ error: '无AI分析权限' }, { status: 403 });

  try {
    const body: AnalysisPlanRequest = await req.json();

    if (!body.fieldStats || !Array.isArray(body.fieldStats)) {
      return NextResponse.json(
        { success: false, error: '缺少 fieldStats 参数' },
        { status: 400 }
      );
    }

    // ===== 行业模板识别 =====
    const fieldNames = body.fieldStats.map(f => f.field);
    const industryTemplate = templateManager.detectTemplate(fieldNames);

    // ===== 基础约束校验 =====
    const validRate = 1 - (body.fieldStats.reduce((sum, f) => sum + f.nullRate, 0) / body.fieldStats.length / 100);
    const constraintResult = basicConstraint.validate(
      body.fieldStats[0]?.totalRows || 0,
      validRate,
      industryTemplate,
      fieldNames,
    );

    // ===== 过滤黑名单字段 =====
    const filteredStats = basicConstraint.filterFields(body.fieldStats, industryTemplate);

    // 构建轻量级数据概要（避免 token 爆炸）
    const compactStats = (filteredStats as FieldStatSummary[]).map(f => {
      const nullRate = f.totalRows > 0 ? (f.nullCount / f.totalRows * 100) : 0;
      const uniqueRate = f.totalRows > 0 ? (f.uniqueCount / f.totalRows * 100) : 0;
      return {
        field: f.field,
        type: f.type,
        nullRate: `${nullRate.toFixed(1)}%`,
        uniqueRate: `${uniqueRate.toFixed(1)}%`,
        mean: f.mean !== undefined ? Number(f.mean.toFixed(2)) : undefined,
        range: f.min !== undefined && f.max !== undefined
          ? `${f.min} ~ ${f.max}`
          : undefined,
        topValue: f.topValues?.[0]?.value,
      };
    });

    const userIntentContext = body.userIntent
      ? `\n用户意图: "${body.userIntent}"`
      : '\n用户意图: 未指定，请根据数据特征推断通用分析目标';

    // ===== 使用行业模板渲染 Prompt =====
    const industryPrompt = templateManager.renderPrompt(industryTemplate, {
      rowCount: body.fieldStats[0]?.totalRows || 0,
      timeRange: undefined,
      dataQuality: JSON.stringify({ validRate: (validRate * 100).toFixed(1) + '%' }),
    });

    const prompt = `${industryPrompt}

【数据概要】
${JSON.stringify(compactStats, null, 2)}
${userIntentContext}

【行业场景】${industryTemplate.name}（模板: ${industryTemplate.key}）
【允许的时间粒度】${industryTemplate.baseConfig.allowedTimeGranularities.join('、')}
【禁止的算法模块】${industryTemplate.forbiddenRules.modules.join('、') || '无'}
【行业关注点】${industryTemplate.focusBusinessPoints.join('；')}
【字段映射】${Object.entries(industryTemplate.fieldMapping).map(([k, v]) => `${k}→${v}`).join('、') || '无'}

【可选分析模块】
${ANALYSIS_MODULES.filter(m => !industryTemplate.forbiddenRules.modules.includes(m)).map(m => `- ${m}`).join('\n')}

请输出以下JSON格式的分析计划（严格JSON，无Markdown包裹）：
{
  "goal": "一句话描述分析目标",
  "businessContext": "推断的业务场景（使用行业术语）",
  "relevantFields": ["需要重点分析的关键字段列表（使用映射后的字段名）"],
  "recommendedDimensions": [
    {"field": "维度字段名", "reason": "为什么选这个维度"}
  ],
  "keyMetrics": [
    {"name": "指标名", "calculation": "如何计算", "businessMeaning": "业务意义"}
  ],
  "analysisSequence": [
    {"module": "模块名", "priority": "high/medium/low", "expectedOutcome": "预期产出"}
  ],
  "skipFields": ["跳过的字段（ID/高缺失/常量等）"],
  "warnings": ["数据层面的警告"]
}

注意：
1. 只选择与目标最相关的2-4个模块，不需要全部跑完
2. 禁止选择行业禁用的模块：${industryTemplate.forbiddenRules.modules.join('、') || '无'}
3. 时间粒度只能在${industryTemplate.baseConfig.allowedTimeGranularities.join('/')}中选择
4. relevantFields 应包含数值字段 + 关键分组维度
5. skipFields 应包含ID字段、黑名单字段、高缺失率字段、常量字段
6. 所有数值必须精确，禁止模糊表达

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
      plan = generateFallbackPlan(filteredStats, industryTemplate.key);
    }

    // 验证必需字段
    if (!plan.goal || !plan.relevantFields || !plan.analysisSequence) {
      plan = generateFallbackPlan(filteredStats, industryTemplate.key);
    }

    // ===== LLM 边界校验 =====
    // 过滤掉行业禁止的模块
    if (industryTemplate.forbiddenRules.modules.length > 0) {
      plan.analysisSequence = plan.analysisSequence.filter(
        item => !industryTemplate.forbiddenRules.modules.includes(item.module)
      );
    }

    // 追加行业信息到响应
    const responsePlan = {
      ...plan,
      industryTemplate: industryTemplate.key,
      industryName: industryTemplate.name,
    };

    // 异步记录AI使用
    trackAiUsage({
      userId: auth?.userId,
      functionType: 'analysis-planner',
      status: 'success',
      latencyMs: Date.now() - callStart,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      plan: responsePlan,
      constraintWarnings: constraintResult.warnings,
      industry: {
        key: industryTemplate.key,
        name: industryTemplate.name,
        fieldMapping: industryTemplate.fieldMapping,
        focusBusinessPoints: industryTemplate.focusBusinessPoints,
        forbiddenRules: industryTemplate.forbiddenRules,
      },
    });
  } catch (error) {
    console.error('[analysis-planner] Error:', error);
    // 异步记录AI调用失败
    trackAiUsage({
      userId: auth?.userId,
      functionType: 'analysis-planner',
      status: 'error',
      errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 500),
      latencyMs: Date.now() - callStart,
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * 降级计划：当模型调用失败时，使用规则+行业模板生成分析计划
 */
function generateFallbackPlan(fieldStats: FieldStatSummary[], industryKey: string = 'general_v1'): AnalysisPlanResponse['plan'] {
  const numericFields = fieldStats.filter(f => f.type === 'number');
  const stringFields = fieldStats.filter(f => f.type === 'string');
  const topGroupField = stringFields.find(f => f.uniqueRate > 10 && f.uniqueRate < 80);
  const topMetricField = numericFields[0];

  // 根据行业模板决定默认分析模块
  const defaultModules = industryKey === 'hr_v1'
    ? [
        { module: 'distribution', priority: 'high' as const, expectedOutcome: '了解人员分布特征' },
        { module: 'outlier', priority: 'medium' as const, expectedOutcome: '识别异常薪资/离职数据' },
      ]
    : industryKey === 'finance_v1'
    ? [
        { module: 'distribution', priority: 'high' as const, expectedOutcome: '了解收支分布' },
        { module: 'trend', priority: 'high' as const, expectedOutcome: '识别营收/成本趋势' },
        { module: 'outlier', priority: 'medium' as const, expectedOutcome: '识别异常财务数据' },
      ]
    : [
        { module: 'distribution', priority: 'high' as const, expectedOutcome: '了解数据分布特征' },
        { module: 'correlation', priority: 'medium' as const, expectedOutcome: '发现字段间关联关系' },
        { module: 'outlier', priority: 'medium' as const, expectedOutcome: '识别异常数据点' },
      ];

  return {
    goal: '对数据进行全面深度分析',
    businessContext: industryKey !== 'general_v1' ? `${industryKey}场景数据` : '通用表格数据',
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
    analysisSequence: defaultModules,
    skipFields: fieldStats
      .filter(f => f.uniqueRate > 90 || f.nullRate > 50)
      .map(f => f.field),
    warnings: fieldStats
      .filter(f => f.nullRate > 20)
      .map(f => `"${f.field}" 缺失率达 ${f.nullRate.toFixed(1)}%，可能影响分析准确性`),
  };
}
