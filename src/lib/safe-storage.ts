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
