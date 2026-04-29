import { ParsedData, FieldStats } from '@/types';
import { ToolDefinition, ToolResult } from '@/types/llm';

export interface ToolContext {
  data: ParsedData;
  fieldStats: FieldStats[];
}

export abstract class BaseTool {
  public name: string;
  public description: string;
  public parameters: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
  }>;

  constructor(name: string, description: string, parameters: BaseTool['parameters']) {
    this.name = name;
    this.description = description;
    this.parameters = parameters;
  }

  async execute(params: Record<string, unknown>, context: ToolContext): Promise<ToolResult> {
    const startTime = Date.now();
    try {
      const result = await this.doExecute(params, context);
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  protected abstract doExecute(params: Record<string, unknown>, context: ToolContext): Promise<unknown>;
}

export class DataFilterTool extends BaseTool {
  constructor() {
    super(
      'filter_data',
      '根据条件筛选数据行',
      [
        { name: 'field', type: 'string', description: '要筛选的字段名', required: true },
        { name: 'operator', type: 'string', description: '操作符: eq, neq, gt, gte, lt, lte, contains, startsWith, endsWith', required: true },
        { name: 'value', type: 'string', description: '比较的值', required: true },
      ]
    );
  }

  protected async doExecute(params: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    const { field, operator, value } = params as { field: string; operator: string; value: string };
    const filtered = context.data.rows.filter(row => {
      const fieldValue = row[field];
      const strValue = String(fieldValue);

      switch (operator) {
        case 'eq': return strValue === value;
        case 'neq': return strValue !== value;
        case 'gt': return Number(fieldValue) > Number(value);
        case 'gte': return Number(fieldValue) >= Number(value);
        case 'lt': return Number(fieldValue) < Number(value);
        case 'lte': return Number(fieldValue) <= Number(value);
        case 'contains': return strValue.includes(value);
        case 'startsWith': return strValue.startsWith(value);
        case 'endsWith': return strValue.endsWith(value);
        default: return false;
      }
    });

    return {
      filteredCount: filtered.length,
      totalCount: context.data.rows.length,
      rows: filtered.slice(0, 100),
    };
  }
}

export class DataSortTool extends BaseTool {
  constructor() {
    super(
      'sort_data',
      '对数据进行排序',
      [
        { name: 'field', type: 'string', description: '排序的字段名', required: true },
        { name: 'order', type: 'string', description: '排序方向: asc 或 desc', required: true },
      ]
    );
  }

  protected async doExecute(params: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    const { field, order } = params as { field: string; order: 'asc' | 'desc' };
    const sorted = [...context.data.rows].sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return order === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return order === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });

    return { rows: sorted.slice(0, 100) };
  }
}

export class DataGroupTool extends BaseTool {
  constructor() {
    super(
      'group_data',
      '对数据进行分组聚合',
      [
        { name: 'groupBy', type: 'string', description: '分组的字段名，多个用逗号分隔', required: true },
        { name: 'measure', type: 'string', description: '聚合字段', required: true },
        { name: 'operation', type: 'string', description: '聚合操作: sum, avg, count, min, max', required: true },
      ]
    );
  }

  protected async doExecute(params: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    const { groupBy, measure, operation } = params as { groupBy: string; measure: string; operation: string };
    const fields = groupBy.split(',').map(f => f.trim());
    const groupMap = new Map<string, { key: Record<string, unknown>; values: number[] }>();

    for (const row of context.data.rows) {
      const key = fields.map(f => String(row[f])).join('|');
      if (!groupMap.has(key)) {
        const keyObj: Record<string, unknown> = {};
        fields.forEach((f, i) => { keyObj[f] = row[f]; });
        groupMap.set(key, { key: keyObj, values: [] });
      }
      const numValue = Number(row[measure]);
      if (!isNaN(numValue)) {
        groupMap.get(key)!.values.push(numValue);
      }
    }

    const result = Array.from(groupMap.entries()).map(([key, group]) => {
      let aggregatedValue: number;
      const values = group.values;

      switch (operation) {
        case 'sum':
          aggregatedValue = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          aggregatedValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        case 'min':
          aggregatedValue = values.length > 0 ? Math.min(...values) : 0;
          break;
        case 'max':
          aggregatedValue = values.length > 0 ? Math.max(...values) : 0;
          break;
        default:
          aggregatedValue = 0;
      }

      return { ...group.key, [measure]: Math.round(aggregatedValue * 100) / 100 };
    });

    return { groups: result };
  }
}

