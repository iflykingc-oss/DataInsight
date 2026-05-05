'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AIModelSettings } from '@/components/ai-model-settings';
import { DataAlerting } from '@/components/data-alerting';
import { VersionHistory } from '@/components/version-history';
import { TemplateManager } from '@/components/template-manager';
import { RowPermissions } from '@/components/row-permissions';
import {
  AlertTriangle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  Mail,
  MessageSquare,
  Webhook,
  TestTube,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { privacyMode } from '@/lib/security/privacy-mode';
import type { ParsedData, FieldStat } from '@/lib/data-processor';
import { useAuth } from '@/lib/use-auth';
import { Badge } from '@/components/ui/badge';
import { Globe, Key, Bot, Lock } from 'lucide-react';

// ============================================
// 通知渠道配置类型
// ============================================
interface NotificationChannelConfig {
  email: { smtp: string; port: string; user: string; password: string; from: string; to: string; enabled: boolean };
  feishu: { webhookUrl: string; secret: string; enabled: boolean };
  webhook: { url: string; method: string; headers: string; enabled: boolean };
}

const DEFAULT_NOTIFICATION_CONFIG: NotificationChannelConfig = {
  email: { smtp: '', port: '465', user: '', password: '', from: '', to: '', enabled: false },
  feishu: { webhookUrl: '', secret: '', enabled: false },
  webhook: { url: '', method: 'POST', headers: '', enabled: false },
};

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parsedData: ParsedData | null;
  fieldStats: FieldStat[];
  darkMode: boolean;
  onDarkModeChange: (dark: boolean) => void;
  onModelChange: (config: { apiKey: string; baseUrl: string; model: string; isDefault?: boolean; enabled?: boolean } | null) => void;
}

