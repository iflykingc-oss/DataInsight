/**
 * 数据生命周期管理
 * 遵循出海合规：业务数据72小时后自动清理，配置数据保留
 */

const FORM_DATA_PREFIX = 'datainsight_form_';
const FORM_DATA_MAX_AGE_MS = 72 * 60 * 60 * 1000; // 72小时
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 每小时检查一次

/** 已知业务数据 localStorage key（会被自动清理） */
export const BUSINESS_STORAGE_KEYS = [
  'datainsight-tables',           // 用户上传的表格数据
  'datainsight-table-history',    // 建表历史
  'datainsight-table-favorites',  // 收藏表格
  'datainsight-ai-sessions',      // AI对话历史（旧组件）
  'datainsight-form-submissions', // 表单收集数据
  'datainsight-comments',         // 行内评论
  'datainsight-relations',        // 关联表数据
  'datainsight-field-results',    // AI字段执行结果
] as const;

/** 已知配置数据 localStorage key（保留，不清理） */
export const CONFIG_STORAGE_KEYS = [
  'datainsight_token',            // 登录态
  'datainsight-model-config',     // AI模型配置
  'datainsight_ai_models',        // AI模型列表
  'datainsight-darkmode',         // 主题
  'ai-assistant-position',        // 助手位置
  'datainsight_guide_completed',  // 引导完成状态
  'datainsight_tip_dismissed',    // 提示关闭状态
  'datainsight-dashboard-configs',// 仪表盘配置
  'datainsight-clean-templates',  // 清洗模板
  'datainsight-app-blocks',       // 应用构建器配置
  'datainsight_custom_metrics',   // 自定义指标
  'datainsight-permissions',      // 权限配置
  'datainsight-alerts-rules',     // 告警规则
  'datainsight-alerts-history',   // 告警历史
  'datainsight-alerts-config',    // 告警渠道配置
  'nl2dashboard_history_v2',      // NL2Dashboard历史
  'datainsight-forms',            // 表单配置
  'datainsight-model-prefs',      // 模型偏好
] as const;

/** 检查数据项是否过期 */
function isExpired(timestamp: number, maxAge: number = FORM_DATA_MAX_AGE_MS): boolean {
  return Date.now() - timestamp > maxAge;
}

/** 判断一个 localStorage key 是否为业务数据 */
export function isBusinessDataKey(key: string): boolean {
  // 精确匹配已知业务数据key
  if (BUSINESS_STORAGE_KEYS.includes(key as (typeof BUSINESS_STORAGE_KEYS)[number])) {
    return true;
  }
  // 表单收集数据前缀
  if (key.startsWith(FORM_DATA_PREFIX)) {
    return true;
  }
  // 带有业务数据标记
  if (key.startsWith('__biz__')) {
    return true;
  }
  return false;
}

/** 判断一个 localStorage key 是否为配置数据 */
export function isConfigDataKey(key: string): boolean {
  return CONFIG_STORAGE_KEYS.includes(key as (typeof CONFIG_STORAGE_KEYS)[number]);
}

/** 清理表单收集数据 */
export function cleanupExpiredFormData(): { cleaned: number; remaining: number } {
  let cleaned = 0;
  let remaining = 0;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;

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
        localStorage.removeItem(key);
        cleaned++;
      }
    }
  }

  return { cleaned, remaining };
}

/** 清理已知业务数据键 */
export function cleanupExpiredBusinessData(): { cleaned: number } {
  let cleaned = 0;

  for (const key of BUSINESS_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        // 检查是否有时间戳标记
        const storedAt = data._storedAt || data._timestamp || 0;
        if (storedAt === 0) {
          // 旧数据没有标记，直接删除（强制合规）
          localStorage.removeItem(key);
          cleaned++;
          continue;
        }
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

/** 扫描并清理所有带业务数据标记的项 */
export function cleanupAllBusinessData(): { cleaned: number } {
  let cleaned = 0;

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;

    if (isBusinessDataKey(key)) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const data = JSON.parse(raw);
          const storedAt = data._storedAt || data._timestamp || 0;
          if (storedAt === 0 || isExpired(storedAt)) {
            localStorage.removeItem(key);
            cleaned++;
          }
        } else {
          localStorage.removeItem(key);
          cleaned++;
        }
      } catch {
        localStorage.removeItem(key);
        cleaned++;
      }
    }
  }

  return { cleaned };
}

