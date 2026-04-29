/**
 * AI字段引擎 - 融合飞书AI字段捷径+AI生成公式+单元格智能工具栏
 * 核心能力：可视化配置AI字段、自然语言生成公式、单元格文本AI处理
 */

import type { CellValue } from '@/types';

// ============================================
// AI字段类型定义（6大核心类型）
// ============================================
export type AIFieldType =
  | 'extract'      // 信息提取
  | 'classify'     // 智能分类
  | 'summarize'    // 内容总结
  | 'translate'    // 智能翻译
  | 'generate'     // 内容生成
  | 'clean';       // 数据清洗

export interface AIFieldConfig {
  // 信息提取
  extractTarget?: string;      // 提取目标：手机号/地址/日期/金额等
  // 智能分类
  classifyRules?: string;      // 分类规则：高/中/低 或 产品问题/物流问题
  // 内容总结
  summarizeLength?: number;    // 总结字数限制（默认100）
  // 智能翻译
  translateTarget?: string;    // 目标语言：中文/英文/日文
  // 内容生成
  generatePrompt?: string;     // 生成提示词
  // 数据清洗
  cleanStrategy?: string;      // 清洗策略：去重/格式化/补全
}

export interface AIField {
  id: string;
  name: string;                // 字段显示名称
  type: AIFieldType;
  sourceColumns: string[];     // 源数据列（支持多列）
  config: AIFieldConfig;
  status: 'pending' | 'preview' | 'running' | 'completed' | 'error';
  results: Record<number, CellValue>;  // 按行索引存储结果
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  autoUpdate: boolean;         // 源数据变化自动联动更新
  previewMode: boolean;        // 是否只预览前5行
}

// ============================================
// AI字段预设模板（开箱即用）
// ============================================
export interface AIFieldTemplate {
  id: string;
  name: string;
  description: string;
  type: AIFieldType;
  icon: string;
  defaultConfig: AIFieldConfig;
  example: string;
}

export const AI_FIELD_TEMPLATES: AIFieldTemplate[] = [
  {
    id: 'extract-phone',
    name: '提取手机号',
    description: '从文本中自动提取手机号码',
    type: 'extract',
    icon: 'Phone',
    defaultConfig: { extractTarget: '手机号' },
    example: '从"客户备注"列提取手机号 → 138****8888',
  },
  {
    id: 'extract-address',
    name: '提取地址',
    description: '从文本中自动提取地址信息',
    type: 'extract',
    icon: 'MapPin',
    defaultConfig: { extractTarget: '地址' },
    example: '从"订单备注"提取收货地址',
  },
  {
    id: 'classify-amount',
    name: '金额分级',
    description: '按金额区间自动分类',
    type: 'classify',
    icon: 'Tags',
    defaultConfig: { classifyRules: '高客单(>10000) / 中客单(3000-10000) / 低客单(<3000)' },
    example: '订单金额 → 高/中/低客单分类',
  },
  {
    id: 'classify-feedback',
    name: '反馈分类',
    description: '自动分类客户反馈类型',
    type: 'classify',
    icon: 'MessageSquare',
    defaultConfig: { classifyRules: '产品问题 / 物流问题 / 服务问题 / 其他' },
    example: '"物流太慢了" → 物流问题',
  },
  {
    id: 'summarize-text',
    name: '文本总结',
    description: '将长文本精简为核心摘要',
    type: 'summarize',
    icon: 'FileText',
    defaultConfig: { summarizeLength: 100 },
    example: '项目进展大段文本 → 100字核心摘要',
  },
  {
    id: 'summarize-todo',
    name: '提取待办',
    description: '从聊天记录/会议纪要的提取待办事项',
    type: 'summarize',
    icon: 'CheckSquare',
    defaultConfig: { summarizeLength: 50 },
    example: '会议纪要 → 待办事项清单',
  },
  {
    id: 'translate-cn',
    name: '翻译为中文',
    description: '将外文自动翻译为中文',
    type: 'translate',
    icon: 'Languages',
    defaultConfig: { translateTarget: '中文' },
    example: 'Customer Address → 客户地址',
  },
  {
    id: 'translate-en',
    name: '翻译为英文',
    description: '将中文自动翻译为英文',
    type: 'translate',
    icon: 'Globe',
    defaultConfig: { translateTarget: '英文' },
    example: '产品名称 → Product Name',
  },
  {
    id: 'generate-copy',
    name: '生成推广文案',
    description: '基于产品信息自动生成推广文案',
    type: 'generate',
    icon: 'PenTool',
    defaultConfig: { generatePrompt: '基于产品名称、价格、卖点生成50字推广文案' },
    example: '产品名+价格+卖点 → 推广文案',
  },
  {
    id: 'generate-review',
    name: '生成绩效评语',
    description: '基于考勤数据自动生成绩效评语',
    type: 'generate',
    icon: 'Star',
    defaultConfig: { generatePrompt: '基于员工考勤数据生成季度绩效评语' },
    example: '考勤数据 → 绩效评语',
  },
  {
    id: 'clean-format',
    name: '格式标准化',
    description: '统一数据格式（日期/金额/电话等）',
    type: 'clean',
    icon: 'AlignLeft',
    defaultConfig: { cleanStrategy: '格式化' },
    example: '2024.1.5 / 01/05/2024 → 2024-01-05',
  },
  {
    id: 'clean-fill',
    name: '智能补全',
    description: '根据上下文智能补全缺失数据',
    type: 'clean',
    icon: 'Database',
    defaultConfig: { cleanStrategy: '补全' },
    example: '缺失的地址根据省市自动补全',
  },
];

