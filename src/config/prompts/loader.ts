/**
 * Prompt配置加载器
 * 支持热更新、版本管理、配置验证
 */

// import type { PromptConfig } from './prompt-compiler';
interface PromptConfig {
  id: string;
  name: string;
  content?: string;
  version?: string;
  industry?: string;
  scene?: string;
  systemPrompt?: string;
  userPromptTemplates?: unknown[];
  outputSchema?: unknown;
  examples?: unknown[];
  variables?: string[];
  tags?: string[];
}

interface PromptModule {
  default: PromptConfig;
}

class PromptLoader {
  private prompts: Map<string, PromptConfig> = new Map();
  private loaders: Map<string, () => Promise<PromptModule>> = new Map();
  private lastModified: Map<string, number> = new Map();
  private listeners: Array<(promptId: string) => void> = [];

  constructor() {
    this.init();
  }

  private async init() {
    // 注册所有Prompt模块
    // 行业场景
    this.registerPromptModule('retail-sales-analysis', () => import('./retail-sales-analysis.json'));
    this.registerPromptModule('restaurant-operation-analysis', () => import('./restaurant-operation-analysis.json'));
    this.registerPromptModule('healthcare-operation-analysis', () => import('./healthcare-operation-analysis.json'));
    this.registerPromptModule('logistics-operation-analysis', () => import('./logistics-operation-analysis.json'));
    this.registerPromptModule('education-operation-analysis', () => import('./education-operation-analysis.json'));
    this.registerPromptModule('real-estate-analysis', () => import('./real-estate-analysis.json'));
    this.registerPromptModule('energy-operation-analysis', () => import('./energy-operation-analysis.json'));
    this.registerPromptModule('cross-border-ecommerce-analysis', () => import('./cross-border-ecommerce-analysis.json'));
    this.registerPromptModule('manufacturing-operation-analysis', () => import('./manufacturing-operation-analysis.json'));

    // 通用场景
    this.registerPromptModule('table-generation-general', () => import('./table-generation-general.json'));
    this.registerPromptModule('data-cleaning-standard', () => import('./data-cleaning-standard.json'));
    this.registerPromptModule('data-analysis-general', () => import('./data-analysis-general.json'));
    this.registerPromptModule('visualization-design', () => import('./visualization-design.json'));

    // 初始加载
    await this.loadAllPrompts();
  }

  /** 注册Prompt模块 */
  private registerPromptModule(id: string, loader: () => Promise<PromptModule>) {
    this.loaders.set(id, loader);
  }

  /** 加载所有Prompt */
  private async loadAllPrompts() {
    const loadPrompts = Array.from(this.loaders.entries()).map(async ([id, loader]) => {
      try {
        const module = await loader();
        const prompt = module.default;
        this.prompts.set(id, prompt);
        this.lastModified.set(id, Date.now());
      } catch (error) {
        console.error(`Failed to load prompt: ${id}`, error);
      }
    });

    await Promise.all(loadPrompts);
  }

  /** 加载单个Prompt */
  async reloadPrompt(id: string): Promise<boolean> {
    const loader = this.loaders.get(id);
    if (!loader) {
      console.warn(`No loader found for prompt: ${id}`);
      return false;
    }

    try {
      const module = await loader();
      const prompt = module.default;
      this.prompts.set(id, prompt);
      this.lastModified.set(id, Date.now());

      // 通知监听器
      this.listeners.forEach(listener => listener(id));

      return true;
    } catch (error) {
      console.error(`Failed to reload prompt: ${id}`, error);
      return false;
    }
  }

  /** 热更新所有Prompt */
  async hotReloadAll(): Promise<void> {
    for (const id of this.loaders.keys()) {
      await this.reloadPrompt(id);
    }
  }

  /** 获取Prompt */
  getPrompt(id: string): PromptConfig | undefined {
    return this.prompts.get(id);
  }

  /** 根据行业和场景获取Prompt */
  getPromptByIndustryAndScene(industry: string, scene: string): PromptConfig | undefined {
    for (const prompt of this.prompts.values()) {
      if (prompt.industry === industry && prompt.scene === scene) {
        return prompt;
      }
      // 通配匹配
      if ((prompt.industry === 'general' || prompt.industry === industry) &&
          (prompt.scene === 'general' || prompt.scene === scene)) {
        return prompt;
      }
    }
    return undefined;
  }

  /** 获取所有Prompts */
  getAllPrompts(): PromptConfig[] {
    return Array.from(this.prompts.values());
  }

  /** 获取所有已注册的Prompt ID */
  getPromptIds(): string[] {
    return Array.from(this.prompts.keys());
  }

  /** 订阅变更 */
  subscribe(listener: (promptId: string) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /** 验证Prompt配置 */
  validatePrompt(prompt: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!prompt || typeof prompt !== 'object') {
      errors.push('Prompt must be an object');
      return { valid: false, errors };
    }

    const p = prompt as Record<string, unknown>;

    if (!p.id || typeof p.id !== 'string') {
      errors.push('Missing or invalid id');
    }

    if (!p.name || typeof p.name !== 'string') {
      errors.push('Missing or invalid name');
    }

    if (!p.industry || typeof p.industry !== 'string') {
      errors.push('Missing or invalid industry');
    }

    if (!p.scene || typeof p.scene !== 'string') {
      errors.push('Missing or invalid scene');
    }

    if (!p.systemPrompt && typeof p.systemPrompt !== 'string') {
      errors.push('Missing or invalid systemPrompt');
    }

    return { valid: errors.length === 0, errors };
  }

  /** 获取统计信息 */
  getStats(): {
    total: number;
    byIndustry: Record<string, number>;
    byScene: Record<string, number>;
    lastReload: number | null;
  } {
    const byIndustry: Record<string, number> = {};
    const byScene: Record<string, number> = {};
    let lastReload: number | null = null;

    for (const prompt of this.prompts.values()) {
      const industry = prompt.industry ?? 'unknown';
      const scene = prompt.scene ?? 'unknown';
      byIndustry[industry] = (byIndustry[industry] || 0) + 1;
      byScene[scene] = (byScene[scene] || 0) + 1;
    }

    for (const time of this.lastModified.values()) {
      if (lastReload === null || time > lastReload) {
        lastReload = time;
      }
    }

    return {
      total: this.prompts.size,
      byIndustry,
      byScene,
      lastReload
    };
  }
}

/** 全局实例 */
export const promptLoader = new PromptLoader();
