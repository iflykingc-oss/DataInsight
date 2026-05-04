import type { ParsedData, CellValue } from '@/types';
import type { ProblemReport } from '../algorithms';

export interface SkillStep {
  id: string;
  name: string;
  description: string;
  tool: string;
  params: Record<string, unknown>;
  estimatedTime?: number;
  estimatedImpact?: 'low' | 'medium' | 'high';
  requiresConfirmation?: boolean;
  condition?: (data: ParsedData) => boolean;
  rollbackTool?: string;
  rollbackParams?: Record<string, unknown>;
  validation?: StepValidation;
  retryPolicy?: RetryPolicy;
  alternatives?: AlternativeStep[];
}

export interface StepValidation {
  validateAfter?: (data: ParsedData, result: unknown) => ValidationResult;
  preValidate?: (data: ParsedData) => ValidationResult;
}

export interface ValidationResult {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code?: string;
  suggestion?: string;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier?: number;
  initialDelayMs?: number;
  retryableErrors?: string[];
  fallbackAction?: 'skip' | 'rollback' | 'continue';
}

export interface AlternativeStep {
  stepId: string;
  condition: (error: unknown) => boolean;
  description: string;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'data' | 'format' | 'analysis' | 'export' | 'transform';
  triggerKeywords: string[];
  version: string;
  tags?: string[];

  execution: {
    type: 'sequential' | 'parallel' | 'conditional';
    steps: SkillStep[];
    requiresConfirmation: boolean | 'complex_only';
    autoExecuteOnSimple: boolean;
    maxRetries?: number;
    timeout?: number;
    parallelBatchSize?: number;
    continueOnError?: boolean;
    rollbackOnFailure?: boolean;
  };

  output: {
    showPreview: boolean;
    previewCount: number;
    showExecutionLog: boolean;
    logLevel: 'summary' | 'detailed' | 'verbose';
    explainChanges: boolean;
  };

  requirements?: {
    minRows?: number;
    minCols?: number;
    requiredColumns?: string[];
    supportedFormats?: string[];
  };

  examples?: string[];
}

export interface LogEntry {
  id: string;
  step: number;
  stepName: string;
  action: string;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped' | 'rolled_back';
  detail?: string;
  error?: string;
  warning?: string;
  timestamp: number;
  duration?: number;
  retryCount?: number;
  dataSnapshot?: string;
}

export interface ExecutionResult {
  success: boolean;
  status: 'success' | 'failed' | 'cancelled' | 'partial' | 'rolled_back';
  log: LogEntry[];
  newData?: ParsedData;
  summary?: string;
  changes?: ChangeRecord[];
  error?: string;
  partialErrors?: string[];
  rollbackPerformed?: boolean;
  executionTime?: number;
  stepsCompleted?: number;
  totalSteps?: number;
}

export interface ChangeRecord {
  type: 'rows' | 'columns' | 'cells' | 'format' | 'data';
  before: number | string;
  after: number | string;
  description: string;
  affectedRows?: number[];
  affectedCols?: string[];
}

export interface SkillContext {
  originalData: ParsedData;
  currentData: ParsedData;
  problemReport?: ProblemReport;
  sessionId: string;
  timestamp: number;
  scenario?: string;
  operationSnapshot?: DataSnapshot;
  userConfirmToken?: string;
}

export interface DataSnapshot {
  id: string;
  data: ParsedData;
  timestamp: number;
  description: string;
}

