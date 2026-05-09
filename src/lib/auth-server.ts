/**
 * 认证服务端持久化存储 - Supabase 版本
 * 仅由API路由导入，不进入客户端bundle
 *
 * 生产环境使用 Supabase PostgreSQL 存储，支持水平扩展
 * - 用户账号、登录日志、使用统计、AI配置
 * - JWT 签名仍在本机执行（密钥由环境变量控制）
 */

import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import {
  type Role,
  type User,
  type UserPermissions,
  type LoginLog,
  type AuthStorage,
  type UsageStat,
  type AIConfig,
  setAuthStorage,
  ROLE_TEMPLATES,
} from './auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { users, loginLogs, usageStats, adminAiConfig } from '@/storage/database/shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';

// ==================== 类型映射 ====================

/** 数据库行 → TypeScript User */
function mapDbToUser(row: Record<string, unknown>): User {
  // 字段名映射: DB snake_case → TS camelCase
  const role = (row.role as string) === 'member' ? 'editor' : (row.role as string);
  const permissions = (row.permissions as UserPermissions) || {};
  // 补充默认值（兼容旧数据或新字段）
  if (typeof permissions !== 'object' || permissions === null) {
    const defaultPerms = ROLE_TEMPLATES[role as keyof typeof ROLE_TEMPLATES] || ROLE_TEMPLATES.editor;
    Object.assign(permissions, defaultPerms);
  }
  return {
    id: row.id as number,
    username: row.username as string,
    email: (row.email as string) || undefined,
    passwordHash: row.password_hash as string,
    name: row.name as string,
    role: role as Role,
    status: (row.status as 'active' | 'disabled') || 'active',
    permissions,
    createdBy: row.created_by as number | null,
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

/** TypeScript User → DB 插入格式 */
function mapUserToDbInsert(user: Omit<User, 'id'>): Record<string, unknown> {
  const dbRole = user.role === 'editor' ? 'member' : user.role;
  return {
    username: user.username,
    email: user.email || null,
    password_hash: user.passwordHash,
    name: user.name,
    role: dbRole,
    status: user.status,
    permissions: user.permissions,
    created_by: user.createdBy,
    created_at: user.createdAt,
  };
}

/** 数据库行 → TypeScript LoginLog */
function mapDbToLoginLog(row: Record<string, unknown>): LoginLog {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    username: '', // login_logs 表无 username 字段，需 join
    ip: row.ip as string,
    userAgent: (row.user_agent as string) || '',
    status: (row.status as 'success' | 'failed') || 'failed',
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

/** 数据库行 → TypeScript UsageStat */
function mapDbToUsageStat(row: Record<string, unknown>): UsageStat {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    action: row.action as string,
    count: row.count as number,
    date: (row.date as string) || '',
    createdAt: (row.created_at as string) || new Date().toISOString(),
  };
}

/** 数据库行 → TypeScript AIConfig */
function mapDbToAIConfig(row: Record<string, unknown>): AIConfig {
  const config = (row.config as Record<string, string>) || {};
  return {
    id: row.id as number,
    apiKey: config.apiKey || config.api_key || '',
    baseUrl: config.baseUrl || config.base_url || '',
    modelName: config.modelName || config.model_name || '',
    updatedBy: row.updated_by as number | null,
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
  };
}

/** TypeScript AIConfig → DB 更新格式 */
function mapAIConfigToDbUpdate(config: AIConfig): Record<string, unknown> {
  return {
    config: {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      modelName: config.modelName,
    },
    updated_by: config.updatedBy,
    updated_at: new Date().toISOString(),
  };
}

// ==================== Supabase 存储实现 ====================

class SupabaseAuthStorage implements AuthStorage {
  constructor() {
    this.initDefaultData().catch(err => {
      console.error('[SupabaseAuth] 初始化默认数据失败:', err);
    });
  }

  /** 初始化：若无用户则创建默认账号 */
  private async initDefaultData(): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (existing && existing.length > 0) {
        return; // 已有用户，跳过
      }

      console.log('[SupabaseAuth] 检测到空用户表，开始初始化...');

      const adminUsername = process.env.INIT_ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.INIT_ADMIN_PASSWORD;
      if (!adminPassword) {
        console.warn('[SupabaseAuth] ⚠️ 未设置 INIT_ADMIN_PASSWORD 环境变量，跳过默认管理员创建。请在部署时设置该变量。');
        return;
      }
      const adminName = process.env.INIT_ADMIN_NAME || '管理员';

      // 创建默认管理员
      const passwordHash = bcrypt.hashSync(adminPassword, 12);
      const adminUser = {
        username: adminUsername,
        password_hash: passwordHash,
        name: adminName,
        role: 'admin',
        status: 'active',
        permissions: ROLE_TEMPLATES.admin,
        created_by: null,
      };

      const { error: adminErr } = await supabase
        .from('users')
        .insert(adminUser);

      if (adminErr) {
        console.error('[SupabaseAuth] 创建管理员失败:', adminErr);
        return;
      }

      // 创建演示用户
      const demoUser = {
        username: 'demo',
        password_hash: bcrypt.hashSync('demo123', 12),
        name: '演示用户',
        role: 'member',
        status: 'active',
        permissions: ROLE_TEMPLATES.editor,
        created_by: 1,
      };

      const { error: demoErr } = await supabase
        .from('users')
        .insert(demoUser);

      if (demoErr) {
        console.error('[SupabaseAuth] 创建演示用户失败:', demoErr);
        return;
      }

      // 初始化 AI 配置
      const { error: aiErr } = await supabase
        .from('admin_ai_config')
        .insert({
          config: { apiKey: '', baseUrl: '', modelName: '' },
          updated_by: null,
        });

      if (aiErr) {
        console.error('[SupabaseAuth] 初始化AI配置失败:', aiErr);
      } else {
        console.log('[SupabaseAuth] 初始化完成（管理员: admin / ' + adminPassword + '）');
      }
    } catch (err) {
      console.error('[SupabaseAuth] 初始化异常:', err);
    }
  }

  // ==================== 用户管理 ====================

  getUsers(): Map<number, User> {
    // 同步接口返回空Map，实际通过 async 方法操作
    return new Map();
  }

  async getUsersAsync(): Promise<Map<number, User>> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('id', { ascending: true });

    const map = new Map<number, User>();
    if (!error && data) {
      for (const row of data) {
        const user = mapDbToUser(row);
        map.set(user.id, user);
      }
    }
    return map;
  }

  saveUser(user: User): void {
    // 异步保存（不使用定时器，直接调用）
    this.saveUserAsync(user).catch(err => {
      console.error('[SupabaseAuth] saveUser 失败:', err);
    });
  }

  async saveUserAsync(user: User): Promise<void> {
    const supabase = getSupabaseClient();
    const dbData = {
      username: user.username,
      email: user.email || null,
      password_hash: user.passwordHash,
      name: user.name,
      role: user.role === 'editor' ? 'member' : user.role,
      status: user.status,
      permissions: user.permissions,
      created_by: user.createdBy,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from('users')
      .update(dbData)
      .eq('id', user.id);
  }

  async createUserAsync(userData: Omit<User, 'id'>): Promise<User> {
    const supabase = getSupabaseClient();
    const dbData = mapUserToDbInsert(userData as Omit<User, 'id'>);

    const { data, error } = await supabase
      .from('users')
      .insert(dbData)
      .select()
      .single();

    if (error || !data) {
      throw new Error('创建用户失败: ' + (error?.message || '未知错误'));
    }

    return mapDbToUser(data as Record<string, unknown>);
  }

  deleteUser(id: number): boolean {
    this.deleteUserAsync(id).catch(err => {
      console.error('[SupabaseAuth] deleteUser 失败:', err);
    });
    return true;
  }

  async deleteUserAsync(id: number): Promise<boolean> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    return !error;
  }

  getNextUserId(): number {
    return Date.now(); // 非精确，仅用于标识
  }

  // ==================== 登录日志 ====================

  getLoginLogs(): LoginLog[] {
    return [];
  }

  async getLoginLogsAsync(limit = 50): Promise<LoginLog[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('login_logs')
      .select('*, users(username)')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(row => {
      const log = mapDbToLoginLog(row as Record<string, unknown>);
      log.username = (row as Record<string, unknown>).users as unknown as string || '';
      return log;
    });
  }

  addLoginLog(log: LoginLog): void {
    this.addLoginLogAsync(log).catch(err => {
      console.error('[SupabaseAuth] addLoginLog 失败:', err);
    });
  }

  async addLoginLogAsync(log: LoginLog): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.from('login_logs').insert({
      user_id: log.userId,
      ip: log.ip,
      user_agent: log.userAgent,
      status: log.status,
    });
  }

  getNextLogId(): number {
    return Date.now();
  }

  // ==================== 使用统计 ====================

  getUsageStats(): UsageStat[] {
    return [];
  }

  async getUsageStatsAsync(): Promise<UsageStat[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('usage_stats')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as Record<string, unknown>[]).map(mapDbToUsageStat);
  }

  addUsageStat(stat: UsageStat): void {
    this.addUsageStatAsync(stat).catch(err => {
      console.error('[SupabaseAuth] addUsageStat 失败:', err);
    });
  }

  async addUsageStatAsync(stat: UsageStat): Promise<void> {
    const supabase = getSupabaseClient();
    const today = stat.date || new Date().toISOString().split('T')[0];

    // 检查今日是否已有记录，有则增量，无则新增
    const { data: existing } = await supabase
      .from('usage_stats')
      .select('id, count')
      .eq('user_id', stat.userId)
      .eq('action', stat.action)
      .eq('date', today)
      .single();

    if (existing) {
      await supabase
        .from('usage_stats')
        .update({ count: existing.count + 1 })
        .eq('id', existing.id);
    } else {
      await supabase.from('usage_stats').insert({
        user_id: stat.userId,
        action: stat.action,
        count: 1,
        date: today,
      });
    }
  }

  // ==================== AI 配置 ====================

  getAIConfig(): AIConfig {
    // 同步返回空配置，实际通过 async 方法获取
    return {
      id: 1,
      apiKey: '',
      baseUrl: '',
      modelName: '',
      updatedBy: null,
      updatedAt: new Date().toISOString(),
    };
  }

  async getAIConfigAsync(): Promise<AIConfig> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('admin_ai_config')
      .select('*')
      .limit(1)
      .single();

    if (error || !data) {
      // 表为空，插入默认配置
      const defaultConfig: AIConfig = {
        id: 1,
        apiKey: '',
        baseUrl: '',
        modelName: '',
        updatedBy: null,
        updatedAt: new Date().toISOString(),
      };
      await supabase.from('admin_ai_config').insert({
        config: { apiKey: '', baseUrl: '', modelName: '' },
        updated_by: null,
      });
      return defaultConfig;
    }

    return mapDbToAIConfig(data as Record<string, unknown>);
  }

  saveAIConfig(config: AIConfig): void {
    this.saveAIConfigAsync(config).catch(err => {
      console.error('[SupabaseAuth] saveAIConfig 失败:', err);
    });
  }

  async saveAIConfigAsync(config: AIConfig): Promise<void> {
    const supabase = getSupabaseClient();
    const dbData = mapAIConfigToDbUpdate(config);

    const { data: existing } = await supabase
      .from('admin_ai_config')
      .select('id')
      .limit(1)
      .single();

    if (existing) {
      await supabase
        .from('admin_ai_config')
        .update(dbData)
        .eq('id', existing.id);
    } else {
      await supabase.from('admin_ai_config').insert(dbData);
    }
  }
}

