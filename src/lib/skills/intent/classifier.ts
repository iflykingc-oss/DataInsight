import type { ParsedData, CellValue } from '@/types';
import type { SkillDefinition } from './registry';

export type IntentType =
  | 'filter'
  | 'format'
  | 'clean'
  | 'delete'
  | 'add'
  | 'modify'
  | 'export'
  | 'undo'
  | 'redo'
  | 'analyze'
  | 'visualize'
  | 'aggregate'
  | 'split'
  | 'merge'
  | 'transform'
  | 'validate'
  | 'unknown';

export interface ParsedIntent {
  type: IntentType;
  params: Record<string, unknown>;
  confidence: number;
  needsClarification: boolean;
  clarificationQuestion?: string;
  skillId?: string;
  multiStepPlan?: SubIntent[];
  reasoning?: string;
}

export interface SubIntent {
  step: number;
  type: IntentType;
  description: string;
  params: Record<string, unknown>;
  skillId?: string;
  dependsOn?: number[];
}

export interface FilterParams {
  column: string;
  operator: string;
  value: CellValue;
  logicalOperator?: 'and' | 'or';
  nextCondition?: FilterParams;
}

export interface ReferenceContext {
  lastOperation?: {
    type: IntentType;
    params: Record<string, unknown>;
    timestamp: number;
  };
  lastFilterResult?: {
    rowCount: number;
    columns: string[];
  };
  columnMappings: Record<string, string>;
  operationHistory: OperationRecord[];
  selectedRange?: { startRow: number; endRow: number; startCol: number; endCol: number };
}

export interface OperationRecord {
  id: string;
  type: IntentType;
  description: string;
  params: Record<string, unknown>;
  timestamp: number;
  undoable: boolean;
  snapshotId?: string;
}

type TimeUnit = '秒' | '分钟' | '小时' | '天' | '周' | '月';

interface TimeExpression {
  value: number;
  unit: TimeUnit;
 毫秒: number;
}

const TIME_UNITS: Record<TimeUnit, number> = {
  '秒': 1000,
  '分钟': 60 * 1000,
  '小时': 60 * 60 * 1000,
  '天': 24 * 60 * 60 * 1000,
  '周': 7 * 24 * 60 * 60 * 1000,
  '月': 30 * 24 * 60 * 60 * 1000,
};

const TIME_KEYWORDS: Record<string, TimeUnit> = {
  '秒': '秒', '秒钟': '秒', 'second': '秒', 'seconds': '秒',
  '分钟': '分钟', '分钟': '分钟', 'min': '分钟', 'mins': '分钟',
  '小时': '小时', '小时': '小时', 'hour': '小时', 'hours': '小时',
  '天': '天', '天': '天', 'day': '天', 'days': '天',
  '周': '周', '周': '周', 'week': '周', 'weeks': '周',
  '月': '月', '月': '月', 'month': '月', 'months': '月',
};

const AGGREGATION_FUNCTIONS = ['求和', '求平均', '平均值', '求均值', '计数', '统计', '求最大', '最大值', '求最小', '最小值', '求方差', '标准差'];
const AGGREGATION_MAP: Record<string, string> = {
  '求和': 'sum', 'sum': 'sum', '总计': 'sum', '合计': 'sum',
  '求平均': 'avg', '平均值': 'avg', 'avg': 'avg', '均值': 'avg',
  '计数': 'count', '统计': 'count', 'count': 'count', '数量': 'count',
  '求最大': 'max', '最大值': 'max', 'max': 'max',
  '求最小': 'min', '最小值': 'min', 'min': 'min',
  '求方差': 'variance', 'variance': 'variance', '标准差': 'stddev', 'stddev': 'stddev',
};

