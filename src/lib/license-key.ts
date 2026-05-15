/**
 * 激活码系统 - 不依赖外部数据库，使用 localStorage + 内存缓存
 * 支持：生成、验证、兑换激活码
 */

export interface LicenseKey {
  code: string;
  planKey: string;
  billingCycle: 'monthly' | 'yearly';
  durationDays: number;
  status: 'active' | 'redeemed' | 'expired';
  createdAt: string;
  redeemedBy?: number;
  redeemedAt?: string;
  redeemedEmail?: string;
}

export interface UserSubscription {
  userId: number;
  planKey: string;
  billingCycle: 'monthly' | 'yearly';
  status: 'active' | 'canceled' | 'expired';
  paymentProvider: 'license' | 'creem' | 'paypal';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  licenseCode?: string;
  updatedAt: string;
}

const LICENSE_KEYS_STORAGE_KEY = 'datainsight_license_keys';
const USER_SUBSCRIPTIONS_STORAGE_KEY = 'datainsight_user_subscriptions';

// ==================== 激活码管理 ====================

/** 生成单个激活码 */
export function generateLicenseCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/** 批量生成激活码 */
export function generateLicenseKeys(
  count: number,
  planKey: string,
  billingCycle: 'monthly' | 'yearly',
  durationDays: number
): LicenseKey[] {
  const existing = getAllLicenseKeys();
  const newKeys: LicenseKey[] = [];

  for (let i = 0; i < count; i++) {
    let code: string;
    do {
      code = generateLicenseCode();
    } while (existing.some(k => k.code === code) || newKeys.some(k => k.code === code));

    newKeys.push({
      code,
      planKey,
      billingCycle,
      durationDays,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
  }

  // 保存到 storage
  const all = [...existing, ...newKeys];
  if (typeof window !== 'undefined') {
    localStorage.setItem(LICENSE_KEYS_STORAGE_KEY, JSON.stringify(all));
  }

  return newKeys;
}

/** 获取所有激活码 */
export function getAllLicenseKeys(): LicenseKey[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LICENSE_KEYS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** 验证激活码是否有效 */
export function validateLicenseCode(code: string): { valid: boolean; license?: LicenseKey; error?: string } {
  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})/g, '$1-').slice(0, 19);
  const keys = getAllLicenseKeys();
  const license = keys.find(k => k.code === cleanCode || k.code === code.toUpperCase().trim());

  if (!license) {
    return { valid: false, error: 'invalid_code' };
  }

  if (license.status === 'redeemed') {
    return { valid: false, error: 'already_redeemed', license };
  }

  // 检查是否过期（生成后90天未使用则过期）
  const createdAt = new Date(license.createdAt);
  const expiryDate = new Date(createdAt.getTime() + 90 * 24 * 60 * 60 * 1000);
  if (new Date() > expiryDate) {
    license.status = 'expired';
    saveLicenseKey(license);
    return { valid: false, error: 'expired', license };
  }

  return { valid: true, license };
}

/** 获取激活码信息（公开接口，不暴露敏感信息） */
export function getLicenseCodeInfo(code: string): {
  exists: boolean;
  status?: string;
  planKey?: string;
  billingCycle?: string;
  durationDays?: number;
  redeemedAt?: string;
  redeemedBy?: number;
  error?: string;
} {
  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/(.{4})/g, '$1-').slice(0, 19);
  const keys = getAllLicenseKeys();
  const license = keys.find(k => k.code === cleanCode || k.code === code.toUpperCase().trim());

  if (!license) {
    return { exists: false, error: 'invalid_code' };
  }

  return {
    exists: true,
    status: license.status,
    planKey: license.planKey,
    billingCycle: license.billingCycle,
    durationDays: license.durationDays,
    redeemedAt: license.redeemedAt,
    redeemedBy: license.redeemedBy,
  };
}

