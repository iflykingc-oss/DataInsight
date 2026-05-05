/**
 * 任务规划引擎
 * 将用户请求拆解为可执行的任务计划
 */

import type { AgentContext, TaskPlan, TaskPlanStep } from './types';
import { skillRegistry } from '@/lib/skills/core/registry';
import type { SkillDefinition } from '@/lib/skills/core/types';

/**
 * 基于规则的任务规划（确定性任务，70%场景）
 * 不调用模型，纯规则匹配
 */
export async function planTaskByRules(
  request: string,
  sceneId: string,
  _context: AgentContext
): Promise<TaskPlan> {
  const lowerRequest = request.toLowerCase();
  const steps: TaskPlanStep[] = [];

  // 根据请求关键词匹配技能组合
  const matchedSkills = matchSkillsByRequest(lowerRequest, sceneId);

  if (matchedSkills.length === 0) {
    // 未匹配到，返回 LLM 规划兜底
    return {
      steps: [{ type: 'llm', prompt: request }],
      estimatedComplexity: 'unknown',
    };
  }

  for (const skill of matchedSkills) {
    steps.push({
      type: 'skill',
      skillId: skill.id,
      parameters: inferParameters(skill, lowerRequest),
      continueOnError: false,
    });
  }

  return {
    steps,
    estimatedComplexity: matchedSkills.length > 3 ? 'high' : matchedSkills.length > 1 ? 'medium' : 'low',
  };
}

/**
 * 基于 LLM 的任务规划（复杂非标需求，30%场景）
 * 调用模型拆解任务
 */
export async function planTaskByLLM(
  request: string,
  sceneId: string,
  context: AgentContext
): Promise<TaskPlan> {
  const availableSkills = skillRegistry.listByScene(sceneId);

  const skillList = availableSkills.map(s =>
    `- ${s.id}: ${s.description} (策略: ${s.strategy})`
  ).join('\n');

  const prompt = `你是一个任务规划助手。请将用户的请求拆解为可执行的步骤序列。

当前场景: ${sceneId}
可用技能:
${skillList}

用户请求: ${request}

请按以下格式输出任务计划（纯文本，不要JSON）：
1. 步骤1: skill=<技能ID> 参数=<参数键值对>
2. 步骤2: ...

如果不需要调用技能，直接回答用户问题即可。`;

  try {
    const { callLLM } = await import('@/lib/llm');
    const response = await callLLM(
      context.modelConfig ?? { apiKey: '', baseUrl: '', model: '' },
      [{ role: 'user', content: prompt }]
    );

    // 简化解析：从 LLM 输出中提取技能调用
    const steps = parseLLMPlan(response, availableSkills);

    return {
      steps,
      estimatedComplexity: 'high',
    };
  } catch {
    // LLM 失败，降级为规则规划
    return planTaskByRules(request, sceneId, context);
  }
}

/** 根据请求匹配技能 */
function matchSkillsByRequest(request: string, sceneId: string): SkillDefinition[] {
  const sceneSkills = skillRegistry.listByScene(sceneId);
  const matched: { skill: SkillDefinition; score: number }[] = [];

  for (const skill of sceneSkills) {
    let score = 0;
    for (const keyword of (skill.keywords ?? [])) {
      if (request.includes(keyword.toLowerCase())) {
        score += 1;
      }
    }
    if (score > 0) {
      matched.push({ skill, score });
    }
  }

  matched.sort((a, b) => b.score - a.score);

  // 按依赖关系排序：被依赖的技能先执行
  return topologicalSort(matched.map(m => m.skill));
}

/** 推断参数 */
function inferParameters(skill: SkillDefinition, _request: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const param of (skill.parameters ?? [])) {
    if (param.default !== undefined) {
      params[param.name] = param.default;
    }
  }
  return params;
}

/** 拓扑排序（按依赖关系） */
function topologicalSort(skills: SkillDefinition[]): SkillDefinition[] {
  const result: SkillDefinition[] = [];
  const visited = new Set<string>();

  function visit(skill: SkillDefinition) {
    if (visited.has(skill.id)) return;
    visited.add(skill.id);

    for (const depId of (skill.dependencies ?? [])) {
      const dep = skillRegistry.get(depId);
      if (dep) visit(dep);
    }

    result.push(skill);
  }

  for (const skill of skills) {
    visit(skill);
  }

  return result;
}

/** 解析 LLM 规划输出 */
function parseLLMPlan(response: string, availableSkills: SkillDefinition[]): TaskPlanStep[] {
  const steps: TaskPlanStep[] = [];

  // 简单正则提取：匹配 "skill=xxx" 模式
  const lines = response.split('\n');
  for (const line of lines) {
    const skillMatch = line.match(/skill[=:](\w+)/);
    if (skillMatch) {
      const skillId = skillMatch[1];
      const skill = availableSkills.find(s => s.id === skillId);
      if (skill) {
        steps.push({
          type: 'skill',
          skillId,
          parameters: inferParameters(skill, line),
          continueOnError: false,
        });
      }
    }
  }

  // 如果没有解析到任何步骤，返回 LLM 文本回复
  if (steps.length === 0) {
    steps.push({ type: 'llm', prompt: response });
  }

  return steps;
}