// ==================== 导出异步操作辅助函数 ====================

/** 异步获取所有用户 */
export async function getAllUsersAsync(): Promise<User[]> {
  const storage = new SupabaseAuthStorage();
  const map = await storage.getUsersAsync();
  return Array.from(map.values());
}

/** 异步按用户名查询用户 */
export async function getUserByUsernameAsync(username: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .limit(1)
    .single();

  if (error || !data) return null;
  return mapDbToUser(data as Record<string, unknown>);
}

/** 异步按 ID 查询用户 */
export async function getUserByIdAsync(id: number): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .limit(1)
    .single();

  if (error || !data) return null;
  return mapDbToUser(data as Record<string, unknown>);
}

/** 异步创建用户 */
export async function createUserAsync(data: {
  username: string;
  email?: string;
  name: string;
  role?: Role;
  password?: string;
  permissions?: UserPermissions;
  createdBy: number;
}): Promise<User> {
  const storage = new SupabaseAuthStorage();
  return storage.createUserAsync({
    username: data.username,
    email: data.email,
    passwordHash: await bcrypt.hash(data.password || 'changeme123', 12),
    name: data.name,
    role: data.role || 'editor',
    status: 'active',
    permissions: data.permissions || ROLE_TEMPLATES.editor,
    createdBy: data.createdBy,
    createdAt: new Date().toISOString(),
  });
}

