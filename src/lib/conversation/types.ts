/**
 * 对话式分析引擎类型定义
 * 多轮对话、上下文理解、记忆系统
 */

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  messages: ConversationMessage[];
  dataContext?: DataContext;
  analysisContext?: AnalysisContext;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  metadata?: {
    intent?: string;
    industry?: string;
    confidence?: number;
    actions?: string[];
    dataReferences?: string[];
  };
}

export interface DataContext {
  currentDataset?: {
    id: string;
    name: string;
    headers: string[];
    rowCount: number;
    sample: Record<string, unknown>[];
  };
  previousDatasets?: string[];
  filters?: Record<string, unknown>;
  transformations?: DataTransformation[];
}

export interface DataTransformation {
  type: 'filter' | 'aggregate' | 'sort' | 'join' | 'derive';
  description: string;
  params: Record<string, unknown>;
  timestamp: number;
}

export interface AnalysisContext {
  currentAnalysis?: string;
  previousAnalyses?: string[];
  insights?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: number;
  }>;
  visualizations?: Array<{
    id: string;
    type: string;
    config: Record<string, unknown>;
    timestamp: number;
  }>;
}

export interface ConversationResponse {
  message: string;
  type: 'text' | 'data' | 'chart' | 'table' | 'insight' | 'clarification' | 'suggestion';
  data?: unknown;
  chart?: ChartConfig;
  table?: TableConfig;
  insights?: SmartInsight[];
  suggestions?: string[];
  followUpQuestions?: string[];
  actions?: Array<{
    label: string;
    action: string;
    params?: Record<string, unknown>;
  }>;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'heatmap' | 'gauge';
  title: string;
  data: unknown[];
  xAxis?: string;
  yAxis?: string;
  series?: string[];
  options?: Record<string, unknown>;
}

export interface TableConfig {
  title: string;
  headers: string[];
  rows: Record<string, unknown>[];
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
  };
  sortable?: boolean;
  filterable?: boolean;
}

export interface SmartInsight {
  id: string;
  type: 'anomaly' | 'trend' | 'correlation' | 'segment' | 'prediction';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

export interface ConversationConfig {
  maxHistoryLength: number;
  enableContextMemory: boolean;
  enableProactiveInsights: boolean;
  enableFollowUpSuggestions: boolean;
  language: 'zh' | 'en';
  responseStyle: 'detailed' | 'concise' | 'technical';
}
