/**
 * Prompt工程引擎
 * 极致的Prompt设计：结构化输出 + 思维链 + 少样本
 * 模型只是执行器，Prompt才是核心竞争力
 */

import type { DataLayer, AnalysisLayer, InsightLayer, PresentationLayer } from './types';

export interface PromptTemplate {
  id: string;
  version: string;
  system: string;
  instruction: string;
  examples: Example[];
  outputSchema: OutputSchema;
  constraints: string[];
}

export interface Example {
  input: string;
  context?: Record<string, unknown>;
  output: Record<string, unknown>;
  explanation?: string;
}

export interface OutputSchema {
  type: 'object' | 'array';
  fields: SchemaField[];
  required: string[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: OutputSchema;
  properties?: SchemaField[];
}

/**
 * Prompt工程引擎
 * 核心设计原则：
 * 1. 结构化输出：强制JSON格式，降低模型依赖
 * 2. 思维链：要求模型展示推理过程
 * 3. 少样本：提供高质量示例
 * 4. 约束明确：边界清晰，减少幻觉
 */
export class PromptEngine {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.registerBaseTemplates();
  }

  /**
   * 注册基础模板
   */
  private registerBaseTemplates(): void {
    // 数据分析模板
    this.registerTemplate({
      id: 'data-analysis',
      version: '1.0.0',
      system: `你是DataInsight数据分析引擎，专注于从数据中提取有价值的业务洞察。

核心原则：
1. 所有结论必须有数据支撑，禁止无依据推测
2. 使用结构化输出，确保结果可被程序解析
3. 展示推理过程，让用户理解分析逻辑
4. 区分事实和推断，标注置信度

输出规范：
- 数值精度：金额2位小数，百分比1位小数，计数取整
- 时间格式：YYYY-MM-DD
- 必须包含：数据事实、分析推理、业务洞察、行动建议`,
      instruction: `分析以下数据，提取关键洞察：

【数据概况】
{data_profile}

【分析目标】
{analysis_goal}

【输出要求】
请按照以下JSON格式输出分析结果：`,
      examples: [
        {
          input: '分析销售数据，找出问题',
          context: {
            data_profile: '销售额、销量、门店、日期，共1000条记录',
            analysis_goal: '识别销售异常和趋势',
          },
          output: {
            summary: {
              headline: '本月销售额同比下降15%，需重点关注',
              key_metrics: [
                { metric: '总销售额', value: 1250000, unit: '元', change: -15.2 },
                { metric: '订单量', value: 3200, unit: '单', change: -8.5 },
              ],
            },
            findings: [
              {
                type: 'anomaly',
                title: '3号门店销售额异常下降',
                description: '3号门店本月销售额仅8万元，同比下降45%',
                evidence: {
                  current_value: 80000,
                  previous_value: 145000,
                  change_percent: -44.8,
                },
                confidence: 0.95,
                severity: 'critical',
              },
            ],
            root_causes: [
              {
                factor: '周边新开竞品门店',
                impact: 0.6,
                evidence: '竞品A于上月在3号门店500米处开业',
              },
            ],
            recommendations: [
              {
                action: '开展针对性促销活动',
                expected_impact: '提升销售额20-30%',
                priority: 'high',
              },
            ],
          },
          explanation: '展示了结构化输出格式，包含摘要、发现、根因和建议',
        },
      ],
      outputSchema: {
        type: 'object',
        fields: [
          {
            name: 'summary',
            type: 'object',
            description: '执行摘要',
            properties: [
              { name: 'headline', type: 'string', description: '核心结论' },
              {
                name: 'key_metrics',
                type: 'array',
                description: '关键指标',
                items: {
                  type: 'object',
                  fields: [
                    { name: 'metric', type: 'string', description: '指标名称' },
                    { name: 'value', type: 'number', description: '指标值' },
                    { name: 'unit', type: 'string', description: '单位' },
                    { name: 'change', type: 'number', description: '同比变化%' },
                  ],
                  required: ['metric', 'value'],
                },
              },
            ],
          },
          {
            name: 'findings',
            type: 'array',
            description: '数据发现',
            items: {
              type: 'object',
              fields: [
                { name: 'type', type: 'string', description: '发现类型', enum: ['anomaly', 'trend', 'pattern', 'correlation'] },
                { name: 'title', type: 'string', description: '发现标题' },
                { name: 'description', type: 'string', description: '详细描述' },
                { name: 'evidence', type: 'object', description: '证据数据' },
                { name: 'confidence', type: 'number', description: '置信度0-1' },
                { name: 'severity', type: 'string', description: '严重程度', enum: ['critical', 'warning', 'info'] },
              ],
              required: ['type', 'title', 'description', 'confidence'],
            },
          },
          {
            name: 'root_causes',
            type: 'array',
            description: '根因分析',
            items: {
              type: 'object',
              fields: [
                { name: 'factor', type: 'string', description: '影响因素' },
                { name: 'impact', type: 'number', description: '影响程度0-1' },
                { name: 'evidence', type: 'string', description: '证据' },
              ],
              required: ['factor', 'impact'],
            },
          },
          {
            name: 'recommendations',
            type: 'array',
            description: '行动建议',
            items: {
              type: 'object',
              fields: [
                { name: 'action', type: 'string', description: '具体行动' },
                { name: 'expected_impact', type: 'string', description: '预期效果' },
                { name: 'priority', type: 'string', description: '优先级', enum: ['high', 'medium', 'low'] },
              ],
              required: ['action', 'priority'],
            },
          },
        ],
        required: ['summary', 'findings', 'recommendations'],
      },
      constraints: [
        '禁止编造数据',
        '禁止无依据推测',
        '必须展示推理过程',
        '必须区分事实和推断',
        '置信度低于0.7的结论需标注不确定性',
      ],
    });

    // 数据清洗模板
    this.registerTemplate({
      id: 'data-cleaning',
      version: '1.0.0',
      system: `你是DataInsight数据清洗引擎，专注于提升数据质量。

核心原则：
1. 保留原始数据痕迹，所有修改可追溯
2. 清洗规则明确，可复现
3. 异常数据标记，不盲目删除
4. 输出清洗报告，量化改进效果`,
      instruction: `清洗以下数据，提升数据质量：

【数据质量报告】
{quality_report}

【清洗目标】
{cleaning_goal}

【输出要求】
请按照以下JSON格式输出清洗结果：`,
      examples: [
        {
          input: '清洗销售数据',
          context: {
            quality_report: '缺失率15%，重复率5%，异常值3%',
            cleaning_goal: '去除重复，填充缺失，标记异常',
          },
          output: {
            cleaning_report: {
              before: { rows: 1000, completeness: 85, duplicates: 50 },
              after: { rows: 950, completeness: 98, duplicates: 0 },
              operations: [
                { operation: 'remove_duplicates', affected_rows: 50, description: '去除完全重复记录' },
                { operation: 'fill_missing', affected_rows: 150, description: '数值列用均值填充' },
              ],
            },
            data_quality_score: {
              before: 72,
              after: 95,
              improvement: 23,
            },
            warnings: [
              { field: '销售额', issue: '发现3个异常高值', suggestion: '人工确认是否为真实数据' },
            ],
          },
          explanation: '展示了清洗前后的对比和具体操作',
        },
      ],
      outputSchema: {
        type: 'object',
        fields: [
          {
            name: 'cleaning_report',
            type: 'object',
            description: '清洗报告',
            properties: [
              { name: 'before', type: 'object', description: '清洗前状态' },
              { name: 'after', type: 'object', description: '清洗后状态' },
              { name: 'operations', type: 'array', description: '清洗操作' },
            ],
          },
          {
            name: 'data_quality_score',
            type: 'object',
            description: '质量评分',
            properties: [
              { name: 'before', type: 'number', description: '清洗前分数' },
              { name: 'after', type: 'number', description: '清洗后分数' },
              { name: 'improvement', type: 'number', description: '提升幅度' },
            ],
          },
          {
            name: 'warnings',
            type: 'array',
            description: '警告信息',
            items: {
              type: 'object',
              fields: [
                { name: 'field', type: 'string', description: '字段名' },
                { name: 'issue', type: 'string', description: '问题描述' },
                { name: 'suggestion', type: 'string', description: '建议' },
              ],
              required: ['field', 'issue'],
            },
          },
        ],
        required: ['cleaning_report', 'data_quality_score'],
      },
      constraints: [
        '必须保留原始数据备份',
        '所有操作必须可逆',
        '异常数据标记而非删除',
        '输出清洗日志',
      ],
    });

    // 表格生成模板
    this.registerTemplate({
      id: 'table-generation',
      version: '1.0.0',
      system: `你是DataInsight表格生成引擎，专注于生成结构化、标准化的数据表格。

核心原则：
1. 表头清晰、无歧义
2. 字段类型明确
3. 数据符合业务逻辑
4. 包含必要的示例数据`,
      instruction: `根据需求生成表格结构：

【需求描述】
{requirement}

【输出要求】
请按照以下JSON格式输出表格结构：`,
      examples: [
        {
          input: '生成销售跟踪表',
          context: { requirement: '跟踪每日各门店销售额、销量、客单价' },
          output: {
            table_name: '门店销售日报',
            description: '记录各门店每日销售核心指标',
            fields: [
              { name: '日期', type: 'date', required: true, description: '销售日期' },
              { name: '门店编码', type: 'string', required: true, description: '门店唯一标识' },
              { name: '门店名称', type: 'string', required: true, description: '门店名称' },
              { name: '销售额', type: 'number', required: true, description: '当日销售金额（元）', format: '0.00' },
              { name: '销量', type: 'number', required: true, description: '当日销售数量' },
              { name: '客单价', type: 'number', required: false, description: '平均客单价（元）', formula: '销售额/订单数' },
            ],
            sample_data: [
              { 日期: '2024-01-01', 门店编码: 'S001', 门店名称: '北京店', 销售额: 125000, 销量: 320, 客单价: 390.63 },
            ],
            constraints: [
              '销售额必须大于等于0',
              '销量必须为正整数',
              '客单价 = 销售额 / 订单数',
            ],
          },
          explanation: '展示了完整的表格结构定义',
        },
      ],
      outputSchema: {
        type: 'object',
        fields: [
          { name: 'table_name', type: 'string', description: '表格名称' },
          { name: 'description', type: 'string', description: '表格说明' },
          {
            name: 'fields',
            type: 'array',
            description: '字段定义',
            items: {
              type: 'object',
              fields: [
                { name: 'name', type: 'string', description: '字段名' },
                { name: 'type', type: 'string', description: '字段类型', enum: ['string', 'number', 'date', 'boolean'] },
                { name: 'required', type: 'boolean', description: '是否必填' },
                { name: 'description', type: 'string', description: '字段说明' },
                { name: 'format', type: 'string', description: '格式' },
                { name: 'formula', type: 'string', description: '计算公式' },
              ],
              required: ['name', 'type', 'required'],
            },
          },
          { name: 'sample_data', type: 'array', description: '示例数据' },
          { name: 'constraints', type: 'array', description: '约束条件' },
        ],
        required: ['table_name', 'fields'],
      },
      constraints: [
        '字段名必须清晰无歧义',
        '必须包含示例数据',
        '数值字段必须标注单位',
        '日期字段统一格式',
      ],
    });
  }