/** 异步更新用户 */
export async function updateUserAsync(id: number, data: Partial<{
  username: string;
  email: string;
  name: string;
  role: Role;
  status: 'active' | 'disabled';
  permissions: UserPermissions;
  password: string;
}>): Promise<User | null> {
  const supabase = getSupabaseClient();
  const updates: Record<string, unknown> = {};
  if (data.username) updates.username = data.username;
  if (data.email !== undefined) updates.email = data.email || null;
  if (data.name) updates.name = data.name;
  if (data.role) updates.role = data.role === 'editor' ? 'member' : data.role;
  if (data.status) updates.status = data.status;
  if (data.permissions) updates.permissions = data.permissions;
  if (data.password) {
    if (data.password.length < 8) throw new Error('密码必须至少8位字符');
    if (!/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
      throw new Error('密码必须包含字母和数字');
    }
    updates.password_hash = await bcrypt.hash(data.password, 12);
  }
  updates.updated_at = new Date().toISOString();

  const { data: row, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error || !row) return null;
  return mapDbToUser(row as Record<string, unknown>);
}

/** 异步删除用户 */
export async function deleteUserAsync(id: number): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  return !error;
}

/** 异步获取登录日志 */
export async function getLoginLogsAsync(limit = 50): Promise<LoginLog[]> {
  const storage = new SupabaseAuthStorage();
  return storage.getLoginLogsAsync(limit);
}

