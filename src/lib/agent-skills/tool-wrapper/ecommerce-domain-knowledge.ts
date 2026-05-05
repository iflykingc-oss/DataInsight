import type { SkillDefinition, SkillExecutionContext } from '../core/types';

export const TOOL_WRAPPER_ECOMMERCE_001: SkillDefinition = {
  metadata: {
    id: 'tool-wrapper-ecommerce-001',
    name: '电商领域知识包',
    version: '1.0.0',
    author: 'DataInsight',
    description: '按需加载电商行业领域知识',
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
      keywords: ['电商知识', '电商行业', '电商指标'],
      patterns: [/电商/, /ecommerce/],
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
      conversionRate: { name: '转化率', unit: '%', formula: '订单数 / 访客数', importance: 'high' },
      returnRate: { name: '退货率', unit: '%', formula: '退货金额 / 销售金额', importance: 'high' },
      customerAcquisitionCost: { name: '获客成本', unit: '元', formula: '营销费用 / 新增客户数', importance: 'high' },
      lifetimeValue: { name: '客户生命周期价值', unit: '元', formula: '客单价 × 购买频次 × 客户关系持续时间', importance: 'high' },
      cartAbandonmentRate: { name: '购物车放弃率', unit: '%', formula: '放弃购物车数 / 创建购物车数', importance: 'medium' },
      averageSessionDuration: { name: '平均会话时长', unit: '秒', formula: '总会话时长 / 会话数', importance: 'medium' },
    };

    const benchmarks: Record<string, Record<string, { min: number; max: number; unit: string }>> = {
      CN: {
        conversionRate: { min: 2, max: 5, unit: '%' },
        returnRate: { min: 5, max: 15, unit: '%' },
        customerAcquisitionCost: { min: 50, max: 200, unit: '元' },
        lifetimeValue: { min: 500, max: 2000, unit: '元' },
      },
      US: {
        conversionRate: { min: 2.5, max: 6, unit: '%' },
        returnRate: { min: 8, max: 20, unit: '%' },
        customerAcquisitionCost: { min: 30, max: 100, unit: 'USD' },
        lifetimeValue: { min: 100, max: 500, unit: 'USD' },
      },
      GLOBAL: {
        conversionRate: { min: 2, max: 6, unit: '%' },
        returnRate: { min: 5, max: 20, unit: '%' },
        customerAcquisitionCost: { min: 50, max: 200, unit: '元' },
        lifetimeValue: { min: 500, max: 2000, unit: '元' },
      },
    };

    const complianceRules = [
      '遵守《电子商务法》',
      '符合《网络安全法》数据保护要求',
      '遵循《广告法》相关规定',
      '保护用户个人信息',
    ];

    return {
      industryMetrics,
      benchmarks: benchmarks[region as keyof typeof benchmarks] || benchmarks.GLOBAL,
      complianceRules,
    };
  },
};
