'use client';

import { useState, useEffect, memo, useMemo, lazy, Suspense } from 'react';
import { trackAction, trackAccount } from '@/lib/activity-tracker';
import {
  Users, LogIn, Brain, BarChart3, Plus, Edit3, Trash2, Shield,
  CheckCircle2, AlertCircle, Lock, LayoutGrid, Settings2,
  RefreshCw, Activity, TrendingUp, Database, CreditCard,
  Star, Zap, Crown, Megaphone, Calendar, Clock, Bell, BellRing, Eye, Pencil,
  FileDown, Search, Filter, Globe, Smartphone, Monitor, ShieldCheck, Cpu,
  DollarSign, Timer, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/use-auth';
import { useI18n } from '@/lib/i18n';
import { request } from '@/lib/request';
import dynamic from 'next/dynamic';
const AdminAiUsageDashboard = dynamic(() => import('@/components/admin-ai-usage-dashboard'), { ssr: false });

type Role = 'admin' | 'editor' | 'analyst' | 'viewer' | 'custom';

// Announcement helper maps
const announcementTypeColor: Record<string, string> = {
  info: 'bg-primary/10 text-primary',
  warning: 'bg-warning/10 text-warning',
  urgent: 'bg-destructive/10 text-destructive',
  maintenance: 'bg-chart-4/10 text-chart-4',
};
const announcementTypeLabel: Record<string, string> = { info: 'Info', warning: 'Warning', urgent: 'Urgent', maintenance: 'Maintenance' };
const announcementPriorityLabel: Record<string, string> = { low: 'Low', normal: 'Normal', high: 'High' };
const announcementStatusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-warning/10 text-warning',
  published: 'bg-success/10 text-success',
  expired: 'bg-destructive/10 text-destructive',
};
const announcementStatusLabel: Record<string, string> = { draft: 'Draft', scheduled: 'Scheduled', published: 'Published', expired: 'Expired' };

// Activity event helpers
const getActivityEventColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    login: 'bg-success/10 text-success', logout: 'bg-muted text-muted-foreground',
    login_failed: 'bg-destructive/10 text-destructive', register: 'bg-primary/10 text-primary',
    bind_email: 'bg-primary/10 text-primary', bind_phone: 'bg-primary/10 text-primary',
    permission_change: 'bg-warning/10 text-warning', role_change: 'bg-warning/10 text-warning',
    payment_init: 'bg-chart-4/10 text-chart-4', payment_success: 'bg-success/10 text-success',
    payment_failed: 'bg-destructive/10 text-destructive', export: 'bg-primary/10 text-primary',
    share: 'bg-primary/10 text-primary', ai_analyze: 'bg-chart-4/10 text-chart-4',
    upload: 'bg-success/10 text-success', dashboard_create: 'bg-primary/10 text-primary',
  };
  return colorMap[type] || 'bg-muted text-muted-foreground';
};

