'use client';

import { trackAuth } from '@/lib/activity-tracker';
import { setCurrentUserId } from '@/lib/safe-storage';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { showError, showSuccess } from './feedback';

export type UserRole = 'admin' | 'editor' | 'analyst' | 'viewer' | 'custom';

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
  name: string;
  role: UserRole;
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

export type PermissionKey = keyof User['permissions'];

// Check if user subscription has expired and downgrade plan if needed
function checkSubscriptionExpiry(user: User | null): User | null {
  if (!user) return null;
  try {
    const subRaw = localStorage.getItem(`datainsight_subscription_${user.id}`);
    if (!subRaw) return user;
    const sub = JSON.parse(subRaw);
    if (sub.planKey && sub.planKey !== 'free' && sub.expiresAt) {
      const expiry = new Date(sub.expiresAt);
      if (expiry < new Date()) {
        // Expired - downgrade to free
        sub.planKey = 'free';
        sub.status = 'expired';
        sub.autoRenew = false;
        localStorage.setItem(`datainsight_subscription_${user.id}`, JSON.stringify(sub));
        console.log('[Auth] Subscription expired, downgraded to free');
      }
    }
  } catch { /* ignore */ }
  return user;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasPermission: (key: keyof User['permissions']) => boolean;
  loginDialogOpen: boolean;
  setLoginDialogOpen: (open: boolean) => void;
  onLoginRequired: () => void;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [initialized, setInitialized] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('datainsight_token');
    if (!token) {
      // 检查系统是否已初始化
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        setInitialized(!data.needInit);
        if (data.needInit) {
          setLoginDialogOpen(true);
        }
      } catch {
        setInitialized(true);
      }
      setUser(null);
      setCurrentUserId(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const checkedUser = checkSubscriptionExpiry(data.user);
        setUser(checkedUser);
        setCurrentUserId(checkedUser?.id ?? null);
        setInitialized(true);
      } else if (res.status === 401) {
        // Token 过期，尝试刷新
        const refreshToken = localStorage.getItem('datainsight_refresh_token');
        if (refreshToken) {
          try {
            const refreshRes = await fetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              if (refreshData.success) {
                localStorage.setItem('datainsight_token', refreshData.token);
                localStorage.setItem('datainsight_refresh_token', refreshData.refreshToken);
                // 用新 Token 重试
                const retryRes = await fetch('/api/auth/me', {
                  headers: { Authorization: `Bearer ${refreshData.token}` },
                });
                if (retryRes.ok) {
                  const retryData = await retryRes.json();
                  // Check subscription expiry and auto-downgrade if needed
                  const sub = checkSubscriptionExpiry(retryData.user);
                  setUser(sub);
                  setCurrentUserId(sub?.id ?? null);
                  setInitialized(true);
                  setIsLoading(false);
                  return;
                }
              }
            }
          } catch { /* refresh failed */ }
        }
        localStorage.removeItem('datainsight_token');
        localStorage.removeItem('datainsight_refresh_token');
        setUser(null);
        setCurrentUserId(null);
      } else {
        localStorage.removeItem('datainsight_token');
        setUser(null);
        setCurrentUserId(null);
      }
    } catch {
      setUser(null);
      setCurrentUserId(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('datainsight_token', data.token);
        if (data.refreshToken) {
          localStorage.setItem('datainsight_refresh_token', data.refreshToken);
        }
        setUser(data.user);
        setCurrentUserId(data.user?.id ?? null);
        setInitialized(true);
        showSuccess('登录成功', `欢迎回来，${data.user.name}`);
        return { success: true };
      }

      // 系统未初始化
      if (data.needInit) {
        setInitialized(false);
        setLoginDialogOpen(true);
        return { success: false, error: '系统未初始化，请先创建管理员账号' };
      }

      showError(data.error || '登录失败');
      return { success: false, error: data.error || '登录失败' };
    } catch {
      showError('网络错误，请重试');
      return { success: false, error: '网络错误，请重试' };
    }
  }, []);

  const logout = useCallback(() => {
    trackAuth('logout');
    localStorage.removeItem('datainsight_token');
    localStorage.removeItem('datainsight_refresh_token');
    setUser(null);
    setCurrentUserId(null);
    showSuccess('已退出登录');
    window.location.reload();
  }, []);

  // 监听 Token 过期事件（由 request.ts 触发）
  useEffect(() => {
    const handleExpired = () => {
      localStorage.removeItem('datainsight_token');
      localStorage.removeItem('datainsight_refresh_token');
      setUser(null);
      setLoginDialogOpen(true);
      showError('登录已过期，请重新登录');
    };
    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const onLoginRequired = useCallback(() => {
    setLoginDialogOpen(true);
  }, []);

  const hasPermission = useCallback(
    (key: keyof User['permissions']) => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      return user.permissions[key] === true;
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isLoggedIn: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        refreshUser,
        hasPermission,
        onLoginRequired,
        loginDialogOpen,
        setLoginDialogOpen,
        initialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
