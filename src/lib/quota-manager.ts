/**
 * 配额管理系统 - 基于 localStorage 的使用量追踪
 * 每个用户按功能键记录使用次数，支持日/月维度重置
 */

export interface QuotaRecord {
  userId: number;
  feature: string;
  count: number;
  period: string; // YYYY-MM-DD 或 YYYY-MM
  updatedAt: string;
}

export interface QuotaConfig {
  dailyLimit: number;
  monthlyLimit: number;
  unlimited?: boolean;
}

// 功能配额配置（按 planKey）
export const QUOTA_CONFIG: Record<string, Record<string, QuotaConfig>> = {
  free: {
    ai_insight: { dailyLimit: 10, monthlyLimit: 50 },
    ai_field: { dailyLimit: 5, monthlyLimit: 20 },
    ai_formula: { dailyLimit: 5, monthlyLimit: 20 },
    ai_table_builder: { dailyLimit: 3, monthlyLimit: 10 },
    export: { dailyLimit: 3, monthlyLimit: 10 },
    dashboard_create: { dailyLimit: 1, monthlyLimit: 3 },
    sql_query: { dailyLimit: 10, monthlyLimit: 30 },
    data_story: { dailyLimit: 2, monthlyLimit: 5 },
    nl2dashboard: { dailyLimit: 1, monthlyLimit: 3 },
    industry_detect: { dailyLimit: 3, monthlyLimit: 10 },
    metric_ai: { dailyLimit: 3, monthlyLimit: 10 },
  },
  pro: {
    ai_insight: { dailyLimit: 100, monthlyLimit: 500 },
    ai_field: { dailyLimit: 50, monthlyLimit: 200 },
    ai_formula: { dailyLimit: 50, monthlyLimit: 200 },
    ai_table_builder: { dailyLimit: 20, monthlyLimit: 100 },
    export: { dailyLimit: 50, monthlyLimit: 200 },
    dashboard_create: { dailyLimit: 10, monthlyLimit: 50 },
    sql_query: { dailyLimit: 100, monthlyLimit: 500 },
    data_story: { dailyLimit: 20, monthlyLimit: 50 },
    nl2dashboard: { dailyLimit: 10, monthlyLimit: 50 },
    industry_detect: { dailyLimit: 20, monthlyLimit: 50 },
    metric_ai: { dailyLimit: 20, monthlyLimit: 50 },
  },
  business: {
    ai_insight: { dailyLimit: 500, monthlyLimit: 3000, unlimited: true },
    ai_field: { dailyLimit: 200, monthlyLimit: 1000, unlimited: true },
    ai_formula: { dailyLimit: 200, monthlyLimit: 1000, unlimited: true },
    ai_table_builder: { dailyLimit: 100, monthlyLimit: 500, unlimited: true },
    export: { dailyLimit: 200, monthlyLimit: 1000, unlimited: true },
    dashboard_create: { dailyLimit: 50, monthlyLimit: 300, unlimited: true },
    sql_query: { dailyLimit: 500, monthlyLimit: 3000, unlimited: true },
    data_story: { dailyLimit: 100, monthlyLimit: 500, unlimited: true },
    nl2dashboard: { dailyLimit: 50, monthlyLimit: 300, unlimited: true },
    industry_detect: { dailyLimit: 100, monthlyLimit: 500, unlimited: true },
    metric_ai: { dailyLimit: 100, monthlyLimit: 500, unlimited: true },
  },
};

const QUOTA_STORAGE_KEY = 'datainsight_quota_records';

// ==================== 配额查询 ====================

/** 获取用户某项功能的当前使用量 */
export function getQuotaUsage(userId: number, feature: string): {
  daily: number;
  monthly: number;
  dailyLimit: number;
  monthlyLimit: number;
  unlimited: boolean;
  planKey: string;
} {
  const { getUserEffectivePlan } = require('./license-key');
  const planKey = getUserEffectivePlan(userId);
  const config = QUOTA_CONFIG[planKey]?.[feature] || QUOTA_CONFIG.free[feature];

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const records = getQuotaRecords();
  const dailyRecord = records.find(
    r => r.userId === userId && r.feature === feature && r.period === today
  );
  const monthlyRecord = records.find(
    r => r.userId === userId && r.feature === feature && r.period === thisMonth
  );

  return {
    daily: dailyRecord?.count || 0,
    monthly: monthlyRecord?.count || 0,
    dailyLimit: config.dailyLimit,
    monthlyLimit: config.monthlyLimit,
    unlimited: !!config.unlimited && planKey === 'business',
    planKey,
  };
}

/** 检查用户是否有配额使用某项功能 */
export function checkQuota(userId: number, feature: string): {
  allowed: boolean;
  reason?: string;
  remaining: { daily: number; monthly: number };
} {
  const usage = getQuotaUsage(userId, feature);

  if (usage.unlimited) {
    return { allowed: true, remaining: { daily: 999999, monthly: 999999 } };
  }

  const remainingDaily = usage.dailyLimit - usage.daily;
  const remainingMonthly = usage.monthlyLimit - usage.monthly;

  if (remainingDaily <= 0) {
    return {
      allowed: false,
      reason: 'daily_limit_exceeded',
      remaining: { daily: 0, monthly: remainingMonthly },
    };
  }

  if (remainingMonthly <= 0) {
    return {
      allowed: false,
      reason: 'monthly_limit_exceeded',
      remaining: { daily: remainingDaily, monthly: 0 },
    };
  }

  return {
    allowed: true,
    remaining: { daily: remainingDaily, monthly: remainingMonthly },
  };
}

/** 记录一次功能使用 */
export function incrementQuota(userId: number, feature: string): void {
  if (typeof window === 'undefined') return;

  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const records = getQuotaRecords();

  // 更新日配额
  const dailyIndex = records.findIndex(
    r => r.userId === userId && r.feature === feature && r.period === today
  );
  if (dailyIndex >= 0) {
    records[dailyIndex].count += 1;
    records[dailyIndex].updatedAt = new Date().toISOString();
  } else {
    records.push({
      userId,
      feature,
      count: 1,
      period: today,
      updatedAt: new Date().toISOString(),
    });
  }

  // 更新月配额
  const monthlyIndex = records.findIndex(
    r => r.userId === userId && r.feature === feature && r.period === thisMonth
  );
  if (monthlyIndex >= 0) {
    records[monthlyIndex].count += 1;
    records[monthlyIndex].updatedAt = new Date().toISOString();
  } else {
    records.push({
      userId,
      feature,
      count: 1,
      period: thisMonth,
      updatedAt: new Date().toISOString(),
    });
  }

  localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(records));
}

/** 获取用户的所有配额信息 */
export function getAllQuotas(userId: number): Record<string, ReturnType<typeof getQuotaUsage>> {
  const features = Object.keys(QUOTA_CONFIG.free);
  const result: Record<string, ReturnType<typeof getQuotaUsage>> = {};
  for (const feature of features) {
    result[feature] = getQuotaUsage(userId, feature);
  }
  return result;
}

// ==================== 内部工具 ====================

function getQuotaRecords(): QuotaRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUOTA_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 清理过期配额记录（保留最近90天） */
export function cleanupOldQuotaRecords(): void {
  if (typeof window === 'undefined') return;
  const records = getQuotaRecords();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const filtered = records.filter(r => r.period >= cutoffStr);
  localStorage.setItem(QUOTA_STORAGE_KEY, JSON.stringify(filtered));
}
