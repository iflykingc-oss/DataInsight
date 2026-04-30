import { NextRequest, NextResponse } from 'next/server';
import { callLLM, validateModelConfig, type LLMModelConfig } from '@/lib/llm';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

// ============================================
// 领域知识库：中小商家销售分析核心指标 + 场景模板
// ============================================
const DOMAIN_KNOWLEDGE = `【销售分析领域知识库 v1.0】

一、核心指标库（按优先级排序）：
1. 销售额（GMV）：衡量整体销售规模的核心指标
2. 订单量（Order Count）：反映销售活跃度
3. 客单价（Average Order Value）：衡量用户购买力
4. 转化率（Conversion Rate）：从访客到购买的漏斗效率
5. 复购率（Repeat Purchase Rate）：用户忠诚度指标
6. 退货率（Return Rate）：商品质量/服务满意度指标
7. 毛利率（Gross Margin）：盈利能力指标
8. 库存周转率（Inventory Turnover）：供应链效率指标

二、场景模板（自动匹配）：

【电商店铺复盘】
- 核心：销售额趋势、品类销量 TopN、渠道占比、转化率漏斗
- 时间维度：日/周/月，618/双11大促节点标注
- 推荐图表：折线图（趋势）+ 条形图（TopN）+ 饼图（占比）

【线下门店分析】
- 核心：各门店销售额对比、客流量趋势、坪效分析
- 时间维度：日/周/月
- 推荐图表：柱状图（门店对比）+ 折线图（客流）+ 环形图（坪效）

【分销渠道表现】
- 核心：各渠道销量占比、回款周期、渠道利润率
- 维度：渠道类型/区域/客户等级
- 推荐图表：堆叠柱状图（渠道趋势）+ 饼图（占比）

【客户分析（RFM）】
- 核心：客户分层（高价值/潜力/流失）、复购周期、LTV预估
- 维度：客户等级/地域/消费品类
- 推荐图表：雷达图（客户画像）+ 柱状图（分层占比）

【库存管理】
- 核心：库存周转天数、滞销占比、安全库存预警
- 维度：品类/仓库/供应商
- 推荐图表：面积图（库存趋势）+ 条形图（滞销 TopN）

三、图表业务化规范：

| 分析目标 | 推荐图表 | 必须包含的业务元素 |
|----------|----------|-------------------|
| 时间趋势（销售额/订单量） | 折线图/柱状图 | 标题含年份月份；Y轴带单位；同比/环比提示；数据标签 |
| 品类对比（销量 TopN） | 条形图 | 标题含周期；降序排列；数据标签；突出 Top3 |
| 区域/渠道占比 | 饼图/环形图 | 图例含名称；百分比+数值标签；突出最大区域 |
| 多维度对比（渠道×月份） | 堆叠柱状图 | X轴月份；Y轴销量；图例渠道；数据标签 |
| 客户分层 | 雷达图 | 维度含R/F/M；数值标准化；标注各层级客户数 |

四、数据生成规范（生成模拟数据时必须遵守）：
- 月度销售额：需模拟业务波动，Q4（10-12月）含双11峰值，是其他月份的1.5-2倍
- 品类销量：头部爆款（Top1）占比≥30%，长尾品类占≤5%
- 渠道对比：电商:线下:分销 ≈ 5:3:2 是常见比例
- 同比数据：当年比去年同月增长10%-30%为合理区间
- 客单价区间：电商80-200元，线下200-500元，ToB 1000-5000元

五、业务化标题模板（禁止使用"序号总览"等通用标题）：
- 月度销售："2024年Q3月度销售额趋势"
- 品类分析："2024年8月商品销量排行榜 Top5"
- 区域占比："2024年8月各省份销量占比"
- 渠道对比："2024年各渠道月度销量对比"
- 客户分层："客户RFM分层画像分布"

六、【关键】数据精确性规范（2024-11-12 升级）：

❌ 禁止的模糊表达：
- "近千人" → ✅ 精确值："986人"
- "环比增长显著" → ✅ 精确值："环比+23.5%"
- "同比增长明显" → ✅ 精确值："同比+15.2%"
- "XX品类" → ✅ 精确品类名："数码配件"
- "表现亮眼" → ✅ 精确描述："环比+23.5%，高于均值15个百分点"
- "需要关注" → ✅ 精确描述："客流环比-8.2%，连续2周下降"
- "头部效应明显" → ✅ 精确描述："Top3门店占比68.5%，较上月+3.2pp"

✅ 正确的数值表达：
- 金额："85.6万元"（非"约86万"）
- 百分比："23.5%"（非"接近四分之一"）
- 人数："986人"（非"近千人"）
- 排名："第2名"（非"名列前茅"）
- 增长："环比+23.5%（上周801人→本周986人）"

✅ 正确的归因表达：
- ❌ "因为管理好" → ✅ "科技园店位于科技园区，工作日客流量稳定（占全天客流68%），周末略降"
- ❌ "受XX带动" → ✅ "受'手机'品类增长带动（该品类销售额+45.3%，贡献整体增长的62%）"
- ❌ "头部效应" → ✅ "科技园店+城南店销售额占比58.3%，较上月+5.1pp"

七、【强制】insight 字段输出规范（必须严格遵循）：

每个图表的 insight 字段必须包含以下全部元素，缺一不可：

\`\`\`json
{
  "insight": {
    "summary": "一句话核心结论（≤20字，不含数据）",
    "metrics": [
      {
        "name": "指标名",
        "value": "精确值+单位",
        "change": "变化值+方向（如'+23.5%↑'或'-8.2%↓'）",
        "basis": "数据来源（如'科技园店日均客流'）"
      }
    ],
    "cause": {
      "text": "归因说明（1句话，如果不确定写'待验证'）",
      "confidence": "high|medium|low",
      "verify": "需要什么数据验证（如果 confidence 不是 high）"
    },
    "dimension": "涉及维度（如'门店维度'/'区域维度'）"
  }
}
\`\`\`

示例对比：
❌ 错误："城南店销售额环比增长显著，主要受促销活动带动"
✅ 正确："城南店销售额12.3万元，环比+18.5%（上月10.4万），归因：周年庆促销（11月1-7日）带动客流+26%，转化率+3.2pp"`;



