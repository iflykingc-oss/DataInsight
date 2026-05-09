'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { LogIn, Loader2, AlertCircle, Shield, UserPlus, Mail, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react';

type AuthMode = 'login' | 'register' | 'init';

export function LoginDialog() {
  const { loginDialogOpen, setLoginDialogOpen, login } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needInit, setNeedInit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 验证码倒计时
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // 重置表单状态
  const resetForm = useCallback(() => {
    setUsername('');
    setPassword('');
    setName('');
    setEmail('');
    setVerifyCode('');
    setError('');
    setShowPassword(false);
  }, []);

  // 切换模式时重置
  const switchMode = useCallback((newMode: AuthMode) => {
    resetForm();
    setMode(newMode);
  }, [resetForm]);

  // 检查系统是否需要初始化
  useEffect(() => {
    if (loginDialogOpen) {
      fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
        .then(r => r.json())
        .then(data => {
          if (data.needInit) {
            setNeedInit(true);
            setMode('init');
          }
        })
        .catch(() => {});
    } else {
      // 弹窗关闭时重置
      resetForm();
      setMode('login');
    }
  }, [loginDialogOpen, resetForm]);

  // 发送验证码
  const handleSendCode = async () => {
    if (!email || countdown > 0) return;
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register' }),
      });
      const data = await res.json();

      if (data.success) {
        setCountdown(60);
      } else {
        setError(data.error || '发送验证码失败');
      }
    } catch {
      setError('网络错误，请重试');
    }
  };

  // 注册提交
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verifyCode, password, name }),
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('datainsight_token', data.token);
        window.location.reload();
      } else {
        setError(data.error || '注册失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 登录/初始化提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'init') {
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

  const getTitle = () => {
    if (mode === 'init') return '初始化管理员账号';
    if (mode === 'register') return '注册 DataInsight';
    return '登录 DataInsight';
  };

  const getDescription = () => {
    if (mode === 'init') return '系统首次使用，请创建管理员账号';
    if (mode === 'register') return '创建账号，开始智能数据分析';
    return '登录后即可使用全部功能';
  };

  return (
    <Dialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen}>
      <DialogContent showCloseButton={false} className="sm:max-w-[420px]">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2 text-lg">
              {mode === 'register' ? (
                <UserPlus className="w-5 h-5" />
              ) : mode === 'init' ? (
                <Shield className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              {getTitle()}
            </DialogTitle>
            <DialogDescription>{getDescription()}</DialogDescription>
          </div>
          <button
            onClick={() => setLoginDialogOpen(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none mt-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            <span className="sr-only">关闭</span>
          </button>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ========== 注册表单 ========== */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label htmlFor="reg-email">邮箱地址</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reg-email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-code">验证码</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-code"
                    type="text"
                    placeholder="6位验证码"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="pl-9"
                    required
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0 min-w-[100px]"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || !email}
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-name">姓名</Label>
              <Input
                id="reg-name"
                type="text"
                placeholder="请输入姓名"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reg-password">密码</Label>
              <div className="relative">
                <Input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="至少8位，包含字母和数字"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground/80">密码要求</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>至少8位字符</li>
                <li>同时包含字母和数字</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  注册中...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  注册
                </>
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              已有账号？{' '}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => switchMode('login')}
              >
                立即登录
              </button>
            </div>
          </form>
        )}

        {/* ========== 登录/初始化表单 ========== */}
        {mode !== 'register' && (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {mode === 'init' && (
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
                placeholder="用户名或邮箱"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">密码</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={mode === 'init' ? '至少8位，包含字母和数字' : '请输入密码'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'init' ? 'new-password' : 'current-password'}
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'init' && (
              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  <span className="font-medium text-foreground/80">密码要求</span>
                </div>
                <div>至少8位字符，同时包含字母和数字</div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {mode === 'init' ? '创建中...' : '登录中...'}
                </>
              ) : (
                <>
                  {mode === 'init' ? <UserPlus className="w-4 h-4 mr-2" /> : <LogIn className="w-4 h-4 mr-2" />}
                  {mode === 'init' ? '创建管理员' : '登录'}
                </>
              )}
            </Button>

            {needInit && mode === 'login' && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => switchMode('init')}
              >
                <Shield className="w-4 h-4 mr-2" />
                初始化管理员账号
              </Button>
            )}

            {!needInit && mode === 'login' && (
              <div className="text-center text-sm text-muted-foreground">
                还没有账号？{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => switchMode('register')}
                >
                  邮箱注册
                </button>
              </div>
            )}

            {mode === 'init' && (
              <button
                type="button"
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
                onClick={() => switchMode('login')}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                返回登录
              </button>
            )}
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
