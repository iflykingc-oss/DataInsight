/**
 * 智能意图理解引擎
 * 从用户需求描述中精准理解业务意图、行业归属、执行策略
 */

import type { ParsedData } from '@/lib/data-processor';

/** 用户需求结构化表示 */
export interface UserRequirement {
  /** 原始需求描述 */
  rawRequest: string;
  /** 识别的行业 */
  industry: IndustryType;
  /** 业务场景 */
  businessScenario: BusinessScenario;
  /** 意图类型 */
  intentType: IntentType;
  /** 业务实体（从需求中提取的关键概念） */
  businessEntities: BusinessEntity[];
  /** 数据需求描述 */
  dataRequirements: DataRequirement;
  /** 期望输出形式 */
  outputExpectation: OutputExpectation;
  /** 置信度 */
  confidence: number;
  /** 是否需要澄清 */
  needClarification: boolean;
  /** 澄清问题列表 */
  clarificationQuestions?: ClarificationQuestion[];
  /** 执行策略建议 */
  suggestedStrategy: ExecutionStrategy;
}

/** 行业类型 */
export type IndustryType =
  | 'retail'           // 零售/商超
  | 'restaurant'       // 餐饮
  | 'healthcare'       // 医疗/医药
  | 'logistics'        // 物流/快递
  | 'real_estate'      // 房地产
  | 'energy'           // 能源/电力
  | 'cross_border'     // 跨境电商
  | 'education'        // 教育培训
  | 'manufacturing'    // 制造业
  | 'finance'          // 金融
  | 'hr'               // 人力资源
  | 'general';         // 通用

/** 业务场景 */
export type BusinessScenario =
  | 'table_generation'     // 表格生成
  | 'data_cleaning'        // 数据清洗
  | 'data_analysis'        // 数据分析
  | 'visualization'        // 可视化
  | 'report'               // 报表生成
  | 'formula'              // 公式生成
  | 'business_review'      // 经营分析
  | 'performance_review'   // 绩效分析
  | 'customer_analysis'    // 客户分析
  | 'supply_chain'         // 供应链分析
  | 'risk_control'         // 风险控制
  | 'general';             // 通用

/** 意图类型 */
export type IntentType =
  | 'generate'            // 生成表格/报告
  | 'analyze'            // 分析数据
  | 'clean'              // 清洗数据
  | 'visualize'          // 可视化
  | 'compare'            // 对比分析
  | 'forecast'           // 预测
  | 'monitor'            // 监控
  | 'audit'              // 审计/检查
  | 'optimize'           // 优化
  | 'report'             // 生成报告
  | 'query'              // 查询
  | 'unknown';

/** 业务实体 */
export interface BusinessEntity {
  type: string;          // 实体类型：门店、商品、客户、订单等
  name: string;          // 实体名称
  count?: number;        // 数量（如果提到）
  attributes?: string[];  // 实体属性
}

/** 数据需求 */
export interface DataRequirement {
  /** 需要包含的指标 */
  metrics: string[];
  /** 需要分析的维度 */
  dimensions: string[];
  /** 时间范围 */
  timeRange?: {
    start?: string;
    end?: string;
    granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  /** 数据筛选条件 */
  filters?: string[];
  /** 数据来源 */
  dataSource?: string;
}

/** 输出期望 */
export interface OutputExpectation {
  /** 输出格式 */
  format: 'table' | 'chart' | 'report' | 'dashboard' | 'json' | 'any';
  /** 详细程度 */
  detailLevel: 'summary' | 'detailed' | 'comprehensive';
  /** 是否需要洞察 */
  needInsights: boolean;
  /** 是否需要建议 */
  needSuggestions: boolean;
  /** 语言风格 */
  languageStyle: 'professional' | 'simple' | 'any';
}

/** 澄清问题 */
export interface ClarificationQuestion {
  question: string;
  options?: string[];
  type: 'select' | 'text' | 'confirm';
  relatedEntity?: string;
}

/** 执行策略 */
export type ExecutionStrategy =
  | 'auto'              // 全自动
  | 'semi_auto'         // 半自动（需确认）
  | 'manual'            // 手动指导
  | 'guided';           // 引导式

/** 意图理解配置 */
export interface IntentUnderstandingConfig {
  /** 是否启用深度语义理解 */
  enableDeepUnderstanding: boolean;
  /** 是否自动检测行业 */
  autoDetectIndustry: boolean;
  /** 是否需要主动澄清 */
  proactiveClarification: boolean;
  /** 最小置信度阈值 */
  minConfidenceThreshold: number;
  /** 模型配置 */
  modelConfig?: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
}

/** 意图理解结果 */
export interface IntentUnderstandingResult {
  success: boolean;
  requirement: UserRequirement;
  matchedPrompts: MatchedPrompt[];
  suggestedWorkflow?: WorkflowSuggestion;
  error?: string;
}

/** 匹配的Prompt */
export interface MatchedPrompt {
  promptId: string;
  promptName: string;
  industry: IndustryType;
  scenario: BusinessScenario;
  matchScore: number;
  adaptationSuggestions?: string[];
}

/** 工作流建议 */
export interface WorkflowSuggestion {
  workflowId: string;
  workflowName: string;
  steps: WorkflowStepSuggestion[];
  estimatedDuration: number;
  complexity: 'low' | 'medium' | 'high';
}

/** 工作流步骤建议 */
export interface WorkflowStepSuggestion {
  stepOrder: number;
  skillId: string;
  skillName: string;
  parameters: Record<string, unknown>;
  reason: string;
}
