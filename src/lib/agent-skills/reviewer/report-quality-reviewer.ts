import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const REVIEWER_REPORT_QUALITY: SkillDefinition = {
  metadata: {
    id: 'reviewer-report-quality-001',
    name: '报告质量审查',
    version: '1.0.0',
    author: 'DataInsight',
    description: '审查分析报告的质量，包括完整性、准确性、规范性和可读性',
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
  type: 'reviewer',
  contract: {
    trigger: {
      keywords: ['报告质量', '审查报告', '报告检查'],
      patterns: [/报告质量/, /审查报告/],
    },
    input: {
      requiredFields: ['report'],
      optionalFields: ['checklist'],
    },
    output: {
      schema: {
        score: 'number',
        passedChecks: 'array',
        failedChecks: 'array',
        suggestions: 'array',
      },
      format: 'json',
    },
    permission: {
      requiredPermissions: ['report:read'],
      forbiddenActions: ['report:delete'],
    },
  },
  failureRules: {
    retryCount: 1,
    abortOnError: false,
  },
  execute: async (context: SkillExecutionContext) => {
    const report = context.params?.report as Record<string, unknown> || {};

    const passedChecks: string[] = [];
    const failedChecks: string[] = [];
    const suggestions: string[] = [];

    if (report.executiveSummary) {
      passedChecks.push('包含执行摘要');
    } else {
      failedChecks.push('缺少执行摘要');
      suggestions.push('添加执行摘要，概述核心发现');
    }

    if (report.keyFindings && Array.isArray(report.keyFindings) && report.keyFindings.length > 0) {
      passedChecks.push('包含关键发现');
    } else {
      failedChecks.push('缺少关键发现');
      suggestions.push('提取并列出关键数据洞察');
    }

    if (report.recommendations && Array.isArray(report.recommendations) && report.recommendations.length > 0) {
      passedChecks.push('包含行动建议');
    } else {
      failedChecks.push('缺少行动建议');
      suggestions.push('基于分析结果给出可执行的建议');
    }

    if (report.dataQuality) {
      passedChecks.push('包含数据质量评估');
    } else {
      failedChecks.push('缺少数据质量评估');
      suggestions.push('添加数据质量评分和问题说明');
    }

    const totalChecks = passedChecks.length + failedChecks.length;
    const score = totalChecks > 0 ? Math.round((passedChecks.length / totalChecks) * 100) : 0;

    return {
      score,
      passedChecks,
      failedChecks,
      suggestions,
    };
  },
};
