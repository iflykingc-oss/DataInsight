import type { SkillDefinition, SkillExecutionContext, PipelineStage } from './types';
import { skillGovernance } from './governance';

interface ExecutionResult {
  success: boolean;
  output?: Record<string, unknown>;
  error?: string;
  executionTime: number;
  retryCount: number;
}

interface PipelineResult {
  success: boolean;
  stageResults: Array<{
    stageId: string;
    success: boolean;
    output?: Record<string, unknown>;
    error?: string;
  }>;
  finalOutput?: Record<string, unknown>;
  error?: string;
}

class SkillExecutor {
  private static instance: SkillExecutor;

  static getInstance(): SkillExecutor {
    if (!SkillExecutor.instance) {
      SkillExecutor.instance = new SkillExecutor();
    }
    return SkillExecutor.instance;
  }

  async executeSkill(skill: SkillDefinition, context: SkillExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    let retryCount = 0;

    if (!skillGovernance.validateSkillPermission(skill, context.userRoles)) {
      return {
        success: false,
        error: '权限不足，无法执行此 Skill',
        executionTime: Date.now() - startTime,
        retryCount: 0,
      };
    }

    const maxRetries = skill.failureRules.retryCount;

    while (retryCount <= maxRetries) {
      try {
        if (skill.execute) {
          const output = await skill.execute(context);
          return {
            success: true,
            output,
            executionTime: Date.now() - startTime,
            retryCount,
          };
        }

        return {
          success: false,
          error: 'Skill 未定义执行逻辑',
          executionTime: Date.now() - startTime,
          retryCount,
        };
      } catch (error) {
        retryCount++;

        if (retryCount > maxRetries) {
          if (skill.fallback && !skill.failureRules.abortOnError) {
            try {
              const fallbackOutput = await skill.fallback(context);
              return {
                success: true,
                output: fallbackOutput,
                executionTime: Date.now() - startTime,
                retryCount,
              };
            } catch (fallbackError) {
              return {
                success: false,
                error: `执行失败（已重试 ${retryCount} 次）: ${error instanceof Error ? error.message : String(error)}; Fallback 也失败: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
                executionTime: Date.now() - startTime,
                retryCount,
              };
            }
          }

          return {
            success: false,
            error: `执行失败（已重试 ${retryCount} 次）: ${error instanceof Error ? error.message : String(error)}`,
            executionTime: Date.now() - startTime,
            retryCount,
          };
        }
      }
    }

    return {
      success: false,
      error: '未知执行错误',
      executionTime: Date.now() - startTime,
      retryCount,
    };
  }

  async executePipeline(
    stages: PipelineStage[],
    context: SkillExecutionContext,
    skillResolver: (skillId: string) => SkillDefinition | undefined
  ): Promise<PipelineResult> {
    const stageResults: PipelineResult['stageResults'] = [];
    let currentContext = { ...context };

    for (const stage of stages) {
      const skill = skillResolver(stage.skillId);

      if (!skill) {
        stageResults.push({
          stageId: stage.id,
          success: false,
          error: `Skill ${stage.skillId} 未找到`,
        });

        if (!stage.skipOnError) {
          return {
            success: false,
            stageResults,
            error: `Pipeline 在阶段 ${stage.id} 失败`,
          };
        }
        continue;
      }

      if (stage.condition) {
        const conditionMet = this.evaluateCondition(stage.condition, currentContext);
        if (!conditionMet) {
          stageResults.push({
            stageId: stage.id,
            success: true,
            output: { skipped: true, reason: '条件不满足' },
          });
          continue;
        }
      }

      const mappedContext = this.mapInputs(currentContext, stage.inputMapping);
      const result = await this.executeSkill(skill, mappedContext);

      stageResults.push({
        stageId: stage.id,
        success: result.success,
        output: result.output,
        error: result.error,
      });

      if (result.success && result.output) {
        currentContext = {
          ...currentContext,
          ...result.output,
        };
      } else if (!result.success && !stage.skipOnError) {
        return {
          success: false,
          stageResults,
          error: `Pipeline 在阶段 ${stage.id} 失败: ${result.error}`,
        };
      }
    }

    const lastResult = stageResults[stageResults.length - 1];
    return {
      success: lastResult?.success ?? true,
      stageResults,
      finalOutput: lastResult?.output,
    };
  }

  private evaluateCondition(condition: string, context: SkillExecutionContext): boolean {
    try {
      const fn = new Function('context', `with(context) { return ${condition}; }`);
      return Boolean(fn(context));
    } catch {
      return false;
    }
  }

  private mapInputs(
    context: SkillExecutionContext,
    mapping: Record<string, string>
  ): SkillExecutionContext {
    const mapped: SkillExecutionContext = { ...context };

    for (const [target, source] of Object.entries(mapping)) {
      const value = this.getValueByPath(context as Record<string, unknown>, source);
      if (value !== undefined) {
        this.setValueByPath(mapped as Record<string, unknown>, target, value);
      }
    }

    return mapped;
  }

  private getValueByPath(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private setValueByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const lastKey = keys.pop();
    if (!lastKey) return;

    const target = keys.reduce<Record<string, unknown>>((current, key) => {
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      return current[key] as Record<string, unknown>;
    }, obj);

    target[lastKey] = value;
  }
}

export const skillExecutor = SkillExecutor.getInstance();
