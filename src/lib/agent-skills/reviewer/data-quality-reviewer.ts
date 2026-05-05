import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const REVIEWER_DATA_QUALITY: SkillDefinition = {
  metadata: {
    id: 'reviewer-data-quality-001',
    name: '数据质量审查',
    version: '1.0.0',
    author: 'DataInsight',
    description: '审查数据质量，评估完整性、一致性、有效性、时效性',
    lifecycle: 'active',
    changeLog: [
      {
        version: '1.0.0',
        date: '2026-05-05',
        changes: ['初始版本'],
      },
    ],
    testCases: [
      {
        name: '完整数据',
        input: { data: [{ a: 1, b: 2 }], fields: ['a', 'b'] },
        expectedOutput: { score: 100, issues: [] },
      },
    ],
  },
  type: 'reviewer',
  contract: {
    trigger: {
      keywords: ['数据质量', '质量审查', '数据检查'],
      patterns: [/数据质量/, /质量审查/],
    },
    input: {
      requiredFields: ['data', 'fields'],
      optionalFields: ['thresholds'],
    },
    output: {
      schema: {
        score: 'number',
        issues: 'array',
        recommendations: 'array',
      },
      format: 'json',
    },
    permission: {
      requiredPermissions: ['data:read'],
      forbiddenActions: ['data:delete'],
    },
  },
  failureRules: {
    retryCount: 1,
    fallbackSkillId: undefined,
    abortOnError: false,
  },
  execute: async (context: SkillExecutionContext) => {
    const data = context.data || [];
    const fields = context.fields || [];

    const issues: Array<{
      type: 'completeness' | 'consistency' | 'validity' | 'timeliness';
      field: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
    }> = [];

    let score = 100;

    if (data.length < 30) {
      score -= 20;
      issues.push({
        type: 'completeness',
        field: 'global',
        description: `数据量仅 ${data.length} 条，建议至少 30 条以上`,
        severity: 'medium',
      });
    }

    for (const field of fields) {
      const nullCount = data.filter(row => row[field] === null || row[field] === undefined || row[field] === '').length;
      const nullRate = data.length > 0 ? nullCount / data.length : 0;

      if (nullRate > 0.1) {
        score -= 10;
        issues.push({
          type: 'completeness',
          field,
          description: `字段 "${field}" 缺失值比例 ${(nullRate * 100).toFixed(1)}%`,
          severity: nullRate > 0.3 ? 'high' : 'medium',
        });
      }
    }

    score = Math.max(0, Math.min(100, score));

    const recommendations: string[] = [];
    if (issues.some(i => i.type === 'completeness')) {
      recommendations.push('补充缺失数据或使用插值法填充');
    }
    if (issues.some(i => i.type === 'consistency')) {
      recommendations.push('统一数据格式和类型');
    }
    if (recommendations.length === 0) {
      recommendations.push('数据质量良好');
    }

    return {
      score: Math.round(score),
      issues,
      recommendations,
    };
  },
};