  /**
   * 注册模板
   */
  registerTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 构建Prompt
   */
  buildPrompt(templateId: string, variables: Record<string, string>): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const parts: string[] = [];

    // System Prompt
    parts.push(`# System`);
    parts.push(template.system);
    parts.push('');

    // Instruction
    parts.push(`# Instruction`);
    let instruction = template.instruction;
    for (const [key, value] of Object.entries(variables)) {
      instruction = instruction.replace(new RegExp(`{${key}}`, 'g'), value);
    }
    parts.push(instruction);
    parts.push('');

    // Examples (Few-shot)
    if (template.examples.length > 0) {
      parts.push(`# Examples`);
      template.examples.forEach((example, i) => {
        parts.push(`## Example ${i + 1}`);
        parts.push(`Input: ${example.input}`);
        if (example.context) {
          parts.push(`Context: ${JSON.stringify(example.context, null, 2)}`);
        }
        parts.push(`Output:`);
        parts.push('```json');
        parts.push(JSON.stringify(example.output, null, 2));
        parts.push('```');
        if (example.explanation) {
          parts.push(`Explanation: ${example.explanation}`);
        }
        parts.push('');
      });
    }

    // Output Schema
    parts.push(`# Output Schema`);
    parts.push('You must output valid JSON following this schema:');
    parts.push('```json');
    parts.push(JSON.stringify(this.schemaToJSON(template.outputSchema), null, 2));
    parts.push('```');
    parts.push('');

