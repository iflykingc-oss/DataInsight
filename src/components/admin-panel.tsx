'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/use-auth';
import {
  Users,
  Shield,
  Brain,
  LogIn,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Activity,
  KeyRound,
  LayoutGrid,
  Settings2,
  Lock,
  Zap,
} from 'lucide-react';
import { ROLE_TEMPLATES, PERMISSION_LABELS, type Role } from '@/lib/auth';

interface UserData {
  id: number;
  username: string;
  name: string;
  role: string;
  status: string;
  permissions: Record<string, boolean>;
  createdAt: string;
}

interface LoginLog {
  id: number;
  userId: number;
  username: string;
  status: string;
  createdAt: string;
}

interface AIConfig {
  apiKey: string;
  baseUrl: string;
  modelName: string;
}

interface AdminPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_OPTIONS: { value: Role; label: string; desc: string; restricted?: boolean }[] = [
  { value: 'admin', label: '管理员', desc: '全部权限（系统保留，不可创建）', restricted: true },
  { value: 'editor', label: '编辑者', desc: '可上传、分析、建表、仪表盘' },
  { value: 'analyst', label: '分析师', desc: '可分析、图表、SQL查询' },
  { value: 'viewer', label: '查看者', desc: '仅查看仪表盘和报表' },
  { value: 'custom', label: '自定义', desc: '手动配置权限' },
];

