/**
 * 认证与权限管理核心
 * 当前使用内存存储，生产环境可替换为数据库存储
 */

import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'member';
  status: 'active' | 'disabled';
  permissions: {
    ai_analyze: boolean;
    export: boolean;
    dashboard: boolean;
    share: boolean;
    upload: boolean;
    form: boolean;
    custom_ai_model: boolean;
  };
  createdBy: number | null;
  createdAt: string;
}

export interface LoginLog {
  id: number;
  userId: number;
  username: string;
  ip: string;
  userAgent: string;
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

// ==================== 内存存储 ====================
let userIdCounter = 2;
let logIdCounter = 1;
let statIdCounter = 1;
let aiConfigIdCounter = 1;

const users = new Map<number, User>([
  [1, {
    id: 1,
    username: 'admin',
    passwordHash: '$2b$10$KAtsw2LoYeMHPvzchflcueCCuhmZEx28b/hndS/NyJIA3dDvc6JaW', // password: 'admin123'
    name: '管理员',
    role: 'admin',
    status: 'active',
    permissions: {
      ai_analyze: true,
      export: true,
      dashboard: true,
      share: true,
      upload: true,
      form: true,
      custom_ai_model: true,
    },
    createdBy: null,
    createdAt: new Date().toISOString(),
  }],
]);

const loginLogs: LoginLog[] = [];
const usageStats: UsageStat[] = [];

let adminAIConfig: AIConfig = {
  id: 1,
  apiKey: '',
  baseUrl: 'https://api.deepseek.com',
  modelName: 'deepseek-chat',
  updatedBy: null,
  updatedAt: new Date().toISOString(),
};

// ==================== 用户CRUD ====================
export function getUserByUsername(username: string): User | undefined {
  for (const user of users.values()) {
    if (user.username === username) return user;
  }
}

export function getUserById(id: number): User | undefined {
  return users.get(id);
}

export function getAllUsers(): User[] {
  return Array.from(users.values());
}

export async function createUser(data: {
  username: string;
  name: string;
  role?: 'admin' | 'member';
  password?: string;
  permissions?: User['permissions'];
  createdBy: number;
}): Promise<User> {
  const id = userIdCounter++;
  const passwordHash = data.password 
    ? await bcrypt.hash(data.password, 10)
    : await bcrypt.hash('123456', 10); // 默认密码

  const user: User = {
    id,
    username: data.username,
    passwordHash,
    name: data.name,
    role: data.role || 'member',
    status: 'active',
    permissions: data.permissions || {
      ai_analyze: true,
      export: true,
      dashboard: true,
      share: true,
      upload: true,
      form: true,
      custom_ai_model: false,
    },
    createdBy: data.createdBy,
    createdAt: new Date().toISOString(),
  };

  users.set(id, user);
  return user;
}

export async function updateUser(id: number, data: Partial<{
  username: string;
  name: string;
  role: 'admin' | 'member';
  status: 'active' | 'disabled';
  permissions: User['permissions'];
  password: string;
}>): Promise<User | null> {
  const user = users.get(id);
  if (!user) return null;

  if (data.username) user.username = data.username;
  if (data.name) user.name = data.name;
  if (data.role) user.role = data.role;
  if (data.status) user.status = data.status;
  if (data.permissions) user.permissions = { ...user.permissions, ...data.permissions };
  if (data.password) {
    user.passwordHash = await bcrypt.hash(data.password, 10);
  }

  return user;
}

export function deleteUser(id: number): boolean {
  return users.delete(id);
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

// ==================== 登录日志 ====================
export function addLoginLog(data: {
  userId: number;
  username: string;
  ip: string;
  userAgent: string;
  status: 'success' | 'failed';
}): void {
  loginLogs.push({
    id: logIdCounter++,
    ...data,
    createdAt: new Date().toISOString(),
  });
}

export function getLoginLogs(limit = 50): LoginLog[] {
  return loginLogs.slice(-limit).reverse();
}

export function getLoginLogsByUser(userId: number, limit = 20): LoginLog[] {
  return loginLogs
    .filter(log => log.userId === userId)
    .slice(-limit)
    .reverse();
}

// ==================== 使用统计 ====================
export function addUsageStat(userId: number, action: string): void {
  const today = new Date().toISOString().split('T')[0];
  const existing = usageStats.find(
    s => s.userId === userId && s.action === action && s.date === today
  );
  
  if (existing) {
    existing.count++;
  } else {
    usageStats.push({
      id: statIdCounter++,
      userId,
      action,
      count: 1,
      date: today,
      createdAt: new Date().toISOString(),
    });
  }
}

export function getUsageStats(userId?: number): UsageStat[] {
  if (userId) {
    return usageStats.filter(s => s.userId === userId);
  }
  return usageStats;
}

export function getUsageStatsByDate(startDate: string, endDate: string): UsageStat[] {
  return usageStats.filter(s => s.date >= startDate && s.date <= endDate);
}

// ==================== AI配置 ====================
export function getAIConfig(): AIConfig {
  return adminAIConfig;
}

export function updateAIConfig(data: {
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  updatedBy: number;
}): AIConfig {
  if (data.apiKey !== undefined) adminAIConfig.apiKey = data.apiKey;
  if (data.baseUrl !== undefined) adminAIConfig.baseUrl = data.baseUrl;
  if (data.modelName !== undefined) adminAIConfig.modelName = data.modelName;
  adminAIConfig.updatedBy = data.updatedBy;
  adminAIConfig.updatedAt = new Date().toISOString();
  return adminAIConfig;
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
    users.set(u.id, {
      id: u.id,
      username: u.username,
      passwordHash: u.password_hash,
      name: u.name,
      role: u.role as 'admin' | 'member',
      status: u.status as 'active' | 'disabled',
      permissions: u.permissions,
      createdBy: u.created_by,
      createdAt: u.created_at,
    });
    if (u.id >= userIdCounter) userIdCounter = u.id + 1;
  }
}

// 同步登录日志从数据库
export function syncLoginLogsFromDB(dbLogs: Array<{
  id: number;
  user_id: number;
  username: string;
  ip: string;
  user_agent: string;
  status: string;
  created_at: string;
}>): void {
  for (const l of dbLogs) {
    loginLogs.push({
      id: l.id,
      userId: l.user_id,
      username: l.username,
      ip: l.ip,
      userAgent: l.user_agent,
      status: l.status as 'success' | 'failed',
      createdAt: l.created_at,
    });
    if (l.id >= logIdCounter) logIdCounter = l.id + 1;
  }
}
