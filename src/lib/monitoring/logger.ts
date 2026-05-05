/**
 * 监控日志系统
 * 分级日志、分类记录、本地存储、远程上报
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  userId?: string;
  sessionId?: string;
  traceId?: string;
}

export interface LogFilter {
  levels?: LogLevel[];
  categories?: string[];
  startTime?: number;
  endTime?: number;
  keyword?: string;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  byCategory: Record<string, number>;
  timeRange: { start: number; end: number };
  errorRate: number;
}

const LOG_STORAGE_KEY = 'datainsight_logs';
const MAX_LOCAL_LOGS = 1000;
const LOG_EXPIRE_DAYS = 7;

class Logger {
  private logs: LogEntry[] = [];
  private listeners: Array<(entry: LogEntry) => void> = [];
  private sessionId: string;
  private userId?: string;
  private enableRemote: boolean = false;
  private remoteEndpoint?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadFromStorage();
    this.cleanExpiredLogs();
  }

  private generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================
  // 日志记录
  // ============================================================

  debug(category: string, message: string, data?: Record<string, unknown>): void {
    this.log('debug', category, message, data);
  }

  info(category: string, message: string, data?: Record<string, unknown>): void {
    this.log('info', category, message, data);
  }

  warn(category: string, message: string, data?: Record<string, unknown>): void {
    this.log('warn', category, message, data);
  }

  error(category: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('error', category, message, data, error);
  }

  fatal(category: string, message: string, error?: Error, data?: Record<string, unknown>): void {
    this.log('fatal', category, message, data, error);
  }

  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: Record<string, unknown>,
    error?: Error
  ): void {
    const entry: LogEntry = {
      id: this.generateLogId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      sessionId: this.sessionId,
      userId: this.userId,
      traceId: this.generateTraceId(),
    };

    this.logs.push(entry);

    // 触发监听器
    this.listeners.forEach(listener => listener(entry));

    // 本地存储
    this.saveToStorage();

    // 控制台输出（开发环境）
    if (level === 'error' || level === 'fatal') {
      console.error(`[${level.toUpperCase()}] [${category}] ${message}`, data || '', error || '');
    } else if (level === 'warn') {
      console.warn(`[${level.toUpperCase()}] [${category}] ${message}`, data || '');
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] [${category}] ${message}`, data || '');
    }

    // 远程上报（异步）
    if (this.enableRemote && this.remoteEndpoint) {
      this.reportRemote(entry).catch(console.error);
    }
  }

  // ============================================================
  // 日志查询
  // ============================================================

  query(filter: LogFilter = {}): LogEntry[] {
    let result = [...this.logs];

    // 按级别过滤
    if (filter.levels && filter.levels.length > 0) {
      result = result.filter(log => filter.levels!.includes(log.level));
    }

    // 按分类过滤
    if (filter.categories && filter.categories.length > 0) {
      result = result.filter(log => filter.categories!.includes(log.category));
    }

    // 按时间过滤
    if (filter.startTime) {
      result = result.filter(log => log.timestamp >= filter.startTime!);
    }
    if (filter.endTime) {
      result = result.filter(log => log.timestamp <= filter.endTime!);
    }

    // 按关键词过滤
    if (filter.keyword) {
      const keyword = filter.keyword.toLowerCase();
      result = result.filter(
        log =>
          log.message.toLowerCase().includes(keyword) ||
          log.category.toLowerCase().includes(keyword) ||
          JSON.stringify(log.data || '').toLowerCase().includes(keyword)
      );
    }

    // 排序（按时间倒序）
    result.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    if (filter.offset) {
      result = result.slice(filter.offset);
    }
    if (filter.limit) {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  getStats(filter: LogFilter = {}): LogStats {
    const logs = this.query({ ...filter, limit: undefined, offset: undefined });

    const byLevel: Record<LogLevel, number> = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
      fatal: 0,
    };

    const byCategory: Record<string, number> = {};

    logs.forEach(log => {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    const errorCount = byLevel.error + byLevel.fatal;
    const errorRate = logs.length > 0 ? errorCount / logs.length : 0;

    return {
      total: logs.length,
      byLevel,
      byCategory,
      timeRange: {
        start: logs.length > 0 ? logs[logs.length - 1].timestamp : Date.now(),
        end: logs.length > 0 ? logs[0].timestamp : Date.now(),
      },
      errorRate: Number((errorRate * 100).toFixed(2)),
    };
  }

  // ============================================================
  // 日志管理
  // ============================================================

  clear(): void {
    this.logs = [];
    this.saveToStorage();
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  setRemoteEndpoint(endpoint: string): void {
    this.remoteEndpoint = endpoint;
    this.enableRemote = true;
  }

  disableRemote(): void {
    this.enableRemote = false;
    this.remoteEndpoint = undefined;
  }

  subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // ============================================================
  // 本地存储
  // ============================================================

  private saveToStorage(): void {
    try {
      const logsToSave = this.logs.slice(-MAX_LOCAL_LOGS);
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logsToSave));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(LOG_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load logs from storage:', error);
      this.logs = [];
    }
  }

  private cleanExpiredLogs(): void {
    const expireTime = Date.now() - LOG_EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    this.logs = this.logs.filter(log => log.timestamp > expireTime);
    this.saveToStorage();
  }

  private async reportRemote(entry: LogEntry): Promise<void> {
    if (!this.remoteEndpoint) return;

    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      console.error('Failed to report log to remote:', error);
    }
  }

  // ============================================================
  // 便捷方法
  // ============================================================

  getSessionId(): string {
    return this.sessionId;
  }

  createTimer(category: string, action: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(category, `${action} completed`, { duration });
    };
  }

  logAsync<T>(
    category: string,
    action: string,
    fn: () => Promise<T>
  ): Promise<T> {
    return fn().then(
      result => {
        this.info(category, `${action} succeeded`, { result });
        return result;
      },
      error => {
        this.error(category, `${action} failed`, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    );
  }
}

/** 全局日志实例 */
export const logger = new Logger();

// 便捷导出函数
export const log = {
  debug: (category: string, message: string, data?: Record<string, unknown>) => logger.debug(category, message, data),
  info: (category: string, message: string, data?: Record<string, unknown>) => logger.info(category, message, data),
  warn: (category: string, message: string, data?: Record<string, unknown>) => logger.warn(category, message, data),
  error: (category: string, message: string, error?: Error, data?: Record<string, unknown>) => logger.error(category, message, error, data),
  fatal: (category: string, message: string, error?: Error, data?: Record<string, unknown>) => logger.fatal(category, message, error, data),
  query: (filter?: LogFilter) => logger.query(filter),
  stats: (filter?: LogFilter) => logger.getStats(filter),
  timer: (category: string, action: string) => logger.createTimer(category, action),
  wrapAsync: <T>(category: string, action: string, fn: () => Promise<T>) => logger.logAsync(category, action, fn),
};
