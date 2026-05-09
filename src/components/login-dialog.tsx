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
import {
  LogIn, Loader2, AlertCircle, Shield, UserPlus, Mail,
  KeyRound, ArrowLeft, Eye, EyeOff, Lock, HelpCircle,
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'init' | 'reset';

// 预置安全问题列表（与后端 auth-server.ts 保持同步）
const SECURITY_QUESTIONS = [
  '您的出生地是哪里？',
  '您母亲的姓名是什么？',
  '您第一只宠物的名字是什么？',
  '您小学的名称是什么？',
  '您最喜欢的电影是什么？',
  '您童年最好的朋友叫什么？',
  '您第一次旅行的目的地是哪里？',
  '您最喜欢的一道菜是什么？',
  '您父亲的中间名是什么？',
  '您购买的第一辆车是什么品牌？',
];

export function LoginDialog() {
  const { loginDialogOpen, setLoginDialogOpen, login } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needInit, setNeedInit] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // 注册：安全问题
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [customQuestion, setCustomQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');

  // 密码重置
  const [resetStep, setResetStep] = useState<1 | 2 | 3>(1); // 1=输入邮箱 2=回答问题 3=设置新密码
  const [resetQuestion, setResetQuestion] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 重置表单状态
  const resetForm = useCallback(() => {
    setUsername('');
    setPassword('');
    setName('');
    setEmail('');
    setError('');
    setShowPassword(false);
    setSecurityQuestion('');
    setCustomQuestion('');
    setSecurityAnswer('');
    setResetStep(1);
    setResetQuestion('');
    setNewPassword('');
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
      resetForm();
      setMode('login');
    }
  }, [loginDialogOpen, resetForm]);

  // 获取最终的安全问题文本
  const getFinalQuestion = () => {
    return securityQuestion === '__custom__' ? customQuestion.trim() : securityQuestion;
  };

  // 注册提交
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const finalQuestion = getFinalQuestion();
    if (!finalQuestion) {
      setError('请选择或输入安全问题');
      return;
    }
    if (!securityAnswer.trim()) {
      setError('请设置安全问题答案');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          securityQuestion: finalQuestion,
          securityAnswer: securityAnswer.trim(),
        }),
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

  // 密码重置 - 步骤1：输入邮箱获取安全问题
  const handleResetStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-question', email }),
      });
      const data = await res.json();

      if (data.success) {
        setResetQuestion(data.question);
        setResetStep(2);
      } else {
        setError(data.error || '获取安全问题失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 密码重置 - 步骤2：验证安全问题答案
  const handleResetStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!securityAnswer.trim()) {
      setError('请输入安全问题答案');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-answer', email, answer: securityAnswer.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setResetStep(3);
      } else {
        setError(data.error || '验证失败');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 密码重置 - 步骤3：设置新密码
  const handleResetStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('密码至少8位字符');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('密码必须包含字母和数字');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reset-password',
          email,
          securityAnswer: securityAnswer.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setError('');
        // 自动切回登录
        switchMode('login');
      } else {
        setError(data.error || '密码重置失败');
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
    if (mode === 'reset') return '重置密码';
    return '登录 DataInsight';
  };

  const getDescription = () => {
    if (mode === 'init') return '系统首次使用，请创建管理员账号';
    if (mode === 'register') return '创建账号，开始智能数据分析';
    if (mode === 'reset') return '通过安全问题验证重置密码';
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
              ) : mode === 'reset' ? (
                <Lock className="w-5 h-5" />
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

        {/* ========== 注册表单（安全问题验证） ========== */}
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
              <Label htmlFor="reg-question">安全问题</Label>
              <div className="relative">
                <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  id="reg-question"
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 pl-9 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  required
                >
                  <option value="" disabled>请选择安全问题</option>
                  {SECURITY_QUESTIONS.map((q, i) => (
                    <option key={i} value={q}>{q}</option>
                  ))}
                  <option value="__custom__">自定义安全问题...</option>
                </select>
              </div>
            </div>

            {securityQuestion === '__custom__' && (
              <div className="space-y-2">
                <Label htmlFor="reg-custom-q">自定义问题</Label>
                <Input
                  id="reg-custom-q"
                  type="text"
                  placeholder="请输入您的安全问题"
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  required
                  maxLength={100}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reg-answer">安全问题答案</Label>
              <Input
                id="reg-answer"
                type="text"
                placeholder="请输入答案（用于密码重置验证）"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                required
                autoComplete="off"
                minLength={2}
              />
              <p className="text-[11px] text-muted-foreground">答案不区分大小写，请牢记此答案以便日后重置密码</p>
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
              <p className="font-medium text-foreground/80">账号安全提示</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>密码至少8位字符，同时包含字母和数字</li>
                <li>安全问题用于验证身份和重置密码，请选择只有您知道答案的问题</li>
                <li>安全问题答案不区分大小写</li>
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

        {/* ========== 密码重置表单 ========== */}
        {mode === 'reset' && (
          <form
            onSubmit={resetStep === 1 ? handleResetStep1 : resetStep === 2 ? handleResetStep2 : handleResetStep3}
            className="space-y-4 mt-2"
          >
            {/* 步骤指示器 */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={resetStep >= 1 ? 'text-primary font-medium' : ''}>1. 验证邮箱</span>
              <span className="text-border">→</span>
              <span className={resetStep >= 2 ? 'text-primary font-medium' : ''}>2. 回答问题</span>
              <span className="text-border">→</span>
              <span className={resetStep >= 3 ? 'text-primary font-medium' : ''}>3. 设置密码</span>
            </div>

            {/* 步骤1：输入邮箱 */}
            {resetStep === 1 && (
              <div className="space-y-2">
                <Label htmlFor="reset-email">注册邮箱</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="请输入注册时使用的邮箱"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            {/* 步骤2：回答安全问题 */}
            {resetStep === 2 && (
              <>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">您的安全问题</p>
                  <p className="text-sm font-medium text-foreground">{resetQuestion}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-answer">答案</Label>
                  <Input
                    id="reset-answer"
                    type="text"
                    placeholder="请输入安全问题答案"
                    value={securityAnswer}
                    onChange={(e) => setSecurityAnswer(e.target.value)}
                    required
                    autoComplete="off"
                    minLength={2}
                  />
                </div>
              </>
            )}

            {/* 步骤3：设置新密码 */}
            {resetStep === 3 && (
              <div className="space-y-2">
                <Label htmlFor="reset-new-password">新密码</Label>
                <div className="relative">
                  <Input
                    id="reset-new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="至少8位，包含字母和数字"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                <p className="text-[11px] text-muted-foreground">密码至少8位字符，同时包含字母和数字</p>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  验证中...
                </>
              ) : (
                <>
                  {resetStep === 1 && '下一步'}
                  {resetStep === 2 && '验证答案'}
                  {resetStep === 3 && (
                    <>
                      <KeyRound className="w-4 h-4 mr-2" />
                      重置密码
                    </>
                  )}
                </>
              )}
            </Button>

            <button
              type="button"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              onClick={() => switchMode('login')}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              返回登录
            </button>
          </form>
        )}

        {/* ========== 登录/初始化表单 ========== */}
        {mode !== 'register' && mode !== 'reset' && (
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
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <button
                  type="button"
                  className="hover:text-foreground transition-colors"
                  onClick={() => switchMode('reset')}
                >
                  忘记密码？
                </button>
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
