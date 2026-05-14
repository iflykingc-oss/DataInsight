/**
 * 认证与权限管理核心
 * 安全增强版：移除硬编码密码，强制首次登录初始化
 */

import bcrypt from 'bcryptjs';

export type Role = 'admin' | 'editor' | 'analyst' | 'viewer' | 'custom';
export type UserRole = Role;

export interface UserPermissions {
  upload: boolean;
  export: boolean;
  ai_analyze: boolean;
  ai_table_builder: boolean;
  ai_formula: boolean;
  ai_field: boolean;
  dashboard: boolean;
  report: boolean;
  share: boolean;
  sql_query: boolean;
  metric_custom: boolean;
  workflow: boolean;
  form: boolean;
  custom_ai_model: boolean;
  admin_user: boolean;
  admin_ai_config: boolean;
}

export interface User {
  id: number;
  username: string;
  email?: string;
  passwordHash: string;
  securityQuestion?: string;
  securityAnswer?: string;
  name: string;
  role: Role;
  status: 'active' | 'disabled';
  permissions: UserPermissions;
  createdBy: number | null;
  createdAt: string;
  subscription?: {
    planKey: string;
    status: 'active' | 'canceled' | 'expired';
    currentPeriodEnd: string;
    paymentProvider?: string;
  };
}

export interface LoginLog {
  id: number;
  userId: number;
  username: string;
  status: 'success' | 'failed';
  createdAt: string;
}

export interface UsageStat {
  id: number;
  userId: number;
  action: string;
  count: number;
  date: string;
  createdAt: string;
}

export interface AIConfig {
  id: number;
  apiKey: string;
  baseUrl: string;
  modelName: string;
  updatedBy: number | null;
  updatedAt: string;
}

// ==================== 安全存储接口（可替换实现） ====================
export interface AuthStorage {
  getUsers(): Map<number, User>;
  saveUser(user: User): void;
  deleteUser(id: number): boolean;
  getLoginLogs(): LoginLog[];
  addLoginLog(log: LoginLog): void;
  getUsageStats(): UsageStat[];
  addUsageStat(stat: UsageStat): void;
  getAIConfig(): AIConfig;
  saveAIConfig(config: AIConfig): void;
}

// 内存存储实现（开发环境）
class MemoryAuthStorage implements AuthStorage {
  private users = new Map<number, User>();
  private loginLogs: LoginLog[] = [];
  private usageStats: UsageStat[] = [];
  private aiConfig: AIConfig = {
    id: 1,
    apiKey: '',
    baseUrl: '',
    modelName: '',
    updatedBy: null,
    updatedAt: new Date().toISOString(),
  };
  private userIdCounter = 1;
  private logIdCounter = 1;
  private statIdCounter = 1;

  constructor() {
    // 不再硬编码默认用户，强制首次初始化
    this.loadFromEnv();
  }

  private loadFromEnv() {
    // 支持通过环境变量配置初始管理员（仅用于首次部署）
    const initAdmin = process.env.INIT_ADMIN_USERNAME;
    const initPassword = process.env.INIT_ADMIN_PASSWORD;
    if (initAdmin && initPassword && initAdmin.length >= 3 && initPassword.length >= 8) {
      const passwordHash = bcrypt.hashSync(initPassword, 10);
      this.users.set(1, {
        id: 1,
        username: initAdmin,
        passwordHash,
        name: '管理员',
        role: 'admin',
        status: 'active',
        permissions: {
          upload: true, export: true, ai_analyze: true, ai_table_builder: true,
          ai_formula: true, ai_field: true, dashboard: true, report: true,
          share: true, sql_query: true, metric_custom: true, workflow: true,
          form: true, custom_ai_model: true, admin_user: true, admin_ai_config: true,
        },
        createdBy: null,
        createdAt: new Date().toISOString(),
      });
      this.userIdCounter = 2;
    }
  }

  getUsers(): Map<number, User> { return this.users; }

  saveUser(user: User): void {
    if (user.id >= this.userIdCounter) {
      this.userIdCounter = user.id + 1;
    }
    this.users.set(user.id, user);
  }

  deleteUser(id: number): boolean {
    return this.users.delete(id);
  }