export default function SettingsDialog({
  open,
  onOpenChange,
  parsedData,
  fieldStats,
  darkMode,
  onDarkModeChange,
  onModelChange,
}: SettingsDialogProps) {
  const { user, isLoggedIn } = useAuth();
  const [adminConfig, setAdminConfig] = useState<{ apiKey?: string; baseUrl?: string; modelName?: string }>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('/api/admin/ai-config')
      .then(r => r.json())
      .then(data => {
        if (data.success) setAdminConfig(data.config || {});
      })
      .catch(() => {});
  }, []);

  const canCustomModel = user?.permissions?.custom_ai_model ?? false;

  const [notificationConfig, setNotificationConfig] = useState<NotificationChannelConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_CONFIG;
    try {
      const saved = localStorage.getItem('datainsight_notification_config');
      return saved ? { ...DEFAULT_NOTIFICATION_CONFIG, ...JSON.parse(saved) } : DEFAULT_NOTIFICATION_CONFIG;
    } catch {
      return DEFAULT_NOTIFICATION_CONFIG;
    }
  });
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [notifTestResult, setNotifTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestNotification = async (channel: 'email' | 'feishu' | 'webhook') => {
    setIsTestingNotif(true);
    setNotifTestResult(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      if (channel === 'feishu' && !notificationConfig.feishu.webhookUrl) {
        setNotifTestResult({ success: false, message: '请先配置飞书 Webhook 地址' });
      } else if (channel === 'webhook' && !notificationConfig.webhook.url) {
        setNotifTestResult({ success: false, message: '请先配置 Webhook URL' });
      } else if (channel === 'email' && !notificationConfig.email.smtp) {
        setNotifTestResult({ success: false, message: '请先配置 SMTP 服务器' });
      } else {
        setNotifTestResult({ success: true, message: `测试通知已通过${channel === 'feishu' ? '飞书' : channel === 'webhook' ? 'Webhook' : '邮件'}渠道发送` });
      }
    } catch {
      setNotifTestResult({ success: false, message: '测试失败，请检查配置' });
    } finally {
      setIsTestingNotif(false);
    }
  };

  // 保存通知配置到localStorage
  const saveNotificationConfig = (config: NotificationChannelConfig) => {
    setNotificationConfig(config);
    try {
      localStorage.setItem('datainsight_notification_config', JSON.stringify(config));
    } catch { /* ignore */ }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>设置与管理</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="ai-settings" className="w-full">
          <div className="mb-4 border-b">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-0 -mb-px">
              <TabsTrigger 
                value="ai-settings" 
                className="px-4 py-2.5 h-auto data-[state=active]:border-b-2 data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                AI 模型
              </TabsTrigger>
              <TabsTrigger 
                value="alert" 
                className="px-4 py-2.5 h-auto data-[state=active]:border-b-2 data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                数据预警
              </TabsTrigger>
              <TabsTrigger 
                value="version" 
                className="px-4 py-2.5 h-auto data-[state=active]:border-b-2 data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                版本快照
              </TabsTrigger>
              <TabsTrigger 
                value="template" 
                className="px-4 py-2.5 h-auto data-[state=active]:border-b-2 data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                模板管理
              </TabsTrigger>
              <TabsTrigger 
                value="general" 
                className="px-4 py-2.5 h-auto data-[state=active]:border-b-2 data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                通用设置
              </TabsTrigger>
              <TabsTrigger 
                value="notifications" 
                className="px-4 py-2.5 h-auto data-[state=active]:border-b-2 data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                通知渠道
              </TabsTrigger>
              <TabsTrigger 
                value="permissions" 
                className="px-4 py-2.5 h-auto data-[state=active]:border-b-2 data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
              >
                权限管理
              </TabsTrigger>
            </TabsList>
          </div>

          {/* AI 模型配置 */}
          <TabsContent value="ai-settings" className="py-4">
            {isLoggedIn && canCustomModel ? (
              <AIModelSettings onModelChange={onModelChange} />
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">平台模型配置</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      由管理员配置
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    您当前使用的是管理员配置的AI模型。如需自定义模型，请联系管理员开启权限。
                  </p>
                  <div className="space-y-3 bg-muted/50 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Base URL</div>
                        <div className="text-sm font-medium truncate">{adminConfig.baseUrl || '未配置'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">模型</div>
                        <div className="text-sm font-medium truncate">{adminConfig.modelName || '未配置'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">API Key</div>
                        <div className="text-sm font-medium">{adminConfig.apiKey ? '已配置' : '未配置'}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 数据预警 */}
          <TabsContent value="alert" className="py-4">
            {parsedData ? (
              <DataAlerting data={parsedData} fieldStats={fieldStats} />
            ) : (
              <div className="flex flex-col items-center py-12 text-muted-foreground">
                <AlertTriangle className="w-10 h-10 mb-3" />
                <p>请先上传数据以使用数据预警功能</p>
              </div>
            )}
          </TabsContent>

          {/* 版本快照 */}
          <TabsContent value="version" className="py-4">
            <VersionHistory currentContent={parsedData ? { data: { rows: parsedData.rows } } : undefined} />
          </TabsContent>

          {/* 模板管理 */}
          <TabsContent value="template" className="py-4">
            <TemplateManager />
          </TabsContent>

          {/* 通用设置 */}
          <TabsContent value="general" className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">深色模式</p>
                <p className="text-xs text-muted-foreground">{darkMode ? '已开启深色主题' : '开启深色主题'}</p>
              </div>
              <Switch
                checked={darkMode}
                onCheckedChange={(checked) => {
                  onDarkModeChange(checked);
                  localStorage.setItem('datainsight-darkmode', String(checked));
                  if (checked) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">数据缓存</p>
                <p className="text-xs text-muted-foreground">本地存储分析数据</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">自动保存</p>
                <p className="text-xs text-muted-foreground">每5分钟自动保存</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">隐私模式</p>
                  <p className="text-xs text-muted-foreground">数据仅存于内存，关闭页面后自动销毁，不留任何痕迹</p>
                </div>
              </div>
              <Switch
                checked={privacyMode.enabled}
                onCheckedChange={(checked) => {
                  if (checked) {
                    privacyMode.enable();
                  } else {
                    privacyMode.disable();
                  }
                  // Force re-render
                  setNotificationConfig(prev => ({ ...prev }));
                }}
              />
            </div>
            {privacyMode.enabled && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs space-y-1">
                      <p className="font-medium text-primary">隐私模式已开启</p>
                      <p className="text-muted-foreground">所有数据仅存储在浏览器内存中，页面关闭后将彻底销毁。API密钥等敏感信息不会写入本地存储。</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-1 h-6 text-xs"
                        onClick={() => {
                          privacyMode.destroyAll();
                          setNotificationConfig(prev => ({ ...prev }));
                        }}
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        立即销毁所有数据
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 通知渠道设置 */}
          <TabsContent value="notifications" className="space-y-4 py-4">
            <p className="text-xs text-muted-foreground">配置告警通知渠道，数据预警触发时将通过已启用的渠道发送通知。</p>

            {/* 邮件 */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">邮件通知</span>
                  </div>
                  <Switch
                    checked={notificationConfig.email.enabled}
                    onCheckedChange={(v) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, enabled: v } }))}
                  />
                </div>
                {notificationConfig.email.enabled && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="SMTP 服务器" value={notificationConfig.email.smtp} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, smtp: e.target.value } }))} className="text-xs h-8" />
                      <Input placeholder="端口" value={notificationConfig.email.port} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, port: e.target.value } }))} className="text-xs h-8" />
                      <Input placeholder="用户名" value={notificationConfig.email.user} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, user: e.target.value } }))} className="text-xs h-8" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="密码/授权码" type="password" value={notificationConfig.email.password} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, password: e.target.value } }))} className="text-xs h-8" />
                      <Input placeholder="收件人邮箱" value={notificationConfig.email.to} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, to: e.target.value } }))} className="text-xs h-8" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 飞书 */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-sm">飞书通知</span>
                  </div>
                  <Switch
                    checked={notificationConfig.feishu.enabled}
                    onCheckedChange={(v) => setNotificationConfig(prev => ({ ...prev, feishu: { ...prev.feishu, enabled: v } }))}
                  />
                </div>
                {notificationConfig.feishu.enabled && (
                  <div className="space-y-2">
                    <Input placeholder="飞书机器人 Webhook 地址" value={notificationConfig.feishu.webhookUrl} onChange={(e) => setNotificationConfig(prev => ({ ...prev, feishu: { ...prev.feishu, webhookUrl: e.target.value } }))} className="text-xs h-8" />
                    <Input placeholder="签名密钥（可选）" value={notificationConfig.feishu.secret} onChange={(e) => setNotificationConfig(prev => ({ ...prev, feishu: { ...prev.feishu, secret: e.target.value } }))} className="text-xs h-8" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Webhook */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Webhook</span>
                  </div>
                  <Switch
                    checked={notificationConfig.webhook.enabled}
                    onCheckedChange={(v) => setNotificationConfig(prev => ({ ...prev, webhook: { ...prev.webhook, enabled: v } }))}
                  />
                </div>
                {notificationConfig.webhook.enabled && (
                  <div className="space-y-2">
                    <Input placeholder="Webhook URL（支持飞书/钉钉/企微自动适配）" value={notificationConfig.webhook.url} onChange={(e) => setNotificationConfig(prev => ({ ...prev, webhook: { ...prev.webhook, url: e.target.value } }))} className="text-xs h-8" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 测试按钮 + 结果 */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={isTestingNotif || (!notificationConfig.email.enabled && !notificationConfig.feishu.enabled && !notificationConfig.webhook.enabled)}
                onClick={() => {
                  if (notificationConfig.feishu.enabled) handleTestNotification('feishu');
                  else if (notificationConfig.webhook.enabled) handleTestNotification('webhook');
                  else if (notificationConfig.email.enabled) handleTestNotification('email');
                }}
              >
                {isTestingNotif ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <TestTube className="w-3.5 h-3.5 mr-1" />}
                测试通知
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNotifTestResult(null)}>
                清除结果
              </Button>
            </div>
            {notifTestResult && (
              <div className={cn(
                'p-3 rounded-lg text-xs flex items-center gap-2',
                notifTestResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
              )}>
                {notifTestResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {notifTestResult.message}
              </div>
            )}
          </TabsContent>

          {/* 数据管理 */}
          <TabsContent value="permissions" className="py-4">
            <RowPermissions headers={parsedData?.headers || []} />
          </TabsContent>
          <TabsContent value="data" className="space-y-3 py-4">
            <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => {
              const configKeys = ['datainsight_alert_config', 'datainsight_alerts', 'datainsight_alert_history', 'nl2dashboard_history_v2', 'datainsight_metrics_library', 'datainsight_notification_config'];
              const exportData: Record<string, unknown> = {};
              configKeys.forEach(key => {
                const val = localStorage.getItem(key);
                if (val) exportData[key] = JSON.parse(val);
              });
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `datainsight-config-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              onOpenChange(false);
            }}>
              <Download className="w-4 h-4 mr-2" />
              导出配置
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => {
              if (confirm('确定清除所有缓存数据？此操作不可恢复。')) {
                localStorage.clear();
                onOpenChange(false);
                window.location.reload();
              }
            }}>
              <Trash2 className="w-4 h-4 mr-2" />
              清除缓存并刷新
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
