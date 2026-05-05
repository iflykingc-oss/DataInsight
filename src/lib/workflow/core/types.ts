/**
 * 工作流引擎 - 核心类型定义
 */

import type { SkillDefinition, SkillContext, SkillResult, SkillCallRecord } from '@/lib/skills/core/types';

/** 工作流步骤类型 */
export type WorkflowStepType =
  | 'skill'       // 调用原子技能
  | 'condition'   // 条件分支
  | 'parallel'    // 并行执行
  | 'loop'        // 循环
  | 'human'       // 人工确认（本产品中简化为自动通过）
  | 'merge';      // 结果合并

/** 工作流分类 */
export type WorkflowCategory =
  | 'general'     // 通用办公
  | 'sales'       // 销售零售
  | 'finance'     // 财务人事
  | 'project'     // 项目运营
  | 'education';  // 教育科研

/** 条件分支定义 */
export interface ConditionBranch {
  id: string;
  name: string;
  condition: string; // 表达式，如 "result.success === true"
  nextSteps: string[];
}

/** 工作流步骤 */
export interface WorkflowStep {
  id?: string;
  name?: string;
  type?: WorkflowStepType;
  /** skill 类型时使用 */
  skillId?: string;
  /** 简化的条件表达式（为兼容配置化定义） */
  condition?: string | null;
  /** 参数映射 */
  parameterMapping?: Record<string, string>;
  /** 条件分支（condition 类型时使用） */
  branches?: ConditionBranch[];
  /** 并行步骤（parallel 类型时使用） */
  parallelSteps?: string[];
  /** 下一步 */
  nextStep?: string;
  /** 失败时的回退步 */
  fallbackStep?: string;
  /** 重试次数 */
  retryCount?: number;
  /** 步骤描述 */
  description?: string;
}

/** 工作流定义 */
export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  /** 业务领域 */
  domain?: string;
  /** 业务领域（domain 的别名，兼容配置化定义） */
  category?: string;
  /** 适用场景 */
  scenes?: string[];
  /** 场景绑定（scenes 的别名） */
  sceneBindings?: string[];
  /** 标签 */
  tags?: string[];
  /** 输入参数 */
  inputs?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  /** 步骤列表 */
  steps: WorkflowStep[];
  /** 入口步骤 */
  entryStep?: string;
  /** 输出定义 */
  outputs?: {
    name: string;
    type: string;
    description: string;
  }[];
  /** 预计耗时（秒） */
  estimatedDuration?: number;
  /** 是否支持动态编排 */
  supportsDynamic?: boolean;
  /** 错误处理策略 */
  errorStrategy?: 'fail' | 'continue' | 'fallback';
  /** 最大重试次数 */
  maxRetries?: number;
  /** 超时（毫秒） */
  timeout?: number;
  /** 是否为内置工作流 */
  isBuiltin?: boolean;
  /** 是否为模板 */
  isTemplate?: boolean;
  /** 创建时间 */
  createdAt?: string;
  /** 版本 */
  version?: string;
}

/** 工作流实例状态 */
export type WorkflowInstanceStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** 工作流实例 */
export interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: WorkflowInstanceStatus;
  context: SkillContext;
  currentStepId?: string;
  completedSteps: string[];
  stepResults: Map<string, SkillResult>;
  skillRecords: SkillCallRecord[];
  startTime: number;
  endTime?: number;
  error?: string;
  /** 执行进度 0-100 */
  progress: number;
  /** 原始工作流定义，用于步骤查找 */
  definition: WorkflowDefinition;
}

/** 工作流执行选项 */
export interface WorkflowExecuteOptions {
  /** 超时时间（秒） */
  timeout?: number;
  /** 是否允许动态编排 */
  allowDynamic?: boolean;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 进度回调 */
  onProgress?: (progress: number, currentStep: string) => void;
  /** 步骤完成回调 */
  onStepComplete?: (stepId: string, result: SkillResult) => void;
}

/** 工作流执行结果 */
export interface WorkflowResult {
  success: boolean;
  instanceId: string;
  workflowId: string;
  outputs: Record<string, unknown>;
  skillRecords: SkillCallRecord[];
  duration: number;
  progress: number;
  error?: string;
}

/** 动态编排请求 */
export interface DynamicWorkflowRequest {
  userRequest: string;
  context: SkillContext;
  /** 可用技能白名单 */
  availableSkills: string[];
}

/** 动态编排结果 */
export interface DynamicWorkflowPlan {
  steps: WorkflowStep[];
  entryStep: string;
  reasoning: string;
}
