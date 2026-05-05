'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { showError, showSuccess } from './feedback';

export interface User {
  id: number;
  username: string;
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

export type PermissionKey = keyof User['permissions'];

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
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setInitialized(true);
      } else {
        localStorage.removeItem('datainsight_token');
        setUser(null);
      }
    } catch {
      setUser(null);
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
        setUser(data.user);
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
    localStorage.removeItem('datainsight_token');
    setUser(null);
    showSuccess('已退出登录');
    window.location.reload();
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
