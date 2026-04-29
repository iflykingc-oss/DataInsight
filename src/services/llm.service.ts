import {
  AIModelConfig,
  LLMMessage,
  LLMCallOptions,
  LLMCallLog,
  LLMCallStats,
  IntentDetection,
  createSuccessResponse,
  createErrorResponse,
  type ApiResponse
} from '@/types';

const LLM_CALL_LOGS: LLMCallLog[] = [];
const MAX_LOG_SIZE = 100;

function logLLMCall(log: LLMCallLog): void {
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

export function getLLMCallStats(): LLMCallStats {
  const stats: LLMCallStats = {
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

export function validateModelConfig(config: AIModelConfig | undefined): { valid: boolean; error?: string } {
  if (!config) {
    return { valid: false, error: '请先配置 AI 模型' };
  }
  if (!config.apiKey) {
    return { valid: false, error: '请提供 API Key' };
  }
  if (!config.baseUrl) {
    return { valid: false, error: '请提供 Base URL' };
  }
  if (!config.model) {
    return { valid: false, error: '请提供模型名称' };
  }
  return { valid: true };
}

export async function callLLM(
  config: AIModelConfig,
  messages: LLMMessage[],
  options?: LLMCallOptions
): Promise<string> {
  const startTime = Date.now();
  const validation = validateModelConfig(config);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
  const endpoint = `${cleanBaseUrl}/chat/completions`;

  const timeout = options?.timeout ?? config.timeout ?? 120000;
  const maxRetries = options?.maxRetries ?? 1;
  const temperature = options?.temperature ?? config.temperature ?? 0.7;
  const maxTokens = options?.maxTokens ?? config.maxTokens ?? 4096;

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
        else if (response.status === 404) hint = '（模型名称不正确或端点不可用）';
        else if (response.status === 429) hint = '（请求频率超限）';

        throw new Error(`模型调用失败 (HTTP ${response.status}): ${errorMsg} ${hint}`.trim());
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
        lastError = new Error(`模型响应超时（${Math.round(timeout/1000)}秒）`);
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }

      if (error instanceof Error) {
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
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
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

export function detectIntent(question: string): IntentDetection {
  const q = question.toLowerCase();

  const greeting = ['你好', 'hi', 'hello', '嗨', '您好', '在吗', '在不在'];
  if (greeting.some(g => q.includes(g))) {
    return { intent: 'greeting', label: '问候', confidence: 0.95 };
  }

  const command = ['生成报表', '导出', '下载', '保存', '删除', '清除', '重置'];
  if (command.some(c => q.includes(c))) {
    return { intent: 'command', label: '命令执行', confidence: 0.9 };
  }

  const visualization = ['图表', '图', '可视化', '柱状', '折线', '饼图', '显示'];
  if (visualization.some(v => q.includes(v))) {
    return { intent: 'visualization', label: '可视化', confidence: 0.85 };
  }

  const report = ['报表', '报告', '总结', '周报', '月报', '分析报告'];
  if (report.some(r => q.includes(r))) {
    return { intent: 'report', label: '报表生成', confidence: 0.85 };
  }

  const analysis = ['分析', '原因', '为什么', '归因', '比较', '对比', '趋势', '预测'];
  if (analysis.some(a => q.includes(a))) {
    return { intent: 'analysis', label: '深度分析', confidence: 0.8 };
  }

  const query = ['多少', '哪个', '什么', '哪里', '是谁', '找出', '查找', '搜索'];
  if (query.some(qw => q.includes(qw))) {
    return { intent: 'query', label: '数据查询', confidence: 0.75 };
  }

  return { intent: 'unknown', label: '未分类', confidence: 0.5 };
}

export class LLMService {
  private static instance: LLMService;

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  async chat(
    config: AIModelConfig,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<ApiResponse<string>> {
    try {
      const content = await callLLM(config, messages, options);
      return createSuccessResponse(content);
    } catch (error) {
      return createErrorResponse(
        'LLM_ERROR',
        error instanceof Error ? error.message : 'LLM 调用失败'
      );
    }
  }

  async chatStream(
    config: AIModelConfig,
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<Response> {
    const validation = validateModelConfig(config);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanBaseUrl = config.baseUrl.replace(/\/$/, '');
    const endpoint = `${cleanBaseUrl}/chat/completions`;
    const temperature = options?.temperature ?? config.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? config.maxTokens ?? 4096;

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
        stream: true,
      }),
    });

    return response;
  }

  getStats(): LLMCallStats {
    return getLLMCallStats();
  }

  getLogs(): LLMCallLog[] {
    return getLLMCallLogs();
  }

  detectIntent(question: string): IntentDetection {
    return detectIntent(question);
  }
}

export const llmService = LLMService.getInstance();
