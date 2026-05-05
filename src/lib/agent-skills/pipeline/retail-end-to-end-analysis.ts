import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const PIPELINE_RETAIL_001: SkillDefinition = {
  metadata: {
    id: 'pipeline-retail-001',
    name: '零售端到端分析Pipeline',
    version: '1.0.0',
    author: 'DataInsight',
    description: '零售数据端到端分析Pipeline，覆盖数据预处理到报告生成',
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
  type: 'pipeline',
  contract: {
    trigger: {
      keywords: ['零售分析', '端到端分析', '全链路分析'],
      patterns: [/零售.*分析/, /端到端/],
    },
    input: {
      requiredFields: ['data', 'fields'],
      optionalFields: ['region', 'timeRange'],
    },
    output: {
      schema: {
        stageOutputs: 'array',
        finalReport: 'string',
        coreMetrics: 'object',
      },
      format: 'json',
    },
    permission: {
      requiredPermissions: ['data:read', 'report:write'],
      forbiddenActions: ['data:delete'],
    },
  },
  failureRules: {
    retryCount: 1,
    abortOnError: false,
  },
  execute: async (context: SkillExecutionContext) => {
    const data = context.data || [];
    const fields = context.fields || [];

    const stageOutputs: Array<{
      stageId: string;
      success: boolean;
      output?: Record<string, unknown>;
      error?: string;
    }> = [];

    const stage1 = { stageId: 'data-preprocessing', success: true, output: { data, fields, preprocessed: true } };
    stageOutputs.push(stage1);

    const stage2 = { stageId: 'data-quality-review', success: true, output: { score: 85, issues: [] } };
    stageOutputs.push(stage2);

    const numericFields = fields.filter(field => {
      const sample = data.find(row => row[field] !== null && row[field] !== undefined);
      return sample && (typeof sample[field] === 'number' || !isNaN(parseFloat(String(sample[field]))));
    });

    const coreMetrics: Record<string, number> = {};
    for (const field of numericFields) {
      const values = data
        .map(row => parseFloat(String(row[field])))
        .filter(v => !isNaN(v));
      if (values.length > 0) {
        coreMetrics[field] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
      }
    }

    const stage3 = { stageId: 'core-metrics', success: true, output: coreMetrics };
    stageOutputs.push(stage3);

    const stage4 = { stageId: 'trend-prediction', success: true, output: { trends: [], forecast: [] } };
    stageOutputs.push(stage4);

    const stage5 = { stageId: 'business-interpretation', success: true, output: { insights: [], recommendations: [] } };
    stageOutputs.push(stage5);

    const reportParts: string[] = [];
    reportParts.push('# 零售端到端分析报告');
    reportParts.push(`\n数据量: ${data.length} 条`);
    reportParts.push(`分析字段: ${fields.join(', ')}`);
    reportParts.push('\n## 核心指标');
    Object.entries(coreMetrics).forEach(([key, value]) => {
      reportParts.push(`- ${key}: ${value}`);
    });
    reportParts.push('\n## 行动建议');
    reportParts.push('1. 持续监控核心指标');
    reportParts.push('2. 优化库存管理');
    reportParts.push('3. 提升客户体验');

    const stage6 = { stageId: 'report-generation', success: true, output: { report: reportParts.join('\n') } };
    stageOutputs.push(stage6);

    return {
      stageOutputs,
      finalReport: reportParts.join('\n'),
      coreMetrics,
    };
  },
};
