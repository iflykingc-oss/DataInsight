import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const INVERSION_REQUIREMENT_VALIDATION: SkillDefinition = {
  metadata: {
    id: 'inversion-requirement-validation-001',
    name: '需求验证',
    version: '1.0.0',
    author: 'DataInsight',
    description: '验证需求完整性，检查关键约束是否缺失',
    lifecycle: 'active',
    changeLog: [
      {
        version: '1.0.0',
        date: '2026-05-05',
        changes: ['初始版本'],
      },
    ],
    testCases: [],
  },
  type: 'inversion',
  contract: {
    trigger: {
      keywords: ['需求验证', '验证需求', '检查需求'],
      patterns: [/验证/, /检查需求/],
    },
    input: {
      requiredFields: ['requirements'],
      optionalFields: ['constraints'],
    },
    output: {
      schema: {
        isComplete: 'boolean',
        missingRequirements: 'array',
        risks: 'array',
        suggestedNextSteps: 'array',
      },
      format: 'json',
    },
    permission: {
      requiredPermissions: [],
      forbiddenActions: [],
    },
  },
  failureRules: {
    retryCount: 0,
    abortOnError: false,
  },
  execute: async (context: SkillExecutionContext) => {
    const requirements = context.params?.requirements as Record<string, unknown> || {};

    const missingRequirements: string[] = [];
    const risks: string[] = [];
    const suggestedNextSteps: string[] = [];

    if (!requirements.industry) {
      missingRequirements.push('行业类型');
      risks.push('缺少行业背景可能导致分析方向偏差');
    }

    if (!requirements.goal) {
      missingRequirements.push('分析目标');
      risks.push('缺少明确目标可能导致分析结果无法满足需求');
    }

    if (!requirements.metrics || !Array.isArray(requirements.metrics) || requirements.metrics.length === 0) {
      missingRequirements.push('关注指标');
      risks.push('未指定关注指标，分析可能过于宽泛');
    }

    if (!requirements.timeRange) {
      missingRequirements.push('时间范围');
      risks.push('缺少时间范围可能导致分析结果不具时效性');
    }

    const isComplete = missingRequirements.length === 0;

    if (!isComplete) {
      suggestedNextSteps.push('使用需求澄清 Skill 收集缺失信息');
      suggestedNextSteps.push('明确业务目标和关键约束');
    } else {
      suggestedNextSteps.push('需求完整，可以进入分析阶段');
    }

    return {
      isComplete,
      missingRequirements,
      risks,
      suggestedNextSteps,
    };
  },
};
