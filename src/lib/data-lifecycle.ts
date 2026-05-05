/**
 * 数据生命周期管理
 * 遵循出海合规：业务数据72小时后自动清理，配置数据保留
 */

const FORM_DATA_PREFIX = 'datainsight_form_';
const FORM_DATA_MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72小时
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 每小时检查一次

/** 业务数据存储项（会被自动清理） */
export const BUSINESS_DATA_KEYS = [
  'uploadedData',
  'parsedDataCache',
  'analysisResultCache',
  'cleanedDataCache',
  'aiGeneratedTable',
  'tempExportData',
  'sessionChatHistory',
  'workflowExecutionResult',
] as const;

/** 配置数据存储项（保留） */
export const CONFIG_DATA_KEYS = [
  'aiModelConfig',
  'userPreferences',
  'uiTheme',
  'sidebarCollapsed',
  'dashboardConfigTemplates',
  'cleanTemplates',
  'customMetrics',
  'alertRules',
  'formConfig',           // 表单配置（不含收集数据）
  'versionHistoryMeta',
  'workflowRuleConfig',   // 工作流规则配置
  'skillPreferences',     // 技能偏好设置
] as const;

/** 检查数据项是否过期 */
function isExpired(timestamp: number, maxAge: number = FORM_DATA_MAX_AGE_MS): boolean {
  return Date.now() - timestamp > maxAge;
}

/** 清理表单收集数据 */
export function cleanupExpiredFormData(): { cleaned: number; remaining: number } {
  let cleaned = 0;
  let remaining = 0;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;

    // 清理表单收集数据（以 datainsight_form_ 开头）
    if (key.startsWith(FORM_DATA_PREFIX)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          const storedAt = data._storedAt || data._timestamp || 0;
          if (isExpired(storedAt)) {
            localStorage.removeItem(key);
            cleaned++;
            continue;
          }
        }
        remaining++;
      } catch {
        // 解析失败，删除
        localStorage.removeItem(key);
        cleaned++;
      }
    }
  }

  return { cleaned, remaining };
}

/** 清理所有过期业务数据 */
export function cleanupExpiredBusinessData(): { cleaned: number } {
  let cleaned = 0;

  for (const key of BUSINESS_DATA_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        const storedAt = data._storedAt || data._timestamp || 0;
        if (isExpired(storedAt)) {
          localStorage.removeItem(key);
          cleaned++;
        }
      }
    } catch {
      localStorage.removeItem(key);
      cleaned++;
    }
  }

  return { cleaned };
}

/** 存储业务数据（自动附加时间戳） */
export function storeBusinessData(key: string, data: unknown): void {
  const payload = {
    ...((typeof data === 'object' && data !== null) ? data : { value: data }),
    _storedAt: Date.now(),
    _ttl: FORM_DATA_MAX_AGE_MS,
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

/** 存储配置数据（不附加TTL） */
export function storeConfigData(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/** 启动定期清理 */
export function startDataLifecycleManager(): () => void {
  // 立即执行一次清理
  const formResult = cleanupExpiredFormData();
  const businessResult = cleanupExpiredBusinessData();
  console.log(`[DataLifecycle] Initial cleanup: ${formResult.cleaned} form entries, ${businessResult.cleaned} business entries removed`);

  // 每小时定时清理
  const interval = setInterval(() => {
    const f = cleanupExpiredFormData();
    const b = cleanupExpiredBusinessData();
    if (f.cleaned > 0 || b.cleaned > 0) {
      console.log(`[DataLifecycle] Scheduled cleanup: ${f.cleaned} form, ${b.cleaned} business entries removed`);
    }
  }, CLEANUP_INTERVAL_MS);

  // 页面可见性变化时检查
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      cleanupExpiredFormData();
      cleanupExpiredBusinessData();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  // 返回清理函数
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

/** 导出数据为文件（让用户下载保存） */
export function exportToFile(data: unknown, filename: string, type: 'json' | 'csv' = 'json'): void {
  let content: string;
  let mimeType: string;

  if (type === 'csv') {
    content = typeof data === 'string' ? data : JSON.stringify(data);
    mimeType = 'text/csv;charset=utf-8;';
  } else {
    content = JSON.stringify(data, null, 2);
    mimeType = 'application/json';
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** 获取数据剩余有效期（小时） */
export function getRemainingHours(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const storedAt = data._storedAt || data._timestamp || 0;
    const elapsed = Date.now() - storedAt;
    const remaining = FORM_DATA_MAX_AGE_MS - elapsed;
    return remaining > 0 ? Math.ceil(remaining / (60 * 60 * 1000)) : 0;
  } catch {
    return null;
  }
}
