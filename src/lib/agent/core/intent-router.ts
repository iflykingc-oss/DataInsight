/**
 * 智能体核心 - 意图识别与场景路由
 * 将用户请求路由到正确的场景智能体
 */

import type { AgentContext, IntentClassification, SceneAgent } from './types';

/** 场景定义 */
interface SceneDefinition {
  id: string;
  name: string;
  keywords: string[];
  description: string;
  agent: SceneAgent;
}

const scenes: SceneDefinition[] = [];

/** 注册场景 */
export function registerScene(scene: SceneDefinition): void {
  scenes.push(scene);
}

/** 批量注册场景 */
export function registerScenes(sceneList: SceneDefinition[]): void {
  scenes.push(...sceneList);
}

/** 意图识别与路由 */
export async function classifyAndRoute(
  request: string,
  context: AgentContext
): Promise<IntentClassification> {
  // 1. 规则匹配（确定性意图识别，70%准确率兜底）
  const ruleMatch = ruleBasedClassify(request);
  if (ruleMatch.confidence > 0.85) {
    return ruleMatch;
  }

  // 2. LLM 辅助意图识别（复杂模糊请求）
  const llmMatch = await llmBasedClassify(request, context);

  // 取置信度更高的结果
  if (llmMatch.confidence > ruleMatch.confidence) {
    return llmMatch;
  }

  return ruleMatch;
}

/** 基于规则的意图识别 */
function ruleBasedClassify(request: string): IntentClassification {
  const lowerRequest = request.toLowerCase();

  // 场景关键词匹配
  const sceneScores: { sceneId: string; score: number }[] = [];

  for (const scene of scenes) {
    let score = 0;
    for (const keyword of scene.keywords) {
      if (lowerRequest.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      sceneScores.push({ sceneId: scene.id, score });
    }
  }

  if (sceneScores.length > 0) {
    sceneScores.sort((a, b) => b.score - a.score);
    const top = sceneScores[0];
    return {
      intent: 'cross_scene',
      sceneId: top.sceneId,
      confidence: Math.min(top.score * 0.3, 0.95),
      matchedKeywords: scenes.find(s => s.id === top.sceneId)?.keywords.filter(k =>
        lowerRequest.includes(k.toLowerCase())
      ) || [],
    };
  }

  // 未匹配到任何场景，返回通用场景
  return {
    intent: 'unknown',
    sceneId: 'general',
    confidence: 0.3,
    matchedKeywords: [],
  };
}

/** 基于 LLM 的意图识别 */
async function llmBasedClassify(
  request: string,
  context: AgentContext
): Promise<IntentClassification> {
  // 简化实现：当规则匹配置信度低时，通过场景描述让 LLM 选择
  const sceneDescriptions = scenes.map(s =>
    `- ${s.id}: ${s.description}（关键词：${s.keywords.join(', ')}）`
  ).join('\n');

  const prompt = `请分析用户的请求，判断属于哪个业务场景。只返回场景ID。

可用场景：
${sceneDescriptions}

用户请求：${request}

请只返回最匹配的场景ID（如 "table-generate"），不要返回其他内容。`;

  try {
    const { callLLM } = await import('@/lib/llm');
    const response = await callLLM(
      context.modelConfig ?? { apiKey: '', baseUrl: '', model: '' },
      [{ role: 'user', content: prompt }]
    );
    const sceneId = response.trim().split('\n')[0].trim();

    const matchedScene = scenes.find(s => s.id === sceneId);
    if (matchedScene) {
      return {
        intent: 'cross_scene',
        sceneId,
        confidence: 0.75,
        matchedKeywords: [],
      };
    }
  } catch {
    // LLM 失败，不影响
  }

  return {
    intent: 'unknown',
    sceneId: 'general',
    confidence: 0.2,
    matchedKeywords: [],
  };
}

/** 获取场景智能体 */
export function getSceneAgent(sceneId: string): SceneAgent | undefined {
  return scenes.find(s => s.id === sceneId)?.agent;
}

/** 获取所有场景 */
export function getAllScenes(): { id: string; name: string; description: string }[] {
  return scenes.map(s => ({ id: s.id, name: s.name, description: s.description }));
}
