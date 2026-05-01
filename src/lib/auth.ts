/**
 * 认证与权限管理核心
 * 当前使用内存存储，生产环境可替换为数据库存储
 */

import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
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
    custom_ai_model: boolean;
  };
  createdBy: number | null;
  createdAt: string;
}

export interface LoginLog {
  id: number;
  userId: number;
  email: string;
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
    email: 'admin@datainsight.local',
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
export function getUserByEmail(email: string): User | undefined {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
}

export function getUserById(id: number): User | undefined {
  return users.get(id);
}

export function getAllUsers(): User[] {
  return Array.from(users.values()).sort((a, b) => b.id - a.id);
}

export async function createUser(data: {
  email: string;
  name: string;
  role?: 'admin' | 'member';
  password?: string;
  permissions?: Partial<User['permissions']>;
  createdBy: number;
}): Promise<User> {
  const id = userIdCounter++;
  const password = data.password || generateRandomPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const user: User = {
    id,
    email: data.email,
    passwordHash,
    name: data.name,
    role: data.role || 'member',
    status: 'active',
    permissions: {
      ai_analyze: true,
      export: true,
      dashboard: true,
      share: true,
      upload: true,
      custom_ai_model: false,
      ...data.permissions,
    },
    createdBy: data.createdBy,
    createdAt: new Date().toISOString(),
  };
  users.set(id, user);
  return user;
}

export async function updateUser(
  id: number,
  data: Partial<Pick<User, 'name' | 'role' | 'status' | 'permissions'>> & { password?: string }
): Promise<User | null> {
  const user = users.get(id);
  if (!user) return null;

  if (data.name !== undefined) user.name = data.name;
  if (data.role !== undefined) user.role = data.role;
  if (data.status !== undefined) user.status = data.status;
  if (data.permissions !== undefined) {
    user.permissions = { ...user.permissions, ...data.permissions };
  }
  if (data.password) {
    user.passwordHash = await bcrypt.hash(data.password, 10);
  }

  users.set(id, user);
  return user;
}

export function deleteUser(id: number): boolean {
  return users.delete(id);
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.passwordHash);
}

// ==================== 登录日志 ====================
export function addLoginLog(data: Omit<LoginLog, 'id' | 'createdAt'>): LoginLog {
  const log: LoginLog = {
    ...data,
    id: logIdCounter++,
    createdAt: new Date().toISOString(),
  };
  loginLogs.unshift(log);
  // 保留最近1000条
  if (loginLogs.length > 1000) loginLogs.length = 1000;
  return log;
}

export function getLoginLogs(filter?: { userId?: number; status?: string; limit?: number }): LoginLog[] {
  let result = [...loginLogs];
  if (filter?.userId !== undefined) {
    result = result.filter(l => l.userId === filter.userId);
  }
  if (filter?.status) {
    result = result.filter(l => l.status === filter.status);
  }
  const limit = filter?.limit ?? 100;
  return result.slice(0, limit);
}

// ==================== 使用统计 ====================
export function recordUsage(userId: number, action: string): UsageStat {
  const today = new Date().toISOString().split('T')[0];
  const existing = usageStats.find(
    s => s.userId === userId && s.action === action && s.date === today
  );

  if (existing) {
    existing.count += 1;
    return existing;
  }

  const stat: UsageStat = {
    id: statIdCounter++,
    userId,
    action,
    count: 1,
    date: today,
    createdAt: new Date().toISOString(),
  };
  usageStats.push(stat);
  return stat;
}

export function getUsageStats(userId?: number): UsageStat[] {
  if (userId !== undefined) {
    return usageStats.filter(s => s.userId === userId);
  }
  return usageStats;
}

// ==================== AI配置 ====================
export function getAdminAIConfig(): AIConfig {
  return { ...adminAIConfig };
}

export function updateAdminAIConfig(data: Partial<Omit<AIConfig, 'id' | 'updatedAt'>>, updatedBy: number): AIConfig {
  adminAIConfig = {
    ...adminAIConfig,
    ...data,
    updatedBy,
    updatedAt: new Date().toISOString(),
  };
  return { ...adminAIConfig };
}

// ==================== 工具函数 ====================
function generateRandomPassword(): string {
  return Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4);
}

export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...safe } = user;
  return safe;
}

// 初始化：将之前exec_sql创建的管理员数据同步到内存（如果exec_sql已创建）
// 实际运行时内存存储是独立的