export default function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 用户管理
  const [users, setUsers] = useState<UserData[]>([]);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<{
    username: string;
    name: string;
    role: Role;
    password: string;
    permissions: Record<string, boolean>;
  }>({
    username: '',
    name: '',
    role: 'editor',
    password: '',
    permissions: { ...ROLE_TEMPLATES.editor },
  });

  // 登录记录
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);

  // AI配置
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    apiKey: '',
    baseUrl: '',
    modelName: '',
  });
  const [aiConfigLoading, setAiConfigLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('datainsight_token') : '';

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    if (type === 'success') {
      setSuccess(msg);
      setError('');
    } else {
      setError(msg);
      setSuccess('');
    }
    setTimeout(() => {
      setSuccess('');
      setError('');
    }, 3000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setUsers(data.data);
    } catch {
      showMessage('获取用户列表失败', 'error');
    }
  }, [token]);

  const fetchLoginLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/login-logs?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setLoginLogs(data.data);
    } catch {
      showMessage('获取登录记录失败', 'error');
    }
  }, [token]);

  const fetchAIConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/ai-config', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setAiConfig(data.data);
    } catch {
      showMessage('获取AI配置失败', 'error');
    }
  }, [token]);

  useEffect(() => {
    if (open && user?.role === 'admin') {
      fetchUsers();
      fetchLoginLogs();
      fetchAIConfig();
    }
  }, [open, user, fetchUsers, fetchLoginLogs, fetchAIConfig]);

  const applyRoleTemplate = (role: Role) => {
    if (role === 'custom') {
      // 自定义角色：保留当前权限设置，仅切换角色标识
      setFormData((prev) => ({ ...prev, role: 'custom' }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      role,
      permissions: { ...ROLE_TEMPLATES[role] },
    }));
  };

  // 添加/编辑用户
  const handleSaveUser = async () => {
    setLoading(true);
    try {
      const url = editingUser
        ? `/api/admin/users?id=${editingUser.id}`
        : '/api/admin/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload = editingUser
        ? {
            name: formData.name,
            role: formData.role,
            permissions: formData.permissions,
            ...(formData.password ? { password: formData.password } : {}),
          }
        : {
            username: formData.username,
            name: formData.name,
            role: formData.role,
            password: formData.password || undefined,
            permissions: formData.permissions,
          };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        showMessage(editingUser ? '用户已更新' : '用户已创建');
        setUserFormOpen(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        showMessage(data.error || '操作失败', 'error');
      }
    } catch {
      showMessage('网络错误', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('确定要删除该用户吗？')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('用户已删除');
        fetchUsers();
      } else {
        showMessage(data.error || '删除失败', 'error');
      }
    } catch {
      showMessage('网络错误', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEditForm = (u: UserData) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      name: u.name,
      role: (u.role as Role) || 'editor',
      password: '',
      permissions: { ...u.permissions },
    });
    setUserFormOpen(true);
  };

  const openAddForm = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      role: 'editor',
      password: '',
      permissions: { ...ROLE_TEMPLATES.editor },
    });
    setUserFormOpen(true);
  };

  const handleSaveAIConfig = async () => {
    setAiConfigLoading(true);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(aiConfig),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('AI配置已保存');
      } else {
        showMessage(data.error || '保存失败', 'error');
      }
    } catch {
      showMessage('网络错误', 'error');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const handleTestAIConnection = async () => {
    if (!aiConfig.apiKey || !aiConfig.baseUrl) {
      showMessage('请先填写 API Key 和 Base URL', 'error');
      return;
    }
    setAiConfigLoading(true);
    try {
      const res = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiConfig),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMessage(`连接成功！模型: ${data.model || aiConfig.modelName}`, 'success');
      } else {
        showMessage(data.error || '连接失败，请检查配置', 'error');
      }
    } catch {
      showMessage('网络错误，无法测试连接', 'error');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const togglePermission = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  // 权限按类别分组
  const permissionCategories = [
    {
      key: '数据与AI',
      icon: <Brain className="w-4 h-4" />,
      keys: ['upload', 'export', 'ai_analyze', 'ai_table_builder', 'ai_formula', 'ai_field'],
    },
    {
      key: '可视化与报表',
      icon: <LayoutGrid className="w-4 h-4" />,
      keys: ['dashboard', 'report', 'share', 'metric_custom', 'form'],
    },
    {
      key: '高级功能',
      icon: <Settings2 className="w-4 h-4" />,
      keys: ['sql_query', 'workflow', 'custom_ai_model'],
    },
    {
      key: '系统管理',
      icon: <Shield className="w-4 h-4" />,
      keys: ['admin_user', 'admin_ai_config'],
    },
  ];

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      admin: { label: '管理员', variant: 'default' },
      editor: { label: '编辑者', variant: 'secondary' },
      analyst: { label: '分析师', variant: 'outline' },
      viewer: { label: '查看者', variant: 'outline' },
      custom: { label: '自定义', variant: 'destructive' },
    };
    const cfg = map[role] || { label: role, variant: 'outline' as const };
    return <Badge variant={cfg.variant} className="text-xs">{cfg.label}</Badge>;
  };

  if (user?.role !== 'admin') return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              管理员控制台
            </DialogTitle>
            <DialogDescription>
              管理用户账号、权限配置和系统设置
            </DialogDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
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
        {success && (
          <Alert className="bg-green-50 text-green-800 border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="gap-1.5">
              <Users className="w-4 h-4" />
              用户管理
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <LogIn className="w-4 h-4" />
              登录记录
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Brain className="w-4 h-4" />
              AI模型配置
            </TabsTrigger>
          </TabsList>

          {/* 用户管理 */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium">用户列表</h3>
                <p className="text-xs text-muted-foreground">共 {users.length} 个用户</p>
              </div>
              <Button size="sm" onClick={openAddForm}>
                <Plus className="w-4 h-4 mr-1" />
                添加用户
              </Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>账户</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>数据</TableHead>
                    <TableHead>AI</TableHead>
                    <TableHead>仪表盘</TableHead>
                    <TableHead>系统</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-xs">{u.username}</TableCell>
                      <TableCell>{getRoleBadge(u.role)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.permissions.upload && <Badge variant="outline" className="text-xs h-5">上传</Badge>}
                          {u.permissions.export && <Badge variant="outline" className="text-xs h-5">导出</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.permissions.ai_analyze && <Badge variant="outline" className="text-xs h-5">分析</Badge>}
                          {u.permissions.ai_table_builder && <Badge variant="outline" className="text-xs h-5">建表</Badge>}
                          {u.permissions.ai_formula && <Badge variant="outline" className="text-xs h-5">公式</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.permissions.dashboard && <Badge variant="outline" className="text-xs h-5">仪表盘</Badge>}
                          {u.permissions.share && <Badge variant="outline" className="text-xs h-5">分享</Badge>}
                          {u.permissions.report && <Badge variant="outline" className="text-xs h-5">报表</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.permissions.admin_user && <Badge variant="outline" className="text-xs h-5">用户管理</Badge>}
                          {u.permissions.admin_ai_config && <Badge variant="outline" className="text-xs h-5">AI配置</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditForm(u)}
                          >
                            <Edit3 className="w-4 h-4" />
                          </Button>
                          {u.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDeleteUser(u.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 添加/编辑用户弹窗 */}
            <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
              <DialogContent showCloseButton={false} className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-start justify-between">
                  <DialogTitle>{editingUser ? '编辑用户' : '添加用户'}</DialogTitle>
                  <button
                    onClick={() => setUserFormOpen(false)}
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    <span className="sr-only">关闭</span>
                  </button>
                </DialogHeader>
                <div className="space-y-5">
                  {!editingUser && (
                    <div className="space-y-2">
                      <Label>账户 *</Label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="输入账户名"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>姓名 *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="用户姓名"
                    />
                  </div>

                  {/* 角色选择 */}
                  <div className="space-y-2">
                    <Label>角色模板</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => !opt.restricted && applyRoleTemplate(opt.value)}
                          disabled={opt.restricted}
                          className={`relative flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                            opt.restricted
                              ? 'border-border/50 bg-muted/30 opacity-50 cursor-not-allowed'
                              : formData.role === opt.value
                                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                : 'border-border hover:border-muted-foreground/30'
                          }`}
                        >
                          <span className="text-sm font-medium">{opt.label}</span>
                          <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                          {opt.restricted && (
                            <Lock className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />
                          )}
                          {!opt.restricted && formData.role === opt.value && (
                            <CheckCircle2 className="w-4 h-4 text-primary absolute top-2 right-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{editingUser ? '新密码（留空不修改）' : '密码（留空自动生成）'}</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? '不修改' : '自动生成'}
                    />
                  </div>

                  {/* 权限配置 */}
                  {formData.role === 'custom' && (
                    <div className="space-y-4 pt-2 border-t">
                      <Label className="font-medium">自定义权限</Label>
                      {permissionCategories.map((cat) => (
                        <div key={cat.key} className="space-y-2">
                          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            {cat.icon}
                            {cat.key}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {cat.keys
                              .filter((k) => PERMISSION_LABELS[k as keyof typeof PERMISSION_LABELS])
                              .map((key) => (
                                <div key={key} className="flex items-center justify-between bg-muted/40 rounded-md px-3 py-2">
                                  <span className="text-sm">
                                    {PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS] || key}
                                  </span>
                                  <Switch
                                    checked={!!formData.permissions[key]}
                                    onCheckedChange={() => togglePermission(key)}
                                    className="scale-90"
                                  />
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button onClick={handleSaveUser} disabled={loading} className="w-full">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingUser ? '保存修改' : '创建用户'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* 登录记录 */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium">登录记录</h3>
                <p className="text-xs text-muted-foreground">最近 100 条</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchLoginLogs}>
                <Activity className="w-4 h-4 mr-1" />
                刷新
              </Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>账户</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{log.username}</TableCell>
                      <TableCell>
                        {log.status === 'success' ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            成功
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            失败
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {loginLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        暂无登录记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* AI模型配置 */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  AI模型配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="sk-xxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-muted-foreground">
                    所有用户将默认使用此API Key进行AI分析
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Base URL</Label>
                  <Input
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                  />
                  <p className="text-xs text-muted-foreground">
                    支持 OpenAI 兼容接口格式，如：DeepSeek、通义千问、Moonshot、GLM 等
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>模型名称</Label>
                  <Input
                    value={aiConfig.modelName}
                    onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                    placeholder="gpt-4o / deepseek-chat / qwen-plus ..."
                  />
                  <p className="text-xs text-muted-foreground">
                    常见模型：gpt-4o、gpt-4o-mini、deepseek-chat、qwen-plus、moonshot-v1-8k、glm-4-flash
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveAIConfig} disabled={aiConfigLoading} className="flex-1">
                    {aiConfigLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    保存配置
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestAIConnection}
                    disabled={aiConfigLoading || !aiConfig.apiKey || !aiConfig.baseUrl}
                    className="gap-1.5"
                  >
                    <Zap className="w-4 h-4" />
                    测试连接
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
