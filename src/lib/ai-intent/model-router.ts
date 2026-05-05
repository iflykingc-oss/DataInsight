/**
 * 智能模型路由与降级系统
 * 根据模型能力自动选择最优策略，支持弱模型兜底
 */

export type ModelLevel = 'strong' | 'medium' | 'weak';
export type ModelProvider = 'openai' | 'claude' | 'deepseek' | 'kimi' | 'doubao' | 'qwen' | 'ollama' | 'unknown';

export interface ModelCapability {
  provider: ModelProvider;
  modelName: string;
  level: ModelLevel;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  contextWindow: number;
  latency: 'fast' | 'medium' | 'slow';
  costLevel: 'low' | 'medium' | 'high';
}

export interface ModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface RoutingResult {
  selectedModel: ModelCapability;
  promptStrategy: PromptStrategy;
  fallbackAvailable: boolean;
  fallbackModel?: ModelCapability;
  reasoning: string;
}

export interface PromptStrategy {
  level: 'standard' | 'enhanced' | 'fallback';
  useStructuredOutput: boolean;
  useFewShot: boolean;
  useChainOfThought: boolean;
  maxOutputTokens: number;
  temperature: number;
}

/** 模型能力注册表 */
const MODEL_REGISTRY: Record<string, ModelCapability> = {
  'gpt-4': {
    provider: 'openai',
    modelName: 'gpt-4',
    level: 'strong',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    contextWindow: 128000,
    latency: 'medium',
    costLevel: 'high'
  },
  'gpt-4-turbo': {
    provider: 'openai',
    modelName: 'gpt-4-turbo',
    level: 'strong',
    maxTokens: 16384,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    contextWindow: 128000,
    latency: 'fast',
    costLevel: 'high'
  },
  'gpt-3.5-turbo': {
    provider: 'openai',
    modelName: 'gpt-3.5-turbo',
    level: 'medium',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    contextWindow: 16385,
    latency: 'fast',
    costLevel: 'low'
  },
  'claude-3-opus': {
    provider: 'claude',
    modelName: 'claude-3-opus',
    level: 'strong',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    contextWindow: 200000,
    latency: 'medium',
    costLevel: 'high'
  },
  'claude-3-sonnet': {
    provider: 'claude',
    modelName: 'claude-3-sonnet',
    level: 'strong',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: true,
    contextWindow: 200000,
    latency: 'fast',
    costLevel: 'medium'
  },
  'deepseek-chat': {
    provider: 'deepseek',
    modelName: 'deepseek-chat',
    level: 'medium',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    contextWindow: 16384,
    latency: 'fast',
    costLevel: 'low'
  },
  'deepseek-coder': {
    provider: 'deepseek',
    modelName: 'deepseek-coder',
    level: 'medium',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    contextWindow: 16384,
    latency: 'fast',
    costLevel: 'low'
  },
  'moonshot-v1-8k': {
    provider: 'kimi',
    modelName: 'moonshot-v1-8k',
    level: 'medium',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    contextWindow: 8192,
    latency: 'fast',
    costLevel: 'medium'
  },
  'moonshot-v1-32k': {
    provider: 'kimi',
    modelName: 'moonshot-v1-32k',
    level: 'medium',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    contextWindow: 32768,
    latency: 'fast',
    costLevel: 'medium'
  },
  'doubao-pro': {
    provider: 'doubao',
    modelName: 'doubao-pro',
    level: 'medium',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    contextWindow: 8192,
    latency: 'fast',
    costLevel: 'medium'
  },
  'qwen-turbo': {
    provider: 'qwen',
    modelName: 'qwen-turbo',
    level: 'medium',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    contextWindow: 8192,
    latency: 'fast',
    costLevel: 'low'
  },
  'qwen-plus': {
    provider: 'qwen',
    modelName: 'qwen-plus',
    level: 'medium',
    maxTokens: 32768,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    contextWindow: 32768,
    latency: 'medium',
    costLevel: 'medium'
  },
  'qwen-max': {
    provider: 'qwen',
    modelName: 'qwen-max',
    level: 'strong',
    maxTokens: 8192,
    supportsStreaming: true,
    supportsFunctionCalling: true,
    supportsVision: false,
    contextWindow: 8192,
    latency: 'medium',
    costLevel: 'medium'
  },
  'llama3': {
    provider: 'ollama',
    modelName: 'llama3',
    level: 'medium',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    contextWindow: 8192,
    latency: 'fast',
    costLevel: 'low'
  },
  'qwen2.5': {
    provider: 'ollama',
    modelName: 'qwen2.5',
    level: 'medium',
    maxTokens: 4096,
    supportsStreaming: true,
    supportsFunctionCalling: false,
    supportsVision: false,
    contextWindow: 8192,
    latency: 'fast',
    costLevel: 'low'
  }
};

