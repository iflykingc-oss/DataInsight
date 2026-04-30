/**
 * LLM 调用工具 - 使用用户自定义模型配置，通过 OpenAI 兼容格式调用
 * 支持流式和非流式两种模式
 */

/**
 * LLM 调用日志
 */
interface LLMCallLog {
  timestamp: string;
  model: string;
  baseUrl: string;
  messageCount: number;
  duration: number;
  status: 'success' | 'error';
  error?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

const LLM_CALL_LOGS: LLMCallLog[] = [];
const MAX_LOG_SIZE = 100;

function logLLMCall(log: LLMCallLog) {
  LLM_CALL_LOGS.push(log);
  if (LLM_CALL_LOGS.length > MAX_LOG_SIZE) {
    LLM_CALL_LOGS.shift();
  }
  if (log.status === 'error') {
    console.error(`[LLM Error] ${log.model} @ ${log.timestamp}:`, log.error);
  } else {
    console.log(`[LLM] ${log.model} - ${log.duration}ms`);
  }
}

export function getLLMCallLogs(): LLMCallLog[] {
  return [...LLM_CALL_LOGS];
}

export function clearLLMCallLogs(): void {
  LLM_CALL_LOGS.length = 0;
}

export function getLLMCallStats(): {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgDuration: number;
  lastCall?: LLMCallLog;
} {
  const stats = {
    totalCalls: LLM_CALL_LOGS.length,
    successCalls: 0,
    errorCalls: 0,
    avgDuration: 0,
    lastCall: LLM_CALL_LOGS[LLM_CALL_LOGS.length - 1],
  };

  let totalDuration = 0;
  for (const log of LLM_CALL_LOGS) {
    if (log.status === 'success') {
      stats.successCalls++;
    } else {
      stats.errorCalls++;
    }
    totalDuration += log.duration;
  }

  if (stats.totalCalls > 0) {
    stats.avgDuration = Math.round(totalDuration / stats.totalCalls);
  }

  return stats;
}

export interface LLMModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 验证模型配置是否有效
 */
export function validateModelConfig(config: LLMModelConfig | null | undefined): { valid: boolean; error?: string } {
  if (!config) {
    return { valid: false, error: '请先配置 AI 模型。在设置中添加模型（需提供 API Key、Base URL 和模型名称）' };
  }
  if (!config.apiKey || config.apiKey.trim() === '') {
    return { valid: false, error: 'API Key 未配置，请在设置中填写模型 API Key' };
  }
  if (!config.baseUrl || config.baseUrl.trim() === '') {
    return { valid: false, error: 'Base URL 未配置，请在设置中填写模型 API 地址' };
  }
  if (!config.model || config.model.trim() === '') {
    return { valid: false, error: '模型名称未配置，请在设置中填写模型名称' };
  }
  return { valid: true };
}

/**
 * 非流式调用 LLM（用于指标生成、仪表盘生成等场景）
 * @param config 模型配置
 * @param messages 消息列表
 * @param options 可选参数
 * @param options.timeout 超时时间（毫秒），默认 120000（2分钟）
 * @param options.maxRetries 最大重试次数，默认 1
 * @param options.temperature 温度参数
 * @param options.max_tokens 最大 token 数
 */
export async function callLLM(
  config: LLMModelConfig,
  messages: LLMMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    maxRetries?: number;
  }
): Promise<string> {
  const startTime = Date.now();
  const validation = validateModelConfig(config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
  const endpoint = `${cleanBaseUrl}/chat/completions`;

  const timeout = options?.timeout ?? 120000; // 默认 2 分钟
  const maxRetries = options?.maxRetries ?? 1; // 默认重试 1 次
  const temperature = options?.temperature ?? 0.7;
  const maxTokens = options?.max_tokens ?? 4096;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const attemptStart = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - attemptStart;

      if (!response.ok) {
        let errorBody: { error?: { message?: string }; message?: string } = {};
        try { errorBody = await response.json(); } catch { /* ignore */ }

        const errorMsg = errorBody?.error?.message || errorBody?.message || response.statusText;
        let hint = '';
        if (response.status === 401) hint = '（API Key 无效或已过期）';
        else if (response.status === 403) hint = '（权限不足或 IP 限制）';
        else if (response.status === 404) hint = '（模型名称不正确或端点不可用，请检查 Base URL 和模型名称）';
        else if (response.status === 429) hint = '（请求频率超限，请稍后重试）';

        const finalError = new Error(`模型调用失败 (HTTP ${response.status}): ${errorMsg} ${hint}`.trim());
        logLLMCall({
          timestamp: new Date().toISOString(),
          model: config.model,
          baseUrl: cleanBaseUrl,
          messageCount: messages.length,
          duration,
          status: 'error',
          error: finalError.message,
        });
        throw finalError;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('模型返回内容为空');
      }

      logLLMCall({
        timestamp: new Date().toISOString(),
        model: config.model,
        baseUrl: cleanBaseUrl,
        messageCount: messages.length,
        duration,
        status: 'success',
        tokenUsage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      });

      return content;
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const duration = Date.now() - attemptStart;

      if (error instanceof Error && error.name === 'AbortError') {
        const isNetworkError = lastError === null && attempt === 0;
        if (attempt < maxRetries) {
          lastError = new Error(`模型响应较慢，正在重试...（${Math.round(timeout/1000)}秒）`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 重试前等待 1 秒
          continue;
        }
        // 所有重试都失败
        const suggestions = [
          '检查网络连接是否稳定',
          '尝试更换为响应更快的模型（如 GPT-3.5-Turbo、Qwen-Turbo 等）',
          '检查 Base URL 是否正确（确保包含完整路径，如 https://api.openai.com/v1）',
          '确认 API Key 有足够的调用额度',
        ];
        const finalError = new Error(`模型调用超时（${Math.round(timeout/1000)}秒），请稍后重试或优化网络环境。\n\n可能原因：\n${suggestions.map((s, i) => `${i+1}. ${s}`).join('\n')}`);
        logLLMCall({
          timestamp: new Date().toISOString(),
          model: config.model,
          baseUrl: cleanBaseUrl,
          messageCount: messages.length,
          duration,
          status: 'error',
          error: finalError.message,
        });
        throw finalError;
      }

      if (error instanceof Error) {
        // 401/404/429 等 HTTP 错误不重试
        if (error.message.includes('HTTP 401') || error.message.includes('HTTP 403') ||
            error.message.includes('HTTP 404') || error.message.includes('HTTP 429')) {
          logLLMCall({
            timestamp: new Date().toISOString(),
            model: config.model,
            baseUrl: cleanBaseUrl,
            messageCount: messages.length,
            duration,
            status: 'error',
            error: error.message,
          });
          throw error;
        }

        // 其他错误可以重试
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        logLLMCall({
          timestamp: new Date().toISOString(),
          model: config.model,
          baseUrl: cleanBaseUrl,
          messageCount: messages.length,
          duration,
          status: 'error',
          error: error.message,
        });
        throw error;
      }

      logLLMCall({
        timestamp: new Date().toISOString(),
        model: config.model,
        baseUrl: cleanBaseUrl,
        messageCount: messages.length,
        duration,
        status: 'error',
        error: String(error),
      });
      throw error;
    }
  }

  logLLMCall({
    timestamp: new Date().toISOString(),
    model: config.model,
    baseUrl: cleanBaseUrl,
    messageCount: messages.length,
    duration: Date.now() - startTime,
    status: 'error',
    error: lastError?.message || '模型调用失败',
  });
  throw lastError || new Error('模型调用失败');
}

