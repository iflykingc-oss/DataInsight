import { NextRequest, NextResponse } from "next/server";
import { callLLM, validateModelConfig, type LLMModelConfig } from "@/lib/llm";

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

## 输出要求（严格遵循JSON格式）
请生成一个完整的指标体系，包含以下维度：

### 1. 核心KPI（必选，3-5个）
- 每个指标包含：name（中文名称）、expression（计算表达式）、category（kpi）、description（业务含义）、businessValue（业务价值）

### 2. 过程指标（可选，3-6个）
- 反映业务过程的关键节点

### 3. 复合指标（可选，2-4个）
- 由多个基础指标计算得出

### 4. 同比/环比指标（可选，2-3个）
- 反映趋势变化

## 指标解读要求
每个指标都要提供：
- businessMeaning：业务含义（用业务语言解释，而非技术语言）
- dataQuality：数据质量评估（高/中/低）及原因
- usageSuggestion：使用建议（如何解读、何时关注）
- alertThreshold：预警阈值（如有）

## 严格返回纯JSON，不要有任何额外文本：
{
  "scenario": "识别的业务场景",
  "metrics": [...],
  "summary": "整体指标体系的设计思路和核心关注点"
}`;
}

export async function POST(request: NextRequest) {
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
      parsedMetrics = {
        scenario: businessScenario.join("、"),
        metrics: [],
        summary: content,
        rawResponse: true,
      };
    }

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
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
