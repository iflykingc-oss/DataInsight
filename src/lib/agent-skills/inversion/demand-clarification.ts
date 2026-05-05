import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const INVERSION_DEMAND_CLARIFICATION: SkillDefinition = {
  metadata: {
    id: 'inversion-demand-clarification-001',
    name: '需求澄清',
    version: '1.0.0',
    author: 'DataInsight',
    description: '收集用户需求信息，确认关键约束和业务背景',
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
      keywords: ['需求澄清', '收集需求', '确认需求'],
      patterns: [/需求/, /澄清/],
    },
    input: {
      requiredFields: ['request'],
      optionalFields: ['industry', 'context'],
    },
    output: {
      schema: {
        collectedInfo: 'object',
        missingInfo: 'array',
        clarificationQuestions: 'array',
        interviewCompleted: 'boolean',
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
    const request = String(context.params?.request || '');
    const industry = String(context.params?.industry || 'general');

    const collectedInfo: Record<string, unknown> = {
      request,
      industry,
      timestamp: new Date().toISOString(),
    };

    const missingInfo: string[] = [];
    const clarificationQuestions: string[] = [];

    if (!request.includes('目标') && !request.includes('目的')) {
      missingInfo.push('分析目标');
      clarificationQuestions.push('您希望通过这次分析解决什么业务问题？');
    }

    if (!request.includes('行业') && industry === 'general') {
      missingInfo.push('行业背景');
      clarificationQuestions.push('您的数据属于哪个行业？（零售/电商/财务/项目/人事）');
    }

    if (!request.includes('时间') && !request.includes('周期')) {
      missingInfo.push('时间范围');
      clarificationQuestions.push('您希望分析哪个时间范围的数据？');
    }

    if (!request.includes('指标') && !request.includes('KPI')) {
      missingInfo.push('关注指标');
      clarificationQuestions.push('您最关注哪些指标？');
    }

    const interviewCompleted = missingInfo.length === 0;

    return {
      collectedInfo,
      missingInfo,
      clarificationQuestions,
      interviewCompleted,
    };
  },
};
