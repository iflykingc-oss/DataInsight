import { ParsedData, FieldStats, IntentDetection } from '@/types';

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPromptTemplate: string;
 适用于: ('query' | 'analysis' | 'visualization' | 'report' | 'command')[];
  优先级: number;
}

export interface PromptContext {
  question: string;
  data: ParsedData;
  fieldStats: FieldStats[];
  intent: IntentDetection;
  chatHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

const DATA_ANALYSIS_TEMPLATE = `你是一个专业的数据分析师，擅长从数据中发现规律、洞察趋势、找出异常。

## 数据概况
- 文件名：{{fileName}}
- 数据规模：{{rowCount}} 行 × {{columnCount}} 列
- 字段信息：
{{fieldInfo}}

## 数据摘要
{{dataSummary}}

## 分析要求
{{question}}

请基于以上数据，提供专业的分析结论。`;

const VISUALIZATION_TEMPLATE = `你是一个数据可视化专家，擅长根据数据特征推荐最合适的图表类型和配置。

## 数据概况
- 文件名：{{fileName}}
- 数据规模：{{rowCount}} 行 × {{columnCount}} 列
- 字段信息：
{{fieldInfo}}

## 可视化需求
{{question}}

请推荐最适合的图表类型，并说明理由。`;

const REPORT_TEMPLATE = `你是一个专业的商业报告撰写专家，擅长将数据分析结果转化为清晰、专业的报告。

## 数据概况
- 文件名：{{fileName}}
- 数据规模：{{rowCount}} 行 × {{columnCount}} 列
- 关键字段：
{{keyFields}}

## 数据分析结果
{{analysisResults}}

## 报告要求
{{question}}

请生成一份专业的分析报告，包含执行摘要、关键发现、建议等部分。`;

const QUERY_TEMPLATE = `你是一个数据查询助手，擅长根据用户问题从数据中检索和计算答案。

## 数据概况
- 文件名：{{fileName}}
- 数据规模：{{rowCount}} 行 × {{columnCount}} 列
- 字段信息：
{{fieldInfo}}

## 用户问题
{{question}}

请直接回答用户的问题，如果需要计算请给出计算过程。`;

export class PromptEngine {
  private static instance: PromptEngine;
  private templates: Map<string, PromptTemplate> = new Map();

  private constructor() {
    this.registerDefaultTemplates();
  }

  static getInstance(): PromptEngine {
    if (!PromptEngine.instance) {
      PromptEngine.instance = new PromptEngine();
    }
    return PromptEngine.instance;
  }

  private registerDefaultTemplates(): void {
    this.templates.set('data_analysis', {
      id: 'data_analysis',
      name: '数据分析',
      description: '通用数据分析场景',
      systemPrompt: `你是一个专业的数据分析师，擅长从数据中发现规律、洞察趋势、找出异常。
请始终基于提供的数据进行回答，不要编造数据。`,
      userPromptTemplate: DATA_ANALYSIS_TEMPLATE,
      适用于: ['analysis', 'query'],
      优先级: 10,
    });

    this.templates.set('visualization', {
      id: 'visualization',
      name: '可视化推荐',
      description: '图表类型推荐场景',
      systemPrompt: `你是一个数据可视化专家，擅长根据数据特征推荐最合适的图表类型和配置。
请基于数据特征，给出专业的可视化建议。`,
      userPromptTemplate: VISUALIZATION_TEMPLATE,
      适用于: ['visualization'],
      优先级: 9,
    });

    this.templates.set('report', {
      id: 'report',
      name: '报表生成',
      description: '报告撰写场景',
      systemPrompt: `你是一个专业的商业报告撰写专家，擅长将数据分析结果转化为清晰、专业的报告。
请生成结构清晰、内容详实的分析报告。`,
      userPromptTemplate: REPORT_TEMPLATE,
      适用于: ['report'],
      优先级: 8,
    });

    this.templates.set('query', {
      id: 'query',
      name: '数据查询',
      description: '简单数据查询场景',
      systemPrompt: `你是一个数据查询助手，请根据提供的数据直接回答用户问题。
保持回答简洁、准确。`,
      userPromptTemplate: QUERY_TEMPLATE,
      适用于: ['query'],
      优先级: 7,
    });
  }

  register(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  getAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  selectTemplate(intent: IntentDetection): PromptTemplate {
    const applicableTemplates = Array.from(this.templates.values())
      .filter(t => t.适用于.includes(intent.intent as 'query' | 'analysis' | 'visualization' | 'report' | 'command'))
      .sort((a, b) => b.优先级 - a.优先级);

    return applicableTemplates[0] || this.templates.get('data_analysis')!;
  }

  buildPrompt(context: PromptContext): { system: string; user: string } {
    const template = this.selectTemplate(context.intent);
    const { data, fieldStats, question, chatHistory } = context;

    const fieldInfo = fieldStats.map(s =>
      `- ${s.field}: ${s.type}${s.numericStats ? ` (范围: ${s.numericStats.min} ~ ${s.numericStats.max})` : ''}`
    ).join('\n');

    const keyFields = fieldStats
      .filter(s => s.type === 'number')
      .slice(0, 5)
      .map(s => `- ${s.field}: ${s.numericStats?.min} ~ ${s.numericStats?.max}`)
      .join('\n');

    const dataSummary = `数据完整度: ${Math.round((1 - fieldStats.reduce((acc, s) => acc + s.nullCount, 0) / data.rowCount) * 100)}%`;

    const replacements: Record<string, string> = {
      '{{fileName}}': data.fileName,
      '{{rowCount}}': String(data.rowCount),
      '{{columnCount}}': String(data.columnCount),
      '{{fieldInfo}}': fieldInfo,
      '{{keyFields}}': keyFields || fieldInfo,
      '{{dataSummary}}': dataSummary,
      '{{question}}': question,
      '{{analysisResults}}': context.chatHistory?.map(m =>
        m.role === 'user' ? `用户: ${m.content}` : `AI: ${m.content}`
      ).join('\n\n') || '',
    };

    let userPrompt = template.userPromptTemplate;
    for (const [key, value] of Object.entries(replacements)) {
      userPrompt = userPrompt.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    let systemPrompt = template.systemPrompt;
    if (chatHistory && chatHistory.length > 0) {
      systemPrompt += `\n\n## 对话历史\n${chatHistory.map(m =>
        m.role === 'user' ? `用户: ${m.content}` : `助手: ${m.content}`
      ).join('\n')}`;
    }

    return { system: systemPrompt, user: userPrompt };
  }

  optimizeForContext(context: PromptContext): { system: string; user: string } {
    const base = this.buildPrompt(context);

    if (context.data.rowCount > 10000) {
      base.system += '\n\n注意：数据量较大，请基于样本数据进行分析，避免遍历全量数据。';
    }

    if (context.data.columnCount > 50) {
      base.system += '\n\n注意：字段较多，请聚焦于与分析相关的字段。';
    }

    const nullRatio = (stats: FieldStats[]) =>
      stats.reduce((acc, s) => acc + s.nullCount, 0) / (stats.reduce((acc, s) => acc + s.count, 0) || 1);
    const overallNullRatio = context.fieldStats.length > 0
      ? nullRatio(context.fieldStats)
      : 0;

    if (overallNullRatio > 0.1) {
      base.system += '\n\n注意：数据存在较多空值，分析时请考虑空值的影响。';
    }

    return base;
  }
}

export const promptEngine = PromptEngine.getInstance();
