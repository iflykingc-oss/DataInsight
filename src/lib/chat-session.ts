import { ChatSession, ChatSessionSummary, LLMMessage, AIModelConfig, createSuccessResponse, createErrorResponse, type ApiResponse } from '@/types';

const STORAGE_KEY = 'datainsight_chat_sessions';
const MAX_SESSIONS = 50;
const MAX_CONTEXT_MESSAGES = 50;

export interface SessionCreateOptions {
  title?: string;
  modelConfig?: AIModelConfig;
  contextWindow?: number;
}

export class ChatSessionManager {
  private static instance: ChatSessionManager;
  private sessions: Map<string, ChatSession> = new Map();
  private currentSessionId: string | null = null;

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): ChatSessionManager {
    if (!ChatSessionManager.instance) {
      ChatSessionManager.instance = new ChatSessionManager();
    }
    return ChatSessionManager.instance;
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const sessions: ChatSession[] = JSON.parse(stored);
        this.sessions = new Map(sessions.map(s => [s.id, s]));
      }
    } catch (error) {
      console.error('[ChatSessionManager] 加载会话失败:', error);
    }
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const sessions = Array.from(this.sessions.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.error('[ChatSessionManager] 保存会话失败:', error);
    }
  }

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private trimContext(messages: LLMMessage[], maxMessages: number): LLMMessage[] {
    if (messages.length <= maxMessages) return messages;

    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');

    const trimmedOthers = otherMessages.slice(-maxMessages);
    return [...systemMessages, ...trimmedOthers];
  }

  create(options: SessionCreateOptions = {}): ChatSession {
    const id = this.generateId();
    const now = new Date().toISOString();

    const session: ChatSession = {
      id,
      title: options.title || `新会话 ${new Date().toLocaleString('zh-CN')}`,
      messages: [],
      createdAt: now,
      updatedAt: now,
      modelConfig: options.modelConfig,
      contextWindow: options.contextWindow || MAX_CONTEXT_MESSAGES,
    };

    this.sessions.set(id, session);
    this.currentSessionId = id;
    this.enforceMaxSessions();
    this.saveToStorage();

    return session;
  }

  get(id: string): ChatSession | undefined {
    return this.sessions.get(id);
  }

  getCurrent(): ChatSession | undefined {
    if (!this.currentSessionId) return undefined;
    return this.sessions.get(this.currentSessionId);
  }

  setCurrent(id: string): boolean {
    if (!this.sessions.has(id)) return false;
    this.currentSessionId = id;
    return true;
  }

  list(): ChatSessionSummary[] {
    return Array.from(this.sessions.values())
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map(s => ({
        id: s.id,
        title: s.title,
        preview: s.messages[s.messages.length - 1]?.content.slice(0, 50) || '',
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
        messageCount: s.messages.length,
      }));
  }

  addMessage(sessionId: string, message: LLMMessage): ApiResponse<ChatSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return createErrorResponse('SESSION_NOT_FOUND', '会话不存在');
    }

    session.messages.push(message);
    session.updatedAt = new Date().toISOString();

    if (message.role === 'user' && session.messages.filter(m => m.role === 'user').length === 1) {
      session.title = message.content.slice(0, 30) + (message.content.length > 30 ? '...' : '');
    }

    const maxMessages = session.contextWindow || MAX_CONTEXT_MESSAGES;
    session.messages = this.trimContext(session.messages, maxMessages);

    this.saveToStorage();
    return createSuccessResponse(session);
  }

  updateTitle(sessionId: string, title: string): ApiResponse<ChatSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return createErrorResponse('SESSION_NOT_FOUND', '会话不存在');
    }

    session.title = title;
    session.updatedAt = new Date().toISOString();
    this.saveToStorage();

    return createSuccessResponse(session);
  }

  delete(id: string): ApiResponse<boolean> {
    if (!this.sessions.has(id)) {
      return createErrorResponse('SESSION_NOT_FOUND', '会话不存在');
    }

    this.sessions.delete(id);

    if (this.currentSessionId === id) {
      this.currentSessionId = null;
    }

    this.saveToStorage();
    return createSuccessResponse(true);
  }

  clear(): ApiResponse<boolean> {
    this.sessions.clear();
    this.currentSessionId = null;
    this.saveToStorage();
    return createSuccessResponse(true);
  }

  private enforceMaxSessions(): void {
    if (this.sessions.size <= MAX_SESSIONS) return;

    const sorted = Array.from(this.sessions.entries())
      .sort((a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime());

    const toDelete = sorted.slice(MAX_SESSIONS);
    for (const [id] of toDelete) {
      this.sessions.delete(id);
    }
  }

  exportSession(id: string): ApiResponse<string> {
    const session = this.sessions.get(id);
    if (!session) {
      return createErrorResponse('SESSION_NOT_FOUND', '会话不存在');
    }

    return createSuccessResponse(JSON.stringify(session, null, 2));
  }

  importSession(jsonString: string): ApiResponse<ChatSession> {
    try {
      const session: ChatSession = JSON.parse(jsonString);
      session.id = this.generateId();
      session.createdAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();

      this.sessions.set(session.id, session);
      this.saveToStorage();

      return createSuccessResponse(session);
    } catch {
      return createErrorResponse('IMPORT_FAILED', '会话导入失败，JSON格式无效');
    }
  }

  getStats(): { totalSessions: number; totalMessages: number; oldestSession?: string } {
    let totalMessages = 0;
    let oldestSession: string | undefined;

    for (const session of this.sessions.values()) {
      totalMessages += session.messages.length;
      if (!oldestSession || new Date(session.createdAt) < new Date(oldestSession)) {
        oldestSession = session.createdAt;
      }
    }

    return {
      totalSessions: this.sessions.size,
      totalMessages,
      oldestSession,
    };
  }
}

export const chatSessionManager = ChatSessionManager.getInstance();
