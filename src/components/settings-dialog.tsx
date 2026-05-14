'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AIModelSettings } from '@/components/ai-model-settings';
import { DataAlerting } from '@/components/data-alerting';
import { UsageStatsPanel } from '@/components/usage-stats-panel';
import { VersionHistory } from '@/components/version-history';
import { TemplateManager } from '@/components/template-manager';
import { RowPermissions } from '@/components/row-permissions';
import {
  AlertTriangle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Mail,
  MessageSquare,
  Webhook,
  TestTube,
  Shield,
  Bot,
  Bell,
  History,
  BookTemplate,
  Settings2,
  Megaphone,
  Lock,
  Globe,
  Key,
  Crown,
  Gift,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ParsedData, FieldStat } from '@/lib/data-processor';
import { useAuth } from '@/lib/use-auth';
import { Badge } from '@/components/ui/badge';

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

// 侧边导航项定义
const SETTINGS_TAB_IDS = [
  { id: 'ai-settings', icon: Bot },
  { id: 'subscription', icon: Crown },
  { id: 'alert', icon: Bell },
  { id: 'version', icon: History },
  { id: 'template', icon: BookTemplate },
  { id: 'general', icon: Settings2 },
  { id: 'notifications', icon: Megaphone },
  { id: 'permissions', icon: Shield },
] as const;

const SETTINGS_TAB_LABELS: Record<string, string> = {
  'ai-settings': 'settings.currentModel',
  'subscription': 'subscription.mySubscription',
  'alert': 'settings.dataAlert',
  'version': 'settings.versionSnapshot',
  'template': 'settings.templateManager',
  'general': 'settings.general',
  'notifications': 'settings.notifications',
  'permissions': 'settings.permissions',
};

