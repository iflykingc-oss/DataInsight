'use client';

import { useState, useEffect } from 'react';
import {
  Users, LogIn, Brain, BarChart3, Plus, Edit3, Trash2, Shield,
  CheckCircle2, AlertCircle, Lock, LayoutGrid, Settings2,
  RefreshCw, Activity, TrendingUp, Database
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/use-auth';
import { request } from '@/lib/request';

type Role = 'admin' | 'editor' | 'analyst' | 'viewer' | 'custom';

interface UserData {
  id: number;
  username: string;
  name: string;
  email?: string;
  role: string;
  status?: string;
  permissions: Record<string, boolean>;
  createdAt?: string;
  createdBy?: number | null;
}

interface FormData {
  username: string;
  name: string;
  role: Role;
  password: string;
  permissions: Record<string, boolean>;
}

const ROLE_TEMPLATES: Record<Role, Record<string, boolean>> = {
  admin: {
    upload: true, export: true, share: true, report: true,
    dashboard: true, ai_analyze: true, ai_field: true, ai_formula: true,
    ai_table_builder: true, workflow: true, sql_query: true, metric_custom: true,
    admin_user: true, admin_ai_config: true, custom_ai_model: true,
    form: true,
  },
  editor: {
    upload: true, export: true, share: true, report: true,
    dashboard: true, ai_analyze: true, ai_field: true, ai_formula: true,
    ai_table_builder: true, workflow: false, sql_query: false, metric_custom: false,
    admin_user: false, admin_ai_config: false, custom_ai_model: false,
    form: true,
  },
  analyst: {
    upload: true, export: true, share: true, report: true,
    dashboard: true, ai_analyze: true, ai_field: false, ai_formula: true,
    ai_table_builder: false, workflow: false, sql_query: true, metric_custom: true,
    admin_user: false, admin_ai_config: false, custom_ai_model: false,
    form: false,
  },
  viewer: {
    upload: false, export: true, share: true, report: true,
    dashboard: true, ai_analyze: true, ai_field: false, ai_formula: false,
    ai_table_builder: false, workflow: false, sql_query: false, metric_custom: false,
    admin_user: false, admin_ai_config: false, custom_ai_model: false,
    form: false,
  },
  custom: {
    upload: true, export: true, share: true, report: true,
    dashboard: true, ai_analyze: true, ai_field: false, ai_formula: false,
    ai_table_builder: false, workflow: false, sql_query: false, metric_custom: false,
    admin_user: false, admin_ai_config: false, custom_ai_model: false,
    form: false,
  },
};

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理员', desc: '全部权限', restricted: false },
  { value: 'editor', label: '编辑者', desc: '数据处理+AI', restricted: false },
  { value: 'analyst', label: '分析师', desc: '分析+SQL', restricted: false },
  { value: 'viewer', label: '查看者', desc: '只读访问', restricted: false },
];

