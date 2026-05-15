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
import { FeedbackAdminPanel } from '@/components/feedback-admin-panel';
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

  // Plans management state (loaded from API)
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState({
    name: '', nameEn: '', description: '', descriptionEn: '',
    priceMonthly: 0, priceYearly: 0, currency: 'USD',
    features: '' as string, highlightFeatures: '' as string,
    isPopular: false, sortOrder: 0, status: 'active',
    promotionType: '', promotionLabel: '', promotionLabelEn: '',
    promotionPriceMonthly: 0, promotionPriceYearly: 0,
    promotionStartAt: '', promotionEndAt: '',
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
      fetchPlans();
    }
  }, [user?.role]);

  // ===== Plans Query =====
  const fetchPlans = async () => {
    setPlansLoading(true);
    try {
      const token = localStorage.getItem('datainsight_token');
      const res = await fetch('/api/pricing', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPlans(data.plans || []);
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setPlansLoading(false);
    }
  };

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
    if (!confirm(t('admin.confirmDeleteAnnouncement'))) return;
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

  const handleDeleteUser = async (id: number, name?: string) => {
    const msg = t('admin.confirmDeleteUser').replace('{name}', name || String(id));
    if (!confirm(msg)) return;
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
      if (res.ok && data.success) showMessage(`Connected! Model: ${data.model || aiConfig.modelName}`);
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

  // Summary stats
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

      {/* User Management */}
      {activeTab === 'users' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-medium">{t('admin.userList')}</h3>
              <p className="text-xs text-muted-foreground">{t('admin.totalUsers', { count: users.length })}</p>
            </div>
            <Button size="sm" onClick={openAddForm}>
              <Plus className="w-4 h-4 mr-1" />
              Add User
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
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{typeof u.name === 'string' ? u.name : (u.name && typeof u.name === 'object' ? JSON.stringify(u.name) : String(u.name ?? ''))}</TableCell>
                    <TableCell className="text-sm font-mono">{typeof u.username === 'string' ? u.username : (u.username && typeof u.username === 'object' ? JSON.stringify(u.username) : String(u.username ?? ''))}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{typeof u.email === 'string' ? u.email : '-'}</TableCell>
                    <TableCell>{getRoleBadge(u.role)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(u)}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        {u.id !== user?.id && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteUser(u.id, u.name as string || u.username as string)}>
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
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Login Logs */}
      {activeTab === 'logs' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-medium flex items-center gap-1.5">
                <LogIn className="w-4 h-4 text-primary" />
                Login Logs
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('admin.totalRecords', { count: logsTotal })}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchLoginLogs(logsPage)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Refresh
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
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              className="h-8 w-32 text-xs"
              value={logsFilter.endDate}
              onChange={(e) => setLogsFilter(f => ({ ...f, endDate: e.target.value }))}
            />
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => fetchLoginLogs(1)}>
              <Search className="w-3 h-3 mr-1" />
              Search
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => {
              setLogsFilter({ username: '', status: '', startDate: '', endDate: '' });
              setTimeout(() => fetchLoginLogs(1), 0);
            }}>
              Reset
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
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : loginLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap truncate">
                      {new Date(log.created_at).toLocaleString('en-US')}
                    </TableCell>
                    <TableCell className="text-sm font-mono">{typeof log.username === 'string' ? log.username : (log.username && typeof log.username === 'object' ? JSON.stringify(log.username) : String(log.username ?? ''))}</TableCell>
                    <TableCell>
                      <Badge variant={log.status === 'success' ? 'default' : 'destructive'} className="text-xs">
                        {log.status === 'success' ? 'Success' : 'Failed'}
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
                      No records
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {logsTotal > 20 && (
            <div className="flex justify-center gap-2 mt-3">
              <Button variant="outline" size="sm" disabled={logsPage <= 1} onClick={() => { setLogsPage(p => p - 1); fetchLoginLogs(logsPage - 1); }}>
                Previous
              </Button>
              <span className="text-xs text-muted-foreground self-center">
                Page {logsPage} of {Math.ceil(logsTotal / 20)}
              </span>
              <Button variant="outline" size="sm" disabled={logsPage * 20 >= logsTotal} onClick={() => { setLogsPage(p => p + 1); fetchLoginLogs(logsPage + 1); }}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* AI Config */}
      {activeTab === 'ai-config' && (
        <div className="max-w-2xl mx-auto">
          <div className="mb-5">
            <h3 className="text-base font-medium flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-primary" />
              AI Model Config
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Configure the global AI model shared by all users</p>
          </div>
          <div className="bg-card border rounded-md divide-y">
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-medium">Base URL</Label>
                  <Input
                    value={aiConfig.baseUrl}
                    onChange={(e) => setAiConfig({ ...aiConfig, baseUrl: e.target.value })}
                    placeholder="https://api.deepseek.com"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">OpenAI-compatible API endpoint</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-medium">API Key</Label>
                  <Input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="sk-..."
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">API key from your model provider</p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Cpu className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <Label className="text-sm font-medium">Model Name</Label>
                  <Input
                    value={aiConfig.modelName}
                    onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                    placeholder="deepseek-chat"
                    className="h-9"
                  />
                  <p className="text-xs text-muted-foreground">e.g. gpt-4o, deepseek-chat, claude-sonnet-4-6</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <Button onClick={handleSaveAIConfig} disabled={aiConfigLoading} className="min-w-[100px]">
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Save Config
            </Button>
            <Button variant="outline" onClick={handleTestAIConnection} disabled={aiConfigLoading}>
              <Brain className="w-4 h-4 mr-1.5" />
              Test Connection
            </Button>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {/* Announcements */}
      {activeTab === 'announcements' && (
        <>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-base font-medium flex items-center gap-1.5">
                <Megaphone className="w-4 h-4 text-primary" />
                Announcements
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Publish and schedule announcements</p>
            </div>
            <Button size="sm" onClick={() => { setEditingAnnouncement(null); setAnnouncementFormOpen(true); }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Announcement
            </Button>
          </div>

          {announcements.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No announcements</p>
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
                    <TableHead className="w-[100px]">Reminder</TableHead>
                    <TableHead className="w-[100px]">{t('admin.status')}</TableHead>
                    <TableHead className="w-[150px]">Scheduled</TableHead>
                    <TableHead className="w-[150px]">Expires</TableHead>
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
                        {a.remind_strategy === 'once' ? 'Once' : 'Every login'}
                      </TableCell>
                      <TableCell>
                        <Badge className={announcementStatusColor[a.status] ?? ''}>
                          {announcementStatusLabel[a.status] ?? a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.scheduled_at ? new Date(a.scheduled_at).toLocaleString('en-US') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.expires_at ? new Date(a.expires_at).toLocaleString('en-US') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {a.status === 'draft' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handlePublishAnnouncement(a.id)}>
                              Publish
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

          {/* Announcement Edit Dialog */}
          <Dialog open={announcementFormOpen} onOpenChange={setAnnouncementFormOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}</DialogTitle>
                <DialogDescription>
                  Announcements are visible to all users. Set a future time for scheduled publishing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('admin.title')}</Label>
                  <Input
                    placeholder="Announcement title"
                    value={announcementForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('admin.content')}</Label>
                  <textarea
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Announcement body..."
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
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="urgent">Urgent</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.priority')}</Label>
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={announcementForm.priority}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAnnouncementForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'normal' | 'high' }))}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Reminder strategy</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={announcementForm.remind_strategy}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAnnouncementForm(prev => ({ ...prev, remind_strategy: e.target.value as 'once' | 'always' }))}
                  >
                    <option value="once">Once (dismissed until next login)</option>
                    <option value="always">Every login</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Scheduled publish time (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={announcementForm.scheduled_at}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncementForm(prev => ({ ...prev, scheduled_at: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to publish immediately</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Expiry time (optional)</Label>
                    <Input
                      type="datetime-local"
                      value={announcementForm.expires_at}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAnnouncementForm(prev => ({ ...prev, expires_at: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Auto-unpublished after expiry</p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAnnouncementFormOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={handleSaveAnnouncement}>
                  {editingAnnouncement ? 'Save Changes' : (announcementForm.scheduled_at ? 'Schedule' : 'Publish Now')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {activeTab === 'feedback' && (
        <FeedbackAdminPanel />
      )}

      {activeTab === 'stats' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-medium">API Call Statistics</h3>
              <p className="text-xs text-muted-foreground">Call counts per endpoint</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsageStats} disabled={statsLoading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${statsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Last Called</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statsLoading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : usageStats.length > 0 ? usageStats.map((s) => (
                  <TableRow key={s.endpoint || s.id}>
                    <TableCell className="font-mono text-xs">{s.endpoint || '-'}</TableCell>
                    <TableCell><Badge variant="secondary">{s.count?.toLocaleString()}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.last_used ? new Date(s.last_used).toLocaleString('en-US') : '-'}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      No data
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Plans */}
      {activeTab === 'plans' && (
        <>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h3 className="text-base font-medium flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-primary" />
                {t('admin.planManagement')}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('admin.planManagementDesc')}</p>
            </div>
            <Button size="sm" onClick={() => {
              setEditingPlan(null);
              setPlanForm({
                name: '', nameEn: '', description: '', descriptionEn: '',
                priceMonthly: 0, priceYearly: 0, currency: 'USD',
                features: '', highlightFeatures: '',
                isPopular: false, sortOrder: plans.length + 1, status: 'active',
                promotionType: '', promotionLabel: '', promotionLabelEn: '',
                promotionPriceMonthly: 0, promotionPriceYearly: 0,
                promotionStartAt: '', promotionEndAt: '',
              });
              setPlanFormOpen(true);
            }}>
              <Plus className="w-3.5 h-3.5 mr-1" />
              {t('admin.addPlan')}
            </Button>
          </div>

          {plansLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">{t('common.loading')}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {plans.map((plan: any) => {
                const features = plan.features || {};
                const promoActive = plan._promotion_active;
                return (
                  <div key={plan.plan_key} className={`relative rounded-md border p-5 transition-all hover:shadow-md ${
                    plan.status === 'active' ? 'border-primary/20 bg-card' : 'border-border/60 bg-muted/30 opacity-70'
                  }`}>
                    {plan.is_popular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground text-xs px-2 py-0.5">
                          <Star className="w-3 h-3 mr-0.5" />
                          {t('pricing.popular')}
                        </Badge>
                      </div>
                    )}
                    {promoActive && (
                      <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {plan.promotion_label}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center ${
                        plan.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                      }`}>
                        {plan.plan_key === 'free' ? <Zap className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium truncate">{plan.name} / {plan.name_en}</h4>
                        <p className="text-xs text-muted-foreground truncate">{plan.description}</p>
                      </div>
                    </div>
                    <div className="mb-3">
                      <span className="text-2xl font-semibold">
                        {plan.price_monthly === 0 ? t('pricing.free') : `$${(plan.price_monthly/100).toFixed(0)}`}
                      </span>
                      {plan.price_monthly > 0 && (
                        <span className="text-xs text-muted-foreground ml-1">/ {t('pricing.monthly')}</span>
                      )}
                      {plan.price_yearly > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ${(plan.price_yearly/100).toFixed(0)}/{t('pricing.yearly')}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 mb-3 text-xs text-muted-foreground">
                      <div>{t('pricing.aiCallLimit')}: {features.aiCallLimit === 9999 ? '∞' : features.aiCallLimit}</div>
                      <div>{t('pricing.maxRows')}: {features.maxRows >= 999999999 ? '∞' : features.maxRows?.toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={() => {
                          setEditingPlan(plan);
                          setPlanForm({
                            name: plan.name || '', nameEn: plan.name_en || '',
                            description: plan.description || '', descriptionEn: plan.description_en || '',
                            priceMonthly: plan.price_monthly || 0, priceYearly: plan.price_yearly || 0,
                            currency: plan.currency || 'USD',
                            features: JSON.stringify(plan.features, null, 2),
                            highlightFeatures: (plan.highlight_features || []).join(', '),
                            isPopular: plan.is_popular || false, sortOrder: plan.sort_order || 0,
                            status: plan.status || 'active',
                            promotionType: plan.promotion_type || '',
                            promotionLabel: plan.promotion_label || '',
                            promotionLabelEn: plan.promotion_label_en || '',
                            promotionPriceMonthly: plan.promotion_price_monthly || 0,
                            promotionPriceYearly: plan.promotion_price_yearly || 0,
                            promotionStartAt: plan.promotion_start_at ? plan.promotion_start_at.slice(0, 16) : '',
                            promotionEndAt: plan.promotion_end_at ? plan.promotion_end_at.slice(0, 16) : '',
                          });
                          setPlanFormOpen(true);
                        }}
                      >
                        <Settings2 className="w-3 h-3 mr-1" />
                        {t('admin.configure')}
                      </Button>
                      <Button
                        variant={plan.status === 'active' ? 'outline' : 'default'}
                        size="sm"
                        className="text-xs h-8"
                        onClick={async () => {
                          const token = localStorage.getItem('datainsight_token');
                          await fetch('/api/pricing', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({
                              planKey: plan.plan_key,
                              updates: { status: plan.status === 'active' ? 'inactive' : 'active' }
                            })
                          });
                          showMessage(plan.status === 'active' ? t('admin.planDeactivated') : t('admin.planActivated'));
                          fetchPlans();
                        }}
                      >
                        {plan.status === 'active' ? t('admin.deactivate') : t('admin.activate')}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Plan Edit Dialog */}
          <Dialog open={planFormOpen} onOpenChange={setPlanFormOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPlan ? t('admin.editPlan') : t('admin.addPlan')}</DialogTitle>
                <DialogDescription>{t('admin.editPlanDesc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.planNameCn')}</Label>
                    <Input value={planForm.name} onChange={(e) => setPlanForm(p => ({ ...p, name: e.target.value }))} placeholder={t('admin.planNameCnPlaceholder')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.planNameEn')}</Label>
                    <Input value={planForm.nameEn} onChange={(e) => setPlanForm(p => ({ ...p, nameEn: e.target.value }))} placeholder="Pro / Business" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.planDescCn')}</Label>
                    <Input value={planForm.description} onChange={(e) => setPlanForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.planDescEn')}</Label>
                    <Input value={planForm.descriptionEn} onChange={(e) => setPlanForm(p => ({ ...p, descriptionEn: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.priceMonthly')} (cents)</Label>
                    <Input type="number" value={planForm.priceMonthly} onChange={(e) => setPlanForm(p => ({ ...p, priceMonthly: Number(e.target.value) }))} placeholder="900" />
                    <p className="text-[10px] text-muted-foreground">{planForm.priceMonthly > 0 ? `$${(planForm.priceMonthly/100).toFixed(2)}` : '$0'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.priceYearly')} (cents)</Label>
                    <Input type="number" value={planForm.priceYearly} onChange={(e) => setPlanForm(p => ({ ...p, priceYearly: Number(e.target.value) }))} placeholder="7500" />
                    <p className="text-[10px] text-muted-foreground">{planForm.priceYearly > 0 ? `$${(planForm.priceYearly/100).toFixed(2)}` : '$0'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.currency')}</Label>
                    <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={planForm.currency} onChange={(e) => setPlanForm(p => ({ ...p, currency: e.target.value }))}>
                      <option value="USD">USD ($)</option>
                      <option value="CNY">CNY (¥)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('admin.featuresJson')}</Label>
                  <textarea
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder='{"maxRows":50000,"aiCallLimit":500,"sqlLab":true}'
                    value={planForm.features}
                    onChange={(e) => setPlanForm(p => ({ ...p, features: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('admin.highlightFeatures')}</Label>
                  <Input value={planForm.highlightFeatures} onChange={(e) => setPlanForm(p => ({ ...p, highlightFeatures: e.target.value }))} placeholder="unlimited_tables,sql_lab,ai_field" />
                  <p className="text-[10px] text-muted-foreground">{t('admin.highlightFeaturesHint')}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-medium">{t('admin.isPopular')}</Label>
                    <button type="button" onClick={() => setPlanForm(p => ({ ...p, isPopular: !p.isPopular }))} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${planForm.isPopular ? 'bg-primary' : 'bg-muted'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${planForm.isPopular ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">{t('admin.sortOrder')}</Label>
                    <Input type="number" value={planForm.sortOrder} onChange={(e) => setPlanForm(p => ({ ...p, sortOrder: Number(e.target.value) }))} />
                  </div>
                </div>

                {/* Promotion section */}
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs font-medium text-foreground mb-3 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {t('admin.promotionSettings')}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('admin.promotionType')}</Label>
                      <select className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm" value={planForm.promotionType} onChange={(e) => setPlanForm(p => ({ ...p, promotionType: e.target.value }))}>
                        <option value="">{t('admin.noPromotion')}</option>
                        <option value="limited_free">{t('admin.limitedFree')}</option>
                        <option value="discount">{t('admin.discount')}</option>
                        <option value="trial">{t('admin.trial')}</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('admin.promotionLabelCn')}</Label>
                      <Input value={planForm.promotionLabel} onChange={(e) => setPlanForm(p => ({ ...p, promotionLabel: e.target.value }))} placeholder={t('admin.promotionLabelPlaceholder')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('admin.promotionLabelEn')}</Label>
                      <Input value={planForm.promotionLabelEn} onChange={(e) => setPlanForm(p => ({ ...p, promotionLabelEn: e.target.value }))} placeholder="50% OFF Launch" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('admin.promoPriceMonthly')} (cents)</Label>
                      <Input type="number" value={planForm.promotionPriceMonthly} onChange={(e) => setPlanForm(p => ({ ...p, promotionPriceMonthly: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('admin.promoPriceYearly')} (cents)</Label>
                      <Input type="number" value={planForm.promotionPriceYearly} onChange={(e) => setPlanForm(p => ({ ...p, promotionPriceYearly: Number(e.target.value) }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('admin.promoStart')}</Label>
                      <Input type="datetime-local" value={planForm.promotionStartAt} onChange={(e) => setPlanForm(p => ({ ...p, promotionStartAt: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">{t('admin.promoEnd')}</Label>
                      <Input type="datetime-local" value={planForm.promotionEndAt} onChange={(e) => setPlanForm(p => ({ ...p, promotionEndAt: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPlanFormOpen(false)}>{t('common.cancel')}</Button>
                <Button onClick={async () => {
                  if (!planForm.name.trim()) {
                    showMessage(t('admin.planNameRequired'), 'error');
                    return;
                  }
                  const token = localStorage.getItem('datainsight_token');
                  try {
                    let featuresObj = {};
                    try { featuresObj = JSON.parse(planForm.features); } catch {}
                    const highlightArr = planForm.highlightFeatures.split(',').map(s => s.trim()).filter(Boolean);
                    
                    if (editingPlan) {
                      const res = await fetch('/api/pricing', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                          planKey: editingPlan.plan_key,
                          updates: {
                            name: planForm.name, name_en: planForm.nameEn,
                            description: planForm.description, description_en: planForm.descriptionEn,
                            price_monthly: planForm.priceMonthly, price_yearly: planForm.priceYearly,
                            currency: planForm.currency,
                            features: featuresObj, highlight_features: highlightArr,
                            is_popular: planForm.isPopular, sort_order: planForm.sortOrder,
                            promotion_type: planForm.promotionType || null,
                            promotion_label: planForm.promotionLabel || null,
                            promotion_label_en: planForm.promotionLabelEn || null,
                            promotion_price_monthly: planForm.promotionPriceMonthly || null,
                            promotion_price_yearly: planForm.promotionPriceYearly || null,
                            promotion_start_at: planForm.promotionStartAt || null,
                            promotion_end_at: planForm.promotionEndAt || null,
                          }
                        })
                      });
                      const data = await res.json();
                      if (data.success) {
                        showMessage(t('admin.planUpdated'));
                      } else {
                        showMessage(data.error || t('admin.planUpdateFailed'), 'error');
                      }
                    } else {
                      const res = await fetch('/api/pricing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({
                          planKey: planForm.nameEn?.toLowerCase().replace(/\s+/g, '-') || planForm.name.toLowerCase(),
                          name: planForm.name, nameEn: planForm.nameEn,
                          description: planForm.description, descriptionEn: planForm.descriptionEn,
                          priceMonthly: planForm.priceMonthly, priceYearly: planForm.priceYearly,
                          currency: planForm.currency,
                          features: featuresObj, highlightFeatures: highlightArr,
                          isPopular: planForm.isPopular, sortOrder: planForm.sortOrder,
                          promotionType: planForm.promotionType || null,
                          promotionLabel: planForm.promotionLabel || null,
                          promotionLabelEn: planForm.promotionLabelEn || null,
                          promotionPriceMonthly: planForm.promotionPriceMonthly || null,
                          promotionPriceYearly: planForm.promotionPriceYearly || null,
                          promotionStartAt: planForm.promotionStartAt || null,
                          promotionEndAt: planForm.promotionEndAt || null,
                        })
                      });
                      const data = await res.json();
                      if (data.success) {
                        showMessage(t('admin.planCreated'));
                      } else {
                        showMessage(data.error || t('admin.planCreateFailed'), 'error');
                      }
                    }
                    setPlanFormOpen(false);
                    fetchPlans();
                  } catch (err) {
                    showMessage(t('admin.planSaveError'), 'error');
                  }
                }}>
                  {editingPlan ? t('admin.saveChanges') : t('admin.createPlan')}
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
                User Activity Logs
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
Product analytics · GDPR/CCPA compliant · Device ID hashed · No PII stored · 90-day auto-expiry
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchActivityLogs(1)}>
                <RefreshCw className={`w-3.5 h-3.5 mr-1 ${activityLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          {activityStats?.last24h && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">24h Auth events</div>
                <div className="text-lg font-semibold">{activityStats.last24h.categoryCounts?.auth || 0}</div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">24h Account ops</div>
                <div className="text-lg font-semibold">{activityStats.last24h.categoryCounts?.account || 0}</div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">24h Feature usage</div>
                <div className="text-lg font-semibold">{activityStats.last24h.categoryCounts?.action || 0}</div>
              </div>
              <div className="rounded-md border bg-card p-3">
                <div className="text-xs text-muted-foreground mb-1">24h Page views</div>
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
              <option value="">All categories</option>
              <option value="auth">Auth</option>
              <option value="account">Account</option>
              <option value="action">Action</option>
              <option value="page_view">Page view</option>
            </select>
            <Input
              placeholder="Event type (e.g. login)"
              className="h-8 w-36 text-xs"
              value={activityFilter.eventType}
              onChange={(e) => setActivityFilter(f => ({ ...f, eventType: e.target.value }))}
            />
            <Input
              placeholder="User ID"
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
              Search
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => {
              setActivityFilter({ category: '', eventType: '', userId: '', startDate: '', endDate: '', search: '' });
              setTimeout(() => fetchActivityLogs(1), 0);
            }}>
              Reset
            </Button>
          </div>

          {/* Compliance Notice */}
          <Alert className="mb-4 border-primary/20 bg-primary/5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <AlertDescription className="text-xs">
              <strong>Compliance:</strong> Device IDs stored as SHA-256 hashes only; phone/email recorded as bind events, not stored in full;
              IP addresses are masked; metadata contains no PII; logs auto-expire after 90 days; users can opt out in settings (GDPR Art.7 / CCPA §1798.120).
            </AlertDescription>
          </Alert>

          {/* Activity Logs Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[140px]">{t('admin.time')}</TableHead>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Event</TableHead>
                  <TableHead className="text-xs">Device ID Hash</TableHead>
                  <TableHead className="text-xs">IP (masked)</TableHead>
                  <TableHead className="text-xs">Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activityLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : activityLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No activity logs
                    </TableCell>
                  </TableRow>
                ) : activityLogs.map((log: Record<string, unknown>) => (
                  <TableRow key={log.id as number}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap truncate">
                      {log.created_at ? new Date(log.created_at as string).toLocaleString('en-US', {
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
                {activityTotal} records · Page {activityPage}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="h-7 text-xs" disabled={activityPage <= 1}
                  onClick={() => fetchActivityLogs(activityPage - 1)}>Previous</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs"
                  disabled={activityPage * 20 >= activityTotal}
                  onClick={() => fetchActivityLogs(activityPage + 1)}>Next</Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* AI Usage Dashboard */}
      {activeTab === 'ai-usage' && (
        <AdminAiUsageDashboard />
      )}

      {/* Add/Edit User Dialog */}
      <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingUser && (
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="Enter username" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Display name" />
            </div>

            {/* Role Template */}
            <div className="space-y-2">
              <Label>Role Template</Label>
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
              <Label>{editingUser ? 'New password (leave blank to keep)' : 'Password (leave blank to auto-generate)'}</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder={editingUser ? 'No change' : 'Auto-generate'} />
            </div>

            {/* Permissions */}
            <div className="space-y-3">
              <Label>Permissions</Label>
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
                {editingUser ? 'Save Changes' : 'Create User'}
              </Button>
              <Button variant="outline" onClick={() => setUserFormOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(AdminContent);