  getNextUserId(): number { return this.userIdCounter++; }
  getNextLogId(): number { return this.logIdCounter++; }
  getNextStatId(): number { return this.statIdCounter++; }

  getLoginLogs(): LoginLog[] { return this.loginLogs; }
  addLoginLog(log: LoginLog): void { this.loginLogs.push(log); }

  getUsageStats(): UsageStat[] { return this.usageStats; }
  addUsageStat(stat: UsageStat): void { this.usageStats.push(stat); }

  getAIConfig(): AIConfig { return this.aiConfig; }
  saveAIConfig(config: AIConfig): void { this.aiConfig = config; }
}

// 全局存储实例（可替换为数据库存储）
let storage: AuthStorage = new MemoryAuthStorage();

export function setAuthStorage(newStorage: AuthStorage): void {
  storage = newStorage;
}

function getStorage(): AuthStorage & { getNextUserId?(): number; getNextLogId?(): number; getNextStatId?(): number } {
  return storage as AuthStorage & { getNextUserId?(): number; getNextLogId?(): number; getNextStatId?(): number };
}

// ==================== 初始化检查 ====================

export function isInitialized(): boolean {
  return getStorage().getUsers().size > 0;
}

export async function initializeAdmin(username: string, password: string, name: string): Promise<User> {
  if (getStorage().getUsers().size > 0) {
    throw new Error('系统已初始化，不能重复创建管理员');
  }
  if (username.length < 3) throw new Error('用户名至少3个字符');
  if (password.length < 8) throw new Error('密码至少8个字符');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error('密码必须包含字母和数字');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user: User = {
    id: 1,
    username,
    passwordHash,
    name,
    role: 'admin',
    status: 'active',
    permissions: {
      upload: true, export: true, ai_analyze: true, ai_table_builder: true,
      ai_formula: true, ai_field: true, dashboard: true, report: true,
      share: true, sql_query: true, metric_custom: true, workflow: true,
      form: true, custom_ai_model: true, admin_user: true, admin_ai_config: true,
    },
    createdBy: null,
    createdAt: new Date().toISOString(),
  };
  getStorage().saveUser(user);
  return user;
}

// ==================== 用户CRUD ====================
export function getUserByUsername(username: string): User | undefined {
  const users = getStorage().getUsers();
  for (const user of users.values()) {
    if (user.username === username) return user;
  }
}

export function getUserById(id: number): User | undefined {
  return getStorage().getUsers().get(id);
}

export function getAllUsers(): User[] {
  return Array.from(getStorage().getUsers().values());
}

export async function createUser(data: {
  username: string;
  name: string;
  role?: Role;
  password?: string;
  permissions?: UserPermissions;
  createdBy: number;
}): Promise<User> {
  const s = getStorage();
  const id = s.getNextUserId ? s.getNextUserId() : Date.now();

  // 安全：不再使用默认密码，必须提供密码
  if (!data.password || data.password.length < 8) {
    throw new Error('密码必须至少8位字符');
  }
  if (!/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
    throw new Error('密码必须包含字母和数字');
  }
  const passwordHash = await bcrypt.hash(data.password, 12);

  const user: User = {
    id,
    username: data.username,
    passwordHash,
    name: data.name,
    role: data.role || 'editor',
    status: 'active',
    permissions: data.permissions || {
      upload: true, export: true, ai_analyze: true, ai_table_builder: true,
      ai_formula: true, ai_field: true, dashboard: true, report: true,
      share: true, sql_query: true, metric_custom: true, workflow: true,
      form: true, custom_ai_model: false, admin_user: false, admin_ai_config: false,
    },
    createdBy: data.createdBy,
    createdAt: new Date().toISOString(),
  };

  s.saveUser(user);
  return user;
}

