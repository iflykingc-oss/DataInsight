/**
 * 智能Prompt引擎
 * 动态组合行业Prompt + 场景Prompt + 用户需求Prompt
 */

import type { UserRequirement } from './types';

export interface PromptConfig {
  id: string;
  name: string;
  industry: string;
  scene: string;
  systemPrompt: string;
  userPromptTemplate: string;
  outputFormat: OutputFormat;
  modelAdapters?: Record<string, string>;
  fallbackPrompt?: string;
  businessRules?: string[];
  benchmarkData?: Record<string, { value: number; label: string }[]>;
}

export interface OutputFormat {
  type: 'json' | 'markdown' | 'table' | 'chart';
  schema?: Record<string, unknown>;
  requiredFields?: string[];
}

export interface CompiledPrompt {
  systemPrompt: string;
  userPrompt: string;
  config: PromptConfig;
  modelLevel: 'standard' | 'enhanced' | 'fallback';
}

/** Prompt编译引擎 */
export class PromptCompiler {
  private prompts: Map<string, PromptConfig> = new Map();
  private defaultSystemPrompt: string;

  constructor() {
    this.defaultSystemPrompt = `你是DataInsight智能数据分析助手，专注于帮助用户处理表格数据和业务分析。

核心原则：
1. 直接回答用户问题，不绕弯子
2. 所有结论必须有数据支撑，禁止无依据推测
3. 语言简洁专业，适配用户业务场景
4. 输出格式规范，方便程序解析`;
  }

  /** 注册Prompt配置 */
  registerPrompt(config: PromptConfig): void {
    this.prompts.set(config.id, config);
  }

  /** 批量注册 */
  registerPrompts(configs: PromptConfig[]): void {
    configs.forEach(c => this.registerPrompt(c));
  }

  /** 编译Prompt */
  compile(
    requirement: UserRequirement,
    options?: {
      modelLevel?: 'standard' | 'enhanced' | 'fallback';
      customInstructions?: string[];
      includeExamples?: boolean;
      maxLength?: number;
    }
  ): CompiledPrompt {
    const modelLevel = options?.modelLevel || 'standard';

    // 1. 获取匹配的Prompt配置
    const matchedPrompt = this.findBestMatch(requirement);

    // 2. 编译系统Prompt
    const systemPrompt = this.compileSystemPrompt(matchedPrompt, requirement, modelLevel);

    // 3. 编译用户Prompt
    const userPrompt = this.compileUserPrompt(matchedPrompt, requirement, options);

    return {
      systemPrompt,
      userPrompt,
      config: matchedPrompt || this.createDefaultPrompt(requirement),
      modelLevel
    };
  }

  /** 查找最佳匹配的Prompt */
  private findBestMatch(requirement: UserRequirement): PromptConfig | undefined {
    let bestMatch: PromptConfig | undefined;
    let bestScore = 0;

    for (const prompt of this.prompts.values()) {
      // 行业匹配
      if (prompt.industry === requirement.industry || prompt.industry === 'general') {
        // 场景匹配
        if (prompt.scene === requirement.businessScenario || prompt.scene === 'general') {
          // 计算匹配分数
          let score = 0;
          if (prompt.industry === requirement.industry) score += 10;
          if (prompt.scene === requirement.businessScenario) score += 5;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = prompt;
          }
        }
      }
    }

