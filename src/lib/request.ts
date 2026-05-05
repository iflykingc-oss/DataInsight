/**
 * 统一请求工具 - 支持普通请求和SSE流式请求（含断线重连）
 */

/** 获取认证头 */
export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
}

/** 通用请求封装 */
export async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = { ...getAuthHeaders(), ...(options.headers as Record<string, string> || {}) };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    let errorMessage = `请求失败: ${response.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error || errorMessage;
    } catch { /* use default message */ }
    throw new Error(errorMessage);
  }

  return response.json();
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
}

/** SSE 流式请求（支持断线重连） */
export async function streamRequest(options: StreamRequestOptions): Promise<void> {
  const { url, body, onChunk, onDone, onError, signal, maxRetries = 2, retryDelay = 1000 } = options;
  
  let retryCount = 0;
  let lastContent = ''; // 用于续传时记录已接收内容

  const attemptStream = async (): Promise<void> => {
    const headers = getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('无法读取流');

    const decoder = new TextDecoder();
    let buffer = '';

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
      if (isRetryable && !signal?.aborted) {
        retryCount++;
        console.warn(`SSE流中断，第${retryCount}次重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptStream();
      }
      throw streamErr;
    }
  };

  try {
    await attemptStream();
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    onError(err as Error);
  }
}
