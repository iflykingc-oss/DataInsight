/**
 * AI模型配置常量
 */

// 默认模型配置
export const DEFAULT_AI_MODEL = {
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  modelName: 'gpt-4',
};

// 支持的模型列表
export const SUPPORTED_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'OpenAI' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'OpenAI' },
  { id: 'claude-3', name: 'Claude 3', provider: 'Anthropic' },
  { id: 'doubao-pro', name: '豆包Pro', provider: '字节跳动' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: '深度求索' },
  { id: 'kimi-chat', name: 'Kimi Chat', provider: '月之暗面' },
] as const;

// API超时配置（毫秒）
export const API_TIMEOUT = {
  DEFAULT: 120000,    // 2分钟
  UPLOAD: 60000,      // 1分钟
  ANALYZE: 180000,    // 3分钟
  LLM: 120000,        // 2分钟
} as const;

// 重试配置
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,
  MAX_DELAY: 10000,
} as const;