const OPERATOR_PATTERNS: Record<string, { operator: string; parse: (v: string) => CellValue }> = {
  '大于': { operator: 'gt', parse: (v) => Number(v) || v },
  '大于等于': { operator: 'gte', parse: (v) => Number(v) || v },
  '小于': { operator: 'lt', parse: (v) => Number(v) || v },
  '小于等于': { operator: 'lte', parse: (v) => Number(v) || v },
  '等于': { operator: 'eq', parse: (v) => isNaN(Number(v)) ? v : Number(v) },
  '不等于': { operator: 'neq', parse: (v) => isNaN(Number(v)) ? v : Number(v) },
  '包含': { operator: 'contains', parse: (v) => v },
  '不包含': { operator: 'not_contains', parse: (v) => v },
  '开头是': { operator: 'starts_with', parse: (v) => v },
  '结尾是': { operator: 'ends_with', parse: (v) => v },
  '为空': { operator: 'is_empty', parse: () => '' },
  '不为空': { operator: 'is_not_empty', parse: () => '' },
  '在...之间': { operator: 'between', parse: (v) => v },
  'like': { operator: 'contains', parse: (v) => v },
  '>': { operator: 'gt', parse: (v) => Number(v) || v },
  '>=': { operator: 'gte', parse: (v) => Number(v) || v },
  '<': { operator: 'lt', parse: (v) => Number(v) || v },
  '<=': { operator: 'lte', parse: (v) => Number(v) || v },
  '=': { operator: 'eq', parse: (v) => isNaN(Number(v)) ? v : Number(v) },
  '==': { operator: 'eq', parse: (v) => isNaN(Number(v)) ? v : Number(v) },
  '!=': { operator: 'neq', parse: (v) => isNaN(Number(v)) ? v : Number(v) },
};

export class IntentClassifier {
  private data: ParsedData;
  private context: ReferenceContext;
  private readonly MAX_CONTEXT_AGE = 5 * 60 * 1000;

  constructor(data: ParsedData, context?: ReferenceContext) {
    this.data = data;
    this.context = context || {
      columnMappings: {},
      operationHistory: [],
    };
  }

