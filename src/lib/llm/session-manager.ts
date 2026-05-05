/**
 * 统一会话管理器
 * 解决各 AI 组件各自管理 history 的问题，提供统一的会话上下文管理
 * 支持多轮连续分析，记忆历史操作与数据
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export class LLMSession {
  readonly id: string;
  private messages: ChatMessage[] = [];
  private maxHistoryLength: number = 20;
  private metadata: Map<string, unknown> = new Map();

  constructor(id?: string, maxHistoryLength?: number) {
    this.id = id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (maxHistoryLength && maxHistoryLength > 0) {
      this.maxHistoryLength = maxHistoryLength;
    }
  }

  /** 添加一条消息 */
  addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.push({ role, content, timestamp: Date.now() });
    // 限制历史长度，避免 token 超限
    if (this.messages.length > this.maxHistoryLength) {
      this.messages = this.messages.slice(-this.maxHistoryLength);
    }
  }

  /** 获取历史消息列表 */
  getHistory(): ChatMessage[] {
    return [...this.messages];
  }

  /** 转为 OpenAI 格式消息列表（不含 system prompt，由调用方添加） */
  getHistoryAsOpenAIMessages(): Array<{ role: 'user' | 'assistant'; content: string }> {
    return this.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /** 获取消息数量 */
  getMessageCount(): number {
    return this.messages.length;
  }

  /** 清空历史 */
  clearHistory(): void {
    this.messages = [];
  }

  /** 存储会话级元数据（如当前分析的数据摘要） */
  setMetadata(key: string, value: unknown): void {
    this.metadata.set(key, value);
  }

  /** 获取会话级元数据 */
  getMetadata<T = unknown>(key: string): T | undefined {
    return this.metadata.get(key) as T | undefined;
  }

  /** 获取最后一条用户消息 */
  getLastUserMessage(): string | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'user') return this.messages[i].content;
    }
    return undefined;
  }

  /** 获取最后一条助手消息 */
  getLastAssistantMessage(): string | undefined {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === 'assistant') return this.messages[i].content;
    }
    return undefined;
  }
}

/**
 * 全局会话管理器
 * 管理所有活跃的 LLM 会话，支持按 ID 检索和自动清理
 */
class SessionManager {
  private sessions: Map<string, LLMSession> = new Map();
  private maxSessions: number = 50;

  /** 创建新会话 */
  createSession(id?: string, maxHistoryLength?: number): LLMSession {
    const session = new LLMSession(id, maxHistoryLength);
    this.sessions.set(session.id, session);

    // 超过上限时清理最早的会话
    if (this.sessions.size > this.maxSessions) {
      const oldestKey = this.sessions.keys().next().value;
      if (oldestKey) this.sessions.delete(oldestKey);
    }

    return session;
  }

  /** 获取会话 */
  getSession(id: string): LLMSession | undefined {
    return this.sessions.get(id);
  }

  /** 获取或创建会话 */
  getOrCreateSession(id: string, maxHistoryLength?: number): LLMSession {
    const existing = this.sessions.get(id);
    if (existing) return existing;
    return this.createSession(id, maxHistoryLength);
  }

  /** 销毁会话 */
  destroySession(id: string): void {
    this.sessions.delete(id);
  }

  /** 销毁所有会话 */
  destroyAllSessions(): void {
    this.sessions.clear();
  }

  /** 获取活跃会话数量 */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

/** 单例导出 */
export const sessionManager = new SessionManager();
