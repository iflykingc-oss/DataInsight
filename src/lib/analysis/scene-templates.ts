/**
 * 场景识别与分析模板
 * 基于字段名称自动识别业务场景，匹配对应的分析模板
 * 在现有 deep-analysis 统计算法之上增加 AI 增强层
 */

import type { DeepAnalysis, FieldStat } from '@/lib/data-processor/types';

/** 分析场景枚举 */
export enum AnalysisScene {
  ECOMMERCE = 'ecommerce',
  FINANCE = 'finance',
  HR = 'hr',
  PROJECT = 'project',
  SALES = 'sales',
  EDUCATION = 'education',
  CUSTOM = 'custom',
}

/** 场景显示配置 */
export const SCENE_DISPLAY: Record<AnalysisScene, { name: string; icon: string; color: string }> = {
  [AnalysisScene.ECOMMERCE]: { name: '电商运营', icon: '🛒', color: 'text-orange-600' },
  [AnalysisScene.FINANCE]: { name: '财务收支', icon: '💰', color: 'text-green-600' },
  [AnalysisScene.HR]: { name: '人事管理', icon: '👥', color: 'text-blue-600' },
  [AnalysisScene.PROJECT]: { name: '项目管理', icon: '📋', color: 'text-purple-600' },
  [AnalysisScene.SALES]: { name: '销售跟踪', icon: '📈', color: 'text-red-600' },
  [AnalysisScene.EDUCATION]: { name: '教育培训', icon: '🎓', color: 'text-cyan-600' },
  [AnalysisScene.CUSTOM]: { name: '通用分析', icon: '🔍', color: 'text-gray-600' },
};

/** 分析步骤定义 */
export interface AnalysisStep {
  id: string;
  name: string;
  description: string;
  promptTemplate: (context: AnalysisContext) => string;
  required: boolean;
  recommendedChartTypes: string[];
}

/** 分析上下文 */
export interface AnalysisContext {
  fieldNames: string[];
  fieldStats: FieldStat[];
  totalRows: number;
  statsSummary: string;
  previousSteps: Record<string, string>;
}

/** 分析模板 */
export interface AnalysisTemplate {
  id: string;
  scene: AnalysisScene;
  name: string;
  description: string;
  keywords: string[];
  minMatchCount: number;
  steps: AnalysisStep[];
}

// ========== 辅助函数 ==========

function summarizeDeepAnalysis(deep: DeepAnalysis | undefined): string {
  if (!deep) return '深度分析结果不可用';
  const parts: string[] = [];
  parts.push(`数据健康评分：${deep.healthScore.overall}/100（完整性${deep.healthScore.completeness}，一致性${deep.healthScore.consistency}，质量${deep.healthScore.quality}）`);
  if (deep.keyFindings.length > 0) {
    parts.push('核心发现：');
    deep.keyFindings.slice(0, 5).forEach(f => {
      parts.push(`  [${f.severity}] ${f.title}：${f.detail}`);
    });
  }
  if (deep.trends.length > 0) {
    parts.push('趋势：');
    deep.trends.forEach(t => {
      const dir = t.direction === 'up' ? '上升' : t.direction === 'down' ? '下降' : t.direction === 'stable' ? '平稳' : '波动';
      parts.push(`  ${t.field}：${dir}，变化率${t.changeRate.toFixed(1)}%，${t.description}`);
    });
  }
  const strongCorr = deep.correlations.filter(c => c.strength === 'strong');
  if (strongCorr.length > 0) {
    parts.push('强相关：');
    strongCorr.forEach(c => {
      parts.push(`  ${c.field1} 与 ${c.field2}：${c.direction === 'positive' ? '正相关' : '负相关'}，系数${c.coefficient.toFixed(3)}`);
    });
  }
  if (deep.attribution) {
    parts.push(`归因总结：${deep.attribution.summary}`);
    deep.attribution.rootCauses.slice(0, 3).forEach(rc => {
      parts.push(`  ${rc.metric}：${rc.cause}（置信度${rc.confidence}）`);
    });
  }
  return parts.join('\n');
}