export interface ExecutionPlan {
  skillId: string;
  skillName: string;
  steps: PlannedStep[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  totalSteps: number;
  requiresConfirmation: boolean;
  warnings?: string[];
}

export interface PlannedStep {
  stepId: string;
  stepName: string;
  tool: string;
  params: Record<string, unknown>;
  reasoning: string;
  willExecute: boolean;
  estimatedImpact?: 'low' | 'medium' | 'high';
  skipReason?: string;
}

export interface ValidationResult_Global {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError_Global {
  stepIndex: number;
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationWarning_Global {
  stepIndex: number;
  message: string;
}

export interface ToolResult {
  success: boolean;
  newData: ParsedData;
  summary: string;
  changes?: ChangeRecord[];
  error?: string;
  affectedRows?: number[];
  affectedCols?: string[];
  metadata?: Record<string, unknown>;
}

export type ToolHandler = (
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
) => Promise<ToolResult>;

export interface ToolMetadata {
  name: string;
  description: string;
  category: 'filter' | 'transform' | 'validate' | 'analyze' | 'format';
  parameters?: ParameterDefinition[];
  returns?: ParameterDefinition[];
}

export interface ParameterDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: unknown;
  description?: string;
  validation?: (value: unknown) => boolean;
}

export const TOOL_HANDLERS: Record<string, ToolHandler> = {};
export const TOOL_METADATA: Record<string, ToolMetadata> = {};

export function registerTool(name: string, handler: ToolHandler, metadata?: ToolMetadata) {
  TOOL_HANDLERS[name] = handler;
  if (metadata) {
    TOOL_METADATA[name] = metadata;
  }
}

export function getToolMetadata(name: string): ToolMetadata | undefined {
  return TOOL_METADATA[name];
}

export const SKILL_REGISTRY: SkillDefinition[] = [
  {
    id: 'problem-detection',
    name: '问题检测',
    description: '全面检测表格中的各类数据质量问题',
    icon: '🔍',
    category: 'analysis',
    triggerKeywords: ['检测', '问题', '健康度', '诊断', '检查', '质量'],
    version: '1.0.0',
    tags: ['诊断', '分析'],
    execution: {
      type: 'parallel',
      steps: [
        { id: 'detect-empty', name: '检测空行', description: '检测完全空白的行', tool: 'detect_empty_rows', estimatedImpact: 'low' },
        { id: 'detect-duplicates', name: '检测重复行', description: '检测完全重复的行', tool: 'detect_duplicate_rows', estimatedImpact: 'medium' },
        { id: 'detect-format', name: '检测格式问题', description: '检测日期/数字格式不一致', tool: 'detect_date_format_issues', estimatedImpact: 'medium' },
        { id: 'detect-type', name: '检测类型混乱', description: '检测列内数据类型不一致', tool: 'detect_type_mismatch', estimatedImpact: 'medium' },
        { id: 'detect-missing', name: '检测缺失值', description: '检测各列的空值数量', tool: 'detect_missing_values', estimatedImpact: 'high' },
        { id: 'detect-outliers', name: '检测异常值', description: '使用 IQR 算法检测异常值', tool: 'detect_outliers', estimatedImpact: 'low' },
        { id: 'detect-spelling', name: '检测拼写错误', description: '检测文本列的拼写错误', tool: 'detect_spelling_errors', estimatedImpact: 'low' },
        { id: 'detect-encoding', name: '检测编码问题', description: '检测乱码和特殊字符', tool: 'detect_encoding_issues', estimatedImpact: 'low' },
      ],
      requiresConfirmation: false,
      autoExecuteOnSimple: true,
      parallelBatchSize: 4,
    },
    output: {
      showPreview: false,
      previewCount: 0,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: true,
    },
    examples: ['检查数据有什么问题', '分析表格健康度', '诊断数据质量'],
  },
  {
    id: 'one-click-format',
    name: '一键规整',
    description: '统一列宽、全局居中、表头加粗、美化表格',
    icon: '🧹',
    category: 'format',
    triggerKeywords: ['规整', '整理', '美化', '格式化', '统一格式', '规范化外观'],
    version: '1.0.0',
    tags: ['格式化', '美化'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'remove-empty', name: '删除空行', description: '删除完全空白的行', tool: 'remove_empty_rows', condition: (d) => d.rows.length > 10, estimatedImpact: 'medium' },
        { id: 'trim-space', name: '去除空格', description: '去除文本首尾多余空格', tool: 'trim_whitespace', estimatedImpact: 'low' },
        { id: 'standardize-text', name: '文本标准化', description: '统一文本大小写和格式', tool: 'standardize_text_case', estimatedImpact: 'low' },
        { id: 'auto-fit', name: '调整列宽', description: '根据内容自动调整列宽', tool: 'auto_fit_width', estimatedImpact: 'low' },
      ],
      requiresConfirmation: false,
      autoExecuteOnSimple: true,
    },
    output: {
      showPreview: false,
      previewCount: 0,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: true,
    },
    examples: ['整理表格格式', '美化表格', '统一表格样式'],
  },
  {
    id: 'one-click-clean',
    name: '一键清理',
    description: '删除空行空列、去重、剔除无效内容、格式标准化',
    icon: '🧼',
    category: 'data',
    triggerKeywords: ['清理', '清洗', '去脏', '规范化', '数据清洗', '清洁数据'],
    version: '1.0.0',
    tags: ['清洗', '数据处理'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'remove-empty-rows', name: '删除空行', description: '删除所有空行', tool: 'remove_empty_rows', estimatedImpact: 'medium', rollbackTool: 'restore_rows', rollbackParams: {} },
        { id: 'remove-empty-cols', name: '删除空列', description: '删除所有空列', tool: 'remove_empty_columns', estimatedImpact: 'low', rollbackTool: 'restore_columns', rollbackParams: {} },
        { id: 'remove-duplicates', name: '删除重复行', description: '删除重复数据行', tool: 'remove_duplicates', estimatedImpact: 'medium', rollbackTool: 'restore_rows', rollbackParams: {}, requiresConfirmation: true },
        { id: 'trim-whitespace', name: '去除空格', description: '去除文本首尾空格', tool: 'trim_whitespace', estimatedImpact: 'low' },
        { id: 'standardize-date', name: '日期格式标准化', description: '统一日期为 YYYY-MM-DD', tool: 'standardize_date_format', estimatedImpact: 'medium' },
        { id: 'standardize-number', name: '数字格式标准化', description: '统一数字格式', tool: 'standardize_number_format', estimatedImpact: 'low' },
        { id: 'fix-type-errors', name: '修复类型错误', description: '修复明显的类型错误', tool: 'fix_type_errors', estimatedImpact: 'low' },
        { id: 'remove-encoding-issues', name: '修复编码问题', description: '修复乱码和特殊字符', tool: 'fix_encoding_issues', estimatedImpact: 'low' },
      ],
      requiresConfirmation: true,
      autoExecuteOnSimple: false,
      rollbackOnFailure: true,
    },
    output: {
      showPreview: true,
      previewCount: 5,
      showExecutionLog: true,
      logLevel: 'verbose',
      explainChanges: true,
    },
    examples: ['清洗数据', '清理脏数据', '规范化数据'],
  },
  {
    id: 'smart-filter',
    name: '智能筛选',
    description: '根据条件筛选数据，支持复杂条件组合和多步筛选',
    icon: '🔍',
    category: 'data',
    triggerKeywords: ['筛选', '过滤', '查询', '找出', '只留', '保留', '过滤出', '查找'],
    version: '1.0.0',
    tags: ['筛选', '查询'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'parse-condition', name: '解析条件', description: '理解用户筛选条件', tool: 'parse_filter_condition', estimatedImpact: 'low' },
        { id: 'validate-condition', name: '验证条件', description: '验证筛选条件的有效性', tool: 'validate_filter_params', estimatedImpact: 'low' },
        { id: 'apply-filter', name: '应用筛选', description: '执行筛选操作', tool: 'filter_by_condition', estimatedImpact: 'high' },
        { id: 'validate-result', name: '验证结果', description: '验证筛选结果', tool: 'validate_filter_result', estimatedImpact: 'low' },
      ],
      requiresConfirmation: 'complex_only',
      autoExecuteOnSimple: true,
      continueOnError: true,
    },
    output: {
      showPreview: true,
      previewCount: 5,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: true,
    },
    examples: ['筛选销售额大于10000的', '找出北京的用户', '只保留已付款的订单'],
  },
  {
    id: 'advanced-sort',
    name: '高级排序',
    description: '按多个字段排序，支持自定义排序规则和排序预览',
    icon: '📊',
    category: 'data',
    triggerKeywords: ['排序', '按...排序', '从大到小', '从小到大', '倒序', '正序'],
    version: '1.0.0',
    tags: ['排序'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'parse-sort', name: '解析排序规则', description: '理解用户排序要求', tool: 'parse_sort_params', estimatedImpact: 'low' },
        { id: 'validate-sort', name: '验证排序参数', description: '验证排序参数的有效性', tool: 'validate_sort_params', estimatedImpact: 'low' },
        { id: 'preview-sort', name: '预览排序', description: '预览排序效果', tool: 'preview_sort', estimatedImpact: 'low' },
        { id: 'apply-sort', name: '执行排序', description: '应用排序', tool: 'sort_data', estimatedImpact: 'medium' },
      ],
      requiresConfirmation: false,
      autoExecuteOnSimple: true,
    },
    output: {
      showPreview: true,
      previewCount: 10,
      showExecutionLog: true,
      logLevel: 'summary',
      explainChanges: true,
    },
    examples: ['按销售额从大到小排序', '先按日期再按金额排序', '排名'],
  },
  {
    id: 'data-deduplication',
    name: '智能去重',
    description: '智能识别并删除重复数据，支持自定义去重键',
    icon: '📋',
    category: 'data',
    triggerKeywords: ['去重', '删除重复', '去除重复', '重复数据', '排重'],
    version: '1.0.0',
    tags: ['去重', '数据清洗'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'detect-dup-method', name: '检测去重方式', description: '确定去重依据列', tool: 'detect_deduplication_method', estimatedImpact: 'low' },
        { id: 'analyze-duplicates', name: '分析重复', description: '分析重复数据分布', tool: 'analyze_duplicates', estimatedImpact: 'low' },
        { id: 'find-duplicates', name: '查找重复', description: '找出重复行', tool: 'find_duplicates', estimatedImpact: 'low' },
        { id: 'preview-deletion', name: '预览删除', description: '预览将要删除的重复行', tool: 'preview_deletion', estimatedImpact: 'medium' },
        { id: 'remove-duplicates', name: '删除重复', description: '删除重复行', tool: 'remove_duplicates', estimatedImpact: 'high', rollbackTool: 'restore_rows', rollbackParams: {} },
      ],
      requiresConfirmation: true,
      autoExecuteOnSimple: false,
      rollbackOnFailure: true,
    },
    output: {
      showPreview: true,
      previewCount: 10,
      showExecutionLog: true,
      logLevel: 'verbose',
      explainChanges: true,
    },
    examples: ['删除重复行', '按姓名去重', '去除重复数据'],
  },
  {
    id: 'fill-missing',
    name: '缺失值处理',
    description: '智能填充缺失值，支持多种策略和智能建议',
    icon: '🩹',
    category: 'data',
    triggerKeywords: ['填充缺失', '补全空值', '填补空值', '空值处理', '填充空值'],
    version: '1.0.0',
    tags: ['缺失值', '数据补全'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'analyze-missing', name: '分析缺失', description: '分析缺失值分布', tool: 'analyze_missing_values', estimatedImpact: 'low' },
        { id: 'suggest-strategy', name: '建议策略', description: '推荐填充策略', tool: 'suggest_fill_strategy', estimatedImpact: 'low' },
        { id: 'preview-fill', name: '预览填充', description: '预览填充效果', tool: 'preview_fill', estimatedImpact: 'low' },
        { id: 'apply-fill', name: '应用填充', description: '执行填充', tool: 'fill_missing_values', estimatedImpact: 'high', rollbackTool: 'restore_missing', rollbackParams: {} },
      ],
      requiresConfirmation: true,
      autoExecuteOnSimple: false,
      rollbackOnFailure: true,
    },
    output: {
      showPreview: true,
      previewCount: 5,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: true,
    },
    examples: ['填充空值', '用均值填充缺失', '补全缺失数据'],
  },
  {
    id: 'column-extract',
    name: '提取列',
    description: '按条件提取指定的列，支持列重命名和列排序',
    icon: '📤',
    category: 'data',
    triggerKeywords: ['提取列', '选取列', '选择列', '截取列', '保留列', '删除其他列'],
    version: '1.0.0',
    tags: ['列操作', '数据提取'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'parse-columns', name: '解析列名', description: '识别要提取的列', tool: 'parse_column_selection', estimatedImpact: 'low' },
        { id: 'validate-columns', name: '验证列', description: '验证列的有效性', tool: 'validate_column_selection', estimatedImpact: 'low' },
        { id: 'extract-columns', name: '提取列', description: '执行提取', tool: 'extract_columns', estimatedImpact: 'high', rollbackTool: 'restore_columns', rollbackParams: {} },
      ],
      requiresConfirmation: true,
      autoExecuteOnSimple: false,
      rollbackOnFailure: true,
    },
    output: {
      showPreview: true,
      previewCount: 5,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: true,
    },
    examples: ['只保留姓名和销售额列', '提取这几列', '删除其他列'],
  },
  {
    id: 'row-extract',
    name: '提取行',
    description: '按范围或条件提取行，支持抽样和随机抽样',
    icon: '📤',
    category: 'data',
    triggerKeywords: ['提取行', '选取行', '选择行', '截取行', '保留行', '获取前几行'],
    version: '1.0.0',
    tags: ['行操作', '数据提取'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'parse-range', name: '解析范围', description: '识别行范围', tool: 'parse_row_range', estimatedImpact: 'low' },
        { id: 'validate-range', name: '验证范围', description: '验证范围的合法性', tool: 'validate_row_range', estimatedImpact: 'low' },
        { id: 'extract-rows', name: '提取行', description: '执行提取', tool: 'extract_rows', estimatedImpact: 'high', rollbackTool: 'restore_rows', rollbackParams: {} },
      ],
      requiresConfirmation: true,
      autoExecuteOnSimple: false,
      rollbackOnFailure: true,
    },
    output: {
      showPreview: true,
      previewCount: 5,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: true,
    },
    examples: ['只保留前100行', '提取第10到20行', '随机抽取10行'],
  },
  {
    id: 'data-analysis',
    name: '数据分析',
    description: '对表格数据进行多维度统计分析',
    icon: '📈',
    category: 'analysis',
    triggerKeywords: ['分析', '统计', '汇总', '计算', '诊断'],
    version: '1.0.0',
    tags: ['分析', '统计'],
    execution: {
      type: 'parallel',
      steps: [
        { id: 'basic-stats', name: '基本统计', description: '计算基本统计量', tool: 'calculate_basic_stats', estimatedImpact: 'low' },
        { id: 'correlation', name: '相关性分析', description: '计算列间相关性', tool: 'calculate_correlation', estimatedImpact: 'low' },
        { id: 'distribution', name: '分布分析', description: '分析数据分布', tool: 'analyze_distribution', estimatedImpact: 'low' },
        { id: 'outliers', name: '异常值检测', description: '检测异常值', tool: 'detect_outliers', estimatedImpact: 'low' },
        { id: 'trend', name: '趋势分析', description: '分析时间序列趋势', tool: 'analyze_trend', estimatedImpact: 'low' },
      ],
      requiresConfirmation: false,
      autoExecuteOnSimple: true,
      parallelBatchSize: 3,
    },
    output: {
      showPreview: false,
      previewCount: 0,
      showExecutionLog: true,
      logLevel: 'summary',
      explainChanges: false,
    },
    examples: ['分析数据', '统计汇总', '计算各项指标'],
  },
  {
    id: 'data-aggregation',
    name: '数据聚合',
    description: '按指定维度聚合数据，支持多种聚合函数',
    icon: '🔢',
    category: 'analysis',
    triggerKeywords: ['聚合', '汇总', '分类汇总', '分组', '按...汇总', '求和', '求平均'],
    version: '1.0.0',
    tags: ['聚合', '汇总'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'parse-agg', name: '解析聚合', description: '理解聚合要求', tool: 'parse_aggregation_params', estimatedImpact: 'low' },
        { id: 'group-data', name: '分组数据', description: '按维度分组', tool: 'group_data', estimatedImpact: 'high' },
        { id: 'calculate-agg', name: '计算聚合', description: '执行聚合计算', tool: 'calculate_aggregation', estimatedImpact: 'high' },
        { id: 'format-result', name: '格式化结果', description: '格式化输出', tool: 'format_aggregation_result', estimatedImpact: 'low' },
      ],
      requiresConfirmation: false,
      autoExecuteOnSimple: true,
    },
    output: {
      showPreview: true,
      previewCount: 10,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: true,
    },
    examples: ['按部门统计销售额', '汇总各品类销量', '计算平均工资'],
  },
  {
    id: 'data-transform',
    name: '数据转换',
    description: '支持数据转置、透视、逆透视等高级转换',
    icon: '🔄',
    category: 'transform',
    triggerKeywords: ['转换', '变换', '转置', '透视', '逆透视', '变换'],
    version: '1.0.0',
    tags: ['转换', '透视'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'parse-transform', name: '解析转换', description: '理解转换类型', tool: 'parse_transform_params', estimatedImpact: 'low' },
        { id: 'validate-transform', name: '验证转换', description: '验证转换可行性', tool: 'validate_transform', estimatedImpact: 'low' },
        { id: 'apply-transform', name: '应用转换', description: '执行转换', tool: 'apply_transform', estimatedImpact: 'high' },
      ],
      requiresConfirmation: true,
      autoExecuteOnSimple: false,
      rollbackOnFailure: true,
    },
    output: {
      showPreview: true,
      previewCount: 5,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: true,
    },
    examples: ['转置数据', '创建透视表', '逆透视'],
  },
  {
    id: 'data-validation',
    name: '数据校验',
    description: '校验数据合法性，支持自定义校验规则',
    icon: '✅',
    category: 'validate',
    triggerKeywords: ['校验', '验证', '核验', '检查合法性', '数据校验'],
    version: '1.0.0',
    tags: ['校验', '验证'],
    execution: {
      type: 'parallel',
      steps: [
        { id: 'validate-types', name: '校验类型', description: '校验数据类型', tool: 'validate_data_types', estimatedImpact: 'low' },
        { id: 'validate-ranges', name: '校验范围', description: '校验数值范围', tool: 'validate_value_ranges', estimatedImpact: 'low' },
        { id: 'validate-formats', name: '校验格式', description: '校验格式一致性', tool: 'validate_formats', estimatedImpact: 'low' },
        { id: 'validate-custom', name: '自定义校验', description: '执行自定义校验规则', tool: 'validate_custom_rules', estimatedImpact: 'low' },
      ],
      requiresConfirmation: false,
      autoExecuteOnSimple: true,
      parallelBatchSize: 4,
    },
    output: {
      showPreview: false,
      previewCount: 0,
      showExecutionLog: true,
      logLevel: 'detailed',
      explainChanges: false,
    },
    examples: ['校验数据', '检查数据合法性', '验证数据格式'],
  },
  {
    id: 'conditional-delete',
    name: '条件删除',
    description: '按条件删除行，支持复杂条件组合',
    icon: '✂️',
    category: 'data',
    triggerKeywords: ['删除', '移除', '去掉', '删', '清除', '条件删除'],
    version: '1.0.0',
    tags: ['删除', '数据清洗'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'parse-condition', name: '解析条件', description: '解析删除条件', tool: 'parse_filter_condition', estimatedImpact: 'low' },
        { id: 'preview-delete', name: '预览删除', description: '预览将要删除的行', tool: 'preview_conditional_delete', estimatedImpact: 'medium' },
        { id: 'delete-rows', name: '删除行', description: '执行删除', tool: 'conditional_delete', estimatedImpact: 'high', rollbackTool: 'restore_rows', rollbackParams: {} },
      ],
      requiresConfirmation: true,
      autoExecuteOnSimple: false,
      rollbackOnFailure: true,
    },
    output: {
      showPreview: true,
      previewCount: 5,
      showExecutionLog: true,
      logLevel: 'verbose',
      explainChanges: true,
    },
    examples: ['删除销售额小于100的行', '移除状态为空的', '删掉所有未付款'],
  },
  {
    id: 'data-export',
    name: '数据导出',
    description: '导出数据为多种格式，支持格式定制',
    icon: '💾',
    category: 'export',
    triggerKeywords: ['导出', '下载', '保存', '输出', '输出为'],
    version: '1.0.0',
    tags: ['导出'],
    execution: {
      type: 'sequential',
      steps: [
        { id: 'parse-export-params', name: '解析导出参数', description: '确定导出格式和选项', tool: 'parse_export_params', estimatedImpact: 'low' },
        { id: 'prepare-export', name: '准备数据', description: '准备导出数据', tool: 'prepare_export_data', estimatedImpact: 'medium' },
        { id: 'generate-file', name: '生成文件', description: '生成导出文件', tool: 'generate_export_file', estimatedImpact: 'medium' },
      ],
      requiresConfirmation: false,
      autoExecuteOnSimple: true,
    },
    output: {
      showPreview: false,
      previewCount: 0,
      showExecutionLog: true,
      logLevel: 'summary',
      explainChanges: false,
    },
    examples: ['导出为Excel', '下载CSV', '保存为JSON'],
  },
];