export class StatisticsTool extends BaseTool {
  constructor() {
    super(
      'calculate_statistics',
      '计算数值字段的统计信息',
      [
        { name: 'field', type: 'string', description: '数值字段名', required: true },
        { name: 'stats', type: 'string', description: '要计算的统计量，用逗号分隔: sum, avg, min, max, count', required: true },
      ]
    );
  }

  protected async doExecute(params: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    const { field, stats } = params as { field: string; stats: string };
    const statList = stats.split(',').map(s => s.trim());
    const values = context.data.rows
      .map(row => Number(row[field]))
      .filter(v => !isNaN(v));

    if (values.length === 0) {
      return { error: '没有找到数值数据' };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const result: Record<string, number> = {};

    for (const stat of statList) {
      switch (stat) {
        case 'sum':
          result.sum = sum;
          break;
        case 'avg':
        case 'mean':
          result.mean = Math.round(mean * 100) / 100;
          break;
        case 'min':
          result.min = sorted[0];
          break;
        case 'max':
          result.max = sorted[sorted.length - 1];
          break;
        case 'count':
          result.count = values.length;
          break;
        case 'median':
          result.median = sorted.length % 2 === 0
            ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
            : sorted[Math.floor(sorted.length / 2)];
          break;
      }
    }

    return result;
  }
}

export class ChartRecommendTool extends BaseTool {
  constructor() {
    super(
      'recommend_chart',
      '根据数据特征推荐图表类型',
      [
        { name: 'field', type: 'string', description: '要可视化的字段', required: false },
      ]
    );
  }

  protected async doExecute(params: Record<string, unknown>, context: ToolContext): Promise<unknown> {
    const field = params.field as string | undefined;
    const fields = field ? [field] : context.data.headers.slice(0, 5);
    const fieldStat = context.fieldStats.find(s => fields.includes(s.field));

    let chartTypes: string[] = ['bar'];
    let reason = '';

    if (fieldStat?.type === 'number') {
      chartTypes = ['bar', 'line', 'area'];
      reason = '数值型字段适合用柱状图、折线图或面积图展示趋势';
    } else if (fieldStat?.type === 'string') {
      const uniqueRatio = fieldStat.uniqueCount / fieldStat.count;
      if (uniqueRatio < 0.1) {
        chartTypes = ['pie', 'bar'];
        reason = '枚举型字段适合用饼图或柱状图展示分布';
      } else {
        chartTypes = ['bar', 'wordcloud'];
        reason = '高基数字段适合用柱状图展示TopN';
      }
    }

    return {
      recommendedCharts: chartTypes,
      reason,
      suggestedFields: fields,
    };
  }
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools = new Map<string, BaseTool>();

  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
      ToolRegistry.instance.registerDefaultTools();
    }
    return ToolRegistry.instance;
  }

  private registerDefaultTools(): void {
    this.register(new DataFilterTool());
    this.register(new DataSortTool());
    this.register(new DataGroupTool());
    this.register(new StatisticsTool());
    this.register(new ChartRecommendTool());
  }

  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }

  unregister(name: string): void {
    this.tools.delete(name);
  }

  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }

  getAll(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters.map(p => ({
        name: p.name,
        type: p.type as 'string' | 'number' | 'boolean' | 'array' | 'object',
        description: p.description,
        required: p.required,
      })),
      execute: async (params: Record<string, unknown>) => {
        const context: ToolContext = {
          data: { headers: [], rows: [], fileName: '', rowCount: 0, columnCount: 0 },
          fieldStats: [],
        };
        return tool.execute(params, context);
      },
    }));
  }

  async executeTool(
    name: string,
    params: Record<string, unknown>,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `工具 ${name} 不存在`,
        executionTime: 0,
      };
    }
    return tool.execute(params, context);
  }
}

export const toolRegistry = ToolRegistry.getInstance();
