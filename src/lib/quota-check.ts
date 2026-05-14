/**
 * Quota Check Utility
 * Checks if user has remaining quota for a given feature.
 * Works in both client and server environments.
 */

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number;
  unlimited: boolean;
  message?: string;
}

export const QUOTA_KEYS = [
  'ai_call',
  'export',
  'dashboard',
  'table',
  'ai_field',
  'ai_formula',
  'data_story',
  'nl2dashboard',
  'custom_metric',
  'data_cleaning',
  'sql_lab',
] as const;

export type QuotaKey = typeof QUOTA_KEYS[number];

const PLAN_LIMITS: Record<string, Record<string, number>> = {
  free: {
    ai_call: 20,
    export: 10,
    dashboard: 1,
    table: 3,
    ai_field: 0,
    ai_formula: 0,
    data_story: 0,
    nl2dashboard: 0,
    custom_metric: 0,
    data_cleaning: 0,
    sql_lab: 0,
  },
  pro: {
    ai_call: 500,
    export: 100,
    dashboard: 10,
    table: 50,
    ai_field: 200,
    ai_formula: 100,
    data_story: 10,
    nl2dashboard: 10,
    custom_metric: 20,
    data_cleaning: 50,
    sql_lab: 1,
  },
  business: {
    ai_call: -1,
    export: -1,
    dashboard: -1,
    table: -1,
    ai_field: -1,
    ai_formula: -1,
    data_story: -1,
    nl2dashboard: -1,
    custom_metric: -1,
    data_cleaning: -1,
    sql_lab: -1,
  },
};

function getLocalQuota(userId: number, key: QuotaKey): { used: number; limit: number; unlimited: boolean } | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`datainsight_quota_${userId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const q = data[key];
    if (!q) return null;
    return { used: q.used || 0, limit: q.limit ?? 0, unlimited: q.unlimited ?? false };
  } catch {
    return null;
  }
}

function getPlanLimit(planKey: string, feature: string): number | null {
  const plan = PLAN_LIMITS[planKey] || PLAN_LIMITS.free;
  const v = plan[feature];
  if (v === undefined) return null;
  return v;
}

/**
 * Check quota for a user and feature.
 * On client: checks localStorage first, falls back to plan limits.
 * On server: only checks plan limits (call count must be tracked client-side or via API).
 */
export function checkQuota(
  userId: number,
  planKey: string,
  feature: QuotaKey
): QuotaResult {
  // Try localStorage first (client-side only)
  const local = getLocalQuota(userId, feature);
  if (local) {
    if (local.unlimited) {
      return { allowed: true, used: local.used, limit: local.limit, unlimited: true };
    }
    if (local.limit <= 0) {
      return { allowed: false, used: local.used, limit: 0, unlimited: false, message: '当前套餐不支持此功能，请升级' };
    }
    if (local.used >= local.limit) {
      return { allowed: false, used: local.used, limit: local.limit, unlimited: false, message: '本月配额已用完，请升级套餐或下月再试' };
    }
    return { allowed: true, used: local.used, limit: local.limit, unlimited: false };
  }

  // Fallback to plan limits (works on both client and server)
  const limit = getPlanLimit(planKey, feature);
  if (limit === null) {
    return { allowed: true, used: 0, limit: 0, unlimited: true };
  }
  if (limit < 0) {
    return { allowed: true, used: 0, limit: 0, unlimited: true };
  }
  if (limit === 0) {
    return { allowed: false, used: 0, limit: 0, unlimited: false, message: '当前套餐不支持此功能，请升级' };
  }

  return { allowed: true, used: 0, limit, unlimited: false };
}

export function incrementQuota(userId: number, feature: QuotaKey): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const key = `datainsight_quota_${userId}`;
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[feature]) {
      data[feature] = { used: 0, limit: 0, unlimited: false };
    }
    data[feature].used = (data[feature].used || 0) + 1;
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}
