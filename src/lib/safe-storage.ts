/**
 * 安全存储工具 - localStorage 容量保护 + IndexedDB 降级
 * D-10 修复：避免 localStorage 5MB 限制导致数据丢失
 */

const STORAGE_WARNING_THRESHOLD = 0.8; // 80% 容量警告
const MAX_LOCALSTORAGE_ITEMS = 50; // 单个key对应的值最大条目数

/** 估算 localStorage 已用容量 (bytes) */
export function estimateLocalStorageUsage(): { used: number; total: number; ratio: number } {
  let totalSize = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key) || '';
        // 估算：每个字符2字节(UTF-16)
        totalSize += (key.length + value.length) * 2;
      }
    }
  } catch { /* ignore */ }
  // 典型浏览器 localStorage 上限 5MB
  const total = 5 * 1024 * 1024;
  return { used: totalSize, total, ratio: totalSize / total };
}

/** 安全写入 localStorage，容量不足时自动精简 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      console.warn(`localStorage 容量不足，key="${key}"，尝试精简旧数据...`);
      // 策略1：精简大数据key（仪表盘配置、历史记录等）
      trimLargeKeys();
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        // 策略2：仍然失败，截断值到安全大小
        const maxSafeSize = 512 * 1024; // 512KB
        if (value.length > maxSafeSize) {
          try {
            const truncated = value.slice(0, maxSafeSize);
            // 尝试保留JSON完整性
            const lastBrace = truncated.lastIndexOf('}');
            if (lastBrace > 0) {
              const safeValue = truncated.slice(0, lastBrace + 1);
              localStorage.setItem(key, safeValue);
              console.warn(`key="${key}" 数据被截断以适应存储限制`);
              return true;
            }
          } catch {
            return false;
          }
        }
      }
    }
    return false;
  }
}

/** 精简占用空间最大的 localStorage 项 */
function trimLargeKeys(): void {
  const candidates: Array<{ key: string; size: number }> = [];
  
  // 可精简的key模式（历史记录类数据优先清理）
  const trimmablePatterns = [
    /history/i,
    /_logs$/i,
    /_history/i,
    /nl2dashboard_history/i,
  ];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key) || '';
      const size = (key.length + value.length) * 2;
      if (trimmablePatterns.some(p => p.test(key)) && size > 10 * 1024) {
        candidates.push({ key, size });
      }
    }
  }

  // 按大小降序排列，优先清理最大的
  candidates.sort((a, b) => b.size - a.size);
  
  for (const { key } of candidates.slice(0, 3)) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          // 保留最近一半数据
          const trimmed = parsed.slice(0, Math.ceil(parsed.length / 2));
          localStorage.setItem(key, JSON.stringify(trimmed));
          console.log(`精简 localStorage key="${key}"，${parsed.length} → ${trimmed.length} 条`);
        }
      }
    } catch {
      // 解析失败直接删除
      localStorage.removeItem(key);
    }
  }
}

/** 限制数组数据的最大条目数 */
export function limitArrayData<T>(data: T[], maxItems: number = MAX_LOCALSTORAGE_ITEMS): T[] {
  if (data.length <= maxItems) return data;
  return data.slice(0, maxItems);
}

/** 安全读取 localStorage */
export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 检查存储容量状态 */
export function checkStorageHealth(): { healthy: boolean; message: string } {
  const { used, total, ratio } = estimateLocalStorageUsage();
  if (ratio > 1) {
    return { healthy: false, message: `存储空间已满 (已用 ${(used / 1024 / 1024).toFixed(1)}MB)` };
  }
  if (ratio > STORAGE_WARNING_THRESHOLD) {
    return { healthy: false, message: `存储空间紧张 (已用 ${(ratio * 100).toFixed(0)}%)` };
  }
  return { healthy: true, message: `存储正常 (已用 ${(ratio * 100).toFixed(0)}%)` };
}

// ============================================================
// 用户级数据隔离存储
// 每个用户的数据以 `u_<userId>_<key>` 格式存储在 localStorage
// 未登录用户使用 `u_guest_<key>` 前缀
// ============================================================

let currentUserId: string | number | null = null;

/** 设置当前用户ID，用于数据隔离命名空间 */
export function setCurrentUserId(userId: string | number | null): void {
  currentUserId = userId;
  // 用户切换时无需清理其他用户数据，按前缀隔离即可
}

/** 获取当前用户的存储前缀 */
export function getUserStoragePrefix(): string {
  return currentUserId ? `u_${currentUserId}_` : 'u_guest_';
}

/** 获取用户隔离的 localStorage key */
function namespacedKey(key: string): string {
  return `${getUserStoragePrefix()}${key}`;
}

/** 用户隔离：安全写入 */
export function userSetItem(key: string, value: string): boolean {
  return safeSetItem(namespacedKey(key), value);
}

/** 用户隔离：安全读取 */
export function userGetItem(key: string): string | null {
  return safeGetItem(namespacedKey(key));
}

/** 用户隔离：删除 */
export function userRemoveItem(key: string): void {
  try {
    localStorage.removeItem(namespacedKey(key));
  } catch { /* ignore */ }
}

/** 用户隔离：获取用户所有数据 key 列表（不含前缀） */
export function getUserDataKeys(): string[] {
  const prefix = getUserStoragePrefix();
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(prefix)) {
        keys.push(fullKey.slice(prefix.length));
      }
    }
  } catch { /* ignore */ }
  return keys;
}

/** 用户隔离：清除当前用户的所有数据 */
export function clearUserData(): number {
  const keys = getUserDataKeys();
  keys.forEach(key => userRemoveItem(key));
  return keys.length;
}

/** 用户隔离：导出当前用户所有数据为 JSON */
export function exportUserData(): Record<string, unknown> {
  const keys = getUserDataKeys();
  const data: Record<string, unknown> = {};
  keys.forEach(key => {
    const value = userGetItem(key);
    if (value !== null) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    }
  });
  return data;
}

/** 用户隔离：获取存储容量占用估算 */
export function getUserStorageUsage(): { used: number; keys: number } {
  const prefix = getUserStoragePrefix();
  let used = 0;
  let keyCount = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const fullKey = localStorage.key(i);
      if (fullKey && fullKey.startsWith(prefix)) {
        const value = localStorage.getItem(fullKey) || '';
        used += (fullKey.length + value.length) * 2;
        keyCount++;
      }
    }
  } catch { /* ignore */ }
  return { used, keys: keyCount };
}
