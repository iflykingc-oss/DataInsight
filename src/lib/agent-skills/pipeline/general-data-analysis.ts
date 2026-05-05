import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const PIPELINE_GENERAL_001: SkillDefinition = {
  metadata: {
    id: 'pipeline-general-001',
    name: '通用数据分析Pipeline',
    version: '1.0.0',
    author: 'DataInsight',
    description: '通用数据分析Pipeline，覆盖数据清洗到可视化建议',
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
      keywords: ['数据分析', '通用分析', '数据洞察'],
      patterns: [/数据分析/, /通用.*分析/],
    },
    input: {
      requiredFields: ['data', 'fields'],
      optionalFields: ['industry'],
    },
    output: {
      schema: {
        stageOutputs: 'array',
        statistics: 'object',
        anomalies: 'array',
        visualizationSuggestions: 'array',
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

    const cleanedData = data.filter(row => {
      return fields.some(field => row[field] !== null && row[field] !== undefined && row[field] !== '');
    });

    stageOutputs.push({
      stageId: 'data-cleaning',
      success: true,
      output: { originalCount: data.length, cleanedCount: cleanedData.length, removedCount: data.length - cleanedData.length },
    });

    const statistics: Record<string, Record<string, number>> = {};
    for (const field of fields) {
      const values = cleanedData
        .map(row => parseFloat(String(row[field])))
        .filter(v => !isNaN(v));

      if (values.length > 0) {
        const sorted = [...values].sort((a, b) => a - b);
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;

        statistics[field] = {
          count: values.length,
          sum: Math.round(sum * 100) / 100,
          avg: Math.round(avg * 100) / 100,
          min: Math.min(...values),
          max: Math.max(...values),
          median: sorted.length % 2 === 0
            ? (sorted[Math.floor(sorted.length / 2) - 1] + sorted[Math.floor(sorted.length / 2)]) / 2
            : sorted[Math.floor(sorted.length / 2)],
        };
      }
    }

    stageOutputs.push({
      stageId: 'statistical-analysis',
      success: true,
      output: statistics,
    });

    const anomalies: Array<{ field: string; value: number; reason: string }> = [];
    for (const [field, stats] of Object.entries(statistics)) {
      const values = cleanedData
        .map(row => parseFloat(String(row[field])))
        .filter(v => !isNaN(v));

      const q1 = stats.avg - (stats.max - stats.min) * 0.25;
      const q3 = stats.avg + (stats.max - stats.min) * 0.25;
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;

      values.forEach(v => {
        if (v < lower || v > upper) {
          anomalies.push({ field, value: v, reason: v < lower ? '低于正常范围' : '高于正常范围' });
        }
      });
    }

    stageOutputs.push({
      stageId: 'anomaly-detection',
      success: true,
      output: { anomalyCount: anomalies.length, anomalies: anomalies.slice(0, 10) },
    });

    const visualizationSuggestions: Array<{ type: string; field: string; reason: string }> = [];
    for (const field of fields) {
      if (statistics[field]) {
        visualizationSuggestions.push({ type: 'line', field, reason: '展示趋势变化' });
        visualizationSuggestions.push({ type: 'bar', field, reason: '对比数值大小' });
      }
    }

    stageOutputs.push({
      stageId: 'visualization-suggestions',
      success: true,
      output: { suggestions: visualizationSuggestions },
    });

    return {
      stageOutputs,
      statistics,
      anomalies: anomalies.slice(0, 10),
      visualizationSuggestions: visualizationSuggestions.slice(0, 6),
    };
  },
};