/** 兑换激活码 */
export function redeemLicenseCode(
  code: string,
  userId: number,
  userEmail?: string
): { success: boolean; subscription?: UserSubscription; error?: string } {
  const validation = validateLicenseCode(code);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const license = validation.license!;
  license.status = 'redeemed';
  license.redeemedBy = userId;
  license.redeemedAt = new Date().toISOString();
  license.redeemedEmail = userEmail;
  saveLicenseKey(license);

  // 创建用户订阅
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + license.durationDays * 24 * 60 * 60 * 1000);

  const subscription: UserSubscription = {
    userId,
    planKey: license.planKey,
    billingCycle: license.billingCycle,
    status: 'active',
    paymentProvider: 'license',
    currentPeriodStart: startDate.toISOString(),
    currentPeriodEnd: endDate.toISOString(),
    licenseCode: license.code,
    updatedAt: new Date().toISOString(),
  };

  saveUserSubscription(subscription);

  return { success: true, subscription };
}

/** 保存单个激活码 */
function saveLicenseKey(license: LicenseKey): void {
  if (typeof window === 'undefined') return;
  const keys = getAllLicenseKeys();
  const index = keys.findIndex(k => k.code === license.code);
  if (index >= 0) {
    keys[index] = license;
  }
  localStorage.setItem(LICENSE_KEYS_STORAGE_KEY, JSON.stringify(keys));
}

// ==================== 用户订阅管理 ====================

/** 获取用户订阅 */
export function getUserSubscription(userId: number): UserSubscription | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_SUBSCRIPTIONS_STORAGE_KEY);
    const subs: UserSubscription[] = raw ? JSON.parse(raw) : [];
    const sub = subs.find(s => s.userId === userId);

    if (!sub) return null;

    // 检查是否过期
    if (sub.status === 'active' && new Date() > new Date(sub.currentPeriodEnd)) {
      sub.status = 'expired';
      sub.updatedAt = new Date().toISOString();
      saveUserSubscription(sub);
    }

    return sub;
  } catch {
    return null;
  }
}

/** 保存用户订阅 */
export function saveUserSubscription(subscription: UserSubscription): void {
  if (typeof window === 'undefined') return;
  const raw = localStorage.getItem(USER_SUBSCRIPTIONS_STORAGE_KEY);
  const subs: UserSubscription[] = raw ? JSON.parse(raw) : [];
  const index = subs.findIndex(s => s.userId === subscription.userId);
  if (index >= 0) {
    subs[index] = subscription;
  } else {
    subs.push(subscription);
  }
  localStorage.setItem(USER_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subs));
}

/** 获取用户当前生效的 planKey（考虑过期） */
export function getUserEffectivePlan(userId: number): string {
  const sub = getUserSubscription(userId);
  if (!sub || sub.status !== 'active') return 'free';
  return sub.planKey;
}

/** 取消用户订阅（降级到 free） */
export function cancelUserSubscription(userId: number): boolean {
  const sub = getUserSubscription(userId);
  if (!sub) return false;
  sub.status = 'canceled';
  sub.planKey = 'free';
  sub.updatedAt = new Date().toISOString();
  saveUserSubscription(sub);
  return true;
}

/** 检查所有订阅并自动降级过期的 */
export function checkAndExpireSubscriptions(): number {
  if (typeof window === 'undefined') return 0;
  const raw = localStorage.getItem(USER_SUBSCRIPTIONS_STORAGE_KEY);
  const subs: UserSubscription[] = raw ? JSON.parse(raw) : [];
  let expiredCount = 0;
  const now = new Date();

  for (const sub of subs) {
    if (sub.status === 'active' && now > new Date(sub.currentPeriodEnd)) {
      sub.status = 'expired';
      sub.planKey = 'free';
      sub.updatedAt = now.toISOString();
      expiredCount++;
    }
  }

  if (expiredCount > 0) {
    localStorage.setItem(USER_SUBSCRIPTIONS_STORAGE_KEY, JSON.stringify(subs));
  }

  return expiredCount;
}
