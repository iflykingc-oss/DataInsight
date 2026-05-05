import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const TOOL_WRAPPER_RETAIL_001: SkillDefinition = {
  metadata: {
    id: 'tool-wrapper-retail-001',
    name: '零售领域知识包',
    version: '1.0.0',
    author: 'DataInsight',
    description: '按需加载零售行业领域知识，包括指标规范、基准数据和合规规则',
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
  type: 'tool_wrapper',
  contract: {
    trigger: {
      keywords: ['零售知识', '零售行业', '零售指标'],
      patterns: [/零售/, /retail/],
    },
    input: {
      requiredFields: ['region'],
      optionalFields: ['metrics'],
    },
    output: {
      schema: {
        industryMetrics: 'object',
        benchmarks: 'object',
        complianceRules: 'array',
      },
      format: 'json',
    },
    permission: {
      requiredPermissions: ['knowledge:read'],
      forbiddenActions: ['knowledge:modify'],
    },
  },
  failureRules: {
    retryCount: 1,
    abortOnError: false,
  },
  execute: async (context: SkillExecutionContext) => {
    const region = String(context.params?.region || 'CN');

    const industryMetrics = {
      grossMargin: { name: '毛利率', unit: '%', formula: '(销售收入 - 销售成本) / 销售收入', importance: 'high' },
      inventoryTurnover: { name: '库存周转率', unit: '次/年', formula: '销售成本 / 平均库存', importance: 'high' },
      customerRetention: { name: '客户留存率', unit: '%', formula: '期末客户数 / 期初客户数', importance: 'high' },
      averageOrderValue: { name: '客单价', unit: '元', formula: '销售额 / 订单数', importance: 'medium' },
      salesGrowth: { name: '销售增长率', unit: '%', formula: '(本期销售额 - 上期销售额) / 上期销售额', importance: 'high' },
      returnRate: { name: '退货率', unit: '%', formula: '退货金额 / 销售金额', importance: 'medium' },
    };

    const benchmarks: Record<string, Record<string, { min: number; max: number; unit: string }>> = {
      CN: {
        grossMargin: { min: 30, max: 40, unit: '%' },
        inventoryTurnover: { min: 6, max: 12, unit: '次/年' },
        customerRetention: { min: 60, max: 80, unit: '%' },
        averageOrderValue: { min: 150, max: 300, unit: '元' },
      },
      US: {
        grossMargin: { min: 35, max: 45, unit: '%' },
        inventoryTurnover: { min: 8, max: 15, unit: '次/年' },
        customerRetention: { min: 65, max: 85, unit: '%' },
        averageOrderValue: { min: 50, max: 100, unit: 'USD' },
      },
      GLOBAL: {
        grossMargin: { min: 30, max: 45, unit: '%' },
        inventoryTurnover: { min: 6, max: 15, unit: '次/年' },
        customerRetention: { min: 60, max: 85, unit: '%' },
        averageOrderValue: { min: 100, max: 250, unit: '元' },
      },
    };

    const complianceRules = [
      '遵守《消费者权益保护法》',
      '符合《价格法》相关规定',
      '遵循《反不正当竞争法》',
      '保护客户隐私数据',
    ];

    return {
      industryMetrics,
      benchmarks: benchmarks[region as keyof typeof benchmarks] || benchmarks.GLOBAL,
      complianceRules,
    };
  },
};