// ============================================
// 类型定义
// ============================================
interface ChartInsightMetrics {
  name: string;
  value: string;
  change?: string;
  basis: string;
}

interface ChartInsight {
  summary: string;  // 一句话核心结论（≤20字）
  metrics: ChartInsightMetrics[];
  cause: {
    text: string;
    confidence: 'high' | 'medium' | 'low';
    verify?: string;
  };
  dimension: string;
}

interface ChartSpec {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'radar' | 'donut';
  title: string;
  xAxis: string;
  yAxis: string;
  insight: ChartInsight;  // 结构化洞察
  recommendation: string;   // 推荐理由
  dataDescription: string;  // 数据描述
  color?: string;
  order?: number;           // 布局顺序
}

interface KPISpec {
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon?: string;
}

interface DashboardSummary {
  overview: string;      // 整体概况
  highlights: string[];  // 亮点（精确数据）
  concerns: string[];    // 关注点（精确数据）
  suggestions: string[]; // 建议（动作+收益）
}

interface GeneratedDashboardSpec {
  id: string;
  name: string;
  scenario: string;         // 业务场景
  scenarioDescription: string; // 场景说明
  detectedMetrics: string[];  // 检测到的核心指标
  kpis: KPISpec[];
  charts: ChartSpec[];
  layout: string;           // 布局建议
  mockData: Record<string, Array<{ [key: string]: string | number }>>;
  aiSummary: DashboardSummary;  // 结构化摘要
}

