export interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  enabled: boolean;
  isDefault: boolean;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  stream?: boolean;
}

export interface AIModelPreset {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  model: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface LLMStreamEvent {
  type: 'content' | 'done' | 'error' | 'tool_call';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}

export interface LLMCallOptions {
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  maxRetries?: number;
  stream?: boolean;
}

export interface LLMCallLog {
  timestamp: string;
  model: string;
  baseUrl: string;
  messageCount: number;
  duration: number;
  status: 'success' | 'error';
  error?: string;
  tokenUsage?: TokenUsage;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface LLMCallStats {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgDuration: number;
  lastCall?: LLMCallLog;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: LLMMessage[];
  createdAt: string;
  updatedAt: string;
  modelConfig?: AIModelConfig;
  contextWindow?: number;
  totalTokens?: number;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  preview: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface IntentDetection {
  intent: 'greeting' | 'query' | 'analysis' | 'visualization' | 'report' | 'command' | 'unknown';
  label: string;
  confidence: number;
  suggestedActions?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: unknown;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTime: number;
}