/** 场景复杂度定义 */
export interface TaskComplexity {
  requiredLevel: ModelLevel;
  requiresLongContext: boolean;
  requiresVision: boolean;
  requiresFunctionCalling: boolean;
  estimatedTokens: number;
}

/** 预定义场景复杂度 */
const SCENE_COMPLEXITY: Record<string, TaskComplexity> = {
  'table_generation': {
    requiredLevel: 'medium',
    requiresLongContext: false,
    requiresVision: false,
    requiresFunctionCalling: false,
    estimatedTokens: 2000
  },
  'data_cleaning': {
    requiredLevel: 'medium',
    requiresLongContext: false,
    requiresVision: false,
    requiresFunctionCalling: false,
    estimatedTokens: 1500
  },
  'data_analysis': {
    requiredLevel: 'medium',
    requiresLongContext: false,
    requiresVision: false,
    requiresFunctionCalling: false,
    estimatedTokens: 3000
  },
  'visualization': {
    requiredLevel: 'medium',
    requiresLongContext: false,
    requiresVision: false,
    requiresFunctionCalling: false,
    estimatedTokens: 2500
  },
  'business_review': {
    requiredLevel: 'medium',
    requiresLongContext: true,
    requiresVision: false,
    requiresFunctionCalling: false,
    estimatedTokens: 5000
  },
  'insight_generation': {
    requiredLevel: 'medium',
    requiresLongContext: false,
    requiresVision: false,
    requiresFunctionCalling: false,
    estimatedTokens: 3500
  },
  'formula_generation': {
    requiredLevel: 'medium',
    requiresLongContext: false,
    requiresVision: false,
    requiresFunctionCalling: true,
    estimatedTokens: 1000
  }
};

export class ModelRouter {
  private registeredModels: Map<string, ModelCapability> = new Map();
  private fallbackChain: ModelLevel[] = ['strong', 'medium', 'weak'];

  constructor() {
    // 初始化注册表
    Object.entries(MODEL_REGISTRY).forEach(([key, value]) => {
      this.registeredModels.set(key, value);
    });
  }

  /** 注册自定义模型 */
  registerModel(modelId: string, capability: ModelCapability): void {
    this.registeredModels.set(modelId, capability);
  }

  /** 识别模型能力 */
  recognizeModel(modelName: string, baseUrl?: string): ModelCapability {
    const lowerName = modelName.toLowerCase();
    const lowerUrl = (baseUrl || '').toLowerCase();

    // 精确匹配
    if (this.registeredModels.has(lowerName)) {
      return this.registeredModels.get(lowerName)!;
    }

    // URL特征匹配
    if (lowerUrl.includes('deepseek')) {
      return MODEL_REGISTRY['deepseek-chat'];
    }
    if (lowerUrl.includes('kimi') || lowerUrl.includes('moonshot')) {
      return MODEL_REGISTRY['moonshot-v1-8k'];
    }
    if (lowerUrl.includes('doubao') || lowerUrl.includes(' volcengine')) {
      return MODEL_REGISTRY['doubao-pro'];
    }
    if (lowerUrl.includes('dashscope') || lowerUrl.includes('qwen')) {
      return MODEL_REGISTRY['qwen-turbo'];
    }
    if (lowerUrl.includes('ollama') || lowerUrl.includes('localhost')) {
      return MODEL_REGISTRY['llama3'];
    }

    // 关键词模糊匹配
    if (lowerName.includes('gpt-4') || lowerName.includes('gpt4')) {
      return MODEL_REGISTRY['gpt-4-turbo'];
    }
    if (lowerName.includes('gpt-3.5') || lowerName.includes('gpt3.5')) {
      return MODEL_REGISTRY['gpt-3.5-turbo'];
    }
    if (lowerName.includes('claude')) {
      if (lowerName.includes('opus')) return MODEL_REGISTRY['claude-3-opus'];
      return MODEL_REGISTRY['claude-3-sonnet'];
    }
    if (lowerName.includes('deepseek')) {
      if (lowerName.includes('coder')) return MODEL_REGISTRY['deepseek-coder'];
      return MODEL_REGISTRY['deepseek-chat'];
    }
    if (lowerName.includes('llama')) {
      return MODEL_REGISTRY['llama3'];
    }

    // 未知模型，返回默认中等能力
    return {
      provider: 'unknown',
      modelName,
      level: 'medium',
      maxTokens: 4096,
      supportsStreaming: true,
      supportsFunctionCalling: false,
      supportsVision: false,
      contextWindow: 8192,
      latency: 'medium',
      costLevel: 'medium'
    };
  }

