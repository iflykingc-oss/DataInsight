/**
 * 模板全链路引擎
 * 选模板 → 自动清洗 → 字段识别 → 指标计算 → 异常检测 → 视图生成
 * 实现"开箱即用"的产品定位
 */

import type { ParsedData, FieldStat, CellValue } from './data-processor/types';
import {
  parseFileClient,
  analyzeFieldsClient,
  cleanDataClient,
  generateSummaryClient,
  detectAnomaliesClient,
  smartSampleClient,
} from './client-data-engine';

// ============================================================
// 模板配置类型
// ============================================================

export interface TemplateConfig {
  id: string;
  name: string;
  industry: string;
  category: string;
  description: string;

  // 预期字段映射规则
  fieldMapping: Array<{
    expectedName: string;           // 模板预期的字段名
    expectedType: 'string' | 'number' | 'date' | 'id';
    required: boolean;              // 是否必填
    aliases: string[];              // 别名列表（用于匹配用户数据）
    defaultValue?: CellValue;       // 默认值
    formula?: string;               // 计算公式
  }>;

  // 预制分析规则
  analysisRules: {
    metrics: Array<{
      name: string;
      type: 'sum' | 'avg' | 'count' | 'max' | 'min' | 'growth_rate' | 'completion_rate';
      field: string;
      groupBy?: string;
      filter?: string;
    }>;
    dimensions: string[];
    segments: Array<{
      name: string;
      condition: string;
      field: string;
    }>;
    comparisons: Array<{
      name: string;
      type: 'period' | 'group';
      fields: string[];
    }>;
  };

  // 预制异常检测规则
  anomalyRules: Array<{
    field: string;
    type: 'null_rate' | 'outlier' | 'duplicate' | 'range';
    threshold: number;
    severity: 'warning' | 'critical';
  }>;

  // 预制可视化配置
  visualizationConfig: {
    defaultView: 'table' | 'dashboard' | 'chart';
    charts: Array<{
      type: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
      title: string;
      xField: string;
      yField: string;
      groupBy?: string;
    }>;
    kpis: Array<{
      name: string;
      metric: string;
      format: 'number' | 'currency' | 'percentage';
      comparison?: string;
    }>;
  };

  // 预制工作流
  workflow: Array<{
    step: 'parse' | 'clean' | 'analyze' | 'detect' | 'visualize' | 'report';
    autoExecute: boolean;
    config?: Record<string, unknown>;
  }>;
}

// ============================================================
// 模板库（配置化，可扩展）
// ============================================================

