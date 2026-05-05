/**
 * 智能体核心 - 类型定义
 */

import type { SkillDefinition, SkillContext, SkillResult } from '@/lib/skills/core/types';
import type { WorkflowDefinition, WorkflowResult, DynamicWorkflowPlan } from '@/lib/workflow/core/types';

/** 用户意图类型 */
export type UserIntent =
  | 'generate_table'     // 生成表格
  | 'clean_data'         // 清洗数据
  | 'analyze_data'       // 分析数据
  | 'visualize'          // 可视化
  | 'create_formula'     // 创建公式
  | 'parse_document'     // 解析文档
  | 'ask_question'       // 问答
  | 'cross_scene'        // 跨场景
  | 'workflow'           // 执行工作流
  | 'help'               // 帮助
  | 'greeting'           // 问候
  | 'unknown';           // 未知

/** 场景路由结果 */
export interface SceneRouteResult {
  /** 目标场景 */
  targetScene: string;
  /** 是否需要切换 Tab */
  needSwitchTab: boolean;
  /** 切换理由 */
  reason: string;
  /** 置信度 0-1 */
  confidence: number;
}

/** 任务拆解结果 */
export interface TaskPlan {
  /** 任务ID */
  taskId?: string;
  /** 任务描述 */
  description?: string;
  /** 执行策略 */
  strategy?: 'skill' | 'workflow' | 'direct' | 'llm' | 'condition';
  /** 关联技能/工作流 */
  skillOrWorkflowId?: string;
  /** 子任务 */
  subTasks?: TaskPlan[];
  /** 步骤列表（旧代码兼容） */
  steps?: TaskPlanStep[];
  /** 依赖的前置任务 */
  dependencies?: string[];
  /** 步骤类型（旧代码兼容） */
  type?: 'skill' | 'workflow' | 'condition' | 'direct' | 'llm';
  /** 技能ID（旧代码兼容） */
  skillId?: string;
  /** 参数（旧代码兼容） */
  parameters?: Record<string, unknown>;
  /** 错误时是否继续（旧代码兼容） */
  continueOnError?: boolean;
  /** 提示词（旧代码兼容） */
  prompt?: string;
  /** 预估复杂度（旧代码兼容） */
  estimatedComplexity?: string;
  /** 工作流ID（旧代码兼容） */
  workflowId?: string;
}

/** 智能体消息 */
export interface AgentMessage {
  role: 'user' | 'agent' | 'system' | 'skill';
  content: string;
  timestamp: number;
  /** 关联的技能调用记录 */
  skillRecord?: {
    skillId: string;
    skillName: string;
    result: SkillResult;
  };
  /** 关联的工作流执行记录 */
  workflowRecord?: {
    workflowId: string;
    workflowName: string;
    result: WorkflowResult;
  };
}

/** 智能体会话 */
export interface AgentSession {
  id: string;
  scene: string;
  messages: AgentMessage[];
  createdAt: number;
  lastActivityAt: number;
  /** 当前任务计划 */
  currentPlan?: TaskPlan[];
  /** 上下文数据（内存态，不持久化） */
  contextData?: Record<string, unknown>;
  /** 最后用户请求（旧代码兼容） */
  lastUserRequest?: string;
  /** 当前数据（旧代码兼容） */
  data?: { headers: string[]; rows: Record<string, unknown>[]; };
  /** 模型配置（旧代码兼容） */
  modelConfig?: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  /** 会话ID（旧代码兼容） */
  sessionId?: string;
}

/** 智能体配置 */
export interface AgentConfig {
  /** 智能体ID */
  id: string;
  /** 智能体名称 */
  name: string;
  /** 智能体类型 */
  type: 'global' | 'scene';
  /** 负责场景（scene类型时使用） */
  scene?: string;
  /** 系统提示词 */
  systemPrompt: string;
  /** 可用技能白名单 */
  skillWhitelist: string[];
  /** 可用工作流白名单 */
  workflowWhitelist: string[];
  /** 是否支持动态编排 */
  supportsDynamicWorkflow: boolean;
  /** 模型配置 */
  modelConfig?: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
}

/** 智能体响应 */
export interface AgentResponse {
  /** 响应文本 */
  content: string;
  /** 响应类型（旧代码兼容） */
  type?: 'text' | 'action' | 'error';
  /** 是否需要用户确认 */
  needConfirm?: boolean;
  /** 建议的操作 */
  suggestedActions?: {
    label: string;
    action: string;
    params?: Record<string, unknown>;
  }[];
  /** 建议列表（旧代码兼容） */
  suggestions?: string[];
  /** 执行的技能 */
  executedSkills?: SkillResult[];
  /** 执行的工作流 */
  executedWorkflows?: WorkflowResult[];
  /** 是否需要切换场景 */
  routeToScene?: SceneRouteResult;
}

/** 全局智能体状态 */
export interface GlobalAgentState {
  sessions: Map<string, AgentSession>;
  activeScene: string;
}

// ===== 以下为兼容旧代码的别名与扩展类型 =====

/** 智能体上下文（AgentContext 是 AgentSession 的简化别名） */
export type AgentContext = AgentSession;

/** 场景上下文 */
export type SceneContext = AgentSession;

/** 智能体角色 */
export type AgentRole = 'global' | 'scene';

/** 全局智能体接口 */
export interface GlobalAgent {
  process(request: string, context: AgentContext): Promise<AgentResponse>;
}

/** 场景智能体接口 */
export interface SceneAgent {
  sceneId: string;
  process(request: string, context: AgentContext): Promise<AgentResponse>;
}

/** 意图分类结果 */
export interface IntentClassification {
  intent: UserIntent;
  sceneId: string;
  confidence: number;
  /** 匹配的关键词 */
  matchedKeywords?: string[];
}

/** 任务计划步骤（TaskPlanStep 是 TaskPlan 的别名） */
export type TaskPlanStep = TaskPlan;

/** LLM 模型配置 */
export interface LLMModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** 扩展 AgentResponse，兼容旧代码字段 */
export interface AgentResponseCompat extends AgentResponse {
  /** 响应类型（旧代码兼容） */
  type?: 'text' | 'action' | 'error';
  /** 建议列表（旧代码兼容） */
  suggestions?: string[];
}
