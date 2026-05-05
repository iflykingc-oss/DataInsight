/**
 * 审计日志模块
 * 记录所有关键操作，支持安全追溯和合规审计
 */

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'security';
  category: 'auth' | 'data' | 'ai' | 'admin' | 'system' | 'api';
  action: string;
  userId?: number;
  username?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  details?: Record<string, unknown>;
  result: 'success' | 'failure' | 'blocked';
  errorMessage?: string;
  durationMs?: number;
}

interface AuditStorage {
  write(entry: AuditLogEntry): void;
  query(options: AuditQueryOptions): AuditLogEntry[];
}

interface AuditQueryOptions {
  startTime?: string;
  endTime?: string;
  userId?: number;
  category?: string;
  action?: string;
  result?: string;
  limit?: number;
  offset?: number;
}

// 内存存储实现
class MemoryAuditStorage implements AuditStorage {
  private logs: AuditLogEntry[] = [];
  private maxSize = 10000;

  write(entry: AuditLogEntry): void {
    this.logs.push(entry);
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }
  }

  query(options: AuditQueryOptions = {}): AuditLogEntry[] {
    let result = [...this.logs];

    if (options.startTime) {
      result = result.filter(l => l.timestamp >= options.startTime!);
    }
    if (options.endTime) {
      result = result.filter(l => l.timestamp <= options.endTime!);
    }
    if (options.userId) {
      result = result.filter(l => l.userId === options.userId);
    }
    if (options.category) {
      result = result.filter(l => l.category === options.category);
    }
    if (options.action) {
      result = result.filter(l => l.action === options.action);
    }
    if (options.result) {
      result = result.filter(l => l.result === options.result);
    }

    result.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    const offset = options.offset || 0;
    const limit = options.limit || 100;
    return result.slice(offset, offset + limit);
  }
}

let storage: AuditStorage = new MemoryAuditStorage();

export function setAuditStorage(newStorage: AuditStorage): void {
  storage = newStorage;
}

// ============================================================
// 审计日志记录函数
// ============================================================

function createEntry(
  level: AuditLogEntry['level'],
  category: AuditLogEntry['category'],
  action: string,
  result: AuditLogEntry['result'],
  options: {
    userId?: number;
    username?: string;
    ip?: string;
    userAgent?: string;
    resource?: string;
    details?: Record<string, unknown>;
    errorMessage?: string;
    durationMs?: number;
  } = {}
): AuditLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    action,
    result,
    ...options,
  };
}

export function logAuth(
  action: string,
  result: AuditLogEntry['result'],
  options: Omit<Parameters<typeof createEntry>[4], 'userId' | 'username'> & { userId?: number; username?: string } = {}
): void {
  storage.write(createEntry(
    result === 'failure' || result === 'blocked' ? 'security' : 'info',
    'auth',
    action,
    result,
    options
  ));
}

export function logDataAccess(
  action: string,
  result: AuditLogEntry['result'],
  options: Parameters<typeof createEntry>[4] = {}
): void {
  storage.write(createEntry('info', 'data', action, result, options));
}

export function logAIAction(
  action: string,
  result: AuditLogEntry['result'],
  options: Parameters<typeof createEntry>[4] = {}
): void {
  storage.write(createEntry('info', 'ai', action, result, options));
}

export function logAdminAction(
  action: string,
  result: AuditLogEntry['result'],
  options: Parameters<typeof createEntry>[4] = {}
): void {
  storage.write(createEntry('warn', 'admin', action, result, options));
}

export function logSystem(
  action: string,
  result: AuditLogEntry['result'],
  options: Parameters<typeof createEntry>[4] = {}
): void {
  storage.write(createEntry('info', 'system', action, result, options));
}

export function logSecurity(
  action: string,
  result: AuditLogEntry['result'],
  options: Parameters<typeof createEntry>[4] = {}
): void {
  storage.write(createEntry('security', 'system', action, result, options));
}

export function logAPI(
  action: string,
  result: AuditLogEntry['result'],
  options: Parameters<typeof createEntry>[4] = {}
): void {
  storage.write(createEntry('info', 'api', action, result, options));
}

// ============================================================
// 查询接口
// ============================================================

export function queryAuditLogs(options: AuditQueryOptions = {}): AuditLogEntry[] {
  return storage.query(options);
}

export function getRecentSecurityEvents(limit = 50): AuditLogEntry[] {
  return storage.query({ category: 'auth', limit });
}

export function getUserActivity(userId: number, limit = 100): AuditLogEntry[] {
  return storage.query({ userId, limit });
}

export function getFailedLogins(limit = 100): AuditLogEntry[] {
  return storage.query({ category: 'auth', result: 'failure', limit });
}

// ============================================================
// 敏感数据脱敏
// ============================================================

export function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  const sensitiveKeys = ['password', 'passwordHash', 'apiKey', 'secret', 'token', 'credential', 'auth'];

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = sensitiveKeys.some(sk => key.toLowerCase().includes(sk));
    if (isSensitive && typeof value === 'string') {
      masked[key] = value.length > 8 ? `${value.slice(0, 4)}****${value.slice(-4)}` : '****';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveData(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}