    return bestMatch;
  }

  /** 编译系统Prompt */
  private compileSystemPrompt(
    prompt: PromptConfig | undefined,
    requirement: UserRequirement,
    modelLevel: 'standard' | 'enhanced' | 'fallback'
  ): string {
    const lines: string[] = [];

    // 基础角色定义
    lines.push(this.defaultSystemPrompt);

    // 行业特定指导
    if (prompt?.industry && prompt.industry !== 'general') {
      lines.push(`\n【行业背景】当前用户属于${this.getIndustryName(prompt.industry)}行业`);
    }

    // 场景特定指导
    if (prompt?.systemPrompt) {
      lines.push(`\n【专业指导】\n${prompt.systemPrompt}`);
    }

    // 业务规则注入
    if (prompt?.businessRules && prompt.businessRules.length > 0) {
      lines.push(`\n【业务规则】`);
      prompt.businessRules.forEach(rule => {
        lines.push(`- ${rule}`);
      });
    }

    // 基准数据注入
    if (prompt?.benchmarkData && modelLevel !== 'fallback') {
      lines.push(`\n【行业基准参考】`);
      for (const [key, values] of Object.entries(prompt.benchmarkData)) {
        const benchmarks = values.map(v => `${v.label}: ${v.value}`).join(' / ');
        lines.push(`- ${key}: ${benchmarks}`);
      }
    }

    // 模型适配
    if (prompt?.modelAdapters && modelLevel !== 'standard') {
      const adapter = prompt.modelAdapters[modelLevel];
      if (adapter) {
        lines.push(`\n【模型适配】\n${adapter}`);
      }
    }

    // 兜底Prompt
    if (modelLevel === 'fallback' && prompt?.fallbackPrompt) {
      lines.push(`\n【简化要求】\n${prompt.fallbackPrompt}`);
    }

    // 输出格式要求
    lines.push(`\n【输出格式要求】`);
    if (prompt?.outputFormat) {
      lines.push(`格式类型：${prompt.outputFormat.type}`);
      if (prompt.outputFormat.requiredFields) {
        lines.push(`必须包含字段：${prompt.outputFormat.requiredFields.join(', ')}`);
      }
    } else {
      lines.push(`默认输出JSON格式，包含：结论、数据、建议`);
    }

    return lines.join('\n');
  }

  /** 编译用户Prompt */
  private compileUserPrompt(
    prompt: PromptConfig | undefined,
    requirement: UserRequirement,
    options?: {
      customInstructions?: string[];
      includeExamples?: boolean;
      maxLength?: number;
    }
  ): string {
    const lines: string[] = [];

    // 原始需求
    lines.push(`【用户需求】${requirement.rawRequest}`);

    // 数据信息
    if (requirement.dataRequirements.metrics.length > 0) {
      lines.push(`\n【需要分析的指标】${requirement.dataRequirements.metrics.join(', ')}`);
    }

    if (requirement.dataRequirements.dimensions.length > 0) {
      lines.push(`【分析维度】${requirement.dataRequirements.dimensions.join(', ')}`);
    }

    // 时间范围
    if (requirement.dataRequirements.timeRange) {
      const tr = requirement.dataRequirements.timeRange;
      if (tr.start && tr.end) {
        lines.push(`【时间范围】${tr.start} 至 ${tr.end}`);
      } else if (tr.start) {
        lines.push(`【时间范围】${tr.start} 至今`);
      }
      if (tr.granularity) {
        lines.push(`【统计粒度】按${tr.granularity}统计`);
      }
    }

    // 业务实体
    if (requirement.businessEntities.length > 0) {
      lines.push(`\n【相关业务实体】`);
      requirement.businessEntities.forEach(e => {
        let entityStr = e.name;
        if (e.count) entityStr += `（${e.count}个）`;
        lines.push(`- ${entityStr}`);
      });
    }

    // 输出期望
    lines.push(`\n【输出期望】`);
    lines.push(`- 详细程度：${requirement.outputExpectation.detailLevel}`);
    if (requirement.outputExpectation.needInsights) {
      lines.push(`- 需要洞察：是`);
    }
    if (requirement.outputExpectation.needSuggestions) {
      lines.push(`- 需要建议：是`);
    }

    // 自定义指令
    if (options?.customInstructions) {
      lines.push(`\n【特殊要求】`);
      options.customInstructions.forEach(instr => {
        lines.push(`- ${instr}`);
      });
    }

    // 语言风格
    if (requirement.outputExpectation.languageStyle !== 'any') {
      lines.push(`\n【语言风格】${requirement.outputExpectation.languageStyle === 'simple' ? '通俗易懂，避免专业术语' : '专业正式'}`);
    }

    return lines.join('\n');
  }

  /** 获取行业名称 */
  private getIndustryName(industry: string): string {
    const names: Record<string, string> = {
      retail: '零售/商超',
      restaurant: '餐饮',
      healthcare: '医疗/医药',
      logistics: '物流/快递',
      real_estate: '房地产',
      energy: '能源/电力',
      cross_border: '跨境电商',
      education: '教育培训',
      manufacturing: '制造业',
      finance: '金融',
      hr: '人力资源',
      general: '通用'
    };
    return names[industry] || industry;
  }

  /** 创建默认Prompt */
  private createDefaultPrompt(requirement: UserRequirement): PromptConfig {
    return {
      id: 'default',
      name: '默认Prompt',
      industry: 'general',
      scene: 'general',
      systemPrompt: '',
      userPromptTemplate: requirement.rawRequest,
      outputFormat: { type: 'json' }
    };
  }

  /** 获取所有已注册的Prompt */
  listPrompts(): PromptConfig[] {
    return Array.from(this.prompts.values());
  }

  /** 根据ID获取Prompt */
  getPrompt(id: string): PromptConfig | undefined {
    return this.prompts.get(id);
  }
}

/** 全局Prompt编译器实例 */
export const promptCompiler = new PromptCompiler();