// ============================================
// 智能推荐：根据数据特征推荐AI字段类型
// ============================================
export interface ColumnFeature {
  name: string;
  type: 'text' | 'number' | 'date' | 'boolean';
  sampleValues: CellValue[];
  avgLength?: number;
  nullRate?: number;
}

export function recommendAIFields(columns: ColumnFeature[]): AIFieldTemplate[] {
  const recommendations: AIFieldTemplate[] = [];
  const usedIds = new Set<string>();

  for (const col of columns) {
    // 长文本列 → 推荐总结/提取
    if (col.type === 'text' && (col.avgLength ?? 0) > 50) {
      if (!usedIds.has('summarize-text')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'summarize-text')!);
        usedIds.add('summarize-text');
      }
    }

    // 包含混合内容的文本 → 推荐提取
    if (col.type === 'text') {
      const samples = String(col.sampleValues[0] || '');
      if (/\d{11}/.test(samples) && !usedIds.has('extract-phone')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'extract-phone')!);
        usedIds.add('extract-phone');
      }
    }

    // 金额列 → 推荐分类
    if (col.type === 'number' && /金额|价格|销售额|收入|cost|price|amount/i.test(col.name)) {
      if (!usedIds.has('classify-amount')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'classify-amount')!);
        usedIds.add('classify-amount');
      }
    }

    // 反馈/备注列 → 推荐分类
    if (/反馈|备注|评价|评论|feedback|comment|review/i.test(col.name)) {
      if (!usedIds.has('classify-feedback')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'classify-feedback')!);
        usedIds.add('classify-feedback');
      }
    }

    // 英文列 → 推荐翻译
    if (col.type === 'text') {
      const samples = String(col.sampleValues[0] || '');
      if (/[a-zA-Z]{3,}/.test(samples) && !usedIds.has('translate-cn')) {
        recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'translate-cn')!);
        usedIds.add('translate-cn');
      }
    }

    // 高缺失率 → 推荐补全
    if ((col.nullRate ?? 0) > 0.3 && !usedIds.has('clean-fill')) {
      recommendations.push(AI_FIELD_TEMPLATES.find(t => t.id === 'clean-fill')!);
      usedIds.add('clean-fill');
    }
  }

  return recommendations.slice(0, 5); // 最多推荐5个
}

// ============================================
// AI字段执行引擎
// ============================================
export interface AIFieldExecuteContext {
  rows: Record<string, CellValue>[];
  headers: string[];
  sourceColumns: string[];
  rowIndices: number[];        // 需要处理的行索引
}

