/**
 * AI Intent 集成层
 * 将新的AI Intent系统与现有的DataInsight Agent系统集成
 */

import { createAIAgentPipeline, type AIPipelineConfig } from '@/lib/ai-intent';
import { promptLoader } from '@/config/prompts/loader';
import { circuitBreaker, withCircuit } from '@/lib/monitoring/circuit-breaker';
import { logger } from '@/lib/monitoring/logger';
import type { UserRequirement } from '@/lib/ai-intent/types';
import type { ParsedData } from '@/lib/data-processor';

/** 集成层配置 */
export interface IntegrationConfig {
  enableDeepUnderstanding: boolean;
  enableAutoRouting: boolean;
  enableFallback: boolean;
  enableHotReload: boolean;
  minConfidenceThreshold: number;
}

const DEFAULT_CONFIG: IntegrationConfig = {
  enableDeepUnderstanding: true,
  enableAutoRouting: true,
  enableFallback: true,
  enableHotReload: true,
  minConfidenceThreshold: 0.6,
};

/** AI Intent集成器 */
export class AIIntentIntegrator {
  private pipeline: ReturnType<typeof createAIAgentPipeline>;
  private config: IntegrationConfig;
  private initialized: boolean = false;

  constructor(config: Partial<IntegrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.pipeline = createAIAgentPipeline({
      enableDeepUnderstanding: this.config.enableDeepUnderstanding,
      autoDetectIndustry: true,
      proactiveClarification: true,
      minConfidenceThreshold: this.config.minConfidenceThreshold,
      enableFallback: this.config.enableFallback,
    });

    // 初始化
    if (this.config.enableHotReload) {
      this.setupHotReload();
    }
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const timer = logger.createTimer('AIIntentIntegrator', 'initialize');

    try {
      // 注册熔断器
      circuitBreaker.register('ai-intent-pipeline', {
        name: 'ai-intent-pipeline',
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 60000,
        resetTimeout: 120000,
      });

      this.initialized = true;
      logger.info('AIIntentIntegrator', 'Initialized successfully');
    } catch (error) {
      logger.error('AIIntentIntegrator', 'Failed to initialize', error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      timer();
    }
  }

  /**
   * 处理用户请求
   */
  async processRequest(
    userRequest: string,
    context: {
      data?: ParsedData;
      modelConfig?: { apiKey: string; baseUrl: string; model: string };
      sessionId?: string;
    }
  ): Promise<AIIntentResult> {
    const traceId = logger.getSessionId();

    logger.info('AIIntentIntegrator', `Processing request: ${userRequest.substring(0, 50)}...`, {
      traceId,
      hasData: !!context.data,
      model: context.modelConfig?.model,
    });

    try {
      // 使用熔断器保护执行
      const result = await withCircuit(
        'ai-intent-pipeline',
        async () => {
          return this.pipeline.process(userRequest, {
            data: context.data ? {
              headers: context.data.headers,
              rows: context.data.rows.slice(0, 100), // 限制数据量
            } : undefined,
            modelConfig: context.modelConfig,
            sessionId: context.sessionId,
          });
        },
        async () => {
          // Fallback: 简单处理
          return this.simpleFallback(userRequest, context);
        }
      );

      if (result.usedFallback) {
        logger.warn('AIIntentIntegrator', 'Used fallback', {
          traceId,
          source: result.source,
        });
      }

      if (result.source === 'error') {
        return {
          success: false,
          error: result.error || 'Unknown error',
          requirement: undefined,
        };
      }

      // 解析结果
      const pipelineResult = result.result as Awaited<ReturnType<typeof this.pipeline.process>>;

      return {
        success: pipelineResult.success,
        requirement: pipelineResult.requirement,
        compiledPrompt: pipelineResult.compiledPrompt,
        workflow: pipelineResult.workflow,
        routingResult: pipelineResult.routingResult,
        error: pipelineResult.error,
        needsClarification: pipelineResult.error === 'NEED_CLARIFICATION',
      };
    } catch (error) {
      logger.error('AIIntentIntegrator', 'Request processing failed', error instanceof Error ? error : new Error(String(error)), {
        traceId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 仅理解意图（不执行）
   */
  async understandIntent(
    userRequest: string,
    data?: ParsedData
  ): Promise<IntentUnderstandingResult> {
    try {
      const result = await this.pipeline.understand(userRequest, data ? {
        headers: data.headers,
        rows: data.rows.slice(0, 100),
      } : undefined);

      return {
        success: result.success,
        requirement: result.requirement,
        matchedPrompts: result.matchedPrompts,
        suggestedWorkflow: result.suggestedWorkflow,
        error: result.error,
      };
    } catch (error) {
      logger.error('AIIntentIntegrator', 'Intent understanding failed', error instanceof Error ? error : new Error(String(error)));
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 编译Prompt
   */
  compilePrompt(requirement: UserRequirement, modelLevel?: 'standard' | 'enhanced' | 'fallback') {
    return this.pipeline.compilePrompt(requirement, modelLevel);
  }

  /**
   * 获取Prompt配置统计
   */
  getPromptStats() {
    return promptLoader.getStats();
  }

  /**
   * 热更新Prompt配置
   */
  async reloadPrompts(): Promise<void> {
    await promptLoader.hotReloadAll();
    logger.info('AIIntentIntegrator', 'Prompts reloaded');
  }

  /**
   * 设置热更新监听
   */
  private setupHotReload(): void {
    promptLoader.subscribe((promptId) => {
      logger.info('AIIntentIntegrator', `Prompt ${promptId} hot reloaded`);
    });
  }

  /**
   * 简单兜底处理
   */
  private simpleFallback(
    userRequest: string,
    context: { data?: ParsedData; modelConfig?: { apiKey: string; baseUrl: string; model: string } }
  ): Promise<Awaited<ReturnType<typeof this.pipeline.process>>> {
    return Promise.resolve({
      success: true,
      requirement: {
        rawRequest: userRequest,
        industry: 'general',
        businessScenario: 'general',
        intentType: 'unknown',
        businessEntities: [],
        dataRequirements: { metrics: [], dimensions: [] },
        outputExpectation: {
          format: 'any',
          detailLevel: 'detailed',
          needInsights: true,
          needSuggestions: true,
          languageStyle: 'any',
        },
        confidence: 0.3,
        needClarification: false,
        suggestedStrategy: 'auto',
      },
      matchedPrompts: [],
      error: 'Fallback mode - simplified processing',
    });
  }
}

/** 结果类型 */
export interface AIIntentResult {
  success: boolean;
  requirement?: UserRequirement;
  compiledPrompt?: ReturnType<ReturnType<typeof createAIAgentPipeline>['compilePrompt']>;
  workflow?: ReturnType<ReturnType<typeof createAIAgentPipeline>['planWorkflow']>;
  routingResult?: ReturnType<ReturnType<typeof createAIAgentPipeline>['routeModel']>;
  error?: string;
  needsClarification?: boolean;
}

export interface IntentUnderstandingResult {
  success: boolean;
  requirement?: UserRequirement;
  matchedPrompts?: Array<{ promptId: string; promptName: string; matchScore: number }>;
  suggestedWorkflow?: { workflowId: string; workflowName: string; steps: unknown[]; estimatedDuration?: number; complexity?: string } | undefined;
  error?: string;
}

/** 全局集成实例 */
let globalIntegrator: AIIntentIntegrator | null = null;

export function getAIIntentIntegrator(config?: Partial<IntegrationConfig>): AIIntentIntegrator {
  if (!globalIntegrator) {
    globalIntegrator = new AIIntentIntegrator(config);
  }
  return globalIntegrator;
}

export async function initializeAIIntentSystem(config?: Partial<IntegrationConfig>): Promise<void> {
  const integrator = getAIIntentIntegrator(config);
  await integrator.initialize();
}
