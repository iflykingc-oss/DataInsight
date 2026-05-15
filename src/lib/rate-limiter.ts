/**
 * Rate Limiter - 内存级请求频率限制
 * 用于防止暴力破解登录/注册/密码重置等接口
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// 内存存储，key => 限流记录
const store = new Map<string, RateLimitEntry>();

// NOTE: This store is process-local. In serverless/multi-instance deployments
// rate limits reset on cold start. For production, replace with a Redis/Upstash store.

// 定期清理过期记录（每5分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * 检查请求频率是否允许
 * @param key 限流标识（如 'login:user@example.com' 或 'register:192.168.1.1'）
 * @param maxAttempts 最大尝试次数
 * @param windowMs 时间窗口（毫秒）
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 5 * 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    // 新窗口或已过期
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: maxAttempts - 1, resetAt };
  }

  if (entry.count >= maxAttempts) {
    // 已达上限
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  // 未达上限
  entry.count += 1;
  return { allowed: true, remaining: maxAttempts - entry.count, resetAt: entry.resetAt };
}

/**
 * 重置某个 key 的限流计数（登录成功后调用）
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * 获取限流响应的 HTTP 头信息
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    'Retry-After': result.allowed ? '0' : String(Math.ceil((result.resetAt - Date.now()) / 1000)),
  };
}