/** 异步记录登录日志 */
export async function addLoginLogAsync(data: {
  userId: number;
  username: string;
  ip: string;
  userAgent: string;
  status: 'success' | 'failed';
}): Promise<void> {
  const storage = new SupabaseAuthStorage();
  return storage.addLoginLogAsync({
    id: Date.now(),
    ...data,
    createdAt: new Date().toISOString(),
  });
}

/** 异步获取使用统计 */
export async function getUsageStatsAsync(): Promise<UsageStat[]> {
  const storage = new SupabaseAuthStorage();
  return storage.getUsageStatsAsync();
}

/** 异步添加使用统计 */
export async function addUsageStatAsync(userId: number, action: string): Promise<void> {
  const storage = new SupabaseAuthStorage();
  return storage.addUsageStatAsync({
    id: Date.now(),
    userId,
    action,
    count: 1,
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  });
}

/** 异步获取 AI 配置 */
export async function getAIConfigAsync(): Promise<AIConfig> {
  const storage = new SupabaseAuthStorage();
  return storage.getAIConfigAsync();
}

/** 异步保存 AI 配置 */
export async function saveAIConfigAsync(config: AIConfig): Promise<void> {
  const storage = new SupabaseAuthStorage();
  return storage.saveAIConfigAsync(config);
}

