import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const GENERATOR_RETAIL_001: SkillDefinition = {
  metadata: {
    id: 'generator-retail-001',
    name: '零售销售报告生成器',
    version: '1.0.0',
    author: 'DataInsight',
    description: '生成零售销售分析报告，模板与风格分离',
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
  type: 'generator',
  contract: {
    trigger: {
      keywords: ['零售报告', '销售报告', '零售分析'],
      patterns: [/零售.*报告/, /销售.*分析/],
    },
    input: {
      requiredFields: ['data', 'metrics'],
      optionalFields: ['style'],
    },
    output: {
      schema: {
        reportContent: 'string',
        reportStructure: 'object',
      },
      format: 'markdown',
    },
    permission: {
      requiredPermissions: ['report:write'],
      forbiddenActions: ['data:delete'],
    },
  },
  failureRules: {
    retryCount: 2,
    abortOnError: false,
  },
  execute: async (context: SkillExecutionContext) => {
    const data = context.data || [];
    const metrics = context.params?.metrics as Record<string, unknown> || {};
    const style = String(context.params?.style || 'formal');

    const reportTemplate = {
      title: '零售销售分析报告',
      sections: [
        { id: 'executive-summary', name: '执行摘要', required: true },
        { id: 'sales-overview', name: '销售概览', required: true },
        { id: 'metric-analysis', name: '指标分析', required: true },
        { id: 'trend-analysis', name: '趋势分析', required: true },
        { id: 'recommendations', name: '行动建议', required: true },
      ],
    };

    const styleGuide: Record<string, { tone: string; format: string; language: string }> = {
      formal: { tone: '正式', format: '结构化报告', language: '专业术语' },
      casual: { tone: '轻松', format: '要点列表', language: '通俗易懂' },
      executive: { tone: '简洁', format: '一页纸摘要', language: '关键数字' },
    };

    const selectedStyle = styleGuide[style] || styleGuide.formal;

    const parts: string[] = [];
    parts.push(`# ${reportTemplate.title}`);
    parts.push(`\n> 风格: ${selectedStyle.tone} | 格式: ${selectedStyle.format}\n`);

    parts.push(`## 执行摘要`);
    parts.push(`本报告基于 ${data.length} 条销售数据，分析了核心指标表现。`);
    if (metrics.grossMargin) {
      parts.push(`毛利率为 ${metrics.grossMargin}%，${Number(metrics.grossMargin) > 30 ? '高于' : '低于'}行业平均水平。`);
    }

    parts.push(`\n## 销售概览`);
    parts.push(`- 数据量: ${data.length} 条`);
    parts.push(`- 分析时间: ${new Date().toLocaleDateString('zh-CN')}`);

    parts.push(`\n## 指标分析`);
    Object.entries(metrics).forEach(([key, value]) => {
      parts.push(`- **${key}**: ${value}`);
    });

    parts.push(`\n## 行动建议`);
    parts.push('1. 持续监控核心指标变化');
    parts.push('2. 优化库存管理，提升周转效率');
    parts.push('3. 加强客户关系维护，提升留存率');

    return {
      reportContent: parts.join('\n'),
      reportStructure: reportTemplate,
    };
  },
};
