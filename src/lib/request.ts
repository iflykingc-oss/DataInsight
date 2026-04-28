/**
 * 统一请求工具
 * 
 * 封装 fetch 请求，内置：
 * - 请求/响应拦截
 * - 异常统一处理
 * - 自动重试（可配置）
 * - 超时控制
 * - 请求取消
 */

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** 请求体（自动 JSON 序列化） */
  body?: unknown;
  /** 超时时间（毫秒），默认 30000 */
  timeout?: number;
  /** 最大重试次数，默认 0 */
  maxRetries?: number;
  /** 重试延迟（毫秒），默认 1000 */
  retryDelay?: number;
  /** 是否在重试前等待（指数退避） */
  exponentialBackoff?: boolean;
  /** AbortSignal，用于取消请求 */
  signal?: AbortSignal;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode: number;
}

/**
 * 统一请求函数
 */
export async function request<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    body,
    timeout = 30000,
    maxRetries = 0,
    retryDelay = 1000,
    exponentialBackoff = true,
    signal: externalSignal,
    headers: customHeaders,
    method = body ? 'POST' : 'GET',
    ...restOptions
  } = options;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string>),
  };

  let serializedBody: string | undefined;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    serializedBody = JSON.stringify(body);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // 超时控制器
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    // 合并外部 signal 和超时 signal
    const combinedSignal = externalSignal
      ? AbortSignal.any([externalSignal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: serializedBody,
        signal: combinedSignal,
        ...restOptions,
      });

      clearTimeout(timeoutId);

      // 非 2xx 错误
      if (!response.ok) {
        let errorMsg: string;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorData.message || `HTTP ${response.status}`;
        } catch {
          errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        }

        // 4xx 错误不重试
        if (response.status >= 400 && response.status < 500) {
          return { success: false, error: errorMsg, statusCode: response.status };
        }

        lastError = new Error(errorMsg);
        // 5xx 可以重试
        if (attempt < maxRetries) {
          await delay(calculateDelay(attempt, retryDelay, exponentialBackoff));
          continue;
        }

        return { success: false, error: errorMsg, statusCode: response.status };
      }

      // 成功响应
      try {
        const data = await response.json() as T;
        return { success: true, data, statusCode: response.status };
      } catch {
        // JSON 解析失败
        return { success: true, statusCode: response.status };
      }
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof DOMException && error.name === 'AbortError') {
        if (externalSignal?.aborted) {
          return { success: false, error: '请求已取消', statusCode: 0 };
        }
        lastError = new Error(`请求超时（${timeout / 1000}s）`);
      } else {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      if (attempt < maxRetries) {
        await delay(calculateDelay(attempt, retryDelay, exponentialBackoff));
        continue;
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || '请求失败',
    statusCode: 0,
  };
}

/**
 * 流式请求（SSE）
 * 返回 ReadableStream，供前端逐步读取
 */
export async function streamRequest(
  url: string,
  options: RequestOptions = {}
): Promise<{ stream: ReadableStream<Uint8Array>; cancel: () => void }> {
  const {
    body,
    timeout = 120000, // 流式请求超时更长
    signal: externalSignal,
    headers: customHeaders,
    method = 'POST',
  } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

  const combinedSignal = externalSignal
    ? AbortSignal.any([externalSignal, timeoutController.signal])
    : timeoutController.signal;

  const response = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: combinedSignal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    let errorMsg: string;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || `HTTP ${response.status}`;
    } catch {
      errorMsg = `HTTP ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  if (!response.body) {
    throw new Error('响应体为空');
  }

  return {
    stream: response.body,
    cancel: () => timeoutController.abort(),
  };
}

// 辅助函数
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, baseDelay: number, exponential: boolean): number {
  if (!exponential) return baseDelay;
  return baseDelay * Math.pow(2, attempt);
}