// ==================== 初始化状态检查 ====================

/** 异步检查：Supabase 中是否有用户 */
export async function isInitializedAsync(): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from('users').select('id').limit(1);
  return !!(data && data.length > 0);
}

/** 异步初始化管理员（仅当无用户时） */
export async function initializeAdminAsync(
  username: string,
  password: string,
  name: string
): Promise<User> {
  const initialized = await isInitializedAsync();
  if (initialized) throw new Error('系统已初始化，不能重复创建管理员');
  if (username.length < 3) throw new Error('用户名至少3个字符');
  if (password.length < 8) throw new Error('密码至少8个字符');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('密码必须包含字母和数字');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const storage = new SupabaseAuthStorage();
  return storage.createUserAsync({
    username,
    passwordHash,
    name,
    role: 'admin',
    status: 'active',
    permissions: ROLE_TEMPLATES.admin,
    createdBy: null,
    createdAt: new Date().toISOString(),
  });
}

/** 兼容导出 auth.ts 中的同步版本（仅用于类型兼容，不推荐使用） */
export { isInitialized, initializeAdmin } from './auth';

// ==================== 邮箱注册功能 ====================

/** 生成6位数字验证码 */
function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 发送邮箱验证码（存入DB，由邮件服务或控制台输出） */
export async function sendVerificationCodeAsync(email: string, type: string = 'register'): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  // 校验邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { success: false, error: '邮箱格式不正确' };
  }

  // 注册场景：检查邮箱是否已被注册
  if (type === 'register') {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1)
      .single();

    if (existingUser) {
      return { success: false, error: '该邮箱已注册，请直接登录' };
    }
  }

  // 防刷：60秒内不能重复发送
  const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: recentCodes } = await supabase
    .from('verification_codes')
    .select('id, created_at')
    .eq('email', email)
    .eq('type', type)
    .gte('created_at', oneMinuteAgo)
    .order('created_at', { ascending: false })
    .limit(1);

  if (recentCodes && recentCodes.length > 0) {
    const lastSent = new Date(recentCodes[0].created_at as string).getTime();
    const waitSeconds = Math.max(0, 60 - Math.floor((Date.now() - lastSent) / 1000));
    return { success: false, error: `操作过于频繁，请${waitSeconds}秒后再试` };
  }

  // 生成验证码
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString(); // 5分钟过期

  // 使旧验证码失效
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('email', email)
    .eq('type', type)
    .eq('used', false);

  // 插入新验证码
  const { error: insertError } = await supabase
    .from('verification_codes')
    .insert({
      email,
      code,
      type,
      expires_at: expiresAt,
      used: false,
    });

  if (insertError) {
    console.error('[Auth] 验证码插入失败:', insertError);
    return { success: false, error: '发送验证码失败，请稍后重试' };
  }

  // 发送邮件：优先使用环境变量配置的SMTP，否则输出到控制台
  const emailSent = await sendEmail(email, code, type);
  if (!emailSent) {
    // 开发环境：验证码输出到控制台（生产环境应配置SMTP）
    console.log(`[Auth] 验证码（${type}）: ${email} → ${code}（5分钟内有效）`);
  }

  return { success: true };
}

