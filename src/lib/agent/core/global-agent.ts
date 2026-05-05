/**
 * 全局调度智能体
 * 平台级总控中枢，负责跨场景任务调度
 */

import type { AgentContext, AgentResponse, GlobalAgent, SceneAgent } from './types';
import { classifyAndRoute, getSceneAgent, getAllScenes } from './intent-router';

export class GlobalSchedulerAgent implements GlobalAgent {
  private sceneAgents: Map<string, SceneAgent> = new Map();

  /** 注册场景智能体 */
  registerSceneAgent(sceneId: string, agent: SceneAgent): void {
    this.sceneAgents.set(sceneId, agent);
  }

  /** 处理用户请求 */
  async process(request: string, context: AgentContext): Promise<AgentResponse> {
    // 1. 意图识别与场景路由
    const intent = await classifyAndRoute(request, context);

    // 2. 获取目标场景智能体
    const targetAgent = this.sceneAgents.get(intent.sceneId);

    if (targetAgent) {
      // 转发到场景智能体
      return await targetAgent.process(request, context);
    }

    // 3. 通用兜底：产品答疑、功能引导
    return await this.handleGeneral(request, context);
  }

  /** 通用处理（功能引导/答疑） */
  private async handleGeneral(request: string, context: AgentContext): Promise<AgentResponse> {
    const scenes = getAllScenes();

    const prompt = `你是 DataInsight 智能表格平台的 AI 助手。请帮助用户解决问题。

用户请求: ${request}

平台可用场景:
${scenes.map(s => `- ${s.name}: ${s.description}`).join('\n')}

请友好地回答用户，如果用户的问题属于某个特定场景，请引导用户切换到对应 Tab。`;

    try {
      const { callLLM } = await import('@/lib/llm');
      const response = await callLLM(
        context.modelConfig ?? { apiKey: '', baseUrl: '', model: '' },
        [{ role: 'user', content: prompt }]
      );

      return {
        type: 'text',
        content: response,
        suggestions: scenes.slice(0, 3).map(s => s.name),
      };
    } catch {
      return {
        type: 'text',
        content: '抱歉，我暂时无法处理您的请求。请尝试切换到对应业务 Tab 后提问，或稍后再试。',
      };
    }
  }
}

/** 全局智能体单例 */
let globalAgentInstance: GlobalSchedulerAgent | null = null;

export function getGlobalAgent(): GlobalSchedulerAgent {
  if (!globalAgentInstance) {
    globalAgentInstance = new GlobalSchedulerAgent();
  }
  return globalAgentInstance;
}

export function resetGlobalAgent(): void {
  globalAgentInstance = null;
}
