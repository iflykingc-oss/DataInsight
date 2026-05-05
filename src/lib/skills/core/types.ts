/**
 * 技能中台 - 核心类型定义
 * 所有原子技能标准化接口
 */

import type { CellValue, ParsedData, FieldStat } from '@/lib/data-processor';

/** 技能类别 */
export type SkillCategory =
  | 'generate'      // 表格生成
  | 'clean'         // 数据清洗
  | 'analyze'       // 数据分析
  | 'visualize'     // 可视化
  | 'formula'       // 公式/计算
  | 'parse'         // 文档解析
  | 'transform'     // 数据转换
  | 'validate'      // 数据校验
  | 'export'        // 导出
  | 'transform_advance' // 高级转换
  | 'table-generate'    // 表格生成（别名）
  | 'data-clean'        // 数据清洗（别名）
  | 'data-analyze'      // 数据分析（别名）
  | 'document-parse'    // 文档解析（别名）
  | string;             // 允许扩展

/** 技能执行策略 */
export type ExecutionStrategy =
  | 'rule'          // 纯规则执行，不调用模型
  | 'llm'           // 模型主导
  | 'hybrid';       // 规则+模型混合

/** 技能入参定义 */
export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'data';
  description: string;
  required: boolean;
  default?: unknown;
  enum?: unknown[];
}

/** 技能出参定义 */
export interface SkillOutput {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'data' | 'chart' | 'file';
  description: string;
}

/** 技能处理器签名 */
export type SkillHandler = (
  params: Record<string, unknown>,
  context: SkillContext
) => Promise<SkillResult>;

/** 技能定义 */
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  strategy: ExecutionStrategy;
  /** 绑定场景 Tab，空数组表示全局可用 */
  scenes?: string[];
  /** 场景绑定（scenes 的别名，兼容配置化定义） */
  sceneBindings?: string[];
  parameters?: SkillParameter[];
  outputs?: SkillOutput[];
  /** 是否需要原始数据 */
  requiresData?: boolean;
  /** 依赖的其他技能ID */
  dependencies?: string[];
  /** 搜索关键词 */
  keywords?: string[];
  /** 执行超时时间（秒） */
  timeout?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否支持流式输出 */
  streaming?: boolean;
  /** 内联处理器（注册时优先） */
  handler?: SkillHandler;
  /** 图标（UI展示用） */
  icon?: string;
}

/** 技能调用记录 */
/** 技能执行上下文 */
export interface SkillContext {
  /** 当前会话ID */
  sessionId: string;
  /** 当前Tab场景 */
  scene: string;
  /** 当前数据（内存态） */
  data?: ParsedData;
  /** 字段统计 */
  fieldStats?: FieldStat[];
  /** 用户原始请求 */
  userRequest: string;
  /** 模型配置 */
  modelConfig?: {
    apiKey: string;
    baseUrl: string;
    model: string;
  };
  /** 执行元数据 */
  metadata: Record<string, unknown>;
}

/** 技能执行结果 */
export interface SkillResult {
  success: boolean;
  skillId?: string;
  /** 输出数据 */
  data?: Record<string, unknown> | unknown;
  /** 文本解释 */
  explanation?: string;
  /** 可视化产物 */
  visualization?: {
    type: 'chart' | 'table' | 'text' | 'file';
    content: unknown;
  };
  /** 错误信息 */
  error?: string;
  /** 执行耗时（ms） */
  duration?: number;
  /** 使用的执行策略 */
  usedStrategy?: ExecutionStrategy;
  /** 执行元数据 */
  metadata?: {
    duration?: number;
    modelUsed?: boolean;
    tokensUsed?: number;
  };
}

/** 技能调用记录 */
export interface SkillCallRecord {
  skillId: string;
  parameters: Record<string, unknown>;
  result: SkillResult;
  timestamp: number;
}

/** 技能注册表接口 */
export interface SkillRegistry {
  register(skill: SkillDefinition): void;
  registerMany(skills: SkillDefinition[]): void;
  get(id: string): SkillDefinition | undefined;
  list(): SkillDefinition[];
  listByCategory(category: SkillCategory): SkillDefinition[];
  listByScene(scene: string): SkillDefinition[];
  listByStrategy(strategy: ExecutionStrategy): SkillDefinition[];
  has(id: string): boolean;
  size(): number;
}

/** 场景标识 */
export type SceneId =
  | 'data-table'
  | 'data-prep'
  | 'smart-insight'
  | 'visualization'
  | 'chart-center'
  | 'ai-qa'
  | 'form-collection'
  | 'sql-query'
  | 'report-export'
  | 'global';
