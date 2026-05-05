/**
 * 应用级常量
 */

// 应用信息
export const APP_INFO = {
  NAME: 'DataInsight',
  VERSION: '1.0.0',
  DESCRIPTION: 'AI原生智能表格数据分析可视化平台',
} as const;

// 存储键名
export const STORAGE_KEYS = {
  AI_MODEL_CONFIG: 'datainsight_ai_model',
  DASHBOARD_CONFIG: 'datainsight_dashboard',
  CLEAN_TEMPLATE: 'datainsight_clean_template',
  BUILD_TABLE_HISTORY: 'datainsight_build_history',
  CUSTOM_METRICS: 'datainsight_custom_metrics',
  ALERT_RULES: 'datainsight_alert_rules',
  USER_ONBOARDING: 'datainsight_onboarding',
  CHAT_HISTORY: 'datainsight_chat_history',
} as const;

// 本地存储配置
export const STORAGE_CONFIG = {
  MAX_SIZE: 5 * 1024 * 1024,  // 5MB
  EXPIRE_DAYS: 30,
} as const;

// 缓存配置
export const CACHE_CONFIG = {
  MAX_ENTRIES: 100,
  MAX_SIZE_MB: 50,
  TTL_MS: 30 * 60 * 1000,  // 30分钟
} as const;