type SettingsTabId = typeof SETTINGS_TAB_IDS[number]['id'];

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
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<SettingsTabId>('ai-settings');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('/api/admin/ai-config', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
      },
    })
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
        setNotifTestResult({ success: false, message: t('settings.configFeishuFirst') });
      } else if (channel === 'webhook' && !notificationConfig.webhook.url) {
        setNotifTestResult({ success: false, message: t('settings.configWebhookFirst') });
      } else if (channel === 'email' && !notificationConfig.email.smtp) {
        setNotifTestResult({ success: false, message: t('settings.configSmtpFirst') });
      } else {
        setNotifTestResult({ success: true, message: t('settings.testSuccess', { channel: channel === 'feishu' ? t('settings.feishu') : channel === 'webhook' ? 'Webhook' : t('settings.email') }) });
      }
    } catch {
      setNotifTestResult({ success: false, message: t('settings.testFailed') });
    } finally {
      setIsTestingNotif(false);
    }
  };

  const saveNotificationConfig = (config: NotificationChannelConfig) => {
    setNotificationConfig(config);
    try {
      localStorage.setItem('datainsight_notification_config', JSON.stringify(config));
    } catch { /* ignore */ }
  };

  // Subscription Panel 子组件
  const SubscriptionPanel = () => {
    const [subscription, setSubscription] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const { t } = useI18n();
    const { user } = useAuth();

    useEffect(() => {
      fetch('/api/license?action=my-subscription', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) setSubscription(data.data);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []);

    if (loading) {
      return (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          {t('common.loading')}
        </div>
      );
    }

    const isActive = subscription?.status === 'active' && new Date(subscription?.expiresAt || 0) > new Date();
    const planNames: Record<string, string> = { pro: 'Pro', business: 'Business' };

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold">{t('subscription.mySubscription')}</h3>
              </div>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? t('subscription.active') : t('subscription.expired')}
              </Badge>
            </div>

            {subscription?.planKey && subscription.planKey !== 'free' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('subscription.currentPlan')}</span>
                  <span className="font-medium">{planNames[subscription.planKey] || subscription.planKey}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('subscription.status')}</span>
                  <span className="font-medium capitalize">{subscription.status}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">{t('subscription.expiresAt')}</span>
                  <span className="font-medium">
                    {subscription.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">{t('subscription.autoRenew')}</span>
                  <span className="font-medium">{subscription.autoRenew ? 'On' : 'Off'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-3">
                <p className="text-muted-foreground">{t('subscription.noSubscription')}</p>
                <p className="text-sm text-muted-foreground">{t('subscription.freePlan')}</p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('show-upgrade', { detail: { planKey: 'pro', billing: 'yearly' } }));
                }}
              >
                <CreditCard className="w-4 h-4 mr-1.5" />
                {t('pricing.upgrade')}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.dispatchEvent(new Event('show-license-redeem'))}
              >
                <Gift className="w-4 h-4 mr-1.5" />
                {t('license.redeemTitle')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quota Overview */}
        <QuotaOverview userId={user?.id} />
      </div>
    );
  };

  // Quota Overview 子组件
  const QuotaOverview = ({ userId }: { userId?: number }) => {
    const [quotas, setQuotas] = useState<Record<string, { used: number; limit: number; unlimited: boolean }>>({});
    const [loading, setLoading] = useState(true);
    const { t } = useI18n();

    useEffect(() => {
      if (!userId) { setLoading(false); return; }
      fetch('/api/quota', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}` },
      })
        .then(r => r.json())
        .then(data => {
          if (data.success) setQuotas(data.data || {});
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [userId]);

    const features = [
      { key: 'ai_call', label: t('quota.aiCalls') },
      { key: 'export', label: t('quota.exports') },
      { key: 'dashboard', label: t('quota.dashboards') },
      { key: 'table', label: t('quota.tables') },
    ];

    if (loading) {
      return (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
          {t('common.loading')}
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            {t('quota.title')}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {features.map(f => {
              const q = quotas[f.key];
              const used = q?.used || 0;
              const limit = q?.limit || 0;
              const unlimited = q?.unlimited || false;
              const percent = unlimited ? 0 : limit > 0 ? Math.min((used / limit) * 100, 100) : 0;

              return (
                <div key={f.key} className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">{f.label}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">{used}</span>
                    <span className="text-xs text-muted-foreground">
                      / {unlimited ? '∞' : limit}
                    </span>
                  </div>
                  {!unlimited && limit > 0 && (
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 渲染各Tab内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'ai-settings':
        return (
          <div className="space-y-4">
            {isLoggedIn && canCustomModel ? (
              <AIModelSettings onModelChange={onModelChange} />
            ) : (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bot className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold">{t('settings.platformModelConfig')}</h3>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      {t('settings.managedByAdmin')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.managedByAdminDesc')}
                  </p>
                  <div className="space-y-3 bg-muted/50 rounded-md p-4">
                    <div className="flex items-center gap-3">
                      <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">Base URL</div>
                        <div className="text-sm font-medium truncate">{adminConfig.baseUrl || t('settings.notConfiguredShort')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{t('settings.model')}</div>
                        <div className="text-sm font-medium truncate">{adminConfig.modelName || t('settings.notConfiguredShort')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Key className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">API Key</div>
                        <div className="text-sm font-medium">{adminConfig.apiKey ? t('settings.configuredShort') : t('settings.notConfiguredShort')}</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* AI Usage Stats */}
            <UsageStatsPanel onUpgrade={() => {
              onOpenChange?.(false);
              window.dispatchEvent(new CustomEvent('navigate', { detail: 'pricing' }));
            }} />
          </div>
        );

      case 'alert':
        return parsedData ? (
          <DataAlerting data={parsedData} fieldStats={fieldStats} />
        ) : (
          <div className="flex flex-col items-center py-16 text-muted-foreground/50">
            <AlertTriangle className="w-10 h-10 mb-3" />
            <p className="text-sm">{t('settings.uploadFirstForAlert')}</p>
          </div>
        );

      case 'version':
        return <VersionHistory currentContent={parsedData ? { data: { rows: parsedData.rows } } : undefined} />;

      case 'template':
        return <TemplateManager />;

      case 'general':
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div>
                <p className="font-medium text-sm">{t('settings.darkMode')}</p>
                <p className="text-xs text-muted-foreground">{darkMode ? t('settings.darkModeOn') : t('settings.darkModeOff')}</p>
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
            <div className="flex items-center justify-between py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                <div>
                  <p className="font-medium text-sm">{t('settings.dataSecurityStatement')}</p>
                  <p className="text-xs text-muted-foreground">{t('settings.dataSecurityDesc')}</p>
                </div>
              </div>
            </div>
            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1 mt-2">
              <p className="font-medium text-foreground">{t('settings.dataPrinciples')}</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>{t('settings.principle1')}</li>
                <li>{t('settings.principle2')}</li>
                <li>{t('settings.principle3')}</li>
                <li>{t('settings.principle4')}</li>
              </ul>
            </div>
            {/* 数据管理 */}
            <div className="pt-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('settings.configManagement')}</p>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => {
                const configKeys = ['datainsight_alert_config', 'datainsight_alerts', 'datainsight_alert_history', 'nl2dashboard_history_v2', 'datainsight_metrics_library', 'datainsight_notification_config', 'datainsight-darkmode'];
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
              }}>
                <Download className="w-4 h-4 mr-2" />
                {t('settings.exportConfig')}
              </Button>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">{t('settings.notifDesc')}</p>

            {/* 邮件 */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary dark:text-primary/80" />
                    <span className="font-medium text-sm">{t('settings.emailNotif')}</span>
                  </div>
                  <Switch
                    checked={notificationConfig.email.enabled}
                    onCheckedChange={(v) => saveNotificationConfig({ ...notificationConfig, email: { ...notificationConfig.email, enabled: v } })}
                  />
                </div>
                {notificationConfig.email.enabled && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder={t("settings.smtpServer")} value={notificationConfig.email.smtp} onChange={(e) => saveNotificationConfig({ ...notificationConfig, email: { ...notificationConfig.email, smtp: e.target.value } })} className="text-xs h-8" />
                      <Input placeholder={t("settings.port")} value={notificationConfig.email.port} onChange={(e) => saveNotificationConfig({ ...notificationConfig, email: { ...notificationConfig.email, port: e.target.value } })} className="text-xs h-8" />
                      <Input placeholder={t("settings.username")} value={notificationConfig.email.user} onChange={(e) => saveNotificationConfig({ ...notificationConfig, email: { ...notificationConfig.email, user: e.target.value } })} className="text-xs h-8" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder={t("settings.passwordAuth")} type="password" value={notificationConfig.email.password} onChange={(e) => saveNotificationConfig({ ...notificationConfig, email: { ...notificationConfig.email, password: e.target.value } })} className="text-xs h-8" />
                      <Input placeholder={t("settings.recipientEmail")} value={notificationConfig.email.to} onChange={(e) => saveNotificationConfig({ ...notificationConfig, email: { ...notificationConfig.email, to: e.target.value } })} className="text-xs h-8" />
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
                    <MessageSquare className="w-4 h-4 text-success dark:text-success/80" />
                    <span className="font-medium text-sm">{t('settings.feishuNotif')}</span>
                  </div>
                  <Switch
                    checked={notificationConfig.feishu.enabled}
                    onCheckedChange={(v) => saveNotificationConfig({ ...notificationConfig, feishu: { ...notificationConfig.feishu, enabled: v } })}
                  />
                </div>
                {notificationConfig.feishu.enabled && (
                  <div className="space-y-2">
                    <Input placeholder={t("settings.feishuWebhook")} value={notificationConfig.feishu.webhookUrl} onChange={(e) => saveNotificationConfig({ ...notificationConfig, feishu: { ...notificationConfig.feishu, webhookUrl: e.target.value } })} className="text-xs h-8" />
                    <Input placeholder={t("settings.signSecret")} value={notificationConfig.feishu.secret} onChange={(e) => saveNotificationConfig({ ...notificationConfig, feishu: { ...notificationConfig.feishu, secret: e.target.value } })} className="text-xs h-8" />
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
                    onCheckedChange={(v) => saveNotificationConfig({ ...notificationConfig, webhook: { ...notificationConfig.webhook, enabled: v } })}
                  />
                </div>
                {notificationConfig.webhook.enabled && (
                  <div className="space-y-2">
                    <Input placeholder={t("settings.webhookUrl")} value={notificationConfig.webhook.url} onChange={(e) => saveNotificationConfig({ ...notificationConfig, webhook: { ...notificationConfig.webhook, url: e.target.value } })} className="text-xs h-8" />
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
                    {t('settings.testNotification')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNotifTestResult(null)}>
                {t('settings.clearResult')}
              </Button>
            </div>
            {notifTestResult && (
              <div className={cn(
                'p-3 rounded-md text-xs flex items-center gap-2',
                notifTestResult.success ? 'bg-success/10 text-success dark:text-success/80 border border-success/20' : 'bg-destructive/10 text-destructive border border-destructive/20'
              )}>
                {notifTestResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {notifTestResult.message}
              </div>
            )}
          </div>
        );

      case 'permissions':
        return <RowPermissions headers={parsedData?.headers || []} />;

      case 'subscription':
        return <SubscriptionPanel />;

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl max-w-[calc(100%-2rem)] max-h-[85vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-0 flex flex-row items-center justify-between">
          <DialogTitle className="text-base">{t('settings.title')}</DialogTitle>
          <DialogDescription className="sr-only">{t('settings.dialogDescription')}</DialogDescription>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            <span className="sr-only">{t('common.close')}</span>
          </button>
        </DialogHeader>
        <div className="flex min-h-[480px]">
          {/* 左侧导航列表 */}
          <nav className="w-48 border-r border-border bg-muted/20 py-2 px-2 shrink-0">
            {SETTINGS_TAB_IDS.map((tabDef) => {
              const TabIcon = tabDef.icon;
              const tabLabel = t(SETTINGS_TAB_LABELS[tabDef.id]);
              const isActive = activeTab === tabDef.id;
              return (
                <button
                  key={tabDef.id}
                  onClick={() => setActiveTab(tabDef.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
                  )}
                >
                  {TabIcon && <TabIcon className="w-4 h-4 shrink-0" />}
                  <span className="truncate">{tabLabel}</span>
                </button>
              );
            })}
          </nav>
          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0 px-6 py-4 overflow-y-auto">
            {renderTabContent()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