  /** 路由决策 */
  route(
    modelConfig: ModelConfig,
    scene: string,
    dataSize?: { rows: number; cols: number }
  ): RoutingResult {
    const capability = this.recognizeModel(modelConfig.model, modelConfig.baseUrl);
    const complexity = this.getSceneComplexity(scene, dataSize);

    // 评估是否需要降级
    const needsUpgrade = this.checkNeedsUpgrade(capability, complexity);
    const needsFallback = capability.level < complexity.requiredLevel;

    let selectedModel = capability;
    let promptStrategy: PromptStrategy;
    let fallbackAvailable = false;
    let fallbackModel: ModelCapability | undefined;
    let reasoning = '';

    if (needsFallback) {
      // 寻找合适的fallback模型
      const fallback = this.findFallbackModel(complexity, capability);
      if (fallback) {
        fallbackAvailable = true;
        fallbackModel = fallback;
        reasoning = `当前模型${capability.modelName}能力不足(${capability.level})，降级使用${fallback.modelName}(${fallback.level})`;
        selectedModel = fallback;
        promptStrategy = this.derivePromptStrategy(selectedModel, complexity, true);
      } else {
        reasoning = `当前模型${capability.modelName}能力不足，但无合适fallback`;
        promptStrategy = this.derivePromptStrategy(capability, complexity, true);
      }
    } else {
      reasoning = `直接使用${selectedModel.modelName}(${selectedModel.level})`;
      promptStrategy = this.derivePromptStrategy(selectedModel, complexity, false);
    }

    return {
      selectedModel,
      promptStrategy,
      fallbackAvailable,
      fallbackModel,
      reasoning
    };
  }

  /** 获取场景复杂度 */
  private getSceneComplexity(
    scene: string,
    dataSize?: { rows: number; cols: number }
  ): TaskComplexity {
    const base = SCENE_COMPLEXITY[scene] || SCENE_COMPLEXITY['data_analysis'];

    // 根据数据量调整
    if (dataSize) {
      const dataTokens = dataSize.rows * dataSize.cols * 2; // 粗略估算
      if (dataTokens > 10000) {
        return {
          ...base,
          requiresLongContext: true,
          estimatedTokens: base.estimatedTokens + dataTokens
        };
      }
    }

    return base;
  }

  /** 检查是否需要升级 */
  private checkNeedsUpgrade(
    capability: ModelCapability,
    complexity: TaskComplexity
  ): boolean {
    // 检查上下文窗口
    if (complexity.requiresLongContext && capability.contextWindow < 16000) {
      return true;
    }

    // 检查功能支持
    if (complexity.requiresFunctionCalling && !capability.supportsFunctionCalling) {
      return true;
    }

    if (complexity.requiresVision && !capability.supportsVision) {
      return true;
    }

    return false;
  }

  /** 寻找降级模型 */
  private findFallbackModel(
    complexity: TaskComplexity,
    currentModel: ModelCapability
  ): ModelCapability | undefined {
    // 找同级别或更低级别的模型
    for (const model of this.registeredModels.values()) {
      if (model.provider === currentModel.provider) continue; // 避免同provider
      if (model.level === complexity.requiredLevel || model.level === 'medium') {
        // 检查功能支持
        if (complexity.requiresFunctionCalling && !model.supportsFunctionCalling) continue;
        if (complexity.requiresVision && !model.supportsVision) continue;
        if (complexity.requiresLongContext && model.contextWindow < 16000) continue;

        return model;
      }
    }

    // 找任何可用的中等模型
    for (const model of this.registeredModels.values()) {
      if (model.level === 'medium') {
        if (complexity.requiresFunctionCalling && !model.supportsFunctionCalling) continue;
        if (complexity.requiresVision && !model.supportsVision) continue;
        return model;
      }
    }

    return undefined;
  }

  /** 推导Prompt策略 */
  private derivePromptStrategy(
    capability: ModelCapability,
    complexity: TaskComplexity,
    isFallback: boolean
  ): PromptStrategy {
    const isWeak = capability.level === 'weak' || isFallback;

    return {
      level: isWeak ? 'fallback' : capability.level === 'strong' ? 'enhanced' : 'standard',
      useStructuredOutput: capability.supportsFunctionCalling,
      useFewShot: !isWeak,
      useChainOfThought: capability.level === 'strong' && !isWeak,
      maxOutputTokens: Math.min(capability.maxTokens, 4096),
      temperature: isWeak ? 0.1 : 0.3
    };
  }

  /** 执行带降级的调用 */
  async executeWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>,
    fallbackCondition?: () => boolean
  ): Promise<{ result: T; usedFallback: boolean }> {
    try {
      const result = await primaryFn();
      return { result, usedFallback: false };
    } catch (error) {
      if (fallbackFn && (fallbackCondition === undefined || fallbackCondition())) {
        console.warn('Primary execution failed, using fallback');
        const fallbackResult = await fallbackFn();
        return { result: fallbackResult, usedFallback: true };
      }
      throw error;
    }
  }
}

/** 全局路由实例 */
export const modelRouter = new ModelRouter();