export interface AIFieldExecuteResult {
  rowIndex: number;
  value: CellValue;
  confidence?: number;         // 置信度 0-1
}

/**
 * 构建AI字段执行的Prompt
 */
export function buildAIFieldPrompt(
  field: AIField,
  context: AIFieldExecuteContext,
  rowIndex: number
): string {
  const row = context.rows[rowIndex];
  const sourceData = context.sourceColumns.map(col => ({
    column: col,
    value: row[col],
  }));

  const dataStr = sourceData.map(d => `${d.column}: ${d.value}`).join('\n');

  const prompts: Record<AIFieldType, string> = {
    extract: `从以下数据中提取"${field.config.extractTarget}"。只返回提取结果，不要解释。
数据：
${dataStr}`,

    classify: `根据以下数据，按照规则"${field.config.classifyRules}"进行分类。只返回分类结果。
数据：
${dataStr}`,

    summarize: `将以下内容总结为${field.config.summarizeLength || 100}字以内的核心摘要。只返回摘要。
内容：
${dataStr}`,

    translate: `将以下内容翻译为${field.config.translateTarget}。只返回翻译结果。
内容：
${dataStr}`,

    generate: `基于以下数据，${field.config.generatePrompt}。只返回生成结果。
数据：
${dataStr}`,

    clean: `对以下数据进行${field.config.cleanStrategy}处理。只返回处理后的结果。
数据：
${dataStr}`,
  };

  return prompts[field.type];
}

// ============================================
// 本地存储管理
// ============================================
const STORAGE_KEY = 'datainsight_ai_fields';

export function saveAIFields(dataId: string, fields: AIField[]): void {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[dataId] = fields;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // ignore
  }
}

export function loadAIFields(dataId: string): AIField[] {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[dataId] || [];
  } catch {
    return [];
  }
}

// ============================================
// 工具函数
// ============================================

/** 生成唯一ID */
export function generateFieldId(): string {
  return `aifield_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** 创建AI字段 */
export function createAIField(
  name: string,
  type: AIFieldType,
  sourceColumns: string[],
  config: AIFieldConfig,
  options?: { autoUpdate?: boolean; previewMode?: boolean }
): AIField {
  return {
    id: generateFieldId(),
    name,
    type,
    sourceColumns,
    config,
    status: 'pending',
    results: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    autoUpdate: options?.autoUpdate ?? true,
    previewMode: options?.previewMode ?? true,
  };
}

/** 从模板创建AI字段 */
export function createAIFieldFromTemplate(
  template: AIFieldTemplate,
  sourceColumns: string[]
): AIField {
  return createAIField(
    template.name,
    template.type,
    sourceColumns,
    { ...template.defaultConfig },
    { previewMode: true, autoUpdate: true }
  );
}

/** 获取AI字段的显示图标 */
export function getAIFieldTypeIcon(type: AIFieldType): string {
  const icons: Record<AIFieldType, string> = {
    extract: '🔍',
    classify: '🏷️',
    summarize: '📝',
    translate: '🌐',
    generate: '✨',
    clean: '🧹',
  };
  return icons[type];
}

/** 获取AI字段类型的中文名 */
export function getAIFieldTypeLabel(type: AIFieldType): string {
  const labels: Record<AIFieldType, string> = {
    extract: '信息提取',
    classify: '智能分类',
    summarize: '内容总结',
    translate: '智能翻译',
    generate: '内容生成',
    clean: '数据清洗',
  };
  return labels[type];
}

/** 获取AI字段类型的颜色 */
export function getAIFieldTypeColor(type: AIFieldType): string {
  const colors: Record<AIFieldType, string> = {
    extract: 'bg-blue-100 text-blue-700',
    classify: 'bg-amber-100 text-amber-700',
    summarize: 'bg-green-100 text-green-700',
    translate: 'bg-purple-100 text-purple-700',
    generate: 'bg-pink-100 text-pink-700',
    clean: 'bg-cyan-100 text-cyan-700',
  };
  return colors[type];
}
