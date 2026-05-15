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
  { value: 'admin', label: 'Admin', desc: 'All permissions (system reserved, cannot be created)', restricted: true },
  { value: 'editor', label: 'Editor', desc: 'Can upload, analyze, build tables, dashboards' },
  { value: 'analyst', label: 'Analyst', desc: 'Can analyze, chart, SQL query' },
  { value: 'viewer', label: 'Viewer', desc: 'View-only: dashboards and reports' },
  { value: 'custom', label: 'Custom', desc: 'Manually configure permissions' },
];

export default function AdminPanel({ open, onOpenChange }: AdminPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // User management
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

  // Login logs
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);

  // AI config
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
      showMessage('Failed to load users', 'error');
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
      showMessage('Failed to load login logs', 'error');
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
      showMessage('Failed to load AI config', 'error');
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
      setFormData((prev) => ({ ...prev, role: 'custom' }));
      return;
    }
    setFormData((prev) => ({
      ...prev,
      role,
      permissions: { ...ROLE_TEMPLATES[role] },
    }));
  };

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
        showMessage(editingUser ? 'User updated' : 'User created');
        setUserFormOpen(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        showMessage(data.error || 'Operation failed', 'error');
      }
    } catch {
      showMessage('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        showMessage('User deleted');
        fetchUsers();
      } else {
        showMessage(data.error || 'Delete failed', 'error');
      }
    } catch {
      showMessage('Network error', 'error');
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
        showMessage('AI config saved');
      } else {
        showMessage(data.error || 'Save failed', 'error');
      }
    } catch {
      showMessage('Network error', 'error');
    } finally {
      setAiConfigLoading(false);
    }
  };

  const handleTestAIConnection = async () => {
    if (!aiConfig.apiKey || !aiConfig.baseUrl) {
      showMessage('Please enter API Key and Base URL first', 'error');
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
        showMessage(`Connected! Model: ${data.model || aiConfig.modelName}`, 'success');
      } else {
        showMessage(data.error || 'Connection failed, please check your config', 'error');
      }
    } catch {
      showMessage('Network error, cannot test connection', 'error');
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

  // Permission categories
  const permissionCategories = [
    {
      key: 'Data & AI',
      icon: <Brain className="w-4 h-4" />,
      keys: ['upload', 'export', 'ai_analyze', 'ai_table_builder', 'ai_formula', 'ai_field'],
    },
    {
      key: 'Visualization & Reports',
      icon: <LayoutGrid className="w-4 h-4" />,
      keys: ['dashboard', 'report', 'share', 'metric_custom', 'form'],
    },
    {
      key: 'Advanced',
      icon: <Settings2 className="w-4 h-4" />,
      keys: ['sql_query', 'workflow', 'custom_ai_model'],
    },
    {
      key: 'System',
      icon: <Shield className="w-4 h-4" />,
      keys: ['admin_user', 'admin_ai_config'],
    },
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

  if (user?.role !== 'admin') return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-start justify-between">
          <div className="space-y-1.5">
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Console
            </DialogTitle>
            <DialogDescription>
              Manage user accounts, permissions, and system settings
            </DialogDescription>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none mt-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            <span className="sr-only">Close</span>
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
              Users
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5">
              <LogIn className="w-4 h-4" />
              Login Logs
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-1.5">
              <Brain className="w-4 h-4" />
              AI Model Config
            </TabsTrigger>
          </TabsList>

          {/* User Management */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium">User List</h3>
                <p className="text-xs text-muted-foreground">{users.length} users</p>
              </div>
              <Button size="sm" onClick={openAddForm}>
                <Plus className="w-4 h-4 mr-1" />
                Add User
              </Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>AI</TableHead>
                    <TableHead>Dashboard</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
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
                          {u.permissions.upload && <Badge variant="outline" className="text-xs h-5">Upload</Badge>}
                          {u.permissions.export && <Badge variant="outline" className="text-xs h-5">Export</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.permissions.ai_analyze && <Badge variant="outline" className="text-xs h-5">Analyze</Badge>}
                          {u.permissions.ai_table_builder && <Badge variant="outline" className="text-xs h-5">Build Table</Badge>}
                          {u.permissions.ai_formula && <Badge variant="outline" className="text-xs h-5">Formula</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.permissions.dashboard && <Badge variant="outline" className="text-xs h-5">Dashboard</Badge>}
                          {u.permissions.share && <Badge variant="outline" className="text-xs h-5">Share</Badge>}
                          {u.permissions.report && <Badge variant="outline" className="text-xs h-5">Report</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {u.permissions.admin_user && <Badge variant="outline" className="text-xs h-5">User Mgmt</Badge>}
                          {u.permissions.admin_ai_config && <Badge variant="outline" className="text-xs h-5">AI Config</Badge>}
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

            {/* Add/Edit User Dialog */}
            <Dialog open={userFormOpen} onOpenChange={setUserFormOpen}>
              <DialogContent showCloseButton={false} className="max-w-lg max-h-[85vh] overflow-y-auto">
                <DialogHeader className="flex flex-row items-start justify-between">
                  <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
                  <button
                    onClick={() => setUserFormOpen(false)}
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    <span className="sr-only">Close</span>
                  </button>
                </DialogHeader>
                <div className="space-y-5">
                  {!editingUser && (
                    <div className="space-y-2">
                      <Label>Username *</Label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="Enter username"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Display name"
                    />
                  </div>

                  {/* Role selection */}
                  <div className="space-y-2">
                    <Label>Role Template</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => !opt.restricted && applyRoleTemplate(opt.value)}
                          disabled={opt.restricted}
                          className={`relative flex flex-col items-start p-3 rounded-md border text-left transition-all ${
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
                    <Label>{editingUser ? 'New Password (leave blank to keep)' : 'Password (leave blank to auto-generate)'}</Label>
                    <Input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingUser ? 'No change' : 'Auto-generate'}
                    />
                  </div>

                  {/* Custom permissions */}
                  {formData.role === 'custom' && (
                    <div className="space-y-4 pt-2 border-t">
                      <Label className="font-medium">Custom Permissions</Label>
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
                    {editingUser ? 'Save Changes' : 'Create User'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Login Logs */}
          <TabsContent value="logs" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium">Login Logs</h3>
                <p className="text-xs text-muted-foreground">Last 100 entries</p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchLoginLogs}>
                <Activity className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>

            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
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
                            Success
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-200 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('en-US')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {loginLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No login records
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* AI Model Config */}
          <TabsContent value="ai" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  AI Model Config
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
                    All users will use this API Key for AI analysis by default
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
                    Supports OpenAI-compatible endpoints, e.g. DeepSeek, Qwen, Moonshot, GLM
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Model Name</Label>
                  <Input
                    value={aiConfig.modelName}
                    onChange={(e) => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                    placeholder="gpt-4o / deepseek-chat / qwen-plus ..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Common models: gpt-4o, gpt-4o-mini, deepseek-chat, qwen-plus, moonshot-v1-8k, glm-4-flash
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveAIConfig} disabled={aiConfigLoading} className="flex-1">
                    {aiConfigLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Config
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestAIConnection}
                    disabled={aiConfigLoading || !aiConfig.apiKey || !aiConfig.baseUrl}
                    className="gap-1.5"
                  >
                    <Zap className="w-4 h-4" />
                    Test Connection
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