export default function AdminContent() {
  const { user } = useAuth();
  const token = localStorage.getItem('datainsight_token') ?? '';
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<UserData[]>([]);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [usageStats, setUsageStats] = useState<any[]>([]);
  const [aiConfig, setAiConfig] = useState({ apiKey: '', baseUrl: '', modelName: 'deepseek-chat' });
  const [loading, setLoading] = useState(false);
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [formData, setFormData] = useState<FormData>({
    username: '', name: '', role: 'editor', password: '', permissions: { ...ROLE_TEMPLATES.editor },
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(0);
  const [logsTotal, setLogsTotal] = useState(0);

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setError('');
    setSuccess('');
    if (type === 'error') setError(msg);
    else setSuccess(msg);
    setTimeout(() => { setError(''); setSuccess(''); }, 3000);
  };

  const fetchUsers = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await request<{ data: UserData[] }>('/api/admin/users');
      setUsers(data.data || []);
    } catch (e) {
      showMessage('加载用户列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginLogs = async (page = 0) => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const data = await request<{ data: any[]; total: number }>(`/api/admin/login-logs?page=${page}&limit=20`);
      setLoginLogs(data.data || []);
      setLogsTotal(data.total || 0);
    } catch {
      showMessage('加载登录记录失败', 'error');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const data = await request<{ data: any[] }>('/api/admin/usage-stats');
      setUsageStats(data.data || []);
    } catch {
      showMessage('加载使用统计失败', 'error');
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchAIConfig = async () => {
    try {
      const data = await request<{ apiKey: string; baseUrl: string; modelName: string }>('/api/admin/ai-config');
      setAiConfig({
        apiKey: data.apiKey || '',
        baseUrl: data.baseUrl || '',
        modelName: data.modelName || 'deepseek-chat',
      });
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers();
      fetchLoginLogs();
      fetchUsageStats();
      fetchAIConfig();
    }
  }, [user?.role]);

  const applyRoleTemplate = (role: Role) => {
    setFormData((prev) => ({
      ...prev,
      role,
      permissions: { ...ROLE_TEMPLATES[role] },
    }));
  };

  const handleSaveUser = async () => {
    if (!token) return;
    if (!formData.name || !formData.username) {
      showMessage('请填写必填项', 'error');
      return;
    }
    setLoading(true);
    try {
      const url = editingUser ? `/api/admin/users?id=${editingUser.id}` : '/api/admin/users';
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
      username: '', name: '', role: 'editor', password: '',
      permissions: { ...ROLE_TEMPLATES.editor },
    });
    setUserFormOpen(true);
  };

  const handleSaveAIConfig = async () => {
    setAiConfigLoading(true);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(aiConfig),
      });
      const data = await res.json();
      if (res.ok) showMessage('AI配置已保存');
      else showMessage(data.error || '保存失败', 'error');
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
      if (res.ok && data.success) showMessage(`连接成功！模型: ${data.model || aiConfig.modelName}`);
      else showMessage(data.error || '连接失败', 'error');
    } catch {
      showMessage('网络错误，无法测试连接', 'error');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const togglePermission = (key: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !prev.permissions[key] },
    }));
  };

  const permissionCategories = [
    { key: '数据与AI', icon: <Brain className="w-3.5 h-3.5" />, keys: ['upload', 'export', 'ai_analyze', 'ai_table_builder', 'ai_formula', 'ai_field'] },
    { key: '可视化', icon: <LayoutGrid className="w-3.5 h-3.5" />, keys: ['dashboard', 'report', 'share', 'metric_custom', 'form'] },
    { key: '高级功能', icon: <Settings2 className="w-3.5 h-3.5" />, keys: ['sql_query', 'workflow', 'custom_ai_model'] },
    { key: '系统管理', icon: <Shield className="w-3.5 h-3.5" />, keys: ['admin_user', 'admin_ai_config'] },
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

  // 统计汇总
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === 'active').length;
  const totalLogins = logsTotal;
  const totalApiCalls = usageStats.reduce((sum, s) => sum + (s.count || 0), 0);

  return (
    <div className="h-full flex flex-col">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Users className="w-3.5 h-3.5" /> 用户总数
          </div>
          <div className="text-2xl font-semibold">{totalUsers}</div>
          <div className="text-xs text-muted-foreground mt-1">{activeUsers} 活跃</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <LogIn className="w-3.5 h-3.5" /> 登录记录
          </div>
          <div className="text-2xl font-semibold">{totalLogins}</div>
          <div className="text-xs text-muted-foreground mt-1">近90天内</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Brain className="w-3.5 h-3.5" /> API调用
          </div>
          <div className="text-2xl font-semibold">{totalApiCalls.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground mt-1">总调用次数</div>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
            <Activity className="w-3.5 h-3.5" /> 在线状态
          </div>
          <div className="text-2xl font-semibold">{activeUsers}</div>
          <div className="text-xs text-muted-foreground mt-1">活跃账号</div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 bg-green-50 text-green-800 border-green-200">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-4">
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
            AI配置
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="w-4 h-4" />
            使用统计
          </TabsTrigger>
        </TabsList>

        {/* 用户管理 */}
        <TabsContent value="users" className="flex-1 mt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-medium">用户列表</h3>
              <p className="text-xs text-muted-foreground">共 {users.length} 个用户</p>
            </div>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4 mr-1" />
              添加用户
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>账户</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm font-mono">{u.username}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email || '-'}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(u)}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        {u.id !== user?.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteUser(u.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      暂无用户
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* 登录记录 */}
        <TabsContent value="logs" className="flex-1 mt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-medium">登录记录</h3>
              <p className="text-xs text-muted-foreground">共 {logsTotal} 条记录（近90天）</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchLoginLogs(logsPage)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              刷新
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>账户</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>错误信息</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : loginLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{log.username}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status === 'success' ? '成功' : '失败'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {!logsLoading && loginLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      暂无记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {logsTotal > 20 && (
            <div className="flex justify-center gap-2 mt-3">
              <Button variant="outline" size="sm" disabled={logsPage === 0} onClick={() => { setLogsPage(p => p - 1); fetchLoginLogs(logsPage - 1); }}>
                上一页
              </Button>
              <span className="text-xs text-muted-foreground self-center">
                第 {logsPage + 1} 页，共 {Math.ceil(logsTotal / 20)} 页
              </span>
              <Button variant="outline" size="sm" disabled={loginLogs.length < 20} onClick={() => { setLogsPage(p => p + 1); fetchLoginLogs(logsPage + 1); }}>
                下一页
              </Button>
            </div>
          )}
        </TabsContent>

        {/* AI配置 */}
        <TabsContent value="ai" className="flex-1 mt-4">
          <div className="max-w-xl">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={aiConfig.baseUrl}
                  onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                  placeholder="https://api.deepseek.com"
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={aiConfig.apiKey}
                  onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </div>
              <div className="space-y-2">
                <Label>模型名称</Label>
                <Input
                  value={aiConfig.modelName}
                  onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                  placeholder="deepseek-chat"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveAIConfig} disabled={aiConfigLoading}>
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  保存配置
                </Button>
                <Button variant="outline" onClick={handleTestAIConnection} disabled={aiConfigLoading}>
                  <Brain className="w-4 h-4 mr-1" />
                  测试连接
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 使用统计 */}
        <TabsContent value="stats" className="flex-1 mt-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-medium">API调用统计</h3>
              <p className="text-xs text-muted-foreground">各接口调用次数</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsageStats} disabled={statsLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${statsLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>接口</TableHead>
                  <TableHead>调用次数</TableHead>
                  <TableHead>最近调用</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : usageStats.length > 0 ? usageStats.map((s) => (
                  <TableRow key={s.endpoint || s.id}>
                    <TableCell className="font-mono text-xs">{s.endpoint || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">{s.count?.toLocaleString()}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.last_used ? new Date(s.last_used).toLocaleString('zh-CN') : '-'}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      暂无统计数据
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* 添加/编辑用户弹窗 */}
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent showCloseButton={false} className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-start justify-between">
            <DialogTitle>{editingUser ? '编辑用户' : '添加用户'}</DialogTitle>
            <button onClick={() => setUserFormOpen(false)} className="rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </DialogHeader>
          <div className="space-y-5">
            {!editingUser && (
              <div className="space-y-2">
                <Label>账户 *</Label>
                <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="输入账户名" />
              </div>
            )}
            <div className="space-y-2">
              <Label>姓名 *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="用户姓名" />
            </div>

            {/* 角色模板 */}
            <div className="space-y-2">
              <Label>角色模板</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => applyRoleTemplate(opt.value as Role)}
                    className={`relative flex flex-col items-start p-3 rounded-lg border text-left transition-all ${
                      formData.role === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                    {formData.role === opt.value && (
                      <CheckCircle2 className="w-4 h-4 text-primary absolute top-2 right-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{editingUser ? '新密码（留空不修改）' : '密码（留空自动生成）'}</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editingUser ? '不修改' : '自动生成'} />
            </div>

            {/* 权限配置 */}
            <div className="space-y-3">
              <Label>权限配置</Label>
              {permissionCategories.map((cat) => (
                <div key={cat.key} className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {cat.icon}
                    {cat.key}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.keys.map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => togglePermission(key)}
                        className={`px-2 py-0.5 rounded text-xs border transition-all ${
                          formData.permissions[key]
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'bg-muted border-border text-muted-foreground'
                        }`}
                      >
                        {key.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSaveUser} disabled={loading} className="flex-1">
                {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                {editingUser ? '保存修改' : '创建用户'}
              </Button>
              <Button variant="outline" onClick={() => setUserFormOpen(false)}>
                取消
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