export async function updateUser(id: number, data: Partial<{
  username: string;
  name: string;
  role: Role;
  status: 'active' | 'disabled';
  permissions: UserPermissions;
  password: string;
}>): Promise<User | null> {
  const user = getStorage().getUsers().get(id);
  if (!user) return null;

  if (data.username) user.username = data.username;
  if (data.name) user.name = data.name;
  if (data.role) user.role = data.role;
  if (data.status) user.status = data.status;
  if (data.permissions) user.permissions = { ...user.permissions, ...data.permissions };
  if (data.password) {
    if (data.password.length < 8) throw new Error('密码必须至少8位字符');
    if (!/[A-Za-z]/.test(data.password) || !/[0-9]/.test(data.password)) {
      throw new Error('密码必须包含字母和数字');
    }
    user.passwordHash = await bcrypt.hash(data.password, 12);
  }

  getStorage().saveUser(user);
  return user;
}

export function deleteUser(id: number): boolean {
  return getStorage().deleteUser(id);
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash' | 'securityAnswer'> {
  const { passwordHash, securityAnswer, ...sanitized } = user;
  return sanitized;
}

// ==================== 登录日志 ====================
export function addLoginLog(data: {
  userId: number;
  username: string;
  status: 'success' | 'failed';
}): void {
  const s = getStorage();
  const id = s.getNextLogId ? s.getNextLogId() : Date.now();
  s.addLoginLog({
    id,
    ...data,
    createdAt: new Date().toISOString(),
  });
}

export function getLoginLogs(limit = 50): LoginLog[] {
  return getStorage().getLoginLogs().slice(-limit).reverse();
}

export function getLoginLogsByUser(userId: number, limit = 20): LoginLog[] {
  return getStorage().getLoginLogs()
    .filter(log => log.userId === userId)
    .slice(-limit)
    .reverse();
}

// ==================== 使用统计 ====================
export function addUsageStat(userId: number, action: string): void {
  const s = getStorage();
  const today = new Date().toISOString().split('T')[0];
  const stats = s.getUsageStats();
  const existing = stats.find(
    st => st.userId === userId && st.action === action && st.date === today
  );

  if (existing) {
    existing.count++;
  } else {
    const id = s.getNextStatId ? s.getNextStatId() : Date.now();
    s.addUsageStat({
      id,
      userId,
      action,
      count: 1,
      date: today,
      createdAt: new Date().toISOString(),
    });
  }
}

// ==================== 角色模板与权限辅助 ====================

export const ROLE_TEMPLATES: Record<Exclude<Role, 'custom'>, UserPermissions> = {
  admin: {
    upload: true, export: true, ai_analyze: true, ai_table_builder: true,
    ai_formula: true, ai_field: true, dashboard: true, report: true,
    share: true, sql_query: true, metric_custom: true, workflow: true,
    form: true, custom_ai_model: true, admin_user: true, admin_ai_config: true,
  },
  editor: {
    upload: true, export: true, ai_analyze: true, ai_table_builder: true,
    ai_formula: true, ai_field: true, dashboard: true, report: true,
    share: true, sql_query: true, metric_custom: true, workflow: true,
    form: true, custom_ai_model: false, admin_user: false, admin_ai_config: false,
  },
  analyst: {
    upload: false, export: false, ai_analyze: true, ai_table_builder: false,
    ai_formula: false, ai_field: false, dashboard: true, report: true,
    share: false, sql_query: true, metric_custom: true, workflow: false,
    form: false, custom_ai_model: false, admin_user: false, admin_ai_config: false,
  },
  viewer: {
    upload: false, export: false, ai_analyze: false, ai_table_builder: false,
    ai_formula: false, ai_field: false, dashboard: true, report: true,
    share: false, sql_query: false, metric_custom: false, workflow: false,
    form: false, custom_ai_model: false, admin_user: false, admin_ai_config: false,
  },
};

export const ROLE_LABELS: Record<Role, string> = {
  admin: '管理员',
  editor: '编辑者',
  analyst: '分析师',
  viewer: '查看者',
  custom: '自定义',
};

export const ROLE_DESCRIPTIONS: Record<Exclude<Role, 'custom'>, string> = {
  admin: '拥有所有权限，可管理用户和系统配置',
  editor: '可上传数据、使用AI功能、创建仪表盘和报表',
  analyst: '可进行数据分析、创建仪表盘和SQL查询，但不能上传数据',
  viewer: '仅可查看仪表盘和报表，无法进行任何操作',
};