// ============================================
// 构建 Prompt
// ============================================
function buildPrompt(
  userMessage: string,
  data: ParsedData,
  fieldStats: FieldStat[],
  context?: {
    scenario?: string;
    metrics?: string[];
    charts?: Array<{
      id?: string;
      type?: string;
      title?: string;
      xAxis?: string;
      yAxis?: string;
    }>;
  }
): string {
  const headers = data.headers;
  const numericFields = getNumericFields(fieldStats).map(f => f.field);
  const textFields = fieldStats.filter(f => f.type === 'string').map(f => f.field);
  const dateFields = fieldStats.filter(f => f.type === 'date').map(f => f.field);

  // 检测业务场景
  let detectedScenario = '通用数据分析';
  const msgLower = userMessage.toLowerCase();
  const headerText = headers.join(' ').toLowerCase();

  if (/销售|店铺|电商|商城|订单|gmv|客单价|转化|复购|退货/i.test(msgLower + headerText)) {
    detectedScenario = '零售/电商/销售';
  } else if (/门店|实体|线下|客流|坪效|店员/i.test(msgLower + headerText)) {
    detectedScenario = '线下门店分析';
  } else if (/渠道|分销|代理|经销商/i.test(msgLower + headerText)) {
    detectedScenario = '分销渠道分析';
  } else if (/客户|用户|会员|rfm|l tv|复购|留存/i.test(msgLower + headerText)) {
    detectedScenario = '客户分析';
  } else if (/库存|仓储|采购|供应链|周转/i.test(msgLower + headerText)) {
    detectedScenario = '库存管理';
  } else if (/财务|利润|成本|预算|支出|收入/i.test(msgLower + headerText)) {
    detectedScenario = '财务分析';
  } else if (/人力|员工|招聘|绩效|考勤/i.test(msgLower + headerText)) {
    detectedScenario = '人力资源';
  }

  // 判断是否为二次调整
  const isAdjustment = context?.scenario && context?.charts && context?.charts.length > 0;

  let prompt = `${DOMAIN_KNOWLEDGE}

二、当前任务：

用户需求：「${userMessage}」
识别到的业务场景：${detectedScenario}`;

  if (isAdjustment) {
    prompt += `

【二次调整任务】
当前仪表盘：${context?.scenario || ''}，已有图表：${(context?.charts || []).map(c => c.title || '').join('、')}
用户希望调整，请根据用户需求修改图表配置。`;
  }

  prompt += `
【重要】数值字段列表仅供参考，请务必排除以下 ID/序号类字段：
${numericFields.filter(f => !isIdField(f)).join('、') || '无有效数值字段'}

禁止使用"序号"、"总序号"、"ID"、"编号"等作为图表的 xAxis 或 yAxis！

四、【强制】JSON 输出格式（必须严格遵循，禁止额外文字）

根据用户需求和领域知识库，生成业务化仪表盘配置。严格输出以下 JSON 结构：

{
  "name": "仪表盘名称（如：2024年Q3线下门店销售仪表盘）",
  "scenario": "${detectedScenario}",
  "scenarioDescription": "场景说明（2-3句话描述核心关注点）",
  "detectedMetrics": ["核心指标1", "核心指标2"],
  "kpis": [
    {"label": "指标名", "value": "精确值+单位", "change": "+12%", "changeType": "up"}
  ],
  "charts": [
    {
      "id": "chart-1",
      "type": "line|bar|pie|area|radar|donut",
      "title": "业务化标题（含年份/月份/指标）",
      "xAxis": "X轴字段名",
      "yAxis": "Y轴字段名",
      "insight": {
        "summary": "一句话核心结论（≤20字，不含数据）",
        "metrics": [
          {
            "name": "指标名",
            "value": "精确值+单位（如'85.6万元'）",
            "change": "变化值+方向（如'+23.5%↑'）",
            "basis": "数据来源（如'科技园店日均客流'）"
          }
        ],
        "cause": {
          "text": "归因说明（1句话，不确定写'待验证'）",
          "confidence": "high|medium|low",
          "verify": "需要什么数据验证（confidence 不是 high 时必填）"
        },
        "dimension": "涉及维度（如'门店维度'）"
      },
      "recommendation": "推荐理由（如：趋势分析用折线图展示月度变化规律）",
      "dataDescription": "数据描述（如：Q4含双11峰值，11月是其他月份的1.8倍）",
      "order": 1
    }
  ],
  "layout": "grid|single|business",
  "mockData": {
    "chart-1": [
      {"month": "10月", "sales": 85000},
      {"month": "11月", "sales": 156000},
      {"month": "12月", "sales": 128000}
    ]
  },
  "aiSummary": {
    "overview": "整体业务概况（1句话：行业+核心指标+同比）",
    "highlights": ["亮点1（精确数据+门店名）", "亮点2"],
    "concerns": ["关注点1（精确数据+变化）", "关注点2"],
    "suggestions": ["建议1（动作+预期收益）", "建议2"]
  }
}

规则：
1. charts 数量控制在 4-8 个，覆盖 KPI总览 → 趋势分析 → 维度对比 → 占比分析
2. insight.metrics 必须包含精确数值，禁止"XX品类"、"近千人"等模糊表达
3. aiSummary 必须包含精确数据，每项都要有具体数值
4. mockData 数据要符合业务逻辑（Q4含双11峰值、Top1占比≥30%等）
5. title 必须包含年份/月份/指标，禁止"数据总览"等通用标题
6. 只输出 JSON，禁止任何其他文字`;

  return prompt;
}

