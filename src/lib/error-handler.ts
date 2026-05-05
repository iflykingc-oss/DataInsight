/**
 * 用户友好的错误提示工具
 * 提供清晰的错误类型分类和排查建议
 */

/** 错误类型 */
export type ErrorType = 
  | 'network'      // 网络问题
  | 'timeout'      // 请求超时
  | 'auth'         // 认证/权限问题
  | 'rate_limit'   // 频率限制
  | 'server'       // 服务器错误
  | 'invalid'      // 无效输入
  | 'unknown';     // 未知错误

/** 错误信息结构 */
export interface UserFriendlyError {
  type: ErrorType;
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
}

/** 错误分类器 */
function classifyError(error: Error | string): ErrorType {
  const msg = error instanceof Error ? error.message : error;
  
  if (msg.includes('401') || msg.includes('403') || msg.includes('API Key') || msg.includes('auth')) {
    return 'auth';
  }
  if (msg.includes('429') || msg.includes('rate limit') || msg.includes('请求过于频繁')) {
    return 'rate_limit';
  }
  if (msg.includes('timeout') || msg.includes('超时') || msg.includes('AbortError')) {
    return 'timeout';
  }
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('服务器')) {
    return 'server';
  }
  if (msg.includes('network') || msg.includes('网络') || msg.includes('fetch') || msg.includes('Failed to fetch')) {
    return 'network';
  }
  if (msg.includes('invalid') || msg.includes('格式错误') || msg.includes('参数错误')) {
    return 'invalid';
  }
  return 'unknown';
}

/** 错误配置 */
const ERROR_CONFIGS: Record<ErrorType, { title: string; suggestions: string[]; canRetry: boolean }> = {
  network: {
    title: '网络连接问题',
    suggestions: [
      '检查网络连接是否稳定',
      '尝试刷新页面后重新操作',
      '如果使用了代理，请暂时关闭代理',
    ],
    canRetry: true,
  },
  timeout: {
    title: '请求超时',
    suggestions: [
      '网络连接可能不稳定',
      '尝试更换为响应更快的模型',
      '减少数据量后重试',
      '稍后重试',
    ],
    canRetry: true,
  },
  auth: {
    title: '认证失败',
    suggestions: [
      '检查 API Key 是否正确',
      '确认 API Key 有足够的调用额度',
      '检查 Base URL 是否正确配置',
      '部分模型需要单独开通访问权限',
    ],
    canRetry: false,
  },
  rate_limit: {
    title: '请求过于频繁',
    suggestions: [
      '等待几分钟后重试',
      '降低请求频率',
      '考虑升级 API 套餐',
    ],
    canRetry: true,
  },
  server: {
    title: '服务器异常',
    suggestions: [
      'AI 服务可能正在维护',
      '稍后重试',
      '尝试更换其他模型',
    ],
    canRetry: true,
  },
  invalid: {
    title: '输入无效',
    suggestions: [
      '检查输入格式是否正确',
      '确保必填字段已填写',
      '参考页面提示进行输入',
    ],
    canRetry: true,
  },
  unknown: {
    title: '操作失败',
    suggestions: [
      '刷新页面后重试',
      '检查网络连接',
      '如持续失败，请联系技术支持',
    ],
    canRetry: true,
  },
};

/**
 * 转换为用户友好的错误信息
 */
export function toUserFriendlyError(error: Error | string, defaultMessage?: string): UserFriendlyError {
  const errorType = classifyError(error);
  const config = ERROR_CONFIGS[errorType];
  const errorMsg = error instanceof Error ? error.message : error;
  
  return {
    type: errorType,
    title: config.title,
    message: defaultMessage || errorMsg || '发生了未知错误',
    suggestions: config.suggestions,
    canRetry: config.canRetry,
  };
}

/**
 * 格式化错误为可显示的字符串
 */
export function formatError(error: Error | string, defaultMessage?: string): string {
  const friendly = toUserFriendlyError(error, defaultMessage);
  const suggestions = friendly.suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return `${friendly.message}\n\n排查建议：\n${suggestions}`;
}

/**
 * 特定场景的错误提示
 */
export const ERROR_MESSAGES = {
  fileUpload: {
    title: '文件上传失败',
    fileTooLarge: '文件大小超过限制（建议≤50MB）',
    invalidFormat: '不支持的文件格式，请上传 Excel 或 CSV 文件',
    parseError: '文件解析失败，请检查文件内容是否完整',
  },
  aiAnalyze: {
    title: 'AI 分析失败',
    noData: '请先上传数据或导入表格',
    apiNotConfigured: '请先在设置中配置 AI 模型',
  },
  chartGenerate: {
    title: '图表生成失败',
    noData: '没有可用的数据生成图表',
    tooManyData: '数据量过大，请先进行筛选或采样',
  },
  dataExport: {
    title: '导出失败',
    noData: '没有数据可导出',
    formatError: '导出格式不支持',
  },
};
