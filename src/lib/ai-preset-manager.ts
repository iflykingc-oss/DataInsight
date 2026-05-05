/**
 * AI 预设管理器 — 参考 gpt-runner 的 .gpt.md 预设管理模式
 * 
 * 每个预设是一个 JSON 对象，包含：
 * - 角色定义、系统提示词
 * - 可保存、分享、版本控制
 * - 支持导入/导出
 */

export interface AIPreset {
  id: string;
  name: string;
  description: string;
  category: 'analysis' | 'visualization' | 'cleaning' | 'formula' | 'storytelling' | 'custom';
  systemPrompt: string;
  userPromptTemplate: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  tags?: string[];
  isBuiltIn?: boolean;
  createdAt: string;
  updatedAt: string;
}

// 预置 AI 预设库
const BUILT_IN_PRESETS: AIPreset[] = [
  // === 分析类 ===
  {
    id: 'data-overview',
    name: '数据概览分析',
    description: '快速生成数据全貌概览，包括统计摘要、分布特征、异常值检测',
    category: 'analysis',
    systemPrompt: '你是一位专业的数据分析师。请对用户上传的数据进行全面概览分析，包括：1）基本统计量（行数、列数、数据类型分布）；2）数值字段的描述统计；3）异常值检测；4）数据质量评估。使用Markdown格式输出，包含表格和要点列表。',
    userPromptTemplate: '请对以下数据进行全面概览分析：\n\n数据信息：{{dataSummary}}\n字段列表：{{headers}}\n前5行数据：{{sampleRows}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'anomaly-detection',
    name: '异常值深度检测',
    description: '使用多种方法（IQR、Z-score、Grubbs）检测数值异常，给出可能原因',
    category: 'analysis',
    systemPrompt: '你是一位数据质量专家。请对数据中的异常值进行深度检测，使用IQR方法、Z-score方法和业务逻辑判断。对每个异常值，给出：1）异常程度（高/中/低）；2）可能的业务原因；3）建议处理方式。',
    userPromptTemplate: '请检测以下数据中的异常值：\n\n字段统计：{{fieldStats}}\n数据样本：{{sampleRows}}\n\n重点关注字段：{{focusFields}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'correlation-analysis',
    name: '相关性分析',
    description: '计算字段间Pearson/Spearman相关系数，发现变量间的线性/非线性关系',
    category: 'analysis',
    systemPrompt: '你是一位统计分析师。请分析数据中数值字段之间的相关性，包括Pearson相关系数矩阵、显著相关性识别、潜在因果关系推断。输出相关性热力图描述和关键发现。',
    userPromptTemplate: '请分析以下数据字段间的相关性：\n\n数值字段：{{numericFields}}\n描述统计：{{fieldStats}}\n数据样本：{{sampleRows}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // === 可视化类 ===
  {
    id: 'chart-recommender',
    name: '智能图表推荐',
    description: '根据数据特征和用户意图，推荐最适合的图表类型和配置',
    category: 'visualization',
    systemPrompt: '你是一位数据可视化专家。根据数据的特征和用户想要展示的信息，推荐最合适的图表类型。对每种推荐，给出：1）图表类型及原因；2）数据映射建议（X轴、Y轴、颜色等）；3）ECharts配置概要。',
    userPromptTemplate: '请推荐适合以下数据的图表：\n\n数据信息：{{dataSummary}}\n用户意图：{{userIntent}}\n字段类型：{{fieldTypes}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'dashboard-designer',
    name: '仪表盘设计',
    description: '根据数据特点自动设计交互式仪表盘布局和组件配置',
    category: 'visualization',
    systemPrompt: '你是一位仪表盘设计专家。请根据数据特征设计一个完整的仪表盘方案，包括：1）整体布局（2x2网格等）；2）每个区域的图表类型和指标；3）交互筛选器建议；4）配色方案。输出JSON格式的配置。',
    userPromptTemplate: '请设计仪表盘方案：\n\n数据：{{dataSummary}}\n关键字段：{{keyFields}}\n业务场景：{{scenario}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // === 清洗类 ===
  {
    id: 'auto-clean',
    name: '自动清洗方案',
    description: '自动检测数据质量问题并生成清洗方案',
    category: 'cleaning',
    systemPrompt: '你是一位数据工程师。请检测数据质量问题并生成清洗方案，包括：1）缺失值处理策略；2）重复记录检测；3）格式标准化；4）异常值处理建议。对每种问题，给出具体的处理方法和优先级。',
    userPromptTemplate: '请为以下数据生成清洗方案：\n\n数据质量报告：{{qualityReport}}\n字段列表：{{headers}}\n样本数据：{{sampleRows}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // === 公式类 ===
  {
    id: 'formula-generator',
    name: 'Excel公式生成',
    description: '将自然语言需求转为Excel/SQL公式',
    category: 'formula',
    systemPrompt: '你是一位Excel和SQL专家。请将用户的自然语言需求转为精确的公式或SQL语句。给出：1）公式/SQL语句；2）详细解释；3）使用注意事项。只返回可直接使用的公式。',
    userPromptTemplate: '请将以下需求转为公式：\n\n需求：{{userRequirement}}\n可用字段：{{headers}}\n数据样本：{{sampleRows}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },

  // === 叙事类 ===
  {
    id: 'data-storytelling',
    name: '数据故事生成',
    description: '将数据分析结果组织为引人入胜的叙事报告',
    category: 'storytelling',
    systemPrompt: '你是一位数据叙事专家。请将分析结果组织为一个数据故事，包括：1）标题和摘要；2）背景与情境；3）关键发现（3-5个）；4）每个发现的因果分析和数据证据；5）总结与行动建议。使用生动的语言，但保持数据准确性。',
    userPromptTemplate: '请生成数据故事：\n\n分析结果：{{analysisResult}}\n关键字段：{{keyFields}}\n行业背景：{{industryContext}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'exec-summary',
    name: '高管摘要',
    description: '将复杂数据分析浓缩为高管级别的执行摘要',
    category: 'storytelling',
    systemPrompt: '你是一位面向C-level的分析顾问。请将数据分析结果浓缩为执行摘要：1）一句话总结；2）3个关键数字；3）最重要的发现（1-2句）；4）建议行动（最多3项）。语言简洁、决策导向。',
    userPromptTemplate: '请生成高管摘要：\n\n分析结果：{{analysisResult}}\n核心指标：{{keyMetrics}}',
    isBuiltIn: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
];

const STORAGE_KEY = 'datainsight_ai_presets';

export class AIPresetManager {
  private presets: AIPreset[] = [];

  constructor() {
    this.loadPresets();
  }

  private loadPresets() {
    // 始终加载内置预设
    this.presets = [...BUILT_IN_PRESETS];
    
    // 加载用户自定义预设
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const customPresets: AIPreset[] = JSON.parse(stored);
          this.presets.push(...customPresets);
        }
      } catch {
        // 解析失败时忽略
      }
    }
  }

  private saveCustomPresets() {
    if (typeof window === 'undefined') return;
    const customPresets = this.presets.filter(p => !p.isBuiltIn);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customPresets));
    } catch {
      // 存储空间不足时忽略
    }
  }

  getAll(): AIPreset[] {
    return [...this.presets];
  }

  getByCategory(category: AIPreset['category']): AIPreset[] {
    return this.presets.filter(p => p.category === category);
  }

  getById(id: string): AIPreset | undefined {
    return this.presets.find(p => p.id === id);
  }

  search(query: string): AIPreset[] {
    const q = query.toLowerCase();
    return this.presets.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    );
  }

  create(preset: Omit<AIPreset, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>): AIPreset {
    const newPreset: AIPreset = {
      ...preset,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.presets.push(newPreset);
    this.saveCustomPresets();
    return newPreset;
  }

  update(id: string, updates: Partial<AIPreset>): AIPreset | null {
    const idx = this.presets.findIndex(p => p.id === id);
    if (idx === -1) return null;
    if (this.presets[idx].isBuiltIn) return null; // 不允许修改内置预设
    
    this.presets[idx] = { ...this.presets[idx], ...updates, updatedAt: new Date().toISOString() };
    this.saveCustomPresets();
    return this.presets[idx];
  }

  delete(id: string): boolean {
    const preset = this.presets.find(p => p.id === id);
    if (!preset || preset.isBuiltIn) return false;
    
    this.presets = this.presets.filter(p => p.id !== id);
    this.saveCustomPresets();
    return true;
  }

  exportPresets(): string {
    return JSON.stringify(this.presets, null, 2);
  }

  importPresets(json: string): number {
    try {
      const imported: AIPreset[] = JSON.parse(json);
      let count = 0;
      for (const preset of imported) {
        if (!this.presets.find(p => p.name === preset.name && p.category === preset.category)) {
          preset.id = `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          preset.isBuiltIn = false;
          preset.createdAt = new Date().toISOString();
          preset.updatedAt = new Date().toISOString();
          this.presets.push(preset);
          count++;
        }
      }
      this.saveCustomPresets();
      return count;
    } catch {
      return 0;
    }
  }

  // 填充模板变量
  fillTemplate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] || `[${key}]`);
  }
}

// 单例
let _instance: AIPresetManager | null = null;
export function getPresetManager(): AIPresetManager {
  if (!_instance) {
    _instance = new AIPresetManager();
  }
  return _instance;
}
