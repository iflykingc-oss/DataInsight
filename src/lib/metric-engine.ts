/**
 * 标准化指标管理体系 - 指标计算引擎
 * 支持预置指标 + 自定义指标 + 实时计算
 */

import { CellValue } from '@/lib/data-processor';

// 指标定义
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  category: 'kpi' | 'process' | 'composite' | 'trend' | 'custom';
  scenario: string[]; // 适用场景标签
  formula: string; // 计算公式表达式
  unit?: string; // 单位
  format?: 'number' | 'percent' | 'currency' | 'ratio'; // 显示格式
  precision?: number; // 小数位数
  thresholds?: {
    // 阈值配置（用于告警）
    warning?: number;
    critical?: number;
    target?: number;
  };
  dependencies: string[]; // 依赖的原始字段
  createdAt: number;
  updatedAt: number;
  isPreset: boolean; // 是否为预置指标
  isCustom: boolean; // 是否为用户自定义
  version: number;
  tags: string[];
}

// 预置指标库 - 按场景分类
export const PRESET_METRICS: MetricDefinition[] = [
  // === 零售/销售场景 ===
  {
    id: 'preset_retail_gmv',
    name: 'GMV（成交总额）',
    description: '统计周期内所有订单的总金额',
    category: 'kpi',
    scenario: ['retail', 'ecommerce'],
    formula: 'SUM(销售额)',
    unit: '元',
    format: 'currency',
    precision: 2,
    dependencies: ['销售额'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['销售', '核心指标'],
  },
  {
    id: 'preset_retail_avg_order_value',
    name: '客单价',
    description: '平均每个订单的金额',
    category: 'kpi',
    scenario: ['retail', 'ecommerce'],
    formula: 'SUM(销售额) / COUNT(订单ID)',
    unit: '元',
    format: 'currency',
    precision: 2,
    dependencies: ['销售额', '订单ID'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['销售', '核心指标'],
  },
  {
    id: 'preset_retail_conversion_rate',
    name: '转化率',
    description: '成交订单数占总访问量的比例',
    category: 'process',
    scenario: ['retail', 'ecommerce', 'marketing'],
    formula: 'COUNT(订单ID) / COUNT(访问量) * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    thresholds: { warning: 2, critical: 1, target: 5 },
    dependencies: ['订单ID', '访问量'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['转化', '过程指标'],
  },
  {
    id: 'preset_retail_gross_margin',
    name: '毛利率',
    description: '毛利占销售额的比例',
    category: 'kpi',
    scenario: ['retail', 'ecommerce', 'finance'],
    formula: '(SUM(销售额) - SUM(成本)) / SUM(销售额) * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    thresholds: { warning: 15, critical: 10, target: 30 },
    dependencies: ['销售额', '成本'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['盈利', '核心指标'],
  },
  {
    id: 'preset_retail_inventory_turnover',
    name: '库存周转率',
    description: '销售成本与平均库存的比值',
    category: 'process',
    scenario: ['retail', 'supply_chain'],
    formula: 'SUM(销售成本) / AVG(库存金额)',
    unit: '次',
    format: 'number',
    precision: 2,
    dependencies: ['销售成本', '库存金额'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['库存', '供应链'],
  },
  // === 用户运营场景 ===
  {
    id: 'preset_user_dau',
    name: 'DAU（日活跃用户）',
    description: '每日活跃用户数',
    category: 'kpi',
    scenario: ['user_operation'],
    formula: 'COUNT_DISTINCT(用户ID)',
    unit: '人',
    format: 'number',
    precision: 0,
    dependencies: ['用户ID'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['用户', '核心指标'],
  },
  {
    id: 'preset_user_retention',
    name: '7日留存率',
    description: '新增用户7天后仍活跃的比例',
    category: 'kpi',
    scenario: ['user_operation'],
    formula: 'COUNT(7日留存用户) / COUNT(新增用户) * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    thresholds: { warning: 20, critical: 10, target: 40 },
    dependencies: ['7日留存用户', '新增用户'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['留存', '核心指标'],
  },
  {
    id: 'preset_user_arpu',
    name: 'ARPU（每用户平均收入）',
    description: '总收入除以活跃用户数',
    category: 'kpi',
    scenario: ['user_operation', 'ecommerce'],
    formula: 'SUM(收入) / COUNT_DISTINCT(用户ID)',
    unit: '元',
    format: 'currency',
    precision: 2,
    dependencies: ['收入', '用户ID'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['收入', '用户价值'],
  },
  // === 财务场景 ===
  {
    id: 'preset_finance_roi',
    name: 'ROI（投资回报率）',
    description: '净利润与投资成本的比值',
    category: 'kpi',
    scenario: ['finance', 'marketing'],
    formula: '(SUM(收入) - SUM(成本)) / SUM(成本) * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    thresholds: { warning: 50, critical: 0, target: 100 },
    dependencies: ['收入', '成本'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['投资', '核心指标'],
  },
  {
    id: 'preset_finance_profit_margin',
    name: '净利率',
    description: '净利润占收入的比例',
    category: 'kpi',
    scenario: ['finance', 'retail'],
    formula: 'SUM(净利润) / SUM(收入) * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    thresholds: { warning: 5, critical: 0, target: 15 },
    dependencies: ['净利润', '收入'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['盈利', '财务'],
  },
  {
    id: 'preset_finance_cost_ratio',
    name: '成本占比',
    description: '各项成本占总收入的比例',
    category: 'process',
    scenario: ['finance'],
    formula: 'SUM(成本) / SUM(收入) * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    thresholds: { warning: 80, critical: 90, target: 60 },
    dependencies: ['成本', '收入'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['成本', '财务'],
  },
  // === 人力场景 ===
  {
    id: 'preset_hr_headcount',
    name: '在职人数',
    description: '当前在职员工总数',
    category: 'kpi',
    scenario: ['hr'],
    formula: 'COUNT(员工ID)',
    unit: '人',
    format: 'number',
    precision: 0,
    dependencies: ['员工ID'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['人力', '核心指标'],
  },
  {
    id: 'preset_hr_turnover_rate',
    name: '员工流失率',
    description: '离职员工占在职员工的比例',
    category: 'kpi',
    scenario: ['hr'],
    formula: 'COUNT(离职员工) / COUNT(在职员工) * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    thresholds: { warning: 15, critical: 25, target: 5 },
    dependencies: ['离职员工', '在职员工'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['人力', '流失'],
  },
  {
    id: 'preset_hr_per_capita_output',
    name: '人均产出',
    description: '总收入除以在职员工数',
    category: 'kpi',
    scenario: ['hr', 'finance'],
    formula: 'SUM(收入) / COUNT(员工ID)',
    unit: '元',
    format: 'currency',
    precision: 2,
    dependencies: ['收入', '员工ID'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['人力', '效率'],
  },
  // === 通用指标 ===
  {
    id: 'preset_general_growth_rate',
    name: '增长率',
    description: '本期相对上期的增长百分比',
    category: 'trend',
    scenario: ['general', 'retail', 'ecommerce', 'finance'],
    formula: '(本期值 - 上期值) / 上期值 * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    dependencies: ['本期值', '上期值'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['增长', '趋势'],
  },
  {
    id: 'preset_general_completion_rate',
    name: '完成率',
    description: '实际完成值占目标值的比例',
    category: 'kpi',
    scenario: ['general', 'retail', 'finance', 'hr'],
    formula: 'SUM(实际值) / SUM(目标值) * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    thresholds: { warning: 80, critical: 60, target: 100 },
    dependencies: ['实际值', '目标值'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['完成', '目标'],
  },
  {
    id: 'preset_general_yoy',
    name: '同比增长率',
    description: '本期相对去年同期的增长百分比',
    category: 'trend',
    scenario: ['general', 'retail', 'ecommerce', 'finance'],
    formula: '(本期值 - 去年同期值) / 去年同期值 * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    dependencies: ['本期值', '去年同期值'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['增长', '同比', '趋势'],
  },
  {
    id: 'preset_general_mom',
    name: '环比增长率',
    description: '本期相对上期的增长百分比',
    category: 'trend',
    scenario: ['general', 'retail', 'ecommerce', 'finance'],
    formula: '(本月值 - 上月值) / 上月值 * 100',
    unit: '%',
    format: 'percent',
    precision: 2,
    dependencies: ['本月值', '上月值'],
    createdAt: 0,
    updatedAt: 0,
    isPreset: true,
    isCustom: false,
    version: 1,
    tags: ['增长', '环比', '趋势'],
  },
];

// 场景映射
export const SCENARIO_LABELS: Record<string, string> = {
  retail: '零售/销售',
  ecommerce: '电商',
  user_operation: '用户运营',
  finance: '财务/成本',
  hr: '人力/组织',
  marketing: '市场营销',
  supply_chain: '供应链/库存',
  education: '教育/培训',
  general: '通用业务',
};

// 指标分类标签
export const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  kpi: { label: '核心KPI', color: 'bg-red-100 text-red-700' },
  process: { label: '过程指标', color: 'bg-blue-100 text-blue-700' },
  composite: { label: '复合指标', color: 'bg-purple-100 text-purple-700' },
  trend: { label: '趋势指标', color: 'bg-green-100 text-green-700' },
  custom: { label: '自定义', color: 'bg-amber-100 text-amber-700' },
};

// 公式解析与计算
export interface ComputeContext {
  headers: string[];
  rows: Record<string, CellValue>[];
}

/**
 * 计算指标值
 * 支持公式: SUM, AVG, COUNT, COUNT_DISTINCT, MAX, MIN, MEDIAN
 */
export function computeMetric(
  metric: MetricDefinition,
  context: ComputeContext
): { value: number | null; error?: string; computedAt: number } {
  try {
    const { headers, rows } = context;
    const formula = metric.formula;

    // 检查依赖字段是否存在
    for (const dep of metric.dependencies) {
      if (!headers.includes(dep)) {
        return {
          value: null,
          error: `缺少依赖字段: ${dep}`,
          computedAt: Date.now(),
        };
      }
    }

    // 提取数值列
    const getNumericValues = (field: string): number[] => {
      return rows
        .map(r => {
          const v = r[field];
          if (typeof v === 'number') return v;
          if (typeof v === 'string') {
            const parsed = parseFloat(v.replace(/[,%¥$]/g, ''));
            return isNaN(parsed) ? 0 : parsed;
          }
          return 0;
        })
        .filter(v => !isNaN(v));
    };

    // 简单公式解析
    let result = 0;

    if (formula.startsWith('SUM(') && formula.endsWith(')')) {
      const field = formula.slice(4, -1);
      const values = getNumericValues(field);
      result = values.reduce((a, b) => a + b, 0);
    } else if (formula.startsWith('AVG(') && formula.endsWith(')')) {
      const field = formula.slice(4, -1);
      const values = getNumericValues(field);
      result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    } else if (formula.startsWith('COUNT(') && formula.endsWith(')')) {
      const field = formula.slice(6, -1);
      if (field === '*') {
        result = rows.length;
      } else {
        result = rows.filter(r => r[field] !== null && r[field] !== undefined && r[field] !== '').length;
      }
    } else if (formula.startsWith('COUNT_DISTINCT(') && formula.endsWith(')')) {
      const field = formula.slice(15, -1);
      const unique = new Set(rows.map(r => String(r[field] ?? '')).filter(v => v !== ''));
      result = unique.size;
    } else if (formula.startsWith('MAX(') && formula.endsWith(')')) {
      const field = formula.slice(4, -1);
      const values = getNumericValues(field);
      result = values.length > 0 ? Math.max(...values) : 0;
    } else if (formula.startsWith('MIN(') && formula.endsWith(')')) {
      const field = formula.slice(4, -1);
      const values = getNumericValues(field);
      result = values.length > 0 ? Math.min(...values) : 0;
    } else if (formula.startsWith('MEDIAN(') && formula.endsWith(')')) {
      const field = formula.slice(7, -1);
      const values = getNumericValues(field).sort((a, b) => a - b);
      const mid = Math.floor(values.length / 2);
      result = values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
    } else {
      // 复杂公式：使用简单表达式求值
      result = evaluateComplexFormula(formula, context);
    }

    return { value: result, computedAt: Date.now() };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : '计算错误',
      computedAt: Date.now(),
    };
  }
}

/**
 * 计算复杂公式（支持基本四则运算）
 */
function evaluateComplexFormula(formula: string, context: ComputeContext): number {
  // 替换聚合函数
  let expr = formula;

  // SUM(field)
  expr = expr.replace(/SUM\(([^)]+)\)/g, (_, field) => {
    const values = context.rows
      .map(r => {
        const v = r[field.trim()];
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const parsed = parseFloat(v.replace(/[,%¥$]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      })
      .filter(v => !isNaN(v));
    return String(values.reduce((a, b) => a + b, 0));
  });

  // COUNT(field)
  expr = expr.replace(/COUNT\(([^)]+)\)/g, (_, field) => {
    if (field.trim() === '*') return String(context.rows.length);
    return String(
      context.rows.filter(r => r[field.trim()] !== null && r[field.trim()] !== undefined).length
    );
  });

  // AVG(field)
  expr = expr.replace(/AVG\(([^)]+)\)/g, (_, field) => {
    const values = context.rows
      .map(r => {
        const v = r[field.trim()];
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          const parsed = parseFloat(v.replace(/[,%¥$]/g, ''));
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      })
      .filter(v => !isNaN(v));
    return String(values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
  });

  // 安全求值 - 只包含数字和运算符
  if (!/^[\d\s+\-*/().]+$/.test(expr)) {
    throw new Error('公式包含不支持的语法');
  }

  // eslint-disable-next-line no-eval
  return eval(expr);
}

/**
 * 格式化指标值
 */
export function formatMetricValue(
  value: number | null,
  format: MetricDefinition['format'],
  precision: number = 2,
  unit?: string
): string {
  if (value === null || value === undefined || isNaN(value)) return '-';

  let formatted = '';
  switch (format) {
    case 'percent':
      formatted = `${value.toFixed(precision)}%`;
      break;
    case 'currency':
      formatted = `¥${value.toFixed(precision)}`;
      break;
    case 'ratio':
      formatted = value.toFixed(precision);
      break;
    case 'number':
    default:
      formatted = Number.isInteger(value) ? String(value) : value.toFixed(precision);
      break;
  }

  return unit && format !== 'currency' ? `${formatted} ${unit}` : formatted;
}

/**
 * 检查指标阈值状态
 */
export function checkThresholdStatus(
  value: number,
  thresholds: MetricDefinition['thresholds']
): { status: 'normal' | 'warning' | 'critical' | 'target'; message?: string } {
  if (!thresholds) return { status: 'normal' };

  if (thresholds.critical !== undefined && value <= thresholds.critical) {
    return { status: 'critical', message: `低于临界值 ${thresholds.critical}` };
  }
  if (thresholds.warning !== undefined && value <= thresholds.warning) {
    return { status: 'warning', message: `低于警告值 ${thresholds.warning}` };
  }
  if (thresholds.target !== undefined && value >= thresholds.target) {
    return { status: 'target', message: `达到目标值 ${thresholds.target}` };
  }

  return { status: 'normal' };
}

/**
 * 从localStorage加载用户自定义指标
 */
export function loadCustomMetrics(): MetricDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('datainsight_custom_metrics');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

/**
 * 保存用户自定义指标到localStorage
 */
export function saveCustomMetrics(metrics: MetricDefinition[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('datainsight_custom_metrics', JSON.stringify(metrics));
}

/**
 * 检测数据适配的预置指标
 */
export function detectApplicableMetrics(
  headers: string[],
  scenario?: string
): MetricDefinition[] {
  const headerSet = new Set(headers.map(h => h.toLowerCase()));

  return PRESET_METRICS.filter(metric => {
    // 场景过滤
    if (scenario && scenario !== 'general' && !metric.scenario.includes(scenario)) {
      return false;
    }

    // 检查依赖字段匹配度
    const matchCount = metric.dependencies.filter(dep => {
      const depLower = dep.toLowerCase();
      return headerSet.has(depLower) || headers.some(h => h.toLowerCase().includes(depLower));
    }).length;

    // 至少匹配一个依赖字段
    return matchCount > 0;
  });
}

/**
 * 创建自定义指标
 */
export function createCustomMetric(params: {
  name: string;
  description: string;
  category: MetricDefinition['category'];
  formula: string;
  dependencies: string[];
  unit?: string;
  format?: MetricDefinition['format'];
  precision?: number;
}): MetricDefinition {
  return {
    id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: params.name,
    description: params.description,
    category: params.category,
    scenario: ['custom'],
    formula: params.formula,
    unit: params.unit,
    format: params.format || 'number',
    precision: params.precision || 2,
    dependencies: params.dependencies,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isPreset: false,
    isCustom: true,
    version: 1,
    tags: ['自定义'],
  };
}