/**
 * 流式调用 LLM（用于 AI 智能分析等场景）
 * 返回 ReadableStream，适配 SSE 协议
 * @param config 模型配置
 * @param messages 消息列表
 * @param options 可选参数
 * @param options.timeout 超时时间（毫秒），默认 120000（2分钟）
 * @param options.temperature 温度参数
 * @param options.max_tokens 最大 token 数
 */
export async function callLLMStream(
  config: LLMModelConfig,
  messages: LLMMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
  }
): Promise<ReadableStream<Uint8Array>> {
  const validation = validateModelConfig(config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
  const endpoint = `${cleanBaseUrl}/chat/completions`;
  const timeout = options?.timeout ?? 120000; // 默认 2 分钟

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 4096,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (fetchError) {
    clearTimeout(timeoutId);
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      const suggestions = [
        '检查网络连接是否稳定',
        '尝试更换为响应更快的模型',
        '检查 Base URL 是否正确',
      ];
      throw new Error(`模型调用超时（${Math.round(timeout/1000)}秒），请稍后重试。\n\n可能原因：\n${suggestions.map((s, i) => `${i+1}. ${s}`).join('\n')}`);
    }
    throw fetchError;
  }

  clearTimeout(timeoutId);

  if (!response.ok) {
    let errorBody: { error?: { message?: string }; message?: string } = {};
    try { errorBody = await response.json(); } catch { /* ignore */ }

    const errorMsg = errorBody?.error?.message || errorBody?.message || response.statusText;
    let hint = '';
    if (response.status === 401) hint = '（API Key 无效或已过期）';
    else if (response.status === 403) hint = '（权限不足或 IP 限制）';
    else if (response.status === 404) hint = '（模型名称不正确或端点不可用，请检查 Base URL 和模型名称）';
    else if (response.status === 429) hint = '（请求频率超限，请稍后重试）';

    throw new Error(`模型调用失败 (HTTP ${response.status}): ${errorMsg} ${hint}`.trim());
  }

  if (!response.body) {
    throw new Error('模型未返回流式响应');
  }

  // 将 OpenAI SSE 格式转换为我们的 SSE 格式
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  const transformStream = new TransformStream();
  const writer = transformStream.writable.getWriter();

  // 异步处理流式数据
  (async () => {
    try {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed?.choices?.[0]?.delta?.content;
            if (content) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          } catch {
            // 跳过无法解析的行
          }
        }
      }

      await writer.write(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '流式处理异常';
      await writer.write(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return transformStream.readable;

}

/**
 * 带兜底的 LLM 流式调用
 * - 首次调用失败后自动重试1次
 * - 4xx 错误（401/404）不重试（API Key 无效等）
 * - 5xx 和网络错误可重试
 */
export async function callLLMStreamWithFallback(
  modelConfig: LLMModelConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  maxRetries = 1
): Promise<ReadableStream> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const stream = await callLLMStream(modelConfig, messages, {
        temperature: 0.7,
        max_tokens: 4096,
      });
      return stream;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // 4xx 错误不重试（API Key 无效等）
      if (lastError.message.includes('401') || lastError.message.includes('404')) {
        throw lastError;
      }
      console.warn(`LLM stream attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  throw lastError || new Error('AI 模型调用失败');
}
