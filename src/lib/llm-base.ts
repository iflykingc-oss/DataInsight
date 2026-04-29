import { AIModelConfig, LLMMessage, LLMCallOptions, TokenUsage } from '@/types';

export interface LLMResponse {
  content: string;
  usage?: TokenUsage;
  finishReason?: string;
}

export interface StreamCallback {
  (chunk: string): void;
  onDone?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

export abstract class BaseLLM {
  protected config: AIModelConfig;

  constructor(config: AIModelConfig) {
    this.config = config;
  }

  abstract chat(
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse>;

  abstract chatStream(
    messages: LLMMessage[],
    callback: StreamCallback,
    options?: LLMCallOptions
  ): Promise<void>;

  abstract validateConfig(): { valid: boolean; error?: string };

  getConfig(): AIModelConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<AIModelConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export class OpenAICompatibleLLM extends BaseLLM {
  async chat(
    messages: LLMMessage[],
    options?: LLMCallOptions
  ): Promise<LLMResponse> {
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const cleanBaseUrl = this.config.baseUrl.replace(/\/$/, '');
    const endpoint = `${cleanBaseUrl}/chat/completions`;
    const timeout = options?.timeout ?? this.config.timeout ?? 120000;
    const maxRetries = options?.maxRetries ?? 1;
    const temperature = options?.temperature ?? this.config.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens ?? 4096;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
          },
          body: JSON.stringify({
            model: this.config.model,
            messages,
            temperature,
            max_tokens: maxTokens,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(`API错误 (${response.status}): ${errorBody.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return {
          content: data.choices?.[0]?.message?.content || '',
          usage: data.usage ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          } : undefined,
          finishReason: data.choices?.[0]?.finish_reason,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
          lastError = new Error(`请求超时（${timeout / 1000}秒）`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        if (error instanceof Error) {
          lastError = error;
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          }
        }
        throw error;
      }
    }

    throw lastError || new Error('LLM调用失败');
  }

  async chatStream(
    messages: LLMMessage[],
    callback: StreamCallback,
    options?: LLMCallOptions
  ): Promise<void> {
    const validation = this.validateConfig();
    if (!validation.valid) {
      callback.onError?.(new Error(validation.error));
      return;
    }

    const cleanBaseUrl = this.config.baseUrl.replace(/\/$/, '');
    const endpoint = `${cleanBaseUrl}/chat/completions`;
    const temperature = options?.temperature ?? this.config.temperature ?? 0.7;
    const maxTokens = options?.maxTokens ?? this.config.maxTokens ?? 4096;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(`API错误 (${response.status}): ${errorBody.error?.message || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应流');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                callback(chunk);
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      callback.onDone?.(fullContent);
    } catch (error) {
      callback.onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  validateConfig(): { valid: boolean; error?: string } {
    if (!this.config.apiKey) {
      return { valid: false, error: 'API Key 不能为空' };
    }
    if (!this.config.baseUrl) {
      return { valid: false, error: 'Base URL 不能为空' };
    }
    if (!this.config.model) {
      return { valid: false, error: '模型名称不能为空' };
    }
    return { valid: true };
  }
}

export class LLMFactory {
  private static providers = new Map<string, new (config: AIModelConfig) => BaseLLM>();

  static registerProvider(name: string, provider: new (config: AIModelConfig) => BaseLLM): void {
    this.providers.set(name, provider);
  }

  static createLLM(config: AIModelConfig): BaseLLM {
    if (config.provider === 'custom' || !config.provider) {
      return new OpenAICompatibleLLM(config);
    }

    const ProviderClass = this.providers.get(config.provider);
    if (ProviderClass) {
      return new ProviderClass(config);
    }

    return new OpenAICompatibleLLM(config);
  }

  static getProviderNames(): string[] {
    return ['custom', ...Array.from(this.providers.keys())];
  }
}

LLMFactory.registerProvider('openai', OpenAICompatibleLLM);
LLMFactory.registerProvider('openai-compatible', OpenAICompatibleLLM);
