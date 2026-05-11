'use client';

import { useState, useEffect, memo, useMemo } from 'react';
import {
  Users, LogIn, Brain, BarChart3, Plus, Edit3, Trash2, Shield,
  CheckCircle2, AlertCircle, Lock, LayoutGrid, Settings2,
  RefreshCw, Activity, TrendingUp, Database, CreditCard,
  Star, Zap, Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

interface AdminContentProps {
  activeTab: string;
}

function AdminContent({ activeTab }: AdminContentProps) {
  const { user } = useAuth();
  const token = typeof window !== 'undefined' ? localStorage.getItem('datainsight_token') ?? '' : '';
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

  // Plans management state
  const [plans, setPlans] = useState([
    { id: 'free', name: '免费版', price: 0, period: '永久', features: ['基础数据表格', '5 个仪表盘', '基础图表'], active: true, users: 128 },
    { id: 'pro', name: '专业版', price: 29, period: '月', features: ['全部 AI 功能', '无限仪表盘', '高级图表', '数据导出', '团队协作'], active: true, users: 56 },
    { id: 'team', name: '团队版', price: 99, period: '月', features: ['专业版全部功能', '成员管理', '权限控制', 'API 接入', '优先支持'], active: true, users: 12 },
    { id: 'enterprise', name: '企业版', price: 299, period: '月', features: ['团队版全部功能', '私有化部署', '定制开发', 'SLA 保障', '专属客服'], active: false, users: 0 },
  ]);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

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
    <div className="h-full flex flex-col overflow-auto">
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

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <>
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
          <div className="border border-border rounded-lg overflow-hidden">
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
                    <TableCell className="font-medium">{typeof u.name === 'string' ? u.name : String(u.name ?? '')}</TableCell>
                    <TableCell className="text-sm font-mono">{typeof u.username === 'string' ? u.username : String(u.username ?? '')}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{typeof u.email === 'string' ? u.email : '-'}</TableCell>
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
        </>
      )}

      {/* 登录记录 */}
      {activeTab === 'logs' && (
        <>
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
                    <TableCell className="text-sm font-mono">{typeof log.username === 'string' ? log.username : String(log.username ?? '')}</TableCell>
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
        </>
      )}

      {/* AI配置 */}
      {activeTab === 'ai-config' && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h3 className="text-base font-medium">AI 模型配置</h3>
            <p className="text-sm text-muted-foreground mt-1">配置全局 AI 模型，所有用户将共用此配置</p>
          </div>
          <div className="space-y-5 bg-card border rounded-xl p-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium">接口地址（Base URL）</Label>
              <Input
                value={aiConfig.baseUrl}
                onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                placeholder="https://api.deepseek.com"
              />
              <p className="text-xs text-muted-foreground">OpenAI 兼容格式的 API 接口地址</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">密钥（API Key）</Label>
              <Input
                type="password"
                value={aiConfig.apiKey}
                onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground">从模型服务商获取的 API Key</p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">模型名称（Model Name）</Label>
              <Input
                value={aiConfig.modelName}
                onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                placeholder="deepseek-chat"
              />
              <p className="text-xs text-muted-foreground">例如：gpt-3.5-turbo、deepseek-chat、claude-3-sonnet</p>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveAIConfig} disabled={aiConfigLoading} className="min-w-[100px]">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                保存配置
              </Button>
              <Button variant="outline" onClick={handleTestAIConnection} disabled={aiConfigLoading}>
                <Brain className="w-4 h-4 mr-1.5" />
                测试连接
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 使用统计 */}
      {activeTab === 'stats' && (
        <>
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
        </>
      )}

      {/* 套餐管理 */}
      {activeTab === 'plans' && (
        <>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-base font-medium">订阅套餐管理</h3>
              <p className="text-xs text-muted-foreground mt-0.5">配置用户订阅套餐、价格与功能权限</p>
            </div>
            <Button size="sm" onClick={() => { setEditingPlan(null); setPlanFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              新增套餐
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className={`relative rounded-xl border p-5 transition-all hover:shadow-md ${
                plan.active ? 'border-primary/20 bg-card' : 'border-border/60 bg-muted/30 opacity-70'
              }`}>
                {plan.id === 'pro' && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5">
                      <Star className="w-3 h-3 mr-0.5" />
                      推荐
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    plan.active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {plan.id === 'free' ? <Zap className="w-4 h-4" /> : plan.id === 'enterprise' ? <Crown className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium truncate">{plan.name}</h4>
                    <p className="text-xs text-muted-foreground">{plan.users} 位用户</p>
                  </div>
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-semibold">${plan.price}</span>
                  <span className="text-xs text-muted-foreground ml-1">/ {plan.period}</span>
                </div>
                <div className="space-y-1.5 mb-4">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs h-8"
                    onClick={() => { setEditingPlan(plan); setPlanFormOpen(true); }}
                  >
                    <Settings2 className="w-3 h-3 mr-1" />
                    配置
                  </Button>
                  <Button
                    variant={plan.active ? 'outline' : 'default'}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      setPlans(plans.map((p) => p.id === plan.id ? { ...p, active: !p.active } : p));
                      showMessage(`${plan.name} 已${plan.active ? '下架' : '上架'}`);
                    }}
                  >
                    {plan.active ? '下架' : '上架'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 添加/编辑用户弹窗 */}
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingUser ? '编辑用户' : '添加用户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 overflow-y-auto pr-1">
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

export default memo(AdminContent);
