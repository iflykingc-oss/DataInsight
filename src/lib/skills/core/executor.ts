/**
 * 技能中台 - 执行器
 * 统一技能调用入口，支持 rule/llm/hybrid 三种策略
 */

import type { SkillDefinition, SkillContext, SkillResult, SkillCallRecord } from './types';
import { skillRegistry } from './registry';

/** 执行技能 */
export async function executeSkill(
  skillId: string,
  parameters: Record<string, unknown>,
  context: SkillContext
): Promise<SkillResult> {
  const skill = skillRegistry.get(skillId);
  if (!skill) {
    return {
      success: false,
      skillId,
      error: `Skill not found: ${skillId}`,
      duration: 0,
      usedStrategy: 'rule',
    };
  }

  const startTime = Date.now();

  try {
    // 参数校验
    const validation = validateParameters(skill, parameters);
    if (!validation.valid) {
      return {
        success: false,
        skillId,
        error: `Parameter validation failed: ${validation.error}`,
        duration: Date.now() - startTime,
        usedStrategy: skill.strategy,
      };
    }

    // 根据策略执行
    let result: SkillResult;
    switch (skill.strategy) {
      case 'rule':
        result = await executeRuleSkill(skill, parameters, context);
        break;
      case 'llm':
        result = await executeLLMSkill(skill, parameters, context);
        break;
      case 'hybrid':
        result = await executeHybridSkill(skill, parameters, context);
        break;
      default:
        result = {
          success: false,
          skillId,
          error: `Unknown strategy: ${skill.strategy}`,
          duration: Date.now() - startTime,
          usedStrategy: skill.strategy,
        };
    }

    return result;
  } catch (err) {
    return {
      success: false,
      skillId,
      error: err instanceof Error ? err.message : String(err),
      duration: Date.now() - startTime,
      usedStrategy: skill.strategy,
    };
  }
}

/** 参数校验 */
function validateParameters(
  skill: SkillDefinition,
  parameters: Record<string, unknown>
): { valid: boolean; error?: string } {
  for (const param of (skill.parameters ?? [])) {
    if (param.required && !(param.name in parameters)) {
      return { valid: false, error: `Missing required parameter: ${param.name}` };
    }
    if (param.name in parameters && param.enum) {
      const value = parameters[param.name];
      if (!param.enum.includes(value)) {
        return { valid: false, error: `Invalid value for ${param.name}: ${value}` };
      }
    }
  }
  return { valid: true };
}

/** 规则技能执行（纯代码逻辑，不调用模型） */
async function executeRuleSkill(
  skill: SkillDefinition,
  parameters: Record<string, unknown>,
  context: SkillContext
): Promise<SkillResult> {
  // 规则技能的具体实现由技能定义中的逻辑处理
  // 这里提供通用执行框架，具体技能逻辑在技能实现层
  const startTime = Date.now();

  // 调用具体技能处理器
  const handler = getSkillHandler(skill.id);
  if (!handler) {
    return {
      success: false,
      skillId: skill.id,
      error: `No handler registered for skill: ${skill.id}`,
      duration: Date.now() - startTime,
      usedStrategy: 'rule',
    };
  }

  return handler(parameters, context);
}

/** LLM 技能执行（调用大模型） */
async function executeLLMSkill(
  skill: SkillDefinition,
  parameters: Record<string, unknown>,
  context: SkillContext
): Promise<SkillResult> {
  const startTime = Date.now();

  // 构建 prompt
  const prompt = buildSkillPrompt(skill, parameters, context);

  try {
    // 调用 LLM（通过现有 llm.ts）
    const { callLLM } = await import('@/lib/llm');
    const response = await callLLM(
      context.modelConfig ?? { apiKey: '', baseUrl: '', model: '' },
      [{ role: 'user', content: prompt }]
    );

    return {
      success: true,
      skillId: skill.id,
      data: { result: response },
      explanation: response,
      duration: Date.now() - startTime,
      usedStrategy: 'llm',
    };
  } catch (err) {
    return {
      success: false,
      skillId: skill.id,
      error: err instanceof Error ? err.message : String(err),
      duration: Date.now() - startTime,
      usedStrategy: 'llm',
    };
  }
}

/** 混合策略执行（规则兜底 + LLM 增强） */
async function executeHybridSkill(
  skill: SkillDefinition,
  parameters: Record<string, unknown>,
  context: SkillContext
): Promise<SkillResult> {
  // 先尝试规则执行
  const ruleResult = await executeRuleSkill(skill, parameters, context);
  if (ruleResult.success) {
    return { ...ruleResult, usedStrategy: 'hybrid' };
  }

  // 规则失败，降级为 LLM
  return executeLLMSkill(skill, parameters, context);
}

/** 构建技能 Prompt */
function buildSkillPrompt(
  skill: SkillDefinition,
  parameters: Record<string, unknown>,
  context: SkillContext
): string {
  const lines = [
    `你正在执行技能: ${skill.name}`,
    `描述: ${skill.description}`,
    `用户请求: ${context.userRequest}`,
    '',
    '参数:',
    ...Object.entries(parameters).map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`),
  ];

  if (context.data) {
    lines.push('', `数据表头: ${context.data.headers.join(', ')}`);
    lines.push(`数据行数: ${context.data.rows.length}`);
  }

  return lines.join('\n');
}

/** 技能处理器注册表 */
const skillHandlers = new Map<string, (params: Record<string, unknown>, ctx: SkillContext) => Promise<SkillResult>>();

/** 注册技能处理器 */
export function registerSkillHandler(
  skillId: string,
  handler: (params: Record<string, unknown>, ctx: SkillContext) => Promise<SkillResult>
): void {
  skillHandlers.set(skillId, handler);
}

/** 获取技能处理器 */
function getSkillHandler(skillId: string) {
  return skillHandlers.get(skillId);
}

/** 批量执行多个技能 */
export async function executeSkillsParallel(
  calls: { skillId: string; parameters: Record<string, unknown> }[],
  context: SkillContext
): Promise<SkillResult[]> {
  return Promise.all(calls.map(c => executeSkill(c.skillId, c.parameters, context)));
}
