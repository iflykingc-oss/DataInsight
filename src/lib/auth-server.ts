/**
 * 认证服务端持久化存储
 * 仅由API路由导入，不进入客户端bundle
 */

import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  type Role,
  type User,
  type UserPermissions,
  type LoginLog,
  type AuthStorage,
  setAuthStorage,
  ROLE_TEMPLATES,
} from './auth';

const DATA_DIR = path.join(process.cwd(), '.data');
const AUTH_FILE = path.join(DATA_DIR, 'auth-store.json');

// globalThis单例，防止HMR重建
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;
if (!g.__PERSISTENT_AUTH_INIT__) {
  g.__PERSISTENT_AUTH_INIT__ = true;

  class PersistentAuthStorage implements AuthStorage {
    private users = new Map<number, User>();
    private loginLogs: LoginLog[] = [];
    private userIdCounter = 1;
    private logIdCounter = 1;
    private saveTimer: ReturnType<typeof setTimeout> | null = null;

    constructor() {
      this.loadFromFile();
    }

    private loadFromFile(): void {
      try {
        if (!fs.existsSync(AUTH_FILE)) {
          this.initDefaultUsers();
          return;
        }
        const raw = fs.readFileSync(AUTH_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.users) {
          for (const u of parsed.users) {
            // 向后兼容：旧role 'member' -> 'editor'
            if (u.role === 'member') u.role = 'editor';
            this.users.set(u.id, u);
            if (u.id >= this.userIdCounter) this.userIdCounter = u.id + 1;
          }
        }
        if (parsed.loginLogs) {
          this.loginLogs = parsed.loginLogs;
          for (const l of parsed.loginLogs) {
            if (l.id >= this.logIdCounter) this.logIdCounter = l.id + 1;
          }
        }
        // 如果没有用户，初始化默认用户
        if (this.users.size === 0) {
          this.initDefaultUsers();
        }
      } catch (err) {
        console.error('[AuthServer] 加载失败，使用默认数据:', err);
        this.initDefaultUsers();
      }
    }

    private initDefaultUsers(): void {
      const adminPassword = process.env.INIT_ADMIN_PASSWORD || 'admin123';
      const users: Omit<User, 'id'>[] = [
        {
          username: 'admin',
          passwordHash: bcrypt.hashSync('admin123', 12),
          name: '管理员',
          role: 'admin',
          status: 'active',
          permissions: ROLE_TEMPLATES.admin,
          createdBy: null,
          createdAt: new Date().toISOString(),
        },
        {
          username: 'demo',
          passwordHash: bcrypt.hashSync('demo123', 12),
          name: '演示用户',
          role: 'editor',
          status: 'active',
          permissions: ROLE_TEMPLATES.editor,
          createdBy: 1,
          createdAt: new Date().toISOString(),
        },
      ];
      for (const u of users) {
        const id = this.userIdCounter++;
        this.users.set(id, { ...u, id });
      }
      this.scheduleSave();

      // 如果环境变量密码不是默认值，更新admin密码
      if (adminPassword !== 'admin123') {
        const admin = Array.from(this.users.values()).find(u => u.username === 'admin');
        if (admin) {
          admin.passwordHash = bcrypt.hashSync(adminPassword, 12);
        }
      }
    }

    private scheduleSave(): void {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.saveToFile(), 500);
    }

    private saveToFile(): void {
      try {
        if (!fs.existsSync(DATA_DIR)) {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        const data = {
          users: Array.from(this.users.values()).map(({ passwordHash, ...u }) => u),
          loginLogs: this.loginLogs,
        };
        fs.writeFileSync(AUTH_FILE, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        console.error('[AuthServer] 保存失败:', err);
      }
    }

    getUsers(): Map<number, User> { return this.users; }

    saveUser(user: User): void {
      if (user.id >= this.userIdCounter) {
        this.userIdCounter = user.id + 1;
      }
      this.users.set(user.id, user);
      this.scheduleSave();
    }

    deleteUser(id: number): boolean {
      const result = this.users.delete(id);
      if (result) this.scheduleSave();
      return result;
    }

    getNextUserId(): number { return this.userIdCounter++; }
    getNextLogId(): number { return this.logIdCounter++; }

    getLoginLogs(): LoginLog[] { return this.loginLogs; }
    addLoginLog(log: LoginLog): void {
      this.loginLogs.push(log);
      this.scheduleSave();
    }

    getUsageStats() { return []; }
    addUsageStat() { /* no-op */ }
    getAIConfig() { return { id: 1, apiKey: '', baseUrl: '', modelName: '', updatedBy: null, updatedAt: '' }; }
    saveAIConfig() { /* no-op */ }
  }

  setAuthStorage(new PersistentAuthStorage());
  console.log('[AuthServer] 持久化存储已初始化');
}
