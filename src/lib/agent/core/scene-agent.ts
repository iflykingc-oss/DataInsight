/**
 * 场景智能体基类
 * 各业务 Tab 场景智能体的抽象基类
 */

import type {
  AgentContext,
  AgentResponse,
  SceneAgent,
  TaskPlan,
  AgentMessage,
} from './types';
import { executeSkill } from '@/lib/skills/core/executor';
import { executeWorkflow } from '@/lib/workflow/core/engine';
import type { SkillDefinition, SkillContext } from '@/lib/skills/core/types';
import type { WorkflowDefinition } from '@/lib/workflow/core/types';
import { skillRegistry } from '@/lib/skills/core/registry';
import { workflowRegistry } from '@/lib/workflow/core/registry';
import { classifyAndRoute } from './intent-router';

/** 场景智能体基类 */
export abstract class BaseSceneAgent implements SceneAgent {
  abstract sceneId: string;
  abstract sceneName: string;
  abstract systemPrompt: string;
  abstract allowedSkillIds: string[];

  protected messages: AgentMessage[] = [];

  /** 处理用户请求 */
  async process(request: string, context: AgentContext): Promise<AgentResponse> {
    // 记录用户消息
    this.messages.push({ role: 'user', content: request, timestamp: Date.now() });

    // 场景隔离检查
    const intent = await classifyAndRoute(request, context);
    if (intent.sceneId !== this.sceneId && intent.sceneId !== 'general') {
      // 跨场景请求，礼貌引导
      const targetScene = this.getSceneName(intent.sceneId);
      return {
        type: 'text',
        content: `您好，我是${this.sceneName}智能体，专门处理${this.sceneName}相关需求。\n\n您的问题似乎更适合在「${targetScene}」场景下处理，建议切换到对应 Tab 后向我提问。\n\n如果确实需要在当前场景处理，请更具体地描述您的${this.sceneName}需求。`,
        suggestions: [`切换到${targetScene}`],
      };
    }

    // 任务规划
    const plan = await this.planTask(request, context);

    // 执行任务
    return await this.executePlan(plan, context);
  }

  /** 任务规划 */
  protected abstract planTask(request: string, context: AgentContext): Promise<TaskPlan>;

  /** 执行规划 */
  protected async executePlan(plan: TaskPlan, context: AgentContext): Promise<AgentResponse> {
    const results: unknown[] = [];
    const steps = plan.steps ?? [];

    for (const step of steps) {
      const stepType = step.type ?? step.strategy ?? 'direct';
      switch (stepType) {
        case 'skill': {
          const skillId = step.skillId ?? step.skillOrWorkflowId;
          if (!skillId) continue;

          // 技能白名单检查
          if (!this.allowedSkillIds.includes(skillId)) {
            results.push({ error: `技能 ${skillId} 不在当前场景白名单中` });
            continue;
          }

          const skillContext: SkillContext = {
            userRequest: context.lastUserRequest ?? '',
            data: context.data as unknown as import('@/lib/data-processor/types').ParsedData | undefined,
            modelConfig: context.modelConfig as unknown as { apiKey: string; baseUrl: string; model: string } | undefined,
            sessionId: context.sessionId ?? '',
            scene: this.sceneId,
            metadata: {},
          };

          const result = await executeSkill(skillId, step.parameters || {}, skillContext);
          results.push(result);

          if (!result.success && !step.continueOnError) {
            break;
          }
          break;
        }

        case 'workflow': {
          const workflowId = step.workflowId ?? step.skillOrWorkflowId;
          if (!workflowId) continue;

          const skillContext: SkillContext = {
            userRequest: context.lastUserRequest ?? '',
            data: context.data as unknown as import('@/lib/data-processor/types').ParsedData | undefined,
            modelConfig: context.modelConfig as unknown as { apiKey: string; baseUrl: string; model: string } | undefined,
            sessionId: context.sessionId ?? '',
            scene: this.sceneId,
            metadata: {},
          };

          const workflow = this.getWorkflowById(workflowId);
          if (!workflow) {
            results.push({ error: `工作流 ${workflowId} 不存在` });
            continue;
          }

          const result = await executeWorkflow(workflow, skillContext);
          results.push(result);
          break;
        }

        case 'llm':
        case 'direct': {
          const { callLLM } = await import('@/lib/llm');
          const response = await callLLM(
            context.modelConfig ?? { apiKey: '', baseUrl: '', model: '' },
            [{ role: 'user', content: step.prompt ?? step.description ?? '' }]
          );
          results.push({ text: response });
          break;
        }
      }
    }

    // 构建响应
    return this.buildResponse(plan, results, context);
  }

  /** 构建响应 */
  protected abstract buildResponse(
    plan: TaskPlan,
    results: unknown[],
    context: AgentContext
  ): Promise<AgentResponse> | AgentResponse;

  /** 获取场景名称 */
  private getSceneName(sceneId: string): string {
    const names: Record<string, string> = {
      'table-generate': '生成表格',
      'data-clean': '数据清洗',
      'data-analyze': '数据分析',
      'visualize': '可视化',
      'formula': '公式生成',
      'document-parse': '文档解析',
      'general': '通用',
    };
    return names[sceneId] || sceneId;
  }

  /** 获取工作流 */
  private getWorkflowById(id: string): WorkflowDefinition | undefined {
    // 从注册表中查找
    return workflowRegistry.get(id);
  }
}