export const PERMISSION_LABELS: Record<keyof UserPermissions, string> = {
  upload: '数据上传',
  export: '数据导出',
  ai_analyze: 'AI智能分析',
  ai_table_builder: 'AI智能建表',
  ai_formula: 'AI公式生成',
  ai_field: 'AI字段生成',
  dashboard: '仪表盘创建',
  report: '报表导出',
  share: '分享链接',
  sql_query: 'SQL查询',
  metric_custom: '自定义指标',
  workflow: '自动化工作流',
  form: '表单收集',
  custom_ai_model: '自定义AI模型',
  admin_user: '用户管理',
  admin_ai_config: 'AI模型配置',
};

export interface PermissionCategory {
  key: string;
  label: string;
  permissions: { key: keyof UserPermissions; label: string }[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'data',
    label: '数据操作',
    permissions: [
      { key: 'upload', label: '数据上传' },
      { key: 'export', label: '数据导出' },
      { key: 'ai_table_builder', label: 'AI智能建表' },
      { key: 'ai_formula', label: 'AI公式生成' },
      { key: 'ai_field', label: 'AI字段生成' },
    ],
  },
  {
    key: 'analysis',
    label: '分析能力',
    permissions: [
      { key: 'ai_analyze', label: 'AI智能分析' },
      { key: 'dashboard', label: '仪表盘创建' },
      { key: 'report', label: '报表导出' },
      { key: 'sql_query', label: 'SQL查询' },
      { key: 'metric_custom', label: '自定义指标' },
    ],
  },
  {
    key: 'collaboration',
    label: '协作分享',
    permissions: [
      { key: 'share', label: '分享链接' },
      { key: 'workflow', label: '自动化工作流' },
      { key: 'form', label: '表单收集' },
    ],
  },
  {
    key: 'admin',
    label: '系统管理',
    permissions: [
      { key: 'admin_user', label: '用户管理' },
      { key: 'admin_ai_config', label: 'AI模型配置' },
      { key: 'custom_ai_model', label: '自定义AI模型' },
    ],
  },
];

export function checkPermission(
  user: Omit<User, 'passwordHash'> | null,
  key: keyof UserPermissions
): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.permissions[key] ?? false;
}

export function getUsageStats(userId?: number): UsageStat[] {
  const stats = getStorage().getUsageStats();
  if (userId) {
    return stats.filter(s => s.userId === userId);
  }
  return stats;
}

export function getUsageStatsByDate(startDate: string, endDate: string): UsageStat[] {
  return getStorage().getUsageStats().filter(s => s.date >= startDate && s.date <= endDate);
}

// ==================== AI配置 ====================
export function getAIConfig(): AIConfig {
  return getStorage().getAIConfig();
}

export function updateAIConfig(data: {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  updatedBy: number;
}): AIConfig {
  const config = getStorage().getAIConfig();
  if (data.apiKey !== undefined) config.apiKey = data.apiKey;
  if (data.baseUrl !== undefined) config.baseUrl = data.baseUrl;
  if (data.modelName !== undefined) config.modelName = data.modelName;
  config.updatedBy = data.updatedBy;
  config.updatedAt = new Date().toISOString();
  getStorage().saveAIConfig(config);
  return config;
}

// 同步数据库中的用户到内存（启动时调用）
export function syncUsersFromDB(dbUsers: Array<{
  id: number;
  username: string;
  password_hash: string;
  name: string;
  role: string;
  status: string;
  permissions: User['permissions'];
  created_by: number | null;
  created_at: string;
}>): void {
  for (const u of dbUsers) {
    getStorage().saveUser({
      id: u.id,
      username: u.username,
      passwordHash: u.password_hash,
      name: u.name,
      role: u.role as Role,
      status: u.status as 'active' | 'disabled',
      permissions: u.permissions,
      createdBy: u.created_by,
      createdAt: u.created_at,
    });
  }
}

// 同步登录日志从数据库
export function syncLoginLogsFromDB(dbLogs: Array<{
  id: number;
  user_id: number;
  username: string;
  status: string;
  created_at: string;
}>): void {
  for (const l of dbLogs) {
    getStorage().addLoginLog({
      id: l.id,
      userId: l.user_id,
      username: l.username,
      status: l.status as 'success' | 'failed',
      createdAt: l.created_at,
    });
  }
}