// ============================================
// API Handler
// ============================================
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userMessage, data, fieldStats, context, modelConfig } = body as {
      userMessage: string;
      data: ParsedData;
      fieldStats: FieldStat[];
      context?: {
        scenario?: string;
        metrics?: string[];
        charts?: Array<{
          id: string;
          type: string;
          title: string;
          xAxis?: string;
          yAxis?: string;
        }>;
      };
      modelConfig?: LLMModelConfig;
    };

    if (!userMessage || !data || !fieldStats) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 验证模型配置
    const validation = validateModelConfig(modelConfig);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // 构建 prompt
    const prompt = buildPrompt(userMessage, data, fieldStats, context);

    // 调用 LLM
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: '你是专业的销售数据分析仪表盘生成助手。你必须严格只输出JSON，禁止输出任何其他文字。' },
      { role: 'user', content: prompt },
    ];

    const content = await callLLM(modelConfig!, messages, { temperature: 0.3, max_tokens: 4096 });

    // 解析 JSON
    let dashboardSpec: GeneratedDashboardSpec;
    try {
      // 尝试提取 JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      dashboardSpec = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn('[NL2Dashboard] JSON parse failed, content preview:', content.substring(0, 200));
      return NextResponse.json({
        success: false,
        error: 'AI 生成内容解析失败，请重试',
        raw: content.substring(0, 200),
      });
    }

    // 补充 id 和颜色
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
    dashboardSpec.charts = dashboardSpec.charts.map((chart, idx) => ({
      ...chart,
      id: chart.id || `chart-${Date.now()}-${idx}`,
      color: colors[idx % colors.length],
      order: chart.order ?? idx + 1,
    }));

    // 补充 KPI 图标
    const kpiIconMap: Record<string, string> = {
      '销售额': '💰', '订单量': '📦', '客单价': '💳', '转化率': '🎯',
      '复购率': '🔄', '毛利率': '📈', '库存': '🏭', '用户': '👥',
    };
    dashboardSpec.kpis = dashboardSpec.kpis.map(kpi => ({
      ...kpi,
      icon: kpi.icon || Object.entries(kpiIconMap).find(([k]) => kpi.label.includes(k))?.[1] || '📊',
    }));

    // 补充默认 mockData（基于真实数据）
    if (!dashboardSpec.mockData || Object.keys(dashboardSpec.mockData).length === 0) {
      dashboardSpec.mockData = generateMockData(data, fieldStats, dashboardSpec.charts);
    }

    return NextResponse.json({
      success: true,
      data: dashboardSpec,
    });
  } catch (error: unknown) {
    console.error('NL2Dashboard API error:', error);
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { success: false, error: `生成失败: ${message}` },
      { status: 500 }
    );
  }
}

// 过滤 ID/序号类字段（用于指标/趋势分析）- 序号检测需要更宽泛
const ID_FIELD_PATTERNS = [
  /^id$/i, /^编号$/i, /^编码$/i, /^no\.?$/i, /^no$/i,
  /^index$/i, /^idx$/i, /^key$/i, /^code$/i, /^_id$/i
];
// 序号类字段 - 使用更宽泛的匹配
const SEQUENCE_FIELD_PATTERNS = [
  /序号/, /^序号$/i, /序号$/
];
// 判断是否为ID/序号字段
function isIdField(fieldName: string): boolean {
  const name = fieldName.toLowerCase();
  return ID_FIELD_PATTERNS.some(p => p.test(name)) || 
         SEQUENCE_FIELD_PATTERNS.some(p => p.test(fieldName));
}

// 过滤掉 ID 字段后的数值字段
function getNumericFields(fieldStats: FieldStat[]): FieldStat[] {
  return fieldStats.filter(f => f.type === 'number' && !isIdField(f.field));
}

// 根据真实数据生成 mock 数据
function generateMockData(
  data: ParsedData,
  fieldStats: FieldStat[],
  charts: ChartSpec[]
): Record<string, Array<Record<string, string | number>>> {
  const result: Record<string, Array<Record<string, string | number>>> = {};
  const rows = data.rows.slice(0, 50);

  const validNumericFields = getNumericFields(fieldStats);

  charts.forEach(chart => {
    if (chart.type === 'line' || chart.type === 'bar' || chart.type === 'area') {
      // 趋势类：取日期字段+数值字段
      const dateField = fieldStats.find(f => f.type === 'date')?.field || data.headers[0];
      // 强制过滤：yAxis 不能是 ID/序号字段
      const numField = (!chart.yAxis || isIdField(chart.yAxis)) 
        ? validNumericFields[0]?.field || ''
        : chart.yAxis;

      // 聚合
      const grouped: Record<string, number> = {};
      rows.forEach(row => {
        const key = String(row[dateField] || '未知');
        const val = Number(row[numField]) || 0;
        grouped[key] = (grouped[key] || 0) + val;
      });

      const sorted = Object.entries(grouped)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => a.name.localeCompare(b.name));

      if (sorted.length > 0) {
        result[chart.id] = sorted;
      }
    } else if (chart.type === 'pie' || chart.type === 'donut') {
      // 占比类：取文本字段+数值字段
      const textField = fieldStats.find(f => f.type === 'string')?.field || data.headers[0];
      // 强制过滤：yAxis 不能是 ID/序号字段
      const numField = (!chart.yAxis || isIdField(chart.yAxis)) 
        ? validNumericFields[0]?.field || ''
        : chart.yAxis;

      const grouped: Record<string, number> = {};
      rows.forEach(row => {
        const key = String(row[textField] || '未知');
        const val = Number(row[numField]) || 0;
        grouped[key] = (grouped[key] || 0) + val;
      });

      const sorted = Object.entries(grouped)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8);

      if (sorted.length > 0) {
        result[chart.id] = sorted;
      }
    }
  });

  return result;
}
