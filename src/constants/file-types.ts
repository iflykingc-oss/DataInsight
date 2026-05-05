/**
 * 文件处理常量
 */

// 支持的文件类型
export const SUPPORTED_FILE_TYPES = {
  EXCEL: ['.xlsx', '.xls'],
  CSV: ['.csv'],
  ALL: ['.xlsx', '.xls', '.csv'],
} as const;

// 文件大小限制
export const FILE_SIZE_LIMITS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024,  // 50MB
  WARNING_SIZE: 10 * 1024 * 1024,    // 10MB
} as const;

// 采样配置
export const SAMPLING_CONFIG = {
  // 超过此行数自动采样
  AUTO_SAMPLE_THRESHOLD: 1000,
  // 默认采样行数
  DEFAULT_SAMPLE_SIZE: 500,
  // 最大采样行数
  MAX_SAMPLE_SIZE: 1000,
  // 深度分析最大行数
  DEEP_ANALYSIS_MAX_ROWS: 2000,
} as const;

// Excel列宽配置
export const EXCEL_COLUMN_WIDTH = {
  MIN: 8,
  MAX: 50,
  DEFAULT: 15,
} as const;
