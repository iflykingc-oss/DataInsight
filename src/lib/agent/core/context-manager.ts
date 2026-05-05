/**
 * 智能体会话上下文管理器
 * 核心约束：零持久化、仅内存态、关页销毁
 */

import type { AgentMessage, AgentContext, SceneContext, AgentRole } from './types';

interface SessionMemory {
  messages: AgentMessage[];
  createdAt: number;
  lastActiveAt: number;
  skillCallHistory: Array<{ skillId: string; success: boolean; timestamp: number }>;
  workflowRuns: Array<{ workflowId: string; status: 'running' | 'completed' | 'failed'; timestamp: number }>;
}

const MAX_SESSION_AGE = 2 * 60 * 60 * 1000; // 2小时会话过期
const MAX_MESSAGES_PER_SESSION = 50;

class ContextManager {
  private sessions = new Map<string, SessionMemory>();
  private globalMessages: AgentMessage[] = [];
  private sceneContexts = new Map<string, SceneContext>();

  /** 创建新会话 */
  createSession(sessionId: string): void {
    this.sessions.set(sessionId, {
      messages: [],
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      skillCallHistory: [],
      workflowRuns: [],
    });
  }

  /** 获取会话上下文 */
  getSession(sessionId: string): SessionMemory | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    // 检查会话过期
    if (Date.now() - session.lastActiveAt > MAX_SESSION_AGE) {
      this.destroySession(sessionId);
      return undefined;
    }

    session.lastActiveAt = Date.now();
    return session;
  }

  /** 追加消息 */
  pushMessage(sessionId: string, message: AgentMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.messages.push(message);
    session.lastActiveAt = Date.now();

    // 限制消息数，避免内存膨胀
    if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
      session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
    }
  }

  /** 记录技能调用 */
  recordSkillCall(sessionId: string, skillId: string, success: boolean): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.skillCallHistory.push({ skillId, success, timestamp: Date.now() });
  }

  /** 记录工作流运行 */
  recordWorkflowRun(sessionId: string, workflowId: string, status: 'running' | 'completed' | 'failed'): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.workflowRuns.push({ workflowId, status, timestamp: Date.now() });
  }

  /** 获取最近消息上下文（用于模型输入） */
  getRecentContext(sessionId: string, limit = 10): AgentMessage[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];
    return session.messages.slice(-limit);
  }

  /** 获取技能调用成功率（用于熔断决策） */
  getSkillSuccessRate(sessionId: string, windowMinutes = 10): number {
    const session = this.sessions.get(sessionId);
    if (!session || session.skillCallHistory.length === 0) return 1;

    const cutoff = Date.now() - windowMinutes * 60 * 1000;
    const recent = session.skillCallHistory.filter(h => h.timestamp > cutoff);
    if (recent.length === 0) return 1;

    const successCount = recent.filter(h => h.success).length;
    return successCount / recent.length;
  }

  /** 销毁会话（关页/切换Tab时调用） */
  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /** 销毁全部会话（页面关闭时） */
  destroyAll(): void {
    this.sessions.clear();
    this.globalMessages = [];
    this.sceneContexts.clear();
  }

  /** 设置场景上下文 */
  setSceneContext(tabId: string, context: SceneContext): void {
    this.sceneContexts.set(tabId, context);
  }

  /** 获取场景上下文 */
  getSceneContext(tabId: string): SceneContext | undefined {
    return this.sceneContexts.get(tabId);
  }

  /** 获取全局消息（跨页面不持久化） */
  getGlobalMessages(): AgentMessage[] {
    return this.globalMessages;
  }

  /** 追加全局消息 */
  pushGlobalMessage(message: AgentMessage): void {
    this.globalMessages.push(message);
    if (this.globalMessages.length > MAX_MESSAGES_PER_SESSION) {
      this.globalMessages = this.globalMessages.slice(-MAX_MESSAGES_PER_SESSION);
    }
  }

  /** 获取内存使用统计 */
  getMemoryStats(): { sessions: number; totalMessages: number; scenes: number } {
    let totalMessages = this.globalMessages.length;
    for (const s of this.sessions.values()) {
      totalMessages += s.messages.length;
    }
    return {
      sessions: this.sessions.size,
      totalMessages,
      scenes: this.sceneContexts.size,
    };
  }

  /** 定期清理过期会话 */
  startCleanup(intervalMs = 5 * 60 * 1000): ReturnType<typeof setInterval> {
    return setInterval(() => {
      const now = Date.now();
      for (const [id, session] of this.sessions) {
        if (now - session.lastActiveAt > MAX_SESSION_AGE) {
          this.destroySession(id);
        }
      }
    }, intervalMs);
  }
}

export const contextManager = new ContextManager();