const getActivityEventLabel = (type: string): string => {
  const labelMap: Record<string, string> = {
    login: 'Login', logout: 'Logout', login_failed: 'Login Failed', register: 'Register',
    bind_email: 'Bind Email', bind_phone: 'Bind Phone', password_change: 'Change Password',
    permission_change: 'Permission Change', role_change: 'Role Change', settings_change: 'Settings Change',
    payment_init: 'Init Payment', payment_success: 'Payment Success', payment_failed: 'Payment Failed',
    export: 'Data Export', share: 'Share', ai_analyze: 'AI Analysis', upload: 'File Upload',
    dashboard_create: 'Create Dashboard', report_generate: 'Generate Report', data_clean: 'Data Cleaning',
    sql_query: 'SQL Query', formula_generate: 'AI Formula', chart_create: 'Create Chart',
    homepage: 'Home', dashboard: 'Dashboard', settings: 'Settings', payment: 'Payment',
    analysis: 'Analysis', data_table: 'Data Table', chart_center: 'Chart Center',
    metric_center: 'Metric Center', ai_assistant: 'AI Assistant', sql_lab: 'SQL Lab', admin_panel: 'Admin Panel',
  };
  return labelMap[type] || type;
};

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
  { value: 'admin', label: 'Admin', desc: 'Full Access', restricted: false },
  { value: 'editor', label: 'Editor', desc: 'Data + AI', restricted: false },
  { value: 'analyst', label: 'Analyst', desc: 'Analysis + SQL', restricted: false },
  { value: 'viewer', label: 'Viewer', desc: 'Read Only', restricted: false },
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
  const { t } = useI18n();
  const [formData, setFormData] = useState<FormData>({
    username: '', name: '', role: 'editor', password: '', permissions: { ...ROLE_TEMPLATES.editor },
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsFilter, setLogsFilter] = useState({ username: '', status: '', startDate: '', endDate: '' });

  // Plans management state
  const [plans, setPlans] = useState<Array<{
    id: string; name: string; price: number; period: string;
    features: string[]; active: boolean; users: number;
    aiCallsLimit?: number; scheduledAt?: string;
  }>>([
    { id: 'free', name: 'Free', price: 0, period: 'Forever', features: ['Basic Data Table', '5 Dashboards', 'Basic Charts'], active: true, users: 128, aiCallsLimit: 50 },
    { id: 'pro', name: 'Pro', price: 29, period: 'Month', features: ['All AI Features', 'Unlimited Dashboards', 'Advanced Charts', 'Data Export', 'Team Collaboration'], active: true, users: 56, aiCallsLimit: 500 },
    { id: 'team', name: 'Team', price: 99, period: 'Month', features: ['All Pro Features', 'Member Management', 'Permission Control', 'API Access', 'Priority Support'], active: true, users: 12, aiCallsLimit: 2000 },
    { id: 'enterprise', name: 'Enterprise', price: 299, period: 'Month', features: ['All Team Features', 'Private Deployment', 'Custom Development', 'SLA Guarantee', 'Dedicated Support'], active: false, users: 0, aiCallsLimit: -1 },
  ]);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: '', price: 0, period: '月', features: '' as string, active: true,
    aiCallsLimit: 50, scheduledAt: '',
  });

  // Announcements management state
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [annLoading, setAnnLoading] = useState(false);
  const [announcementFormOpen, setAnnouncementFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '', content: '', type: 'info' as 'info' | 'warning' | 'urgent' | 'maintenance',
    priority: 'normal' as 'low' | 'normal' | 'high',
    remind_strategy: 'once' as 'once' | 'always',
    scheduled_at: '', expires_at: '',
  });

  // Activity logs state
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityFilter, setActivityFilter] = useState({
    category: '', eventType: '', userId: '', startDate: '', endDate: '', search: '',
  });
  const [activityStats, setActivityStats] = useState<any>(null);

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
      showMessage(t('admin.loadUsersFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginLogs = async (page = 1) => {
    if (!token) return;
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (logsFilter.username) params.set('username', logsFilter.username);
      if (logsFilter.status) params.set('status', logsFilter.status);
      if (logsFilter.startDate) params.set('startDate', logsFilter.startDate);
      if (logsFilter.endDate) params.set('endDate', logsFilter.endDate);
      const data = await request<{ data: Record<string, unknown>[]; total: number }>(`/api/admin/login-logs?${params}`);
      setLoginLogs(data.data || []);
      setLogsTotal(data.total || 0);
    } catch {
      showMessage(t('admin.loadLogsFailed'), 'error');
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const data = await request<{ data: Record<string, unknown>[] }>('/api/admin/usage-stats');
      setUsageStats(data.data || []);
    } catch {
      showMessage(t('admin.loadStatsFailed'), 'error');
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
      fetchAnnouncements();
      fetchActivityLogs();
    }
  }, [user?.role]);

  // ===== Activity Logs Query =====
  const fetchActivityLogs = async (page = 1) => {
    setActivityLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (activityFilter.category) params.set('category', activityFilter.category);
      if (activityFilter.eventType) params.set('eventType', activityFilter.eventType);
      if (activityFilter.userId) params.set('userId', activityFilter.userId);
      if (activityFilter.startDate) params.set('startDate', activityFilter.startDate);
      if (activityFilter.endDate) params.set('endDate', activityFilter.endDate);
      if (activityFilter.search) params.set('search', activityFilter.search);

      const data = await request<{ data: Record<string, unknown>[]; total: number; stats?: Record<string, unknown> }>(`/api/admin/activity-logs?${params}`);
      setActivityLogs(data.data || []);
      setActivityTotal(data.total || 0);
      if (data.stats) setActivityStats(data.stats);
      setActivityPage(page);
    } catch {
      showMessage(t('admin.loadActivityFailed'), 'error');
    } finally {
      setActivityLoading(false);
    }
  };

  // ===== Announcements CRUD =====
  const fetchAnnouncements = async () => {
    setAnnLoading(true);
    try {
      const data = await request<{ data: Record<string, unknown>[] }>('/api/admin/announcements');
      setAnnouncements(data.data || []);
    } catch {
      showMessage(t('admin.loadAnnouncementsFailed'), 'error');
    } finally {
      setAnnLoading(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.content.trim()) {
      showMessage(t('admin.titleContentRequired'), 'error');
      return;
    }
    try {
      const body: Record<string, unknown> = {
        title: announcementForm.title,
        content: announcementForm.content,
        type: announcementForm.type,
        priority: announcementForm.priority,
        remind_strategy: announcementForm.remind_strategy,
        scheduled_at: announcementForm.scheduled_at || null,
        expires_at: announcementForm.expires_at || null,
      };
      if (editingAnnouncement) {
        await request(`/api/admin/announcements/${editingAnnouncement.id}`, { method: 'PUT', body: JSON.stringify(body) });
        showMessage(t('admin.announcementUpdated'));
      } else {
        await request('/api/admin/announcements', { method: 'POST', body: JSON.stringify(body) });
        showMessage(t('admin.announcementCreated'));
      }
      setAnnouncementFormOpen(false);
      setEditingAnnouncement(null);
      setAnnouncementForm({ title: '', content: '', type: 'info', priority: 'normal', remind_strategy: 'once', scheduled_at: '', expires_at: '' });
      fetchAnnouncements();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('admin.saveFailed');
      showMessage(msg || t('admin.saveFailed'), 'error');
    }
  };

  const handlePublishAnnouncement = async (id: number) => {
    try {
      await request(`/api/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify({ status: 'published' }) });
      showMessage(t('admin.announcementPublished'));
      fetchAnnouncements();
    } catch {
      showMessage(t('admin.publishFailed'), 'error');
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    if (!confirm('确定删除此公告？')) return;
    try {
      await request(`/api/admin/announcements/${id}`, { method: 'DELETE' });
      showMessage(t('admin.announcementDeleted'));
      fetchAnnouncements();
    } catch {
      showMessage(t('admin.deleteFailed'), 'error');
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditAnnouncement = (ann: any) => {
    setEditingAnnouncement(ann);
    setAnnouncementForm({
      title: ann.title || '',
      content: ann.content || '',
      type: ann.type || 'info',
      priority: ann.priority || 'normal',
      remind_strategy: ann.remind_strategy || 'once',
      scheduled_at: ann.scheduled_at ? ann.scheduled_at.slice(0, 16) : '',
      expires_at: ann.expires_at ? ann.expires_at.slice(0, 16) : '',
    });
    setAnnouncementFormOpen(true);
  };

  const openNewAnnouncement = () => {
    setEditingAnnouncement(null);
    setAnnouncementForm({ title: '', content: '', type: 'info', priority: 'normal', remind_strategy: 'once', scheduled_at: '', expires_at: '' });
    setAnnouncementFormOpen(true);
  };

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
      showMessage(t('admin.fillRequired'), 'error');
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
        // Track permission/role changes for audit
        if (editingUser) {
          if (editingUser.role !== formData.role) {
            trackAccount('role_change', { target_user_id: editingUser.id, old_role: editingUser.role, new_role: formData.role });
          }
          trackAccount('permission_change', { target_user_id: editingUser.id, action: 'update' });
        }
        showMessage(editingUser ? t('admin.userUpdated') : t('admin.userCreated'));
        setUserFormOpen(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        showMessage(data.error || t('admin.operationFailed'), 'error');
      }
    } catch {
      showMessage(t('admin.networkError'), 'error');
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
        showMessage(data.error || t('admin.userDeleted'));
        fetchUsers();
      } else {
        showMessage(data.error || t('admin.deleteFailed'), 'error');
      }
    } catch {
      showMessage(t('admin.networkError'), 'error');
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
      if (res.ok) showMessage(t('admin.aiConfigSaved'));
      else showMessage(data.error || t('admin.saveFailed'), 'error');
    } catch {
      showMessage(t('admin.networkError'), 'error');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const handleTestAIConnection = async () => {
    if (!aiConfig.apiKey || !aiConfig.baseUrl) {
      showMessage(t('admin.fillApiConfig'), 'error');
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
      else showMessage(data.error || t('admin.connectionFailed'), 'error');
    } catch {
      showMessage(t('admin.networkTestError'), 'error');
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
    { key: 'Data & AI', icon: <Brain className="w-3.5 h-3.5" />, keys: ['upload', 'export', 'ai_analyze', 'ai_table_builder', 'ai_formula', 'ai_field'] },
    { key: 'Visualization', icon: <LayoutGrid className="w-3.5 h-3.5" />, keys: ['dashboard', 'report', 'share', 'metric_custom', 'form'] },
    { key: 'Advanced', icon: <Settings2 className="w-3.5 h-3.5" />, keys: ['sql_query', 'workflow', 'custom_ai_model'] },
    { key: 'System', icon: <Shield className="w-3.5 h-3.5" />, keys: ['admin_user', 'admin_ai_config'] },
  ];

  const getRoleBadge = (role: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      admin: { label: 'Admin', variant: 'default' },
      editor: { label: 'Editor', variant: 'secondary' },
      analyst: { label: 'Analyst', variant: 'outline' },
      viewer: { label: 'Viewer', variant: 'outline' },
      custom: { label: 'Custom', variant: 'destructive' },
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
        <Alert className="mb-4 bg-success/8 text-success border-success/20">
          <CheckCircle2 className="w-4 h-4 text-success" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* 用户管理 */}
      {activeTab === 'users' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-medium">{t('admin.userList')}</h3>
              <p className="text-xs text-muted-foreground">{t('admin.totalUsers', { count: users.length })}</p>
            </div>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4 mr-1" />
              添加用户
            </Button>
          </div>
          <div className="border border-border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.name')}</TableHead>
                  <TableHead>{t('admin.account')}</TableHead>
                  <TableHead>{t('admin.email')}</TableHead>
                  <TableHead>{t('admin.role')}</TableHead>
                  <TableHead>{t('admin.registerTime')}</TableHead>
                  <TableHead>{t('admin.actions')}</TableHead>
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
                    <TableCell className="font-medium">{typeof u.name === 'string' ? u.name : (u.name && typeof u.name === 'object' ? JSON.stringify(u.name) : String(u.name ?? ''))}</TableCell>
                    <TableCell className="text-sm font-mono">{typeof u.username === 'string' ? u.username : (u.username && typeof u.username === 'object' ? JSON.stringify(u.username) : String(u.username ?? ''))}</TableCell>
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
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <LogIn className="w-4 h-4 text-primary" />
                登录记录
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('admin.totalRecords', { count: logsTotal })}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchLoginLogs(logsPage)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              刷新
            </Button>
          </div>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <Input
              placeholder={t("admin.username")}
              className="h-8 w-32 text-xs"
              value={logsFilter.username}
              onChange={(e) => setLogsFilter(f => ({ ...f, username: e.target.value }))}
            />
            <select
              className="h-8 rounded-md border bg-background px-2 text-xs"
              value={logsFilter.status}
              onChange={(e) => setLogsFilter(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">{t('admin.allStatus')}</option>
              <option value="success">{t('admin.success')}</option>
              <option value="failed">{t('admin.failed')}</option>
            </select>
            <Input
              type="date"
              className="h-8 w-32 text-xs"
              value={logsFilter.startDate}
              onChange={(e) => setLogsFilter(f => ({ ...f, startDate: e.target.value }))}
            />
            <span className="text-xs text-muted-foreground">至</span>
            <Input
              type="date"
              className="h-8 w-32 text-xs"
              value={logsFilter.endDate}
              onChange={(e) => setLogsFilter(f => ({ ...f, endDate: e.target.value }))}
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fetchLoginLogs(1)}>
              <Search className="w-3 h-3 mr-1" />
              查询
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => {
              setLogsFilter({ username: '', status: '', startDate: '', endDate: '' });
              setTimeout(() => fetchLoginLogs(1), 0);
            }}>
              重置
            </Button>
          </div>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">{t('admin.time')}</TableHead>
                  <TableHead>{t('admin.account')}</TableHead>
                  <TableHead className="w-[80px]">{t('admin.status')}</TableHead>
                  <TableHead className="w-[120px]">IP</TableHead>
                  <TableHead>错误信息</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : loginLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{typeof log.username === 'string' ? log.username : (log.username && typeof log.username === 'object' ? JSON.stringify(log.username) : String(log.username ?? ''))}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status === 'success' ? '成功' : '失败'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{log.ip_address || '-'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.error_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {!logsLoading && loginLogs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      暂无记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {logsTotal > 20 && (
            <div className="flex justify-center gap-2 mt-3">
              <Button variant="outline" size="sm" disabled={logsPage <= 1} onClick={() => { setLogsPage(p => p - 1); fetchLoginLogs(logsPage - 1); }}>
                上一页
              </Button>
              <span className="text-xs text-muted-foreground self-center">
                第 {logsPage} 页，共 {Math.ceil(logsTotal / 20)} 页
              </span>
              <Button variant="outline" size="sm" disabled={logsPage * 20 >= logsTotal} onClick={() => { setLogsPage(p => p + 1); fetchLoginLogs(logsPage + 1); }}>
                下一页
              </Button>
            </div>
          )}
        </>
      )}

      {/* AI配置 */}
      {activeTab === 'ai-config' && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h3 className="text-base font-medium flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-primary" />
              AI 模型配置
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">配置全局 AI 模型，所有用户将共用此配置</p>
          </div>
          <div className="bg-card border rounded-md divide-y">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-medium">接口地址（Base URL）</Label>
                  <Input
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                    placeholder="https://api.deepseek.com"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">OpenAI 兼容格式的 API 接口地址</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-medium">密钥（API Key）</Label>
                  <Input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">从模型服务商获取的 API Key</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Cpu className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-medium">模型名称（Model Name）</Label>
                  <Input
                    value={aiConfig.modelName}
                    onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                    placeholder="deepseek-chat"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">例如：gpt-3.5-turbo、deepseek-chat、claude-3-sonnet</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
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
      )}

      {/* 使用统计 */}
      {/* 公告管理 */}
      {activeTab === 'announcements' && (
        <>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-base font-medium flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-primary" />
                公告管理
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">发布、定时推送公告，管理公告生命周期</p>
            </div>
            <Button size="sm" onClick={() => { setEditingAnnouncement(null); setAnnouncementFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              新建公告
            </Button>
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">暂无公告</p>
              <p className="text-xs mt-1">{"Click \"New Announcement\" to publish the first announcement"}</p>
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[240px]">{t('admin.title')}</TableHead>
                    <TableHead className="w-[80px]">{t('admin.type')}</TableHead>
                    <TableHead className="w-[80px]">{t('admin.priority')}</TableHead>
                    <TableHead className="w-[100px]">提醒策略</TableHead>
                    <TableHead className="w-[100px]">{t('admin.status')}</TableHead>
                    <TableHead className="w-[150px]">计划发布</TableHead>
                    <TableHead className="w-[150px]">过期时间</TableHead>
                    <TableHead className="w-[100px] text-right">{t('admin.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium truncate max-w-[240px]">{a.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={announcementTypeColor[a.type] ?? ''}>
                          {announcementTypeLabel[a.type] ?? a.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{announcementPriorityLabel[a.priority] ?? a.priority}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {a.remind_strategy === 'once' ? '仅提醒一次' : '每次登录提醒'}
                      </TableCell>
                      <TableCell>
                        <Badge className={announcementStatusColor[a.status] ?? ''}>
                          {announcementStatusLabel[a.status] ?? a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.scheduled_at ? new Date(a.scheduled_at).toLocaleString('zh-CN') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.expires_at ? new Date(a.expires_at).toLocaleString('zh-CN') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {a.status === 'draft' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handlePublishAnnouncement(a.id)}>
                              发布
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingAnnouncement(a); setAnnouncementFormOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => handleDeleteAnnouncement(a.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* 公告编辑弹窗 */}
          <Dialog open={announcementFormOpen} onOpenChange={setAnnouncementFormOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? '编辑公告' : '新建公告'}</DialogTitle>
                <DialogDescription>
                  公告内容对所有用户可见。定时发布可设定未来时间，系统届时自动发布。
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('admin.title')}</Label>
                  <Input
                    placeholder="公告标题"
                    value={announcementForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('admin.content')}</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="公告正文..."
                    value={announcementForm.content}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.type')}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={announcementForm.type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAnnouncementForm(prev => ({ ...prev, type: e.target.value as 'info' | 'warning' | 'urgent' | 'maintenance' }))}
                    >
                      <option value="info">通知</option>
                      <option value="warning">警告</option>
                      <option value="urgent">紧急</option>
                      <option value="maintenance">维护</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.priority')}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={announcementForm.priority}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'normal' | 'high' }))}
                    >
                      <option value="low">低</option>
                      <option value="normal">普通</option>
                      <option value="high">高</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">提醒策略</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={announcementForm.remind_strategy}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAnnouncementForm(prev => ({ ...prev, remind_strategy: e.target.value as 'once' | 'always' }))}
                  >
                    <option value="once">仅提醒一次（用户关闭后不再显示）</option>
                    <option value="always">每次登录提醒</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">计划发布时间（可选）</Label>
                    <Input
                      type="datetime-local"
                      value={announcementForm.scheduled_at}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncementForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">留空则立即发布</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">过期时间（可选）</Label>
                    <Input
                      type="datetime-local"
                      value={announcementForm.expires_at}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncementForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">过期后自动下线</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAnnouncementFormOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleSaveAnnouncement}>
                  {editingAnnouncement ? '保存修改' : (announcementForm.scheduled_at ? '计划发布' : '立即发布')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

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
          <div className="border rounded-md overflow-hidden">
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
              <h3 className="text-base font-medium flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                订阅套餐管理
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">配置用户订阅套餐、价格与功能权限</p>
            </div>
            <Button size="sm" onClick={() => {
              setEditingPlan(null);
              setPlanForm({ name: '', price: 0, period: '月', features: '', active: true, aiCallsLimit: 50, scheduledAt: '' });
              setPlanFormOpen(true);
            }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              新增套餐
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <div key={plan.id} className={`relative rounded-md border p-5 transition-all hover:shadow-md ${
                plan.active ? 'border-primary/20 bg-card' : 'border-border/60 bg-muted/30 opacity-70'
              }`}>
                {plan.id === 'pro' && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                      <Star className="w-3 h-3 mr-0.5" />
                      推荐
                    </Badge>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
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
                  <span className="text-2xl font-semibold">¥{plan.price}</span>
                  <span className="text-xs text-muted-foreground ml-1">/ {plan.period}</span>
                </div>
                <div className="space-y-1.5 mb-4">
                  {plan.features.map((f: string, i: number) => (
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
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanForm({
                        name: plan.name,
                        price: plan.price,
                        period: plan.period,
                        features: plan.features.join('\n'),
                        active: plan.active,
                        aiCallsLimit: plan.aiCallsLimit || 50,
                        scheduledAt: plan.scheduledAt || '',
                      });
                      setPlanFormOpen(true);
                    }}
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

          {/* 套餐编辑弹窗 */}
          <Dialog open={planFormOpen} onOpenChange={setPlanFormOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPlan ? '编辑套餐' : '新增套餐'}</DialogTitle>
                <DialogDescription>配置套餐的价格、功能列表与上架状态</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.planName')}</Label>
                    <Input
                      value={planForm.name}
                      onChange={(e) => setPlanForm(p => ({ ...p, name: e.target.value }))}
                      placeholder="如：专业版"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.period')}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={planForm.period}
                      onChange={(e) => setPlanForm(p => ({ ...p, period: e.target.value }))}
                    >
                      <option value="永久">永久</option>
                      <option value="月">月</option>
                      <option value="年">年</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">价格（¥）</Label>
                    <Input
                      type="number"
                      value={planForm.price}
                      onChange={(e) => setPlanForm(p => ({ ...p, price: Number(e.target.value) }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">AI 调用次数限制</Label>
                    <Input
                      type="number"
                      value={planForm.aiCallsLimit}
                      onChange={(e) => setPlanForm(p => ({ ...p, aiCallsLimit: Number(e.target.value) }))}
                      placeholder="50"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">功能列表（每行一项）</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="全部 AI 功能&#10;无限仪表盘&#10;高级图表"
                    value={planForm.features}
                    onChange={(e) => setPlanForm(p => ({ ...p, features: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">定时上架（可选）</Label>
                  <Input
                    type="datetime-local"
                    value={planForm.scheduledAt}
                    onChange={(e) => setPlanForm(p => ({ ...p, scheduledAt: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">设定未来时间，系统届时自动上架此套餐</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium">{t('admin.listingStatus')}</Label>
                  <button
                    type="button"
                    onClick={() => setPlanForm(p => ({ ...p, active: !p.active }))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      planForm.active ? 'bg-primary' : 'bg-muted'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      planForm.active ? 'translate-x-4' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className="text-xs text-muted-foreground">{planForm.active ? '已上架' : '已下架'}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPlanFormOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={() => {
                  if (!planForm.name.trim()) {
                    showMessage('请输入套餐名称', 'error');
                    return;
                  }
                  const features = planForm.features.split('\n').filter(f => f.trim());
                  if (editingPlan) {
                    setPlans(plans.map(p => p.id === editingPlan.id ? {
                      ...p,
                      name: planForm.name,
                      price: planForm.price,
                      period: planForm.period,
                      features,
                      active: planForm.active,
                      aiCallsLimit: planForm.aiCallsLimit,
                      scheduledAt: planForm.scheduledAt,
                    } : p));
                    showMessage('套餐已更新');
                  } else {
                    const newPlan = {
                      id: planForm.name.toLowerCase().replace(/\s+/g, '-'),
                      name: planForm.name,
                      price: planForm.price,
                      period: planForm.period,
                      features,
                      active: planForm.active,
                      users: 0,
                      aiCallsLimit: planForm.aiCallsLimit,
                      scheduledAt: planForm.scheduledAt,
                    };
                    setPlans([...plans, newPlan]);
                    showMessage('套餐已创建');
                  }
                  setPlanFormOpen(false);
                }}>
                  {editingPlan ? '保存修改' : '创建套餐'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ===== Activity Logs Tab ===== */}
      {activeTab === 'activity-logs' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div>
              <h3 className="text-base font-medium flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-primary" />
                用户行为日志
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                产品优化数据 · GDPR/CCPA 合规 · 设备ID已哈希 · 无PII存储 · 90天自动过期
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchActivityLogs(1)}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${activityLoading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {activityStats?.last24h && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">24h 认证事件</div>
                <div className="text-lg font-semibold">{activityStats.last24h.categoryCounts?.auth || 0}</div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">24h 账户操作</div>
                <div className="text-lg font-semibold">{activityStats.last24h.categoryCounts?.account || 0}</div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">24h 功能使用</div>
                <div className="text-lg font-semibold">{activityStats.last24h.categoryCounts?.action || 0}</div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">24h 页面访问</div>
                <div className="text-lg font-semibold">{activityStats.last24h.categoryCounts?.page_view || 0}</div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              className="h-8 rounded-md border bg-background px-2 text-xs"
              value={activityFilter.category}
              onChange={(e) => setActivityFilter(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">全部类别</option>
              <option value="auth">认证(auth)</option>
              <option value="account">账户(account)</option>
              <option value="action">操作(action)</option>
              <option value="page_view">页面访问(page_view)</option>
            </select>
            <Input
              placeholder="事件类型 (如 login)"
              className="h-8 w-36 text-xs"
              value={activityFilter.eventType}
              onChange={(e) => setActivityFilter(f => ({ ...f, eventType: e.target.value }))}
            />
            <Input
              placeholder="用户ID"
              className="h-8 w-24 text-xs"
              value={activityFilter.userId}
              onChange={(e) => setActivityFilter(f => ({ ...f, userId: e.target.value }))}
            />
            <Input
              type="date"
              className="h-8 w-32 text-xs"
              value={activityFilter.startDate}
              onChange={(e) => setActivityFilter(f => ({ ...f, startDate: e.target.value }))}
            />
            <Input
              type="date"
              className="h-8 w-32 text-xs"
              value={activityFilter.endDate}
              onChange={(e) => setActivityFilter(f => ({ ...f, endDate: e.target.value }))}
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fetchActivityLogs(1)}>
              <Search className="w-3 h-3 mr-1" />
              查询
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => {
              setActivityFilter({ category: '', eventType: '', userId: '', startDate: '', endDate: '', search: '' });
              setTimeout(() => fetchActivityLogs(1), 0);
            }}>
              重置
            </Button>
          </div>

          {/* Compliance Notice */}
          <Alert className="mb-4 border-primary/20 bg-primary/5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <AlertDescription className="text-xs">
              <strong>合规说明：</strong>设备ID仅存储SHA-256哈希值；手机号/邮箱仅记录绑定动作，不存储完整号码；
              IP地址已脱敏显示；元数据不含任何PII；日志90天自动过期；用户可在设置中关闭行为追踪（GDPR Art.7/CCPA §1798.120）。
            </AlertDescription>
          </Alert>

          {/* Activity Logs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[140px]">{t('admin.time')}</TableHead>
                  <TableHead className="text-xs">用户</TableHead>
                  <TableHead className="text-xs">类别</TableHead>
                  <TableHead className="text-xs">事件</TableHead>
                  <TableHead className="text-xs">设备ID哈希</TableHead>
                  <TableHead className="text-xs">IP(脱敏)</TableHead>
                  <TableHead className="text-xs">元数据</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : activityLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      暂无用户行为日志
                    </TableCell>
                  </TableRow>
                ) : activityLogs.map((log: Record<string, unknown>) => (
                  <TableRow key={log.id as number}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {log.created_at ? new Date(log.created_at as string).toLocaleString('zh-CN', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
                      }) : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{(log.users as Record<string, string>)?.name || (log.users as Record<string, string>)?.username || `#${log.user_id}`}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {String(log.event_category)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${getActivityEventColor(String(log.event_type))}`}>
                        {getActivityEventLabel(String(log.event_type))}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground max-w-[100px] truncate" title={String(log.device_id_hash || '')}>
                      {log.device_id_hash ? `${String(log.device_id_hash).slice(0, 8)}...` : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{String(log.ip_address || '-')}</TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate text-muted-foreground" title={log.metadata ? JSON.stringify(log.metadata) : ''}>
                      {log.metadata && typeof log.metadata === 'object' ? Object.entries(log.metadata as Record<string, unknown>).map(([k, v]) => `${k}=${v}`).join(', ') || '-' : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {activityTotal > 20 && (
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">
                共 {activityTotal} 条 · 第 {activityPage} 页
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={activityPage <= 1}
                  onClick={() => fetchActivityLogs(activityPage - 1)}>上一页</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  disabled={activityPage * 20 >= activityTotal}
                  onClick={() => fetchActivityLogs(activityPage + 1)}>下一页</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Usage Dashboard */}
      {activeTab === 'ai-usage' && (
        <AdminAiUsageDashboard />
      )}

      {/* 添加/编辑用户弹窗 */}
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? '编辑用户' : '添加用户'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
                    className={`relative flex flex-col items-start p-3 rounded-md border text-left transition-all ${
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