    // Constraints
    parts.push(`# Constraints`);
    template.constraints.forEach((c, i) => {
      parts.push(`${i + 1}. ${c}`);
    });
    parts.push('');

    // Final instruction
    parts.push(`# Task`);
    parts.push('Now, please analyze the data and output the result in the specified JSON format.');
    parts.push('Ensure your response is valid JSON and follows the schema exactly.');

    return parts.join('\n');
  }

  /**
   * 验证输出
   */
  validateOutput(templateId: string, output: unknown): { valid: boolean; errors: string[]; data?: Record<string, unknown> } {
    const template = this.templates.get(templateId);
    if (!template) {
      return { valid: false, errors: [`Template not found: ${templateId}`] };
    }

    const errors: string[] = [];

    if (!output || typeof output !== 'object') {
      errors.push('Output must be an object');
      return { valid: false, errors };
    }

    const obj = output as Record<string, unknown>;

    // 检查必填字段
    for (const field of template.outputSchema.required) {
      if (!(field in obj)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // 递归验证字段类型
    this.validateFields(obj, template.outputSchema.fields, '', errors);

    return {
      valid: errors.length === 0,
      errors,
      data: errors.length === 0 ? obj : undefined,
    };
  }

  /**
   * 递归验证字段
   */
  private validateFields(obj: Record<string, unknown>, fields: SchemaField[], path: string, errors: string[]): void {
    for (const field of fields) {
      const fullPath = path ? `${path}.${field.name}` : field.name;
      const value = obj[field.name];

      if (value === undefined) continue;

      // 类型检查
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== field.type && !(field.type === 'number' && actualType === 'number')) {
        errors.push(`Field "${fullPath}" should be ${field.type}, got ${actualType}`);
      }

      // 枚举检查
      if (field.enum && typeof value === 'string' && !field.enum.includes(value)) {
        errors.push(`Field "${fullPath}" should be one of [${field.enum.join(', ')}], got "${value}"`);
      }

      // 递归验证对象
      if (field.type === 'object' && field.properties && typeof value === 'object' && value !== null) {
        this.validateFields(value as Record<string, unknown>, field.properties, fullPath, errors);
      }

      // 递归验证数组
      if (field.type === 'array' && field.items && Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          if (field.items.type === 'object' && field.items.fields && typeof item === 'object') {
            this.validateFields(item as Record<string, unknown>, field.items.fields, `${fullPath}[${i}]`, errors);
          }
        }
      }
    }
  }

  /**
   * Schema转JSON示例
   */
  private schemaToJSON(schema: OutputSchema): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const field of schema.fields) {
      result[field.name] = this.getExampleValue(field);
    }

    return result;
  }

  /**
   * 获取示例值
   */
  private getExampleValue(field: SchemaField): unknown {
    switch (field.type) {
      case 'string':
        return field.enum ? field.enum[0] : 'string';
      case 'number':
        return 0;
      case 'boolean':
        return true;
      case 'array':
        return field.items ? [this.schemaToJSON(field.items)] : [];
      case 'object':
        return field.properties ? this.schemaToJSON({ type: 'object', fields: field.properties, required: [] }) : {};
      default:
        return null;
    }
  }

  /**
   * 获取模板
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * 列出所有模板
   */
  listTemplates(): Array<{ id: string; version: string; description: string }> {
    return Array.from(this.templates.values()).map(t => ({
      id: t.id,
      version: t.version,
      description: t.system.substring(0, 100),
    }));
  }
}

export const promptEngine = new PromptEngine();