function summarizeFieldStats(fieldStats: FieldStat[]): string {
  return fieldStats
    .filter(f => !f.isIdField && f.type === 'number')
    .slice(0, 10)
    .map(f => {
      const parts = [`${f.field}(${f.type})`];
      if (f.numericStats) {
        parts.push(`min=${f.numericStats.min}, max=${f.numericStats.max}, mean=${f.numericStats.mean.toFixed(2)}, median=${f.numericStats.median}`);
      }
      if (f.nullCount > 0) parts.push(`null=${f.nullCount}`);
      return parts.join(' ');
    })
    .join('\n');
}

// ========== 预设模板 ==========

export const PRESET_TEMPLATES: AnalysisTemplate[] = [
  {
    id: 'ecommerce-sales',
    scene: AnalysisScene.ECOMMERCE,
    name: '电商销售全维度分析',
    description: '针对电商订单/销售数据，做全流程深度分析',
    keywords: ['订单', '商品', '销售额', '销量', '下单时间', '渠道', 'SKU', '客单价', '退款'],
    minMatchCount: 2,
    steps: [
      {
        id: 'base-stat', name: '核心指标概览', description: '核心经营指标汇总', required: true, recommendedChartTypes: ['bar', 'kpi'],
        promptTemplate: (ctx) => `基于以下电商数据统计结果，输出核心经营指标：\n\n数据字段：${ctx.fieldNames.join('、')}\n数据量：${ctx.totalRows}行\n\n数值字段统计：\n${ctx.statsSummary}\n\n请输出：\n1. 核心指标（总销售额/总订单数/客单价/日均销售额，用数值+趋势箭头）\n2. 与行业基准的对比判断\n3. 最值得关注的一个信号`,
      },
      {
        id: 'trend-analysis', name: '趋势与周期分析', description: '销售趋势变化与周期性规律', required: true, recommendedChartTypes: ['line', 'area'],
        promptTemplate: (ctx) => `基于电商数据趋势分析：\n\n${ctx.statsSummary}\n\n前序分析：\n${ctx.previousSteps['base-stat'] || ''}\n\n请输出：\n1. 整体趋势判断（增长/下降/波动）\n2. 周期性规律（日/周/月维度）\n3. 关键拐点识别及原因推测\n4. 未来1-2周趋势预判`,
      },
      {
        id: 'product-analysis', name: '商品与渠道分析', description: '商品维度和渠道维度的拆解', required: false, recommendedChartTypes: ['bar', 'pie', 'scatter'],
        promptTemplate: (ctx) => `基于电商数据归因分析：\n\n${ctx.statsSummary}\n\n前序分析：\n${Object.entries(ctx.previousSteps).map(([k, v]) => `【${k}】${v}`).join('\n')}\n\n请输出：\n1. TOP5 畅销品与 TOP5 滞销品（含原因分析）\n2. 渠道贡献占比与效率对比\n3. 商品-渠道交叉分析亮点\n4. 优化建议（3条内，要有数据支撑）`,
      },
      {
        id: 'anomaly-action', name: '异常检测与行动建议', description: '数据异常点识别与可落地建议', required: true, recommendedChartTypes: ['scatter', 'bar'],
        promptTemplate: (ctx) => `基于电商数据全维度分析：\n\n${ctx.statsSummary}\n\n前序分析：\n${Object.entries(ctx.previousSteps).map(([k, v]) => `【${k}】${v}`).join('\n')}\n\n请输出：\n1. 异常信号清单（标注严重程度）\n2. 根因分析（每个异常的可能原因）\n3. 5条可直接落地的运营优化建议（每条要有数据支撑，禁止空泛套话）`,
      },
    ],
  },
  {
    id: 'finance-accounting',
    scene: AnalysisScene.FINANCE,
    name: '财务收支全维度分析',
    description: '针对财务/记账数据的专业分析',
    keywords: ['收入', '支出', '利润', '金额', '科目', '凭证', '借贷', '成本', '费用'],
    minMatchCount: 2,
    steps: [
      {
        id: 'base-stat', name: '核心财务指标', description: '核心财务指标汇总', required: true, recommendedChartTypes: ['bar', 'kpi'],
        promptTemplate: (ctx) => `基于以下财务数据统计结果：\n\n数据字段：${ctx.fieldNames.join('、')}\n数据量：${ctx.totalRows}行\n\n数值字段统计：\n${ctx.statsSummary}\n\n请输出：\n1. 核心财务指标（总收入/总支出/净利润/利润率）\n2. 收支结构合理性判断\n3. 最值得关注的财务信号`,
      },
      {
        id: 'trend-structure', name: '趋势与结构分析', description: '收支趋势与科目结构', required: true, recommendedChartTypes: ['line', 'pie', 'area'],
        promptTemplate: (ctx) => `基于财务数据深度分析：\n\n${ctx.statsSummary}\n\n前序分析：\n${ctx.previousSteps['base-stat'] || ''}\n\n请输出：\n1. 收支趋势变化（月度/季度维度）\n2. 科目结构占比与变动\n3. 异常波动识别\n4. 财务优化建议`,
      },
      {
        id: 'risk-suggestion', name: '风险提示与建议', description: '财务风险识别与优化建议', required: true, recommendedChartTypes: ['bar', 'scatter'],
        promptTemplate: (ctx) => `基于财务数据全维度分析：\n\n${ctx.statsSummary}\n\n前序分析：\n${Object.entries(ctx.previousSteps).map(([k, v]) => `【${k}】${v}`).join('\n')}\n\n请输出：\n1. 财务风险信号（标注严重程度）\n2. 成本优化空间分析\n3. 3-5条可落地的财务优化建议（要有数据支撑）`,
      },
    ],
  },
  {
    id: 'hr-people',
    scene: AnalysisScene.HR,
    name: '人事数据全维度分析',
    description: '针对人事/员工数据的专业分析',
    keywords: ['姓名', '部门', '职位', '薪资', '入职', '工龄', '绩效', '离职', '考勤'],
    minMatchCount: 2,
    steps: [
      {
        id: 'base-stat', name: '人员结构概览', description: '核心人事指标与结构', required: true, recommendedChartTypes: ['bar', 'pie'],
        promptTemplate: (ctx) => `基于以下人事数据统计结果：\n\n数据字段：${ctx.fieldNames.join('、')}\n数据量：${ctx.totalRows}行\n\n数值字段统计：\n${ctx.statsSummary}\n\n请输出：\n1. 人员结构分析（部门分布/职级分布/年龄分布）\n2. 薪资统计（均值/中位数/分位值）\n3. 最值得关注的人事信号`,
      },
      {
        id: 'trend-risk', name: '趋势与风险分析', description: '人员流动趋势与风险识别', required: true, recommendedChartTypes: ['line', 'bar'],
        promptTemplate: (ctx) => `基于人事数据深度分析：\n\n${ctx.statsSummary}\n\n前序分析：\n${ctx.previousSteps['base-stat'] || ''}\n\n请输出：\n1. 人员变动趋势（入职/离职）\n2. 离职风险信号\n3. 薪酬竞争力判断\n4. 人事优化建议（3条内）`,
      },
    ],
  },
  {
    id: 'project-management',
    scene: AnalysisScene.PROJECT,
    name: '项目进度全维度分析',
    description: '针对项目/任务数据的专业分析',
    keywords: ['任务', '负责人', '截止日期', '进度', '状态', '优先级', '里程碑', '工时'],
    minMatchCount: 2,
    steps: [
      {
        id: 'base-stat', name: '项目状态概览', description: '核心项目指标与状态分布', required: true, recommendedChartTypes: ['pie', 'bar'],
        promptTemplate: (ctx) => `基于以下项目数据统计结果：\n\n数据字段：${ctx.fieldNames.join('、')}\n数据量：${ctx.totalRows}行\n\n数值字段统计：\n${ctx.statsSummary}\n\n请输出：\n1. 项目/任务状态分布\n2. 进度统计（完成率/逾期率/平均进度）\n3. 最值得关注的项目风险`,
      },
      {
        id: 'risk-suggestion', name: '风险识别与建议', description: '项目延期风险与优化建议', required: true, recommendedChartTypes: ['bar', 'scatter'],
        promptTemplate: (ctx) => `基于项目数据深度分析：\n\n${ctx.statsSummary}\n\n前序分析：\n${ctx.previousSteps['base-stat'] || ''}\n\n请输出：\n1. 逾期/延期风险任务清单\n2. 资源瓶颈识别\n3. 3-5条可落地的项目管理优化建议`,
      },
    ],
  },
  {
    id: 'sales-tracking',
    scene: AnalysisScene.SALES,
    name: '销售跟踪全维度分析',
    description: '针对销售/客户数据的专业分析',
    keywords: ['客户', '合同', '商机', '成交', '赢单', '丢单', '跟进', '销售额', '回款', '线索'],
    minMatchCount: 2,
    steps: [
      {
        id: 'base-stat', name: '销售指标概览', description: '核心销售指标与漏斗', required: true, recommendedChartTypes: ['funnel', 'bar'],
        promptTemplate: (ctx) => `基于以下销售数据统计结果：\n\n数据字段：${ctx.fieldNames.join('、')}\n数据量：${ctx.totalRows}行\n\n数值字段统计：\n${ctx.statsSummary}\n\n请输出：\n1. 核心销售指标（总销售额/赢单率/平均客单价/回款率）\n2. 销售漏斗转化分析\n3. 最值得关注的销售信号`,
      },
      {
        id: 'trend-action', name: '趋势与行动建议', description: '销售趋势与可落地建议', required: true, recommendedChartTypes: ['line', 'area'],
        promptTemplate: (ctx) => `基于销售数据深度分析：\n\n${ctx.statsSummary}\n\n前序分析：\n${ctx.previousSteps['base-stat'] || ''}\n\n请输出：\n1. 销售趋势与周期性规律\n2. 客户/商机质量分析\n3. 3-5条可落地的销售策略建议`,
      },
    ],
  },
];

