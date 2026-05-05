/**
 * 认证与权限管理核心
 * 持久化版：用户数据保存到文件系统，服务器重启不丢失
 */

import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

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

// ==================== 安全存储接口（可替换实现） ====================
interface AuthStorage {
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

// ==================== 文件持久化存储 ====================
const DATA_DIR = path.join(process.cwd(), '.data');
const AUTH_FILE = path.join(DATA_DIR, 'auth-store.json');

class PersistentAuthStorage extends MemoryAuthStorage {
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.loadFromFile();
  }

  private loadFromFile() {
    try {
      if (!fs.existsSync(AUTH_FILE)) return;
      const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
      const data = JSON.parse(raw);

      // 恢复用户
      if (data.users && Array.isArray(data.users)) {
        for (const u of data.users) {
          super.saveUser(u);
          if (u.id >= (this as unknown as { userIdCounter: number }).userIdCounter) {
            (this as unknown as { userIdCounter: number }).userIdCounter = u.id + 1;
          }
        }
      }

      // 恢复登录日志
      if (data.loginLogs && Array.isArray(data.loginLogs)) {
        for (const l of data.loginLogs) {
          super.addLoginLog(l);
        }
      }

      // 恢复AI配置
      if (data.aiConfig) {
        super.saveAIConfig(data.aiConfig);
      }

      console.log(`[Auth] Loaded ${data.users?.length || 0} users from persistent storage`);
    } catch (err) {
      console.warn('[Auth] Failed to load persistent storage, starting fresh:', err instanceof Error ? err.message : err);
    }
  }

  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.saveNow(), 500);
  }

  private saveNow() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const usersMap = super.getUsers();
      const usersArray = Array.from(usersMap.values());
      console.log(`[Auth:Save] Saving ${usersArray.length} users to file:`, usersArray.map(u => u.username));
      const data = {
        users: usersArray,
        loginLogs: super.getLoginLogs(),
        aiConfig: super.getAIConfig(),
        savedAt: new Date().toISOString(),
      };
      fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
      this.dirty = false;
    } catch (err) {
      console.error('[Auth] Failed to save persistent storage:', err instanceof Error ? err.message : err);
    }
  }

  saveUser(user: User): void {
    super.saveUser(user);
    this.saveNow(); // Immediate save for user data integrity
  }

  deleteUser(id: number): boolean {
    const result = super.deleteUser(id);
    if (result) this.saveNow(); // Immediate save
    return result;
  }

  addLoginLog(log: LoginLog): void {
    super.addLoginLog(log);
    this.scheduleSave(); // Login logs can be deferred
  }

  saveAIConfig(config: AIConfig): void {
    super.saveAIConfig(config);
    this.saveNow(); // Immediate save for config changes
  }
}

// 全局存储实例（使用文件持久化）
// 使用 globalThis 防止 HMR 导致的重复实例化
const globalForAuth = globalThis as unknown as { __authStorage?: AuthStorage };
if (!globalForAuth.__authStorage) {
  globalForAuth.__authStorage = new PersistentAuthStorage();
}
let storage: AuthStorage = globalForAuth.__authStorage;

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
  role?: 'admin' | 'member';
  password?: string;
  permissions?: User['permissions'];
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

  s.saveUser(user);
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
      role: u.role as 'admin' | 'member',
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
  ip: string;
  user_agent: string;
  status: string;
  created_at: string;
}>): void {
  for (const l of dbLogs) {
    getStorage().addLoginLog({
      id: l.id,
      userId: l.user_id,
      username: l.username,
      ip: l.ip,
      userAgent: l.user_agent,
      status: l.status as 'success' | 'failed',
      createdAt: l.created_at,
    });
  }
}
