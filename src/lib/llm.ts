/**
 * LLM 调用工具 - 使用用户自定义模型配置，通过 OpenAI 兼容格式调用
 * 支持流式和非流式两种模式
 */

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
 */
export async function callLLM(
  config: LLMModelConfig,
  messages: LLMMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const validation = validateModelConfig(config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
  const endpoint = `${cleanBaseUrl}/chat/completions`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

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
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody: { error?: { message?: string }; message?: string } = {};
      try { errorBody = await response.json(); } catch { /* ignore */ }

      const errorMsg = errorBody?.error?.message || errorBody?.message || response.statusText;
      let hint = '';
      if (response.status === 401) hint = '（API Key 无效或已过期）';
      else if (response.status === 403) hint = '（权限不足或 IP 限制）';
      else if (response.status === 404) hint = '（模型名称不正确或端点不可用）';
      else if (response.status === 429) hint = '（请求频率超限，请稍后重试）';

      throw new Error(`模型调用失败 (HTTP ${response.status}): ${errorMsg} ${hint}`.trim());
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('模型返回内容为空');
    }

    return content;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('模型调用超时（60秒），请检查网络或更换模型');
    }
    throw error;
  }
}

/**
 * 流式调用 LLM（用于 AI 智能分析等场景）
 * 返回 ReadableStream，适配 SSE 协议
 */
export async function callLLMStream(
  config: LLMModelConfig,
  messages: LLMMessage[],
  options?: { temperature?: number; max_tokens?: number }
): Promise<ReadableStream<Uint8Array>> {
  const validation = validateModelConfig(config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
  const endpoint = `${cleanBaseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
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
  });

  if (!response.ok) {
    let errorBody: { error?: { message?: string }; message?: string } = {};
    try { errorBody = await response.json(); } catch { /* ignore */ }

    const errorMsg = errorBody?.error?.message || errorBody?.message || response.statusText;
    let hint = '';
    if (response.status === 401) hint = '（API Key 无效或已过期）';
    else if (response.status === 403) hint = '（权限不足或 IP 限制）';
    else if (response.status === 404) hint = '（模型名称不正确或端点不可用）';
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
