/**
 * 工作流引擎 - 执行引擎
 * 支持预制工作流执行 + 动态编排工作流执行
 */

import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowExecuteOptions,
  WorkflowResult,
  WorkflowStep,
} from './types';
import type { SkillContext, SkillResult } from '@/lib/skills/core/types';
import { executeSkill } from '@/lib/skills/core/executor';
import { skillRegistry } from '@/lib/skills/core/registry';

/** 工作流实例存储（内存态，页面关闭即销毁） */
const workflowInstances = new Map<string, WorkflowInstance>();

/** 创建并执行工作流 */
export async function executeWorkflow(
  workflow: WorkflowDefinition,
  context: SkillContext,
  options: WorkflowExecuteOptions = {}
): Promise<WorkflowResult> {
  const instanceId = generateId();
  const instance: WorkflowInstance = {
    id: instanceId,
    workflowId: workflow.id,
    status: 'running',
    context,
    currentStepId: workflow.entryStep,
    completedSteps: [],
    stepResults: new Map(),
    skillRecords: [],
    startTime: Date.now(),
    progress: 0,
    definition: workflow,
  };

  workflowInstances.set(instanceId, instance);

  const timeout = options.timeout || 120;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Workflow timeout after ${timeout}s`)), timeout * 1000);
  });

  try {
    const result = await Promise.race([
      runWorkflowSteps(instance, workflow, options),
      timeoutPromise,
    ]);

    instance.status = result.success ? 'completed' : 'failed';
    instance.endTime = Date.now();
    instance.progress = result.success ? 100 : instance.progress;

    return result;
  } catch (err) {
    instance.status = 'failed';
    instance.endTime = Date.now();
    instance.error = err instanceof Error ? err.message : String(err);

    return {
      success: false,
      instanceId,
      workflowId: workflow.id,
      outputs: {},
      skillRecords: instance.skillRecords,
      duration: Date.now() - instance.startTime,
      progress: instance.progress,
      error: instance.error,
    };
  }
}

/** 执行工作流步骤 */
async function runWorkflowSteps(
  instance: WorkflowInstance,
  workflow: WorkflowDefinition,
  options: WorkflowExecuteOptions
): Promise<WorkflowResult> {
  const steps = new Map(workflow.steps.filter(s => s.id).map(s => [s.id!, s]));
  let currentStepId: string | undefined = workflow.entryStep ?? workflow.steps[0]?.id;
  const totalSteps = workflow.steps.length;

  while (currentStepId) {
    const step = steps.get(currentStepId);
    if (!step) {
      throw new Error(`Step not found: ${currentStepId}`);
    }

    instance.currentStepId = currentStepId;

    // 执行步骤
    const stepResult = await executeStep(step, instance, options);
    instance.stepResults.set(currentStepId, stepResult);
    instance.completedSteps.push(currentStepId);
    instance.progress = Math.round((instance.completedSteps.length / totalSteps) * 100);

    if (options.onProgress) {
      options.onProgress(instance.progress, currentStepId);
    }
    if (options.onStepComplete) {
      options.onStepComplete(currentStepId, stepResult);
    }

    // 确定下一步
    currentStepId = determineNextStep(step, stepResult, steps);
  }

  // 构建输出
  const outputs: Record<string, unknown> = {};
  for (const output of (workflow.outputs ?? [])) {
    // 从最后完成的步骤结果中提取输出
    const lastCompleted = instance.completedSteps[instance.completedSteps.length - 1];
    const lastResult = instance.stepResults.get(lastCompleted);
    if (lastResult?.data && typeof lastResult.data === 'object') {
      const data = lastResult.data as Record<string, unknown>;
      outputs[output.name] = data[output.name] ?? lastResult.data;
    }
  }

  return {
    success: true,
    instanceId: instance.id,
    workflowId: workflow.id,
    outputs,
    skillRecords: instance.skillRecords,
    duration: Date.now() - instance.startTime,
    progress: 100,
  };
}

/** 执行单个步骤 */
async function executeStep(
  step: WorkflowStep,
  instance: WorkflowInstance,
  options: WorkflowExecuteOptions
): Promise<SkillResult> {
  const retryCount = step.retryCount ?? options.maxRetries ?? 0;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      switch (step.type) {
        case 'skill': {
          if (!step.skillId) {
            return createErrorResult(step.id, 'Skill step missing skillId');
          }

          // 参数映射：从上下文和前面步骤结果中解析参数
          const parameters = resolveParameters(step.parameterMapping || {}, instance);

          const result = await executeSkill(step.skillId, parameters, instance.context);

          if (result.success) {
            instance.skillRecords.push({
              skillId: step.skillId,
              parameters,
              result,
              timestamp: Date.now(),
            });
          }

          return result;
        }

        case 'condition':
          // 条件步骤本身不执行，由 determineNextStep 处理分支
          return {
            success: true,
            skillId: step.id,
            data: {},
            duration: 0,
            usedStrategy: 'rule',
          };

        case 'parallel': {
          if (!step.parallelSteps) {
            return createErrorResult(step.id, 'Parallel step missing parallelSteps');
          }
          // 并行执行子步骤
          const subResults = await Promise.all(
            step.parallelSteps.map(async (subStepId: string) => {
              const subStep = instance.definition.steps.find((s: WorkflowStep) => s.id === subStepId);
              if (!subStep) {
                return createErrorResult(subStepId, `Sub-step not found: ${subStepId}`);
              }
              return executeStep(subStep, instance, options);
            })
          );
          const allSuccess = subResults.every(r => r.success);
          return {
            success: allSuccess,
            skillId: step.id,
            data: { parallelResults: subResults },
            duration: 0,
            usedStrategy: 'rule',
          };
        }

        case 'merge':
          return {
            success: true,
            skillId: step.id,
            data: {},
            duration: 0,
            usedStrategy: 'rule',
          };

        default:
          return createErrorResult(step.id, `Unknown step type: ${step.type}`);
      }
    } catch (err) {
      if (attempt === retryCount) {
        return createErrorResult(step.id, err instanceof Error ? err.message : String(err));
      }
      // 重试
      await sleep(500);
    }
  }

  return createErrorResult(step.id, 'Max retries exceeded');
}

/** 确定下一步 */
function determineNextStep(
  currentStep: WorkflowStep,
  result: SkillResult,
  steps: Map<string, WorkflowStep>
): string | undefined {
  if (currentStep.type === 'condition' && currentStep.branches) {
    // 条件分支：按顺序匹配第一个满足条件的分支
    for (const branch of currentStep.branches) {
      // 简化条件判断：只支持 result.success 判断
      if (branch.condition.includes('success') && result.success) {
        return branch.nextSteps[0];
      }
      if (branch.condition.includes('!success') && !result.success) {
        return branch.nextSteps[0];
      }
    }
    // 默认走第一个分支
    return currentStep.branches[0]?.nextSteps[0];
  }

  if (!result.success && currentStep.fallbackStep) {
    return currentStep.fallbackStep;
  }

  return currentStep.nextStep;
}

/** 解析参数 */
function resolveParameters(
  mapping: Record<string, string>,
  instance: WorkflowInstance
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const [key, valueExpr] of Object.entries(mapping)) {
    // 简化参数解析：直接取值
    params[key] = valueExpr;
  }
  return params;
}

/** 创建错误结果 */
function createErrorResult(skillId: string | undefined, error: string): SkillResult {
  return {
    success: false,
    skillId: skillId ?? 'unknown',
    error,
    duration: 0,
    usedStrategy: 'rule',
  };
}

/** 获取工作流实例 */
export function getWorkflowInstance(id: string): WorkflowInstance | undefined {
  return workflowInstances.get(id);
}

/** 取消工作流 */
export function cancelWorkflow(instanceId: string): boolean {
  const instance = workflowInstances.get(instanceId);
  if (instance && instance.status === 'running') {
    instance.status = 'cancelled';
    return true;
  }
  return false;
}

/** 清理已完成的工作流实例 */
export function cleanupWorkflowInstances(): void {
  const now = Date.now();
  for (const [id, instance] of workflowInstances) {
    if (instance.status === 'completed' || instance.status === 'failed' || instance.status === 'cancelled') {
      if (instance.endTime && now - instance.endTime > 5 * 60 * 1000) {
        workflowInstances.delete(id);
      }
    }
  }
}

function generateId(): string {
  return `wf-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