/** 邮件发送（SMTP配置时实际发送，否则返回false） */
async function sendEmail(to: string, code: string, type: string): Promise<boolean> {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    return false; // 未配置SMTP，走控制台输出
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort) || 465,
      secure: Number(smtpPort) === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const typeLabel = type === 'register' ? '注册' : type === 'reset' ? '重置密码' : '验证';
    await transporter.sendMail({
      from: `"DataInsight" <${smtpFrom}>`,
      to,
      subject: `DataInsight ${typeLabel}验证码`,
      html: `
        <div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="background:#f8f9fa;border-radius:12px;padding:32px;text-align:center;">
            <h2 style="margin:0 0 8px;color:#1a1a1a;font-size:20px;">DataInsight</h2>
            <p style="margin:0 0 24px;color:#666;font-size:14px;">${typeLabel}验证码</p>
            <div style="background:#fff;border-radius:8px;padding:16px;display:inline-block;">
              <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1a1a1a;">${code}</span>
            </div>
            <p style="margin:24px 0 0;color:#999;font-size:12px;">验证码5分钟内有效，请勿泄露给他人</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error('[Auth] 邮件发送失败:', err);
    return false;
  }
}

/** 校验验证码 */
export async function verifyCodeAsync(email: string, code: string, type: string = 'register'): Promise<{ valid: boolean; error?: string }> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('verification_codes')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .eq('type', type)
    .eq('used', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return { valid: false, error: '验证码不正确' };
  }

  // 检查是否过期
  const expiresAt = new Date(data.expires_at as string).getTime();
  if (Date.now() > expiresAt) {
    return { valid: false, error: '验证码已过期，请重新获取' };
  }

  // 标记为已使用
  await supabase
    .from('verification_codes')
    .update({ used: true })
    .eq('id', data.id);

  return { valid: true };
}

/** 邮箱注册（验证码验证后创建用户） */
export async function registerByEmailAsync(data: {
  email: string;
  code: string;
  password: string;
  name: string;
}): Promise<{ user: User; token: string }> {
  const { email, code, password, name } = data;

  // 1. 校验输入
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new Error('邮箱格式不正确');
  if (!name || name.trim().length < 1) throw new Error('请输入姓名');
  if (password.length < 8) throw new Error('密码至少8位字符');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('密码必须包含字母和数字');
  }

  // 2. 验证码校验
  const codeResult = await verifyCodeAsync(email, code, 'register');
  if (!codeResult.valid) throw new Error(codeResult.error || '验证码校验失败');

  // 3. 检查邮箱是否已被注册（双重校验）
  const supabase = getSupabaseClient();
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1)
    .single();

  if (existingUser) throw new Error('该邮箱已注册');

  // 4. 检查username（邮箱前缀）是否冲突，冲突则追加随机数
  const baseUsername = email.split('@')[0];
  let username = baseUsername;
  let suffix = 1;
  while (true) {
    const { data: conflictUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .limit(1)
      .single();
    if (!conflictUser) break;
    username = `${baseUsername}_${suffix++}`;
  }

  // 5. 创建用户
  const passwordHash = await bcrypt.hash(password, 12);
  const storage = new SupabaseAuthStorage();
  const user = await storage.createUserAsync({
    username,
    email,
    passwordHash,
    name: name.trim(),
    role: 'editor',
    status: 'active',
    permissions: ROLE_TEMPLATES.editor,
    createdBy: null,
    createdAt: new Date().toISOString(),
  });

  // 6. 生成JWT token
  const { signToken } = await import('@/lib/auth-middleware');
  const token = await signToken({
    userId: user.id,
    username: user.username,
    role: user.role,
  });

  return { user, token };
}

/** 按邮箱查询用户 */
export async function getUserByEmailAsync(email: string): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .limit(1)
    .single();

  if (error || !data) return null;
  return mapDbToUser(data as Record<string, unknown>);
}

// ==================== 初始化 ====================

const g = globalThis as Record<string, unknown>;
if (!g.__SUPABASE_AUTH_INIT__) {
  g.__SUPABASE_AUTH_INIT__ = true;
  setAuthStorage(new SupabaseAuthStorage());
  console.log('[SupabaseAuth] 已初始化，使用 Supabase PostgreSQL 存储');
}