  classify(input: string): ParsedIntent {
    const normalized = input.trim();

    if (!normalized) {
      return {
        type: 'unknown',
        params: {},
        confidence: 0,
        needsClarification: true,
        clarificationQuestion: '请输入您想执行的操作指令',
      };
    }

    if (this.isReferenceToLastOperation(normalized)) {
      return this.parseReferenceOperation(normalized);
    }

    if (this.isTimeBasedReference(normalized)) {
      return this.parseTimeBasedReference(normalized);
    }

    if (this.isAggregationRequest(normalized)) {
      return this.parseAggregationIntent(normalized);
    }

    if (this.isMultiStepRequest(normalized)) {
      return this.parseMultiStepIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['筛选', '过滤', '查询', '找出', '只留', '保留', '过滤出', '查找'])) {
      return this.parseFilterIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['删除', '移除', '去掉', '删', '清除'])) {
      return this.parseDeleteIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['规整', '整理', '美化', '格式化', '调整', '统一'])) {
      return this.parseFormatIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['清理', '清洗', '去脏', '规范化', '清洗', '数据清洗'])) {
      return this.parseCleanIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['撤销', '取消', '还原', '回退', 'undo'])) {
      return this.parseUndoIntent();
    }

    if (this.containsKeyword(normalized, ['重做', '恢复', 'redo', '恢复'])) {
      return this.parseRedoIntent();
    }

    if (this.containsKeyword(normalized, ['导出', '下载', '保存', '输出'])) {
      return this.parseExportIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['分析', '统计', '诊断', '检查', '健康度'])) {
      return this.parseAnalyzeIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['图表', '可视化', '画图', '展示'])) {
      return this.parseVisualizeIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['聚合', '汇总', '分类汇总', '分组', '按...汇总'])) {
      return this.parseAggregateIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['拆分', '分裂', '分割'])) {
      return this.parseSplitIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['合并', '拼接', '联结'])) {
      return this.parseMergeIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['转换', '变换', '转置', '透视'])) {
      return this.parseTransformIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['验证', '校验', '核验', '检查'])) {
      return this.parseValidateIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['新增', '添加', '插入', '新建'])) {
      return this.parseAddIntent(normalized);
    }

    if (this.containsKeyword(normalized, ['修改', '更新', '编辑', '变更', '替换'])) {
      return this.parseModifyIntent(normalized);
    }

    return this.parseFallbackIntent(normalized);
  }

  private containsKeyword(text: string, keywords: string[]): boolean {
    const lower = text.toLowerCase();
    return keywords.some((kw) => lower.includes(kw.toLowerCase()));
  }

  private parseTimeExpression(text: string): TimeExpression | null {
    const patterns = [
      /(\d+)\s*秒钟?/,
      /(\d+)\s*分钟/,
      /(\d+)\s*小时/,
      /(\d+)\s*天/,
      /(\d+)\s*周/,
      /(\d+)\s*月/,
      /(\d+)\s*min/i,
      /(\d+)\s*hour/i,
      /(\d+)\s*day/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = TIME_KEYWORDS[match[0]] || '天';
        return {
          value,
          unit,
          毫秒: value * TIME_UNITS[unit],
        };
      }
    }

    return null;
  }

  private isTimeBasedReference(input: string): boolean {
    const timeKeywords = ['前', '以内', '内', '之前', 'ago', 'before', 'within', 'last', '最近', '过去'];
    const hasTimeKeyword = timeKeywords.some(kw => input.includes(kw));
    const hasTimeExpr = this.parseTimeExpression(input) !== null;
    return hasTimeKeyword && hasTimeExpr;
  }

  private isAggregationRequest(input: string): boolean {
    return AGGREGATION_FUNCTIONS.some(fn => input.includes(fn));
  }

  private isMultiStepRequest(input: string): boolean {
    const separators = ['，然后', '，接着', '，再', '，最后', ';', '；', '。', '\n', '并且', '同时'];
    return separators.some(sep => input.includes(sep)) && input.length > 15;
  }

  private parseMultiStepIntent(input: string): ParsedIntent {
    const separators = ['，然后', '，接着', '，再', '，最后', ';', '；', '并且', '同时'];
    let parts: string[] = [input];

    for (const sep of separators) {
      if (input.includes(sep)) {
        parts = input.split(sep).map(s => s.trim()).filter(Boolean);
        break;
      }
    }

    const subIntents: SubIntent[] = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const partialIntent = this.classify(part);
      subIntents.push({
        step: i + 1,
        type: partialIntent.type,
        description: part,
        params: partialIntent.params,
        skillId: partialIntent.skillId,
        dependsOn: i > 0 ? [i] : undefined,
      });
    }

    const primaryIntent = subIntents[0];
    return {
      type: primaryIntent.type,
      params: primaryIntent.params,
      confidence: 0.85,
      needsClarification: false,
      skillId: primaryIntent.skillId,
      multiStepPlan: subIntents,
      reasoning: `识别到 ${subIntents.length} 个操作步骤`,
    };
  }

  private parseTimeBasedReference(input: string): ParsedIntent {
    const timeExpr = this.parseTimeExpression(input);
    if (!timeExpr) {
      return this.parseFallbackIntent(input);
    }

    const timeMs = timeExpr.毫秒;
    const cutoffTime = Date.now() - timeMs;

    if (this.context.lastOperation && this.context.lastOperation.timestamp > cutoffTime) {
      const lastOp = this.context.lastOperation;
      if (lastOp.type === 'filter') {
        return {
          type: 'filter',
          params: {
            ...(lastOp.params as FilterParams),
            timeBased: true,
            timeValue: timeExpr.value,
            timeUnit: timeExpr.unit,
          },
          confidence: 0.9,
          needsClarification: false,
          skillId: 'smart-filter',
          reasoning: `基于"${timeExpr.value}${timeExpr.unit}"的时间范围筛选`,
        };
      }
    }

    return {
      type: 'filter',
      params: {
        timeBased: true,
        timeValue: timeExpr.value,
        timeUnit: timeExpr.unit,
        rawInput: input,
      },
      confidence: 0.7,
      needsClarification: true,
      clarificationQuestion: `您想筛选"${timeExpr.value}${timeExpr.unit}"内的什么数据？`,
    };
  }

  private parseAggregationIntent(input: string): ParsedIntent {
    let aggFunction = 'count';
    let aggColumn: string | null = null;
    let groupByColumn: string | null = null;

    for (const [fn, mapped] of Object.entries(AGGREGATION_MAP)) {
      if (input.includes(fn)) {
        aggFunction = mapped;
        break;
      }
    }

    const aggMatch = input.match(new RegExp(`(${AGGREGATION_FUNCTIONS.join('|')})[出]?(.+?)(?:按|分组)`));
    if (aggMatch) {
      const targetText = aggMatch[2] || '';
      aggColumn = this.findMatchingColumn(targetText);
    }

    const groupByMatch = input.match(/按(.+?)(?:分组|分类|汇总)/);
    if (groupByMatch) {
      groupByColumn = this.findMatchingColumn(groupByMatch[1]);
    }

    if (!aggColumn) {
      aggColumn = this.inferNumericColumn();
    }

    if (!aggColumn) {
      return {
        type: 'aggregate',
        params: { function: aggFunction, raw: input },
        confidence: 0.5,
        needsClarification: true,
        clarificationQuestion: '请告诉我要统计哪一列数据？',
      };
    }

    return {
      type: 'aggregate',
      params: {
        function: aggFunction,
        column: aggColumn,
        groupBy: groupByColumn,
      },
      confidence: 0.9,
      needsClarification: false,
      skillId: 'data-aggregation',
      reasoning: `${AGGREGATION_MAP[aggFunction] || aggFunction}(${aggColumn})${groupByColumn ? ` 按 ${groupByColumn} 分组` : ''}`,
    };
  }

  private parseFilterIntent(input: string): ParsedIntent {
    const conditions: FilterParams[] = [];
    let currentCondition: FilterParams | null = null;

    const logicalOperators = this.detectLogicalOperators(input);
    const conditionParts = this.splitByLogicalOperators(input);

    for (const part of conditionParts) {
      const condition = this.parseSingleCondition(part.trim());
      if (condition) {
        if (currentCondition && logicalOperators.length > 0) {
          currentCondition.nextCondition = condition;
          currentCondition.logicalOperator = logicalOperators[conditions.length - 1] || 'and';
        } else {
          conditions.push(condition);
          currentCondition = condition;
        }
      }
    }

    if (conditions.length === 0) {
      return {
        type: 'filter',
        params: { raw: input },
        confidence: 0.5,
        needsClarification: true,
        clarificationQuestion: '请告诉我筛选条件，例如"筛选销售额大于10000的行"',
      };
    }

    const primaryCondition = conditions[0];
    return {
      type: 'filter',
      params: primaryCondition,
      confidence: 0.9,
      needsClarification: false,
      skillId: 'smart-filter',
      reasoning: `筛选条件: ${this.describeCondition(primaryCondition)}`,
      multiStepPlan: conditions.length > 1
        ? conditions.map((c, i) => ({
            step: i + 1,
            type: 'filter' as IntentType,
            description: this.describeCondition(c),
            params: c,
            skillId: 'smart-filter',
          }))
        : undefined,
    };
  }

  private detectLogicalOperators(input: string): string[] {
    const operators: string[] = [];
    const patterns = [
      { pattern: /且|并且|同时|and/i, value: 'and' },
      { pattern: /或|或者|or/i, value: 'or' },
      { pattern: /但|但是|然而|不过|不过/i, value: 'but' },
    ];

    for (const { pattern, value } of patterns) {
      if (pattern.test(input)) {
        operators.push(value);
      }
    }

    return operators;
  }

  private splitByLogicalOperators(input: string): string[] {
    let splitInput = input;

    splitInput = splitInput.replace(/且|并且|同时|而且/gi, '|||AND|||');
    splitInput = splitInput.replace(/或|或者/gi, '|||OR|||');
    splitInput = splitInput.replace(/但|但是|然而/gi, '|||BUT|||');

    return splitInput.split(/\|\|\|.*?\|\|\|/);
  }

  private parseSingleCondition(input: string): FilterParams | null {
    let column: string | null = null;
    let operator = 'contains';
    let value: CellValue = '';

    for (const [opPattern, config] of Object.entries(OPERATOR_PATTERNS)) {
      const regex = new RegExp(`${opPattern}[\\s]*(\\S+?)(?:\\s|,|$)`);
      const match = input.match(regex);
      if (match) {
        operator = config.operator;
        value = config.parse(match[1]);
        break;
      }
    }

    for (const header of this.data.headers) {
      const headerPattern = new RegExp(`${header}|${header.slice(0, 2)}`);
      if (headerPattern.test(input)) {
        column = header;
        break;
      }
    }

    if (!column) {
      column = this.findMatchingColumn(input);
    }

    if (!column) {
      const numericHeaders = this.data.headers.filter(h => {
        const sample = this.data.rows[0]?.[h];
        return typeof sample === 'number' || !isNaN(Number(sample));
      });

      const inferred = this.inferColumnFromCondition(input);
      if (inferred) {
        column = inferred;
      } else if (numericHeaders.length === 1) {
        column = numericHeaders[0];
      }
    }

    if (!column) {
      return null;
    }

    const inferredOp = this.inferOperatorFromContext(input);
    if (inferredOp) {
      operator = inferredOp;
    }

    return { column, operator, value };
  }

  private inferOperatorFromContext(input: string): string | null {
    const contextOps: Record<string, string[]> = {
      '高': ['gt', 'gte'],
      '低': ['lt', 'lte'],
      '大': ['gt', 'gte'],
      '小': ['lt', 'lte'],
      '正': ['gt'],
      '负': ['lt'],
    };

    for (const [context, ops] of Object.entries(contextOps)) {
      if (input.includes(context)) {
        return ops[0];
      }
    }

    return null;
  }

  private inferColumnFromCondition(input: string): string | null {
    const numericHeaders = this.data.headers.filter(h => {
      const sample = this.data.rows[0]?.[h];
      return typeof sample === 'number' || !isNaN(Number(sample));
    });

    const colNameMap: Record<string, string[]> = {
      '金额': ['金额', '数额', '销售额', '收入', '支出', 'cost', 'amount', 'money'],
      '数量': ['数量', '销量', '库存', 'qty', 'quantity', 'num'],
      '价格': ['价格', '单价', 'price', 'cost'],
      '日期': ['日期', '时间', 'date', 'time', '创建时间'],
    };

    for (const [key, aliases] of Object.entries(colNameMap)) {
      if (aliases.some(a => input.includes(a))) {
        const found = numericHeaders.find(h =>
          aliases.some(a => h.toLowerCase().includes(a.toLowerCase()))
        );
        if (found) return found;
      }
    }

    return null;
  }

  private describeCondition(condition: FilterParams): string {
    const opLabels: Record<string, string> = {
      'gt': `> ${condition.value}`,
      'gte': `>= ${condition.value}`,
      'lt': `< ${condition.value}`,
      'lte': `<= ${condition.value}`,
      'eq': `= ${condition.value}`,
      'neq': `!= ${condition.value}`,
      'contains': `包含 "${condition.value}"`,
      'not_contains': `不包含 "${condition.value}"`,
      'starts_with': `开头是 "${condition.value}"`,
      'ends_with': `结尾是 "${condition.value}"`,
      'is_empty': '为空',
      'is_not_empty': '不为空',
    };

    let desc = `${condition.column} ${opLabels[condition.operator] || condition.operator}`;
    if (condition.nextCondition) {
      desc += ` ${condition.logicalOperator || '且'} ${this.describeCondition(condition.nextCondition)}`;
    }
    return desc;
  }

  private parseDeleteIntent(input: string): ParsedIntent {
    if (input.includes('空行') || input.includes('空白行')) {
      return {
        type: 'delete',
        params: { target: 'empty_rows' },
        confidence: 0.95,
        needsClarification: false,
        skillId: 'one-click-clean',
        reasoning: '删除空行',
      };
    }

    if (input.includes('空列') || input.includes('空白列')) {
      return {
        type: 'delete',
        params: { target: 'empty_columns' },
        confidence: 0.95,
        needsClarification: false,
        skillId: 'one-click-clean',
        reasoning: '删除空列',
      };
    }

    if (input.includes('重复') || input.includes('重复行') || input.includes('重复数据')) {
      return {
        type: 'delete',
        params: { target: 'duplicate_rows' },
        confidence: 0.95,
        needsClarification: false,
        skillId: 'data-deduplication',
        reasoning: '删除重复行',
      };
    }

    const filterMatch = this.tryParseInlineFilter(input);
    if (filterMatch) {
      return {
        type: 'delete',
        params: { ...filterMatch, mode: 'filter_then_delete' },
        confidence: 0.9,
        needsClarification: false,
        skillId: 'conditional-delete',
        reasoning: `删除满足条件的行: ${this.describeCondition(filterMatch)}`,
      };
    }

    return {
      type: 'delete',
      params: { target: 'rows', raw: input },
      confidence: 0.6,
      needsClarification: true,
      clarificationQuestion: '请告诉我要删除什么？（空行/重复行/满足某条件的行）',
    };
  }

  private tryParseInlineFilter(input: string): FilterParams | null {
    const deletePatterns = [
      /删除[出]?(?:销售额|数量|金额|成绩)?(.+?)(?:的|满足|大于|小于|等于)/,
      /删[除]?(?:掉)?(?:销售额|数量|金额|成绩)?(.+?)(?:的行|的数据)/,
    ];

    for (const pattern of deletePatterns) {
      const match = input.match(pattern);
      if (match) {
        return this.parseSingleCondition(match[0]);
      }
    }

    return null;
  }

  private parseFormatIntent(input: string): ParsedIntent {
    return {
      type: 'format',
      params: { raw: input },
      confidence: 0.85,
      needsClarification: false,
      skillId: 'one-click-format',
      reasoning: '格式化整理',
    };
  }

  private parseCleanIntent(input: string): ParsedIntent {
    return {
      type: 'clean',
      params: {},
      confidence: 0.9,
      needsClarification: false,
      skillId: 'one-click-clean',
      reasoning: '数据清洗',
    };
  }

  private parseUndoIntent(): ParsedIntent {
    if (!this.context.operationHistory.length) {
      return {
        type: 'undo',
        params: {},
        confidence: 0.3,
        needsClarification: true,
        clarificationQuestion: '当前没有可撤销的操作',
      };
    }

    return {
      type: 'undo',
      params: { operationId: this.context.operationHistory[this.context.operationHistory.length - 1].id },
      confidence: 0.95,
      needsClarification: false,
      reasoning: '撤销上一次操作',
    };
  }

  private parseRedoIntent(): ParsedIntent {
    return {
      type: 'redo',
      params: {},
      confidence: 0.9,
      needsClarification: false,
      reasoning: '重做操作',
    };
  }

  private parseExportIntent(input: string): ParsedIntent {
    let format: 'csv' | 'xlsx' | 'json' = 'csv';

    if (input.includes('excel') || input.includes('xlsx') || input.includes('xls')) {
      format = 'xlsx';
    } else if (input.includes('json')) {
      format = 'json';
    }

    return {
      type: 'export',
      params: { format },
      confidence: 0.9,
      needsClarification: false,
      skillId: 'data-export',
      reasoning: `导出为 ${format.toUpperCase()} 格式`,
    };
  }

  private parseAnalyzeIntent(input: string): ParsedIntent {
    return {
      type: 'analyze',
      params: { raw: input },
      confidence: 0.85,
      needsClarification: false,
      skillId: 'problem-detection',
      reasoning: '数据健康度分析',
    };
  }

  private parseVisualizeIntent(input: string): ParsedIntent {
    let chartType = 'auto';

    if (input.includes('柱状图') || input.includes('条形图')) {
      chartType = 'bar';
    } else if (input.includes('折线图') || input.includes('线图')) {
      chartType = 'line';
    } else if (input.includes('饼图')) {
      chartType = 'pie';
    } else if (input.includes('散点图')) {
      chartType = 'scatter';
    }

    return {
      type: 'visualize',
      params: { chartType, raw: input },
      confidence: 0.8,
      needsClarification: false,
      skillId: 'smart-chart',
      reasoning: `生成${chartType === 'auto' ? '智能推荐' : chartType}图表`,
    };
  }

  private parseAggregateIntent(input: string): ParsedIntent {
    let groupByColumn: string | null = null;
    let aggFunctions: string[] = ['count'];

    const groupByMatch = input.match(/按(.+?)(?:分组|分类|汇总)/);
    if (groupByMatch) {
      groupByColumn = this.findMatchingColumn(groupByMatch[1]);
    }

    for (const [fn, mapped] of Object.entries(AGGREGATION_MAP)) {
      if (input.includes(fn)) {
        aggFunctions.push(mapped);
      }
    }

    return {
      type: 'aggregate',
      params: {
        functions: aggFunctions,
        groupBy: groupByColumn,
      },
      confidence: 0.85,
      needsClarification: false,
      skillId: 'data-aggregation',
      reasoning: `${aggFunctions.join(', ')}${groupByColumn ? ` 按 ${groupByColumn} 分组` : ''}`,
    };
  }

  private parseSplitIntent(input: string): ParsedIntent {
    return {
      type: 'split',
      params: { raw: input },
      confidence: 0.7,
      needsClarification: true,
      clarificationQuestion: '请告诉我按什么规则拆分数据？（按列/按行数/按条件）',
    };
  }

  private parseMergeIntent(input: string): ParsedIntent {
    return {
      type: 'merge',
      params: { raw: input },
      confidence: 0.7,
      needsClarification: true,
      clarificationQuestion: '请告诉我需要合并什么数据？',
    };
  }

  private parseTransformIntent(input: string): ParsedIntent {
    let transformType = 'transpose';

    if (input.includes('转置')) {
      transformType = 'transpose';
    } else if (input.includes('透视')) {
      transformType = 'pivot';
    } else if (input.includes('逆透视')) {
      transformType = 'unpivot';
    }

    return {
      type: 'transform',
      params: { transformType, raw: input },
      confidence: 0.8,
      needsClarification: false,
      skillId: 'data-transform',
      reasoning: `数据${transformType === 'transpose' ? '转置' : transformType === 'pivot' ? '透视' : '逆透视'}`,
    };
  }

  private parseValidateIntent(input: string): ParsedIntent {
    return {
      type: 'validate',
      params: { raw: input },
      confidence: 0.8,
      needsClarification: false,
      skillId: 'data-validation',
      reasoning: '数据校验',
    };
  }

  private parseAddIntent(input: string): ParsedIntent {
    return {
      type: 'add',
      params: { raw: input },
      confidence: 0.6,
      needsClarification: true,
      clarificationQuestion: '请告诉我需要添加什么？（新行/新列/计算列）',
    };
  }

  private parseModifyIntent(input: string): ParsedIntent {
    const filterMatch = this.tryParseInlineFilter(input);
    if (filterMatch) {
      return {
        type: 'modify',
        params: { ...filterMatch, mode: 'conditional_update' },
        confidence: 0.85,
        needsClarification: false,
        skillId: 'conditional-modify',
        reasoning: `修改满足条件的行: ${this.describeCondition(filterMatch)}`,
      };
    }

    return {
      type: 'modify',
      params: { raw: input },
      confidence: 0.6,
      needsClarification: true,
      clarificationQuestion: '请告诉我需要修改什么？',
    };
  }

  private parseFallbackIntent(input: string): ParsedIntent {
    const suggestions = [
      '筛选销售额大于10000的行',
      '删除空行和重复行',
      '按日期排序',
      '导出为Excel',
      '分析数据健康度',
    ];

    return {
      type: 'unknown',
      params: { raw: input },
      confidence: 0.2,
      needsClarification: true,
      clarificationQuestion: `抱歉，我没有理解"${input}"。您可以试试说：\n${suggestions.map(s => `• ${s}`).join('\n')}`,
    };
  }

  private isReferenceToLastOperation(input: string): boolean {
    const refKeywords = ['刚才', '上次', '那', '再', '继续', '基于', '沿用', '同样的', '类似的'];
    return refKeywords.some(kw => input.includes(kw));
  }

  private parseReferenceOperation(input: string): ParsedIntent {
    if (!this.context.lastOperation) {
      return {
        type: 'unknown',
        params: {},
        confidence: 0.3,
        needsClarification: true,
        clarificationQuestion: '没有可参考的上一次操作，请直接说明您的需求',
      };
    }

    const now = Date.now();
    const age = now - this.context.lastOperation.timestamp;

    if (age > this.MAX_CONTEXT_AGE) {
      return {
        type: 'unknown',
        params: {},
        confidence: 0.3,
        needsClarification: true,
        clarificationQuestion: '上一次操作已过期，请重新说明您的需求',
      };
    }

    const lastOp = this.context.lastOperation;

    if (input.includes('再') || input.includes('继续') || input.includes('还要') || input.includes('还要')) {
      if (lastOp.type === 'filter') {
        return {
          type: 'filter',
          params: {
            ...(lastOp.params as FilterParams),
            isContinuation: true,
          },
          confidence: 0.85,
          needsClarification: false,
          skillId: 'smart-filter',
          reasoning: '继续上一次的筛选操作',
        };
      }
    }

    if (input.includes('撤销') || input.includes('取消')) {
      return this.parseUndoIntent();
    }

    if (lastOp.type === 'filter' && input.includes('那') && input.includes('的')) {
      return {
        type: lastOp.type,
        params: {
          ...(lastOp.params as FilterParams),
          isReference: true,
        },
        confidence: 0.8,
        needsClarification: false,
        skillId: lastOp.type === 'filter' ? 'smart-filter' : undefined,
        reasoning: `基于上次筛选（${this.context.lastFilterResult?.rowCount || 0} 行）的操作`,
      };
    }

    return {
      type: lastOp.type,
      params: lastOp.params,
      confidence: 0.6,
      needsClarification: true,
      clarificationQuestion: '我理解您想参考上次的操作，但需要更明确的指示',
    };
  }

  private findMatchingColumn(userText: string): string | null {
    const normalizedText = userText.toLowerCase().trim();

    if (!normalizedText) return null;

    for (const header of this.data.headers) {
      const normalizedHeader = header.toLowerCase();

      if (normalizedHeader === normalizedText) {
        return header;
      }

      if (normalizedHeader.includes(normalizedText) || normalizedText.includes(normalizedHeader)) {
        return header;
      }

      if (this.context.columnMappings[normalizedText] === header) {
        return header;
      }
    }

    const shortText = normalizedText.slice(0, Math.min(3, normalizedText.length));
    const similarHeaders = this.data.headers.filter(h => {
      const hLower = h.toLowerCase();
      if (hLower.includes(shortText) || shortText.includes(hLower.slice(0, Math.min(3, hLower.length)))) {
        return true;
      }

      const words = normalizedText.split(/\s+/);
      const hWords = hLower.split(/\s+/);
      const overlap = words.filter(w => hWords.some(hw => hw.includes(w) || w.includes(hw)));
      return overlap.length >= words.length * 0.5;
    });

    if (similarHeaders.length === 1) {
      return similarHeaders[0];
    }

    if (similarHeaders.length > 1) {
      const exactMatch = similarHeaders.find(h => h.toLowerCase().includes(normalizedText));
      return exactMatch || similarHeaders[0];
    }

    return null;
  }

  private inferNumericColumn(): string | null {
    const candidates: { header: string; numericRatio: number }[] = [];

    for (const header of this.data.headers) {
      let numericCount = 0;
      let totalNonEmpty = 0;

      for (const row of this.data.rows.slice(0, 20)) {
        const val = row[header];
        if (val !== null && val !== undefined && val !== '') {
          totalNonEmpty++;
          if (typeof val === 'number' || !isNaN(Number(val))) {
            numericCount++;
          }
        }
      }

      if (totalNonEmpty > 0) {
        candidates.push({
          header,
          numericRatio: numericCount / totalNonEmpty,
        });
      }
    }

    candidates.sort((a, b) => b.numericRatio - a.numericRatio);

    if (candidates.length > 0 && candidates[0].numericRatio > 0.5) {
      return candidates[0].header;
    }

    return null;
  }

  updateContext(operation: { type: IntentType; params: Record<string, unknown> }) {
    const record: OperationRecord = {
      id: crypto.randomUUID(),
      type: operation.type,
      description: this.generateOperationDescription(operation),
      params: operation.params,
      timestamp: Date.now(),
      undoable: true,
    };

    this.context.operationHistory.push(record);

    if (this.context.operationHistory.length > 50) {
      this.context.operationHistory = this.context.operationHistory.slice(-50);
    }

    this.context.lastOperation = {
      type: operation.type,
      params: operation.params,
      timestamp: Date.now(),
    };

    if (operation.type === 'filter' && operation.params.column) {
      this.context.columnMappings['上次筛选'] = operation.params.column as string;
      this.context.lastFilterResult = {
        rowCount: (operation.params as FilterParams & { resultRows?: number }).resultRows || 0,
        columns: [operation.params.column as string],
      };
    }
  }

  private generateOperationDescription(operation: { type: IntentType; params: Record<string, unknown> }): string {
    switch (operation.type) {
      case 'filter':
        return `筛选: ${(operation.params as FilterParams).column || '某列'}`;
      case 'delete':
        return `删除: ${operation.params.target || '指定行'}`;
      case 'format':
        return '格式化整理';
      case 'clean':
        return '数据清洗';
      case 'export':
        return `导出: ${operation.params.format || 'csv'}`;
      case 'analyze':
        return '数据分析';
      default:
        return `${operation.type} 操作`;
    }
  }

  getContext(): ReferenceContext {
    return { ...this.context };
  }
}

export function classifyIntent(
  input: string,
  data: ParsedData,
  context?: ReferenceContext
): ParsedIntent {
  const classifier = new IntentClassifier(data, context);
  return classifier.classify(input);
}

export function createReferenceContext(): ReferenceContext {
  return {
    columnMappings: {},
    operationHistory: [],
  };
}