export const TEMPLATE_LIBRARY: TemplateConfig[] = [
  {
    id: 'retail-daily-sales',
    name: '日销跟踪表',
    industry: '零售电商',
    category: 'retail',
    description: '每日销售数据记录与分析，支持同比环比、异常检测',

    fieldMapping: [
      { expectedName: '销售日期', expectedType: 'date', required: true, aliases: ['日期', '时间', 'Date', 'date', '销售时间', '成交日期'] },
      { expectedName: '客户名称', expectedType: 'string', required: false, aliases: ['客户', '顾客', 'Customer', '买家', '会员'] },
      { expectedName: '产品名称', expectedType: 'string', required: true, aliases: ['产品', '商品', 'Product', 'SKU', '名称', '品名'] },
      { expectedName: '销售数量', expectedType: 'number', required: true, aliases: ['数量', 'Qty', 'Quantity', '件数', '销量'] },
      { expectedName: '单价', expectedType: 'number', required: true, aliases: ['单价', 'Price', 'UnitPrice', '价格', '售价'] },
      { expectedName: '销售额', expectedType: 'number', required: false, aliases: ['销售额', '金额', 'Amount', 'Total', '总价', 'GMV'], formula: '销售数量 * 单价' },
      { expectedName: '销售区域', expectedType: 'string', required: false, aliases: ['区域', '地区', 'Area', 'Region', '门店', '城市'] },
      { expectedName: '负责人', expectedType: 'string', required: false, aliases: ['负责人', '销售', 'Sales', '员工', '导购'] },
    ],

    analysisRules: {
      metrics: [
        { name: '总销售额', type: 'sum', field: '销售额' },
        { name: '总销量', type: 'sum', field: '销售数量' },
        { name: '平均单价', type: 'avg', field: '单价' },
        { name: '订单数', type: 'count', field: '销售日期' },
        { name: '区域销售TOP', type: 'sum', field: '销售额', groupBy: '销售区域' },
        { name: '员工业绩TOP', type: 'sum', field: '销售额', groupBy: '负责人' },
      ],
      dimensions: ['销售日期', '产品名称', '销售区域', '负责人'],
      segments: [
        { name: '高价值订单', condition: '销售额 > 平均销售额 * 2', field: '销售额' },
        { name: '滞销产品', condition: '销量 < 平均销量 * 0.3', field: '销售数量' },
      ],
      comparisons: [
        { name: '日环比', type: 'period', fields: ['销售额', '销售数量'] },
        { name: '区域对比', type: 'group', fields: ['销售额'] },
      ],
    },

    anomalyRules: [
      { field: '销售日期', type: 'null_rate', threshold: 0.1, severity: 'critical' },
      { field: '销售额', type: 'outlier', threshold: 3, severity: 'warning' },
      { field: '销售数量', type: 'outlier', threshold: 3, severity: 'warning' },
      { field: '产品名称', type: 'duplicate', threshold: 0.5, severity: 'warning' },
    ],

    visualizationConfig: {
      defaultView: 'dashboard',
      charts: [
        { type: 'line', title: '销售趋势', xField: '销售日期', yField: '销售额' },
        { type: 'bar', title: '产品销量TOP10', xField: '产品名称', yField: '销售数量' },
        { type: 'pie', title: '区域销售占比', xField: '销售区域', yField: '销售额' },
        { type: 'bar', title: '员工业绩排名', xField: '负责人', yField: '销售额' },
      ],
      kpis: [
        { name: '总销售额', metric: 'sum(销售额)', format: 'currency', comparison: '环比' },
        { name: '总销量', metric: 'sum(销售数量)', format: 'number', comparison: '环比' },
        { name: '平均客单价', metric: 'avg(单价)', format: 'currency' },
        { name: '订单数', metric: 'count(销售日期)', format: 'number' },
      ],
    },

    workflow: [
      { step: 'parse', autoExecute: true },
      { step: 'clean', autoExecute: true, config: { removeDuplicates: true, fillNulls: true, outlierMethod: 'iqr' } },
      { step: 'analyze', autoExecute: true },
      { step: 'detect', autoExecute: true },
      { step: 'visualize', autoExecute: true },
      { step: 'report', autoExecute: false },
    ],
  },

  {
    id: 'general-inventory',
    name: '通用库存管理',
    industry: '通用',
    category: 'general',
    description: '商品/物料出入库管理，支持库存预警',

    fieldMapping: [
      { expectedName: '商品名称', expectedType: 'string', required: true, aliases: ['产品', '商品', '物料', '名称', '品名', 'Product'] },
      { expectedName: 'SKU编码', expectedType: 'id', required: true, aliases: ['SKU', '编码', 'Code', '编号', '货号'] },
      { expectedName: '入库数量', expectedType: 'number', required: false, aliases: ['入库', '进货', 'InQty', '入库量'] },
      { expectedName: '出库数量', expectedType: 'number', required: false, aliases: ['出库', '出货', 'OutQty', '出库量'] },
      { expectedName: '库存数量', expectedType: 'number', required: true, aliases: ['库存', '存量', 'Stock', '当前库存'] },
      { expectedName: '安全库存', expectedType: 'number', required: false, aliases: ['安全库存', '预警线', 'MinStock', '最低库存'] },
      { expectedName: '仓库位置', expectedType: 'string', required: false, aliases: ['仓库', '位置', 'Location', '库位'] },
    ],

    analysisRules: {
      metrics: [
        { name: '总库存量', type: 'sum', field: '库存数量' },
        { name: '库存SKU数', type: 'count', field: 'SKU编码' },
        { name: '库存预警数', type: 'count', field: '库存数量' },
      ],
      dimensions: ['仓库位置', '商品名称'],
      segments: [
        { name: '库存预警', condition: '库存数量 <= 安全库存', field: '库存数量' },
        { name: '库存积压', condition: '库存数量 > 安全库存 * 3', field: '库存数量' },
      ],
      comparisons: [],
    },

    anomalyRules: [
      { field: '库存数量', type: 'null_rate', threshold: 0.05, severity: 'critical' },
      { field: '库存数量', type: 'outlier', threshold: 3, severity: 'warning' },
    ],

    visualizationConfig: {
      defaultView: 'dashboard',
      charts: [
        { type: 'bar', title: '库存量TOP20', xField: '商品名称', yField: '库存数量' },
        { type: 'table', title: '库存预警清单', xField: 'SKU编码', yField: '库存数量' },
      ],
      kpis: [
        { name: '总库存量', metric: 'sum(库存数量)', format: 'number' },
        { name: '预警SKU数', metric: 'count(库存数量 < 安全库存)', format: 'number' },
        { name: '积压SKU数', metric: 'count(库存数量 > 安全库存 * 3)', format: 'number' },
      ],
    },

    workflow: [
      { step: 'parse', autoExecute: true },
      { step: 'clean', autoExecute: true, config: { removeDuplicates: true, fillNulls: false } },
      { step: 'analyze', autoExecute: true },
      { step: 'detect', autoExecute: true },
      { step: 'visualize', autoExecute: true },
    ],
  },

  {
    id: 'customer-management',
    name: '客户管理表',
    industry: '通用',
    category: 'crm',
    description: '客户信息管理，支持客户分层、跟进记录、价值分析',

    fieldMapping: [
      { expectedName: '客户名称', expectedType: 'string', required: true, aliases: ['客户', '客户名', 'Company', 'Customer', '客户公司'] },
      { expectedName: '联系人', expectedType: 'string', required: false, aliases: ['联系人', '姓名', 'Contact', '负责人'] },
      { expectedName: '联系电话', expectedType: 'string', required: false, aliases: ['电话', '手机', 'Phone', 'Tel', '联系方式'] },
      { expectedName: '客户等级', expectedType: 'string', required: false, aliases: ['等级', '级别', 'Level', '客户类型', 'VIP等级'] },
      { expectedName: '成交金额', expectedType: 'number', required: false, aliases: ['金额', '成交额', 'Amount', '交易金额'] },
      { expectedName: '跟进日期', expectedType: 'date', required: false, aliases: ['日期', '跟进时间', 'Date', '联系日期'] },
      { expectedName: '跟进状态', expectedType: 'string', required: false, aliases: ['状态', '跟进阶段', 'Status', '客户状态'] },
      { expectedName: '所属行业', expectedType: 'string', required: false, aliases: ['行业', 'Industry', '领域'] },
    ],

    analysisRules: {
      metrics: [
        { name: '客户总数', type: 'count', field: '客户名称' },
        { name: '总成交金额', type: 'sum', field: '成交金额' },
        { name: '平均客单价', type: 'avg', field: '成交金额' },
        { name: '高价值客户数', type: 'count', field: '客户等级' },
      ],
      dimensions: ['客户等级', '所属行业', '跟进状态'],
      segments: [
        { name: '高价值客户', condition: '成交金额 > 平均成交金额 * 2', field: '成交金额' },
        { name: '待跟进客户', condition: '跟进状态 = "待跟进"', field: '跟进状态' },
      ],
      comparisons: [
        { name: '行业分布', type: 'group', fields: ['客户名称'] },
      ],
    },

    anomalyRules: [
      { field: '客户名称', type: 'null_rate', threshold: 0.05, severity: 'critical' },
      { field: '成交金额', type: 'outlier', threshold: 3, severity: 'warning' },
    ],

    visualizationConfig: {
      defaultView: 'dashboard',
      charts: [
        { type: 'pie', title: '客户等级分布', xField: '客户等级', yField: '客户名称' },
        { type: 'bar', title: '行业客户数', xField: '所属行业', yField: '客户名称' },
        { type: 'bar', title: '跟进状态分布', xField: '跟进状态', yField: '客户名称' },
      ],
      kpis: [
        { name: '客户总数', metric: 'count(客户名称)', format: 'number' },
        { name: '总成交金额', metric: 'sum(成交金额)', format: 'currency' },
        { name: '平均客单价', metric: 'avg(成交金额)', format: 'currency' },
        { name: '高价值客户', metric: 'count(成交金额 > 平均*2)', format: 'number' },
      ],
    },

    workflow: [
      { step: 'parse', autoExecute: true },
      { step: 'clean', autoExecute: true, config: { removeDuplicates: true, fillNulls: true } },
      { step: 'analyze', autoExecute: true },
      { step: 'detect', autoExecute: true },
      { step: 'visualize', autoExecute: true },
    ],
  },

  {
    id: 'employee-attendance',
    name: '员工考勤表',
    industry: '通用',
    category: 'hr',
    description: '员工考勤记录管理，支持工时统计、异常考勤检测',

    fieldMapping: [
      { expectedName: '员工姓名', expectedType: 'string', required: true, aliases: ['姓名', '员工', 'Name', 'Employee'] },
      { expectedName: '考勤日期', expectedType: 'date', required: true, aliases: ['日期', 'Date', '考勤时间'] },
      { expectedName: '上班时间', expectedType: 'string', required: false, aliases: ['上班', '签到', 'InTime', '上班时间'] },
      { expectedName: '下班时间', expectedType: 'string', required: false, aliases: ['下班', '签退', 'OutTime', '下班时间'] },
      { expectedName: '工作时长', expectedType: 'number', required: false, aliases: ['时长', '工时', 'Hours', '工作小时'] },
      { expectedName: '考勤状态', expectedType: 'string', required: false, aliases: ['状态', 'Status', '出勤状态', '考勤类型'] },
      { expectedName: '部门', expectedType: 'string', required: false, aliases: ['部门', 'Department', 'Dept'] },
    ],

    analysisRules: {
      metrics: [
        { name: '总出勤天数', type: 'count', field: '考勤日期' },
        { name: '平均工时', type: 'avg', field: '工作时长' },
        { name: '迟到次数', type: 'count', field: '考勤状态' },
        { name: '缺勤次数', type: 'count', field: '考勤状态' },
      ],
      dimensions: ['部门', '考勤状态', '员工姓名'],
      segments: [
        { name: '迟到人员', condition: '上班时间 > "09:00"', field: '上班时间' },
        { name: '工时不足', condition: '工作时长 < 8', field: '工作时长' },
      ],
      comparisons: [
        { name: '部门对比', type: 'group', fields: ['工作时长'] },
      ],
    },

    anomalyRules: [
      { field: '员工姓名', type: 'null_rate', threshold: 0.05, severity: 'critical' },
      { field: '工作时长', type: 'outlier', threshold: 3, severity: 'warning' },
      { field: '考勤日期', type: 'duplicate', threshold: 0.3, severity: 'warning' },
    ],

    visualizationConfig: {
      defaultView: 'dashboard',
      charts: [
        { type: 'bar', title: '部门平均工时', xField: '部门', yField: '工作时长' },
        { type: 'pie', title: '考勤状态分布', xField: '考勤状态', yField: '员工姓名' },
        { type: 'line', title: '月度出勤趋势', xField: '考勤日期', yField: '员工姓名' },
      ],
      kpis: [
        { name: '出勤天数', metric: 'count(考勤日期)', format: 'number' },
        { name: '平均工时', metric: 'avg(工作时长)', format: 'number' },
        { name: '迟到次数', metric: 'count(考勤状态="迟到")', format: 'number' },
        { name: '缺勤次数', metric: 'count(考勤状态="缺勤")', format: 'number' },
      ],
    },

    workflow: [
      { step: 'parse', autoExecute: true },
      { step: 'clean', autoExecute: true, config: { removeDuplicates: true, fillNulls: false } },
      { step: 'analyze', autoExecute: true },
      { step: 'detect', autoExecute: true },
      { step: 'visualize', autoExecute: true },
    ],
  },

  {
    id: 'project-tracking',
    name: '项目跟踪表',
    industry: '通用',
    category: 'project',
    description: '项目进度跟踪管理，支持甘特图、里程碑、延期预警',

    fieldMapping: [
      { expectedName: '项目名称', expectedType: 'string', required: true, aliases: ['项目', '名称', 'Project', '任务名称'] },
      { expectedName: '负责人', expectedType: 'string', required: false, aliases: ['负责人', '项目经理', 'Owner', 'PM'] },
      { expectedName: '开始日期', expectedType: 'date', required: true, aliases: ['开始', '启动日期', 'StartDate', '计划开始'] },
      { expectedName: '结束日期', expectedType: 'date', required: true, aliases: ['结束', '截止日期', 'EndDate', '计划结束'] },
      { expectedName: '项目状态', expectedType: 'string', required: false, aliases: ['状态', 'Status', '项目阶段', '进度'] },
      { expectedName: '完成百分比', expectedType: 'number', required: false, aliases: ['完成度', '进度', 'Progress', '完成率'] },
      { expectedName: '优先级', expectedType: 'string', required: false, aliases: ['优先级', 'Priority', '重要程度'] },
    ],

    analysisRules: {
      metrics: [
        { name: '项目总数', type: 'count', field: '项目名称' },
        { name: '进行中项目', type: 'count', field: '项目状态' },
        { name: '平均进度', type: 'avg', field: '完成百分比' },
        { name: '延期项目数', type: 'count', field: '项目状态' },
      ],
      dimensions: ['项目状态', '负责人', '优先级'],
      segments: [
        { name: '延期项目', condition: '结束日期 < 今天 AND 完成百分比 < 100', field: '结束日期' },
        { name: '高风险项目', condition: '优先级 = "高" AND 完成百分比 < 50', field: '优先级' },
      ],
      comparisons: [
        { name: '负责人负载', type: 'group', fields: ['项目名称'] },
      ],
    },

    anomalyRules: [
      { field: '项目名称', type: 'null_rate', threshold: 0.05, severity: 'critical' },
      { field: '完成百分比', type: 'range', threshold: 100, severity: 'warning' },
      { field: '结束日期', type: 'null_rate', threshold: 0.1, severity: 'critical' },
    ],

    visualizationConfig: {
      defaultView: 'dashboard',
      charts: [
        { type: 'bar', title: '项目进度一览', xField: '项目名称', yField: '完成百分比' },
        { type: 'pie', title: '项目状态分布', xField: '项目状态', yField: '项目名称' },
        { type: 'bar', title: '负责人项目数', xField: '负责人', yField: '项目名称' },
      ],
      kpis: [
        { name: '项目总数', metric: 'count(项目名称)', format: 'number' },
        { name: '进行中', metric: 'count(项目状态="进行中")', format: 'number' },
        { name: '平均进度', metric: 'avg(完成百分比)', format: 'percentage' },
        { name: '延期项目', metric: 'count(结束日期<今天 AND 完成<100)', format: 'number' },
      ],
    },

    workflow: [
      { step: 'parse', autoExecute: true },
      { step: 'clean', autoExecute: true, config: { removeDuplicates: true, fillNulls: false } },
      { step: 'analyze', autoExecute: true },
      { step: 'detect', autoExecute: true },
      { step: 'visualize', autoExecute: true },
    ],
  },
];

