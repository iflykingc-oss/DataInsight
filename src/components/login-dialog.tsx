'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/lib/use-auth';
import { LogIn, Loader2, AlertCircle, Shield, UserPlus } from 'lucide-react';

export function LoginDialog() {
  const { loginDialogOpen, setLoginDialogOpen, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needInit, setNeedInit] = useState(false);
  const [isInitMode, setIsInitMode] = useState(false);

  // 检查系统是否需要初始化
  useEffect(() => {
    if (loginDialogOpen) {
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        .then(r => r.json())
        .then(data => {
          if (data.needInit) setNeedInit(true);
        })
        .catch(() => {});
    }
  }, [loginDialogOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isInitMode) {
        // 初始化管理员
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, initMode: true, initName: name }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('datainsight_token', data.token);
          window.location.reload();
        } else {
          setError(data.error || '初始化失败');
        }
      } else {
        const result = await login(username, password);
        if (result.success) {
          setLoginDialogOpen(false);
          setUsername('');
          setPassword('');
        } else {
          setError(result.error || '登录失败');
        }
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <LogIn className="w-5 h-5" />
            {isInitMode ? '初始化管理员账号' : '登录 DataInsight'}
          </DialogTitle>
          <DialogDescription>
            {isInitMode
              ? '系统首次使用，请创建管理员账号'
              : '登录后即可使用全部功能'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isInitMode && (
            <div className="space-y-2">
              <Label htmlFor="login-name">姓名</Label>
              <Input
                id="login-name"
                type="text"
                placeholder="请输入姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="login-username">账户</Label>
            <Input
              id="login-username"
              type="text"
              placeholder="请输入账户"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              minLength={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="login-password">密码</Label>
            <Input
              id="login-password"
              type="password"
              placeholder={isInitMode ? '至少8位，包含字母和数字' : '请输入密码'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isInitMode ? 'new-password' : 'current-password'}
              minLength={8}
            />
          </div>

          {isInitMode && (
            <div className="rounded-md bg-blue-50 p-3 text-xs text-blue-700 space-y-1">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span className="font-medium">密码要求</span>
              </div>
              <div>至少8位字符，同时包含字母和数字</div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isInitMode ? '创建中...' : '登录中...'}
              </>
            ) : (
              <>
                {isInitMode ? <UserPlus className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                {isInitMode ? '创建管理员' : '登录'}
              </>
            )}
          </Button>

          {needInit && !isInitMode && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => { setIsInitMode(true); setError(''); }}
            >
              <Shield className="w-4 h-4 mr-2" />
              初始化管理员账号
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
