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
} from 'lucide-react';

interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  permissions: {
    ai_analyze: boolean;
    export: boolean;
    dashboard: boolean;
    share: boolean;
    upload: boolean;
    custom_ai_model: boolean;
  };
  createdAt: string;
}

interface LoginLog {
  id: number;
  userId: number;
  email: string;
  ip: string;
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
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'member' as 'admin' | 'member',
    password: '',
    permissions: {
      ai_analyze: true,
      export: true,
      dashboard: true,
      share: true,
      upload: true,
      custom_ai_model: false,
    },
  });

  // 登录记录
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);

  // AI配置
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    modelName: 'deepseek-chat',
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
            email: formData.email,
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
      email: u.email,
      name: u.name,
      role: u.role as 'admin' | 'member',
      password: '',
      permissions: { ...u.permissions },
    });
    setUserFormOpen(true);
  };

  const openAddForm = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      name: '',
      role: 'member',
      password: '',
      permissions: {
        ai_analyze: true,
        export: true,
        dashboard: true,
        share: true,
        upload: true,
        custom_ai_model: false,
      },
    });
    setUserFormOpen(true);
  };

  // 保存AI配置
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

  const togglePermission = (key: keyof typeof formData.permissions) => {
    setFormData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  if (user?.role !== 'admin') return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            管理员控制台
          </DialogTitle>
          <DialogDescription>
            管理用户账号、权限配置和系统设置
          </DialogDescription>
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
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>AI分析</TableHead>
                    <TableHead>导出</TableHead>
                    <TableHead>仪表盘</TableHead>
                    <TableHead>分享</TableHead>
                    <TableHead>上传</TableHead>
                    <TableHead>自定义模型</TableHead>
                    <TableHead className="w-[100px]">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-xs">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                          {u.role === 'admin' ? '管理员' : '成员'}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.permissions.ai_analyze ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}</TableCell>
                      <TableCell>{u.permissions.export ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}</TableCell>
                      <TableCell>{u.permissions.dashboard ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}</TableCell>
                      <TableCell>{u.permissions.share ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}</TableCell>
                      <TableCell>{u.permissions.upload ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}</TableCell>
                      <TableCell>{u.permissions.custom_ai_model ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-gray-400" />}</TableCell>
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
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingUser ? '编辑用户' : '添加用户'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {!editingUser && (
                    <div className="space-y-2">
                      <Label>邮箱 *</Label>
                      <Input
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="user@company.com"
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
                  <div className="space-y-2">
                    <Label>角色</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          checked={formData.role === 'member'}
                          onChange={() => setFormData({ ...formData, role: 'member' })}
                        />
                        成员
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="role"
                          checked={formData.role === 'admin'}
                          onChange={() => setFormData({ ...formData, role: 'admin' })}
                        />
                        管理员
                      </label>
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

                  <div className="space-y-3 pt-2">
                    <Label className="font-medium">功能权限</Label>
                    {(
                      [
                        ['ai_analyze', 'AI智能分析'],
                        ['export', '数据导出'],
                        ['dashboard', '仪表盘创建'],
                        ['share', '分享链接'],
                        ['upload', '文件上传'],
                        ['custom_ai_model', '自定义AI模型'],
                      ] as [keyof typeof formData.permissions, string][]
                    ).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm">{label}</span>
                        <Switch
                          checked={formData.permissions[key]}
                          onCheckedChange={() => togglePermission(key)}
                        />
                      </div>
                    ))}
                  </div>

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
                    <TableHead>邮箱</TableHead>
                    <TableHead>IP地址</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loginLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{log.email}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{log.ip}</TableCell>
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
                </div>
                <div className="space-y-2">
                  <Label>模型名称</Label>
                  <Input
                    value={aiConfig.modelName}
                    onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                    placeholder="gpt-4o"
                  />
                </div>
                <Button onClick={handleSaveAIConfig} disabled={aiConfigLoading}>
                  {aiConfigLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  保存配置
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