/**
 * 自动识别业务场景
 */
export function detectScene(fieldNames: string[]): AnalysisTemplate | null {
  const fieldSet = new Set(fieldNames.map(f => f.toLowerCase().trim()));
  let bestTemplate: AnalysisTemplate | null = null;
  let bestScore = 0;

  for (const template of PRESET_TEMPLATES) {
    const matchCount = template.keywords.filter(kw => fieldSet.has(kw.toLowerCase())).length;
    if (matchCount >= template.minMatchCount && matchCount > bestScore) {
      bestScore = matchCount;
      bestTemplate = template;
    }
  }

  return bestTemplate;
}

/**
 * 获取通用分析 Prompt（无模板时的兜底）
 */
export function getGenericAnalysisPrompt(
  fieldNames: string[],
  deepAnalysis: DeepAnalysis | undefined,
  fieldStats: FieldStat[]
): string {
  return `基于以下数据统计结果，给出深度业务解读：\n\n数据字段：${fieldNames.join('、')}\n\n数值字段统计：\n${summarizeFieldStats(fieldStats)}\n\n深度分析摘要：\n${summarizeDeepAnalysis(deepAnalysis)}\n\n请输出：\n1. 核心结论（3条以内，直击重点）\n2. 数据解读（分维度解释数据背后的含义）\n3. 可落地的优化建议（3-5条，要有数据支撑，禁止空泛套话）`;
}

export { summarizeDeepAnalysis, summarizeFieldStats };
