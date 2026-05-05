/**
 * AI Intent System - 统一导出
 * 整合意图理解、Prompt编译、模型路由、工作流编排
 */

export * from './types';
export * from './engine';
export * from './prompt-compiler';
export * from './model-router';
export * from './workflow-orchestrator';

/** 创建完整AI Intent处理管道 */
import { createIntentUnderstandingEngine } from './engine';
import { promptCompiler } from './prompt-compiler';
import { modelRouter } from './model-router';
import { workflowPlanner, WorkflowExecutor } from './workflow-orchestrator';
import type { UserRequirement } from './types';

export interface AIPipelineConfig {
  enableDeepUnderstanding: boolean;
  autoDetectIndustry: boolean;
  proactiveClarification: boolean;
  minConfidenceThreshold: number;
  enableFallback: boolean;
}

export class AIAgentPipeline {
  private intentEngine = createIntentUnderstandingEngine({
    enableDeepUnderstanding: true,
    autoDetectIndustry: true,
    proactiveClarification: true,
    minConfidenceThreshold: 0.6
  });

  private config: AIPipelineConfig;

  constructor(config: Partial<AIPipelineConfig> = {}) {
    this.config = {
      enableDeepUnderstanding: true,
      autoDetectIndustry: true,
      proactiveClarification: true,
      minConfidenceThreshold: 0.6,
      enableFallback: true,
      ...config
    };
  }

  /**
   * 处理用户请求的完整管道
   */
  async process(
    userRequest: string,
    context: {
      data?: { headers: string[]; rows: Record<string, unknown>[] };
      modelConfig?: { apiKey: string; baseUrl: string; model: string };
      sessionId?: string;
    }
  ): Promise<{
    success: boolean;
    requirement?: UserRequirement;
    compiledPrompt?: ReturnType<typeof promptCompiler.compile>;
    workflow?: ReturnType<typeof workflowPlanner.plan>;
    routingResult?: ReturnType<typeof modelRouter.route>;
    error?: string;
  }> {
    try {
      // 1. 意图理解
      const intentResult = await this.intentEngine.understand(userRequest, context.data);

      if (!intentResult.success) {
        return { success: false, error: intentResult.error };
      }

      // 2. 检查是否需要澄清
      if (intentResult.requirement.needClarification) {
        return {
          success: true,
          requirement: intentResult.requirement,
          error: 'NEED_CLARIFICATION'
        };
      }

      // 3. 模型路由
      const routingResult = context.modelConfig
        ? modelRouter.route(context.modelConfig, intentResult.requirement.businessScenario, {
            rows: context.data?.rows.length || 0,
            cols: context.data?.headers.length || 0
          })
        : undefined;

      // 4. 编译Prompt
      const compiledPrompt = promptCompiler.compile(intentResult.requirement, {
        modelLevel: routingResult?.promptStrategy.level || 'standard'
      });

      // 5. 规划工作流
      const workflow = workflowPlanner.plan(intentResult.requirement, []);

      return {
        success: true,
        requirement: intentResult.requirement,
        compiledPrompt,
        workflow,
        routingResult
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 仅理解意图（不执行）
   */
  async understand(userRequest: string, data?: { headers: string[]; rows: Record<string, unknown>[] }) {
    return this.intentEngine.understand(userRequest, data);
  }

  /**
   * 仅编译Prompt
   */
  compilePrompt(requirement: UserRequirement, modelLevel?: 'standard' | 'enhanced' | 'fallback') {
    return promptCompiler.compile(requirement, { modelLevel });
  }

  /**
   * 仅路由模型
   */
  routeModel(modelConfig: { apiKey: string; baseUrl: string; model: string }, scene: string, dataSize?: { rows: number; cols: number }) {
    return modelRouter.route(modelConfig, scene, dataSize);
  }

  /**
   * 仅规划工作流
   */
  planWorkflow(requirement: UserRequirement) {
    return workflowPlanner.plan(requirement, []);
  }
}

/** 创建默认实例 */
export function createAIAgentPipeline(config?: Partial<AIPipelineConfig>): AIAgentPipeline {
  return new AIAgentPipeline(config);
}