// ============================================================
// 模板匹配引擎
// ============================================================

export interface TemplateMatchResult {
  template: TemplateConfig;
  confidence: number;
  fieldMatches: Array<{
    expected: string;
    matched: string | null;
    confidence: number;
  }>;
  missingRequiredFields: string[];
}

/**
 * 基于用户数据的字段名，匹配最合适的模板
 */
export function matchTemplate(data: ParsedData): TemplateMatchResult | null {
  const userFields = data.headers.map(h => h.toLowerCase().trim());
  let bestMatch: TemplateMatchResult | null = null;
  let bestScore = 0;

  for (const template of TEMPLATE_LIBRARY) {
    const matches: TemplateMatchResult['fieldMatches'] = [];
    let matchScore = 0;
    const missingRequired: string[] = [];

    for (const mapping of template.fieldMapping) {
      const allNames = [mapping.expectedName.toLowerCase(), ...mapping.aliases.map(a => a.toLowerCase())];
      let matchedField: string | null = null;
      let maxFieldConfidence = 0;

      for (const userField of userFields) {
        for (const name of allNames) {
          const confidence = calculateFieldSimilarity(userField, name);
          if (confidence > maxFieldConfidence) {
            maxFieldConfidence = confidence;
            matchedField = data.headers[userFields.indexOf(userField)];
          }
        }
      }

      matches.push({
        expected: mapping.expectedName,
        matched: matchedField,
        confidence: maxFieldConfidence,
      });

      if (maxFieldConfidence > 0.6) {
        matchScore += maxFieldConfidence;
      } else if (mapping.required) {
        missingRequired.push(mapping.expectedName);
      }
    }

    const totalPossible = template.fieldMapping.length;
    const confidence = matchScore / totalPossible;

    if (confidence > bestScore && missingRequired.length === 0) {
      bestScore = confidence;
      bestMatch = { template, confidence, fieldMatches: matches, missingRequiredFields: missingRequired };
    }
  }

  return bestMatch && bestScore >= 0.3 ? bestMatch : null;
}

function calculateFieldSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;

  // 编辑距离
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  return 1 - distance / maxLen;
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

// ============================================================
// 模板全链路执行引擎
// ============================================================

export interface TemplateExecutionResult {
  templateId: string;
  templateName: string;
  steps: Array<{
    step: string;
    status: 'success' | 'skipped' | 'error';
    durationMs: number;
    result?: unknown;
    error?: string;
  }>;
  data: ParsedData;
  fieldStats: FieldStat[];
  analysis: ReturnType<typeof generateSummaryClient>;
  anomalies: ReturnType<typeof detectAnomaliesClient>;
  visualizations: TemplateConfig['visualizationConfig'];
}

/**
 * 执行模板全链路：选模板 → 自动清洗 → 识别 → 计算 → 检测 → 视图
 */
export async function executeTemplatePipeline(
  file: File,
  templateId: string,
  onProgress?: (step: string, progress: number) => void
): Promise<TemplateExecutionResult> {
  const template = TEMPLATE_LIBRARY.find(t => t.id === templateId);
  if (!template) throw new Error(`模板不存在: ${templateId}`);

  const startTime = Date.now();
  const steps: TemplateExecutionResult['steps'] = [];

  // Step 1: 解析文件（前端完成）
  const parseStart = Date.now();
  onProgress?.('解析文件', 10);
  const parsedData = await parseFileClient(file, (p) => onProgress?.('解析文件', 10 + p * 0.15));
  steps.push({ step: '解析文件', status: 'success', durationMs: Date.now() - parseStart });

  // Step 2: 自动清洗
  const cleanStart = Date.now();
  onProgress?.('数据清洗', 30);
  const cleanConfig = template.workflow.find(w => w.step === 'clean')?.config as CleanOptions | undefined;
  const cleanedData = cleanConfig
    ? cleanDataClient(parsedData, cleanConfig)
    : parsedData;
  steps.push({ step: '数据清洗', status: 'success', durationMs: Date.now() - cleanStart });

  // Step 3: 字段分析
  const analyzeStart = Date.now();
  onProgress?.('字段分析', 50);
  const fieldStats = analyzeFieldsClient(cleanedData);
  steps.push({ step: '字段分析', status: 'success', durationMs: Date.now() - analyzeStart });

  // Step 4: 指标计算
  const metricStart = Date.now();
  onProgress?.('指标计算', 65);
  const analysis = generateSummaryClient(cleanedData);
  steps.push({ step: '指标计算', status: 'success', durationMs: Date.now() - metricStart });

  // Step 5: 异常检测
  const detectStart = Date.now();
  onProgress?.('异常检测', 80);
  const anomalies = detectAnomaliesClient(cleanedData, fieldStats);
  steps.push({ step: '异常检测', status: 'success', durationMs: Date.now() - detectStart });

  // Step 6: 视图配置
  const vizStart = Date.now();
  onProgress?.('生成视图', 95);
  steps.push({ step: '生成视图', status: 'success', durationMs: Date.now() - vizStart });

  return {
    templateId: template.id,
    templateName: template.name,
    steps,
    data: cleanedData,
    fieldStats,
    analysis,
    anomalies,
    visualizations: template.visualizationConfig,
  };
}

// ============================================================
// 便捷函数
// ============================================================

export function getTemplateById(id: string): TemplateConfig | undefined {
  return TEMPLATE_LIBRARY.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): TemplateConfig[] {
  return TEMPLATE_LIBRARY.filter(t => t.category === category);
}

export function getAllTemplates(): TemplateConfig[] {
  return TEMPLATE_LIBRARY;
}

export function getTemplateCategories(): Array<{ id: string; name: string; count: number }> {
  const categories = new Map<string, number>();
  TEMPLATE_LIBRARY.forEach(t => {
    categories.set(t.category, (categories.get(t.category) || 0) + 1);
  });
  return Array.from(categories.entries()).map(([id, count]) => ({
    id,
    name: id,
    count,
  }));
}

// 类型导入
import type { CleanOptions } from './client-data-engine';