export function getSkillById(id: string): SkillDefinition | undefined {
  return SKILL_REGISTRY.find((s) => s.id === id);
}

export function getSkillByKeyword(keyword: string): SkillDefinition | undefined {
  const lower = keyword.toLowerCase();
  return SKILL_REGISTRY.find((s) =>
    s.triggerKeywords.some((kw) => lower.includes(kw.toLowerCase()))
  );
}

export function matchSkills(input: string): SkillDefinition[] {
  const lower = input.toLowerCase();
  return SKILL_REGISTRY.filter((s) =>
    s.triggerKeywords.some((kw) => lower.includes(kw.toLowerCase()))
  ).sort((a, b) => {
    const aMatch = a.triggerKeywords.find((kw) => lower.includes(kw.toLowerCase()));
    const bMatch = b.triggerKeywords.find((kw) => lower.includes(kw.toLowerCase()));
    return (bMatch?.length || 0) - (aMatch?.length || 0);
  });
}

export function searchSkills(query: string, category?: SkillDefinition['category']): SkillDefinition[] {
  const lower = query.toLowerCase();
  let results = SKILL_REGISTRY;

  if (category) {
    results = results.filter((s) => s.category === category);
  }

  return results.filter((s) =>
    s.name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.tags?.some((t) => t.toLowerCase().includes(lower)) ||
    s.triggerKeywords.some((kw) => kw.toLowerCase().includes(lower))
  );
}

