import { trackAiUsage, estimateTokens } from '@/lib/ai-usage-tracker';
import { NextRequest, NextResponse } from "next/server";
import { callLLM, validateModelConfig, type LLMModelConfig } from "@/lib/llm";
import { verifyAuth } from "@/lib/auth-middleware";

// 业务场景识别关键词
const BUSINESS_SCENARIOS = [
  { id: "retail", label: "零售/销售", keywords: ["销售", "零售", "门店", "商品", "SKU", "库存", "采购", "营收", "毛利率", "客单价", "连带率", "复购"] },
  { id: "ecommerce", label: "电商", keywords: ["电商", "平台", "GMV", "订单", "转化率", "流量", "UV", "PV", "加购", "收藏", "退款"] },
  { id: "user_operation", label: "用户运营", keywords: ["用户", "会员", "DAU", "MAU", "新增", "留存", "流失", "活跃", "唤醒", "召回", "ARPU", "LTV"] },
  { id: "finance", label: "财务/成本", keywords: ["成本", "费用", "利润", "预算", "支出", "收入", "回款", "负债", "资产", "现金流", "ROI"] },
  { id: "hr", label: "人力/组织", keywords: ["员工", "招聘", "离职", "绩效", "考勤", "培训", "薪酬", "编制", "人效", "人均"] },
  { id: "marketing", label: "市场营销", keywords: ["营销", "推广", "广告", "投放", "ROI", "CPA", "CPC", "CPM", "曝光", "点击", "活动"] },
  { id: "supply_chain", label: "供应链/库存", keywords: ["库存", "周转", "补货", "采购", "物流", "配送", "仓储", "SKU", "出库", "入库"] },
  { id: "education", label: "教育/培训", keywords: ["学员", "课程", "续班", "出勤", "课时", "师资", "排课", "报名", "转化"] },
];

// 检测业务场景
function detectBusinessScenario(userDescription: string, headers: string[]): string[] {
  const combined = (userDescription + " " + headers.join(" ")).toLowerCase();
  const detected: string[] = [];

  for (const scenario of BUSINESS_SCENARIOS) {
    const matched = scenario.keywords.filter(kw => combined.includes(kw.toLowerCase()));
    if (matched.length >= 2) {
      detected.push(scenario.label);
    }
  }

  return detected.length > 0 ? detected : ["通用业务"];
}

// 生成指标的系统提示词
function buildSystemPrompt(businessScenario: string[], fieldInfo: string) {
  return `你是一位资深数据分析师，专注于为业务场景设计精准、可落地的数据指标体系。

## 你的角色
- 深度理解业务需求，从数据中提取最有价值的指标
- 严格区分"原始指标"和"复合指标"
- 每个指标都要有明确的业务含义和计算逻辑

## 业务场景识别
用户当前场景：${businessScenario.join("、")}
请结合该场景，生成最相关的指标体系。

## 数据字段信息
${fieldInfo}

## 【关键】数据精确性规范

❌ 禁止的模糊表达：
- "根据业务需求设计" → ✅ 具体场景："电商场景需关注转化率漏斗"
- "包含多个维度" → ✅ 具体维度："包含用户维度（DAU/MAU）、订单维度（GMV/客单价）、商品维度（SKU动销率）"
- "提升运营效率" → ✅ 具体动作："优化详情页加载速度，目标将跳出率从65%降至50%"

✅ 正确的指标解读：
- businessMeaning：用业务语言，如"客单价=每单平均消费金额，反映用户购买力"
- dataQuality：说明数据来源和覆盖率，如"数据覆盖率98%，缺失值集中在新上线渠道"
- usageSuggestion：明确使用场景，如"周同比监控、周环比波动超过10%需预警"

## 输出要求（严格遵循JSON格式）

\`\`\`json
{
  "scenario": "识别的业务场景（如：线下门店销售分析）",
  "metrics": [
    {
      "name": "指标中文名",
      "expression": "计算表达式（如：SUM(销售额)/COUNT(DISTINCT 订单号)）",
      "category": "kpi|process|composite|comparison",
      "description": "业务含义（1-2句话，用业务语言而非技术语言）",
      "businessValue": "这个指标解决什么业务问题",
      "businessMeaning": "用业务语言解释（如：客单价反映用户的购买力水平）",
      "dataQuality": {
        "level": "high|medium|low",
        "reason": "数据质量说明（如：覆盖率98%，新门店数据从8月开始）"
      },
      "usageSuggestion": "使用建议（如：周同比监控，环比波动超10%需关注）",
      "alertThreshold": "预警阈值（如：客单价<100元触发预警）"
    }
  ],
  "summary": {
    "overview": "整体设计思路（1句话：场景+核心关注点）",
    "keyMetrics": ["核心指标1（含计算逻辑）", "核心指标2"],
    "dataGaps": ["数据缺口1（如：缺少用户ID，无法计算复购率）", "数据缺口2"],
    "recommendations": ["建议1（如：建议补充用户ID字段以支持RFM分析）", "建议2"]
  }
}
\`\`\`

## 严格返回纯JSON，不要有任何额外文本`;
}

