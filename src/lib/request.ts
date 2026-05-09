/**
 * 统一请求工具 - 支持普通请求和SSE流式请求（含断线重连）
 * 增强版：统一超时、重试、错误分类
 */

/** 刷新 Token（返回是否成功） */
async function tryRefreshToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem('datainsight_refresh_token');
  if (!refreshToken) return false;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;

    const data = await response.json();
    if (data.success && data.token && data.refreshToken) {
      localStorage.setItem('datainsight_token', data.token);
      localStorage.setItem('datainsight_refresh_token', data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/** 获取认证头 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('datainsight_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

/** 带超时的fetch */
async function fetchWithTimeout(url: string, options: RequestInit & { timeout?: number }): Promise<Response> {
  const { timeout = 30000, ...rest } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...rest,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 通用请求封装（增强版：超时+重试+友好错误） */
export async function request<T>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = 30000, maxRetries = 2, retryDelay = 1000, ...fetchOptions } = options;
  const headers = { ...getAuthHeaders(), ...(fetchOptions.headers as Record<string, string> || {}) };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, {
        ...fetchOptions,
        headers,
        timeout,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        let errorMessage = `请求失败: ${response.status}`;
        try {
          const parsed = JSON.parse(errorBody);
          errorMessage = parsed.error || errorMessage;
        } catch { /* use default message */ }

        // 401 尝试刷新 Token
        if (response.status === 401) {
          const refreshed = await tryRefreshToken();
          if (refreshed && attempt < maxRetries) {
            // 用新 Token 重试
            const newHeaders = getAuthHeaders();
            const retryResponse = await fetchWithTimeout(url, {
              ...fetchOptions,
              headers: { ...newHeaders, ...(fetchOptions.headers as Record<string, string> || {}) },
              timeout,
            });
            if (retryResponse.ok) {
              return await retryResponse.json();
            }
          }
          // 刷新失败，清除登录态
          if (typeof window !== 'undefined') {
            localStorage.removeItem('datainsight_token');
            localStorage.removeItem('datainsight_refresh_token');
            window.dispatchEvent(new CustomEvent('auth:expired'));
          }
          throw new Error('登录已过期，请重新登录');
        }

        // 4xx 错误不重试
        if (response.status >= 400 && response.status < 500) {
          throw new Error(errorMessage);
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // AbortError（超时）可重试
      if (lastError.name === 'AbortError' && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
        continue;
      }

      // 网络错误可重试
      if (lastError.message.includes('fetch') || lastError.message.includes('network') || lastError.message.includes('Failed to fetch')) {
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, retryDelay * (attempt + 1)));
          continue;
        }
      }

      throw lastError;
    }
  }

  throw lastError || new Error('请求失败');
}

/** SSE 流式请求选项 */
export interface StreamRequestOptions {
  url: string;
  body: Record<string, unknown>;
  /** 流数据回调 */
  onChunk: (content: string) => void;
  /** 流完成回调 */
  onDone: () => void;
  /** 错误回调 */
  onError: (error: Error) => void;
  /** 中断信号 */
  signal?: AbortSignal;
  /** 最大重试次数（断线重连），默认2次 */
  maxRetries?: number;
  /** 重试延迟(ms)，默认1000 */
  retryDelay?: number;
  /** 超时时间(ms)，默认120000 */
  timeout?: number;
}

/** SSE 流式请求（支持断线重连+超时） */
export async function streamRequest(options: StreamRequestOptions): Promise<void> {
  const { url, body, onChunk, onDone, onError, signal, maxRetries = 2, retryDelay = 1000, timeout = 120000 } = options;

  let retryCount = 0;
  let lastContent = '';
  let streamStartTime = Date.now();

  const attemptStream = async (): Promise<void> => {
    const headers = getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // 合并外部signal
    if (signal) {
      signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取流');

      const decoder = new TextDecoder();
      let buffer = '';
      streamStartTime = Date.now();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.done) {
                  onDone();
                  return;
                } else if (parsed.content) {
                  lastContent += parsed.content;
                  onChunk(parsed.content);
                }
              } catch { /* ignore malformed chunks */ }
            }
          }
        }
        // 流自然结束（无done标记）
        onDone();
      } catch (streamErr) {
        // 检查是否可重试（网络断开等）
        const isRetryable = streamErr instanceof TypeError && retryCount < maxRetries;
        if (isRetryable && !signal?.aborted && !controller.signal.aborted) {
          retryCount++;
          console.warn(`SSE流中断，第${retryCount}次重试...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay * retryCount));
          return attemptStream();
        }
        throw streamErr;
      }
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  };

  try {
    await attemptStream();
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      if (Date.now() - streamStartTime >= timeout) {
        onError(new Error('请求超时，请检查网络或稍后重试'));
        return;
      }
      return; // 用户主动取消
    }
    onError(err as Error);
  }
}