/** 存储业务数据（自动附加时间戳和TTL标记） */
export function storeBusinessData(key: string, data: unknown): void {
  const payload = {
    ...((typeof data === 'object' && data !== null) ? data : { value: data }),
    _storedAt: Date.now(),
    _ttl: FORM_DATA_MAX_AGE_MS,
    _isBusinessData: true,
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

/** 存储配置数据（不附加TTL） */
export function storeConfigData(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

/** 读取业务数据（同时检查是否过期） */
export function readBusinessData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const storedAt = data._storedAt || data._timestamp || 0;
    if (storedAt && isExpired(storedAt)) {
      localStorage.removeItem(key);
      return null;
    }
    // 返回去掉标记的原始数据
    const { _storedAt, _ttl, _timestamp, _isBusinessData, ...rest } = data;
    return rest as T;
  } catch {
    return null;
  }
}

/** 启动定期清理 */
export function startDataLifecycleManager(): () => void {
  // 立即执行一次清理
  const formResult = cleanupExpiredFormData();
  const businessResult = cleanupExpiredBusinessData();
  const scanResult = cleanupAllBusinessData();
  console.log(
    `[DataLifecycle] Initial cleanup: ${formResult.cleaned} form, ${businessResult.cleaned} business, ${scanResult.cleaned} scanned entries removed`
  );

  // 每小时定时清理
  const interval = setInterval(() => {
    const f = cleanupExpiredFormData();
    const b = cleanupExpiredBusinessData();
    const s = cleanupAllBusinessData();
    if (f.cleaned > 0 || b.cleaned > 0 || s.cleaned > 0) {
      console.log(
        `[DataLifecycle] Scheduled cleanup: ${f.cleaned} form, ${b.cleaned} business, ${s.cleaned} scanned entries removed`
      );
    }
  }, CLEANUP_INTERVAL_MS);

  // 页面可见性变化时检查
  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      cleanupExpiredFormData();
      cleanupExpiredBusinessData();
      cleanupAllBusinessData();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  // 返回清理函数
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibility);
  };
}

/** D-15 修复：检查即将过期的业务数据，返回预警信息 */
export function checkTTLWarning(): { hasWarning: boolean; items: Array<{ key: string; remainingHours: number }> } {
  const WARNING_THRESHOLD_MS = 12 * 60 * 60 * 1000; // 剩余12小时内预警
  const items: Array<{ key: string; remainingHours: number }> = [];

  for (const key of BUSINESS_STORAGE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const data = JSON.parse(raw);
        const storedAt = data._storedAt || data._timestamp || 0;
        if (storedAt > 0) {
          const elapsed = Date.now() - storedAt;
          const remaining = FORM_DATA_MAX_AGE_MS - elapsed;
          if (remaining > 0 && remaining < WARNING_THRESHOLD_MS) {
            items.push({ key, remainingHours: Math.round(remaining / (60 * 60 * 1000) * 10) / 10 });
          }
        }
      }
    } catch { /* ignore */ }
  }

  return { hasWarning: items.length > 0, items };
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

/** 获取所有业务数据项的剩余时间报告 */
export function getBusinessDataReport(): Array<{ key: string; remainingHours: number | null }> {
  const report: Array<{ key: string; remainingHours: number | null }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && isBusinessDataKey(key)) {
      report.push({ key, remainingHours: getRemainingHours(key) });
    }
  }
  return report;
}