export async function POST(request: NextRequest) {
  const callStart = Date.now();
  const auth = await verifyAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user?.permissions?.ai_analyze) return NextResponse.json({ error: '无AI分析权限' }, { status: 403 });

  try {
    const { headers, rows, userDescription, fieldStats, modelConfig } = await request.json() as {
      headers: string[];
      rows: Record<string, unknown>[];
      userDescription?: string;
      fieldStats?: Array<Record<string, unknown>>;
      modelConfig?: LLMModelConfig;
    };

    // 验证模型配置
    const validation = validateModelConfig(modelConfig);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 构建字段信息摘要
    const fieldInfo = headers.map((h: string) => {
      const stats = fieldStats?.find((s: { field?: string; name?: string }) => s.field === h || s.name === h);
      const sampleValues = rows?.slice(0, 3).map((r: Record<string, unknown>) => r[h]);
      const nullCount = Number(stats?.nullCount || 0);
      const count = Number(stats?.count || 1);
      const completeness = stats?.completeness as number | undefined;
      const nonNullRate = completeness ? (completeness * 100).toFixed(0) + '%' : ((1 - nullCount / Math.max(count, 1)) * 100).toFixed(0) + '%';
      return `字段名: ${h}, 类型: ${stats?.type || 'unknown'}, 示例值: ${sampleValues?.join(", ") || 'N/A'}, 非空率: ${nonNullRate}`;
    }).join("\n");

    const businessScenario = detectBusinessScenario(userDescription || "", headers);
    const systemPrompt = buildSystemPrompt(businessScenario, fieldInfo);

    const userPrompt = userDescription
      ? `请根据以下业务描述，为这些数据设计指标体系：\n\n${userDescription}`
      : `请根据这些数据字段，自动识别业务场景并设计指标体系。`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userPrompt },
    ];

    const content = await callLLM(modelConfig!, messages, { temperature: 0.3, max_tokens: 4096 });

    // 解析 LLM 返回的 JSON
    let parsedMetrics;
    try {
      const trimmed = content.trim();
      const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || trimmed.match(/^\s*\{[\s\S]*\}\s*$/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : trimmed;
      parsedMetrics = JSON.parse(jsonStr);
    } catch {
      // Fallback: 确保 summary 是结构化的
      parsedMetrics = {
        scenario: businessScenario.join("、"),
        metrics: [],
        summary: {
          overview: "指标体系生成中...",
          keyMetrics: [],
          dataGaps: ["数据解析失败，请重试"],
          recommendations: [],
        },
        rawResponse: true,
        rawContent: content.substring(0, 500),
      };
    }

    // 异步记录AI使用
    trackAiUsage({
      userId: auth?.userId,
      functionType: 'metric-ai',
      modelName: modelConfig?.model,
      status: 'success',
      latencyMs: Date.now() - callStart,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        ...parsedMetrics,
        detectedScenario: businessScenario,
        rawFieldInfo: fieldInfo,
      },
    });
  } catch (error) {
    console.error("Metric AI API error:", error);
    const errorMsg = error instanceof Error ? error.message : "指标生成失败";
    // 异步记录AI调用失败
    trackAiUsage({
      userId: auth?.userId,
      functionType: 'metric-ai',
      status: 'error',
      errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 500),
      latencyMs: Date.now() - callStart,
    }).catch(() => {});

    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