export function getSkillsByCategory(category: SkillDefinition['category']): SkillDefinition[] {
  return SKILL_REGISTRY.filter((s) => s.category === category);
}

export function validateSkillRequirements(
  skill: SkillDefinition,
  data: ParsedData
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (skill.requirements) {
    const { minRows, minCols, requiredColumns, supportedFormats } = skill.requirements;

    if (minRows && data.rows.length < minRows) {
      errors.push(`数据行数不足：需要至少 ${minRows} 行，当前 ${data.rows.length} 行`);
    }

    if (minCols && data.headers.length < minCols) {
      errors.push(`数据列数不足：需要至少 ${minCols} 列，当前 ${data.headers.length} 列`);
    }

    if (requiredColumns) {
      const missingCols = requiredColumns.filter((col) => !data.headers.includes(col));
      if (missingCols.length > 0) {
        errors.push(`缺少必要列：${missingCols.join(', ')}`);
      }
    }
  }

  const hasDeletableRows = skill.execution.steps.some((s) =>
    ['remove_empty_rows', 'remove_duplicates', 'conditional_delete'].includes(s.tool)
  );
  if (hasDeletableRows && data.rows.length <= 1) {
    warnings.push('数据行数较少，删除操作可能导致数据过少');
  }

  const hasHighImpact = skill.execution.steps.some((s) => s.estimatedImpact === 'high');
  if (hasHighImpact) {
    warnings.push('此操作包含高影响性步骤，可能导致数据显著变化');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
