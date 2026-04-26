'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bell,
  BellRing,
  Mail,
  MessageSquare,
  Webhook,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Save,
  History,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronRight,
  Zap,
  Eye,
  MoreVertical,
  Send,
	Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

// ============================================
// 类型定义
// ============================================

// 告警条件类型
type AlertCondition = 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between' | 'change_up' | 'change_down' | 'null';

// 告警严重程度
type AlertSeverity = 'critical' | 'warning' | 'info';

// 通知渠道
type NotificationChannel = 'in_app' | 'email' | 'feishu' | 'webhook';

// 告警规则
export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  field: string;
  condition: AlertCondition;
  threshold: number;
  threshold2?: number; // for between condition
  severity: AlertSeverity;
  channels: NotificationChannel[];
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  lastTriggered?: number;
  triggerCount: number;
}

// 告警历史
interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  triggeredAt: number;
  value: number;
  threshold: number;
  severity: AlertSeverity;
  status: 'firing' | 'resolved' | 'acknowledged';
  notificationSent: boolean;
}

// 条件配置
const CONDITION_CONFIG: Array<{
  value: AlertCondition;
  label: string;
  description: string;
  example: string;
}> = [
  { value: 'gt', label: '大于', description: '当值大于阈值时触发', example: '销售额 > 10000' },
  { value: 'lt', label: '小于', description: '当值小于阈值时触发', example: '转化率 < 5%' },
  { value: 'gte', label: '大于等于', description: '当值大于等于阈值时触发', example: '订单数 >= 100' },
  { value: 'lte', label: '小于等于', description: '当值小于等于阈值时触发', example: '库存 <= 10' },
  { value: 'eq', label: '等于', description: '当值等于阈值时触发', example: '状态 = 1' },
  { value: 'between', label: '区间', description: '当值在两个阈值之间时触发', example: '10 < 评分 < 90' },
  { value: 'change_up', label: '上涨超过', description: '当值上涨超过阈值百分比', example: '环比上涨 > 20%' },
  { value: 'change_down', label: '下跌超过', description: '当值下跌超过阈值百分比', example: '环比下跌 > 10%' },
  { value: 'null', label: '为空', description: '当值为空时触发', example: '邮箱字段为空' }
];

// 严重程度配置
const SEVERITY_CONFIG: Record<AlertSeverity, { label: string; color: string; bg: string }> = {
  critical: { label: '严重', color: 'text-red-600', bg: 'bg-red-100' },
  warning: { label: '警告', color: 'text-yellow-600', bg: 'bg-yellow-100' },
  info: { label: '提示', color: 'text-blue-600', bg: 'bg-blue-100' }
};

// 渠道配置
const CHANNEL_CONFIG: Record<NotificationChannel, { label: string; icon: React.ElementType; color: string }> = {
  in_app: { label: '应用内通知', icon: Bell, color: 'text-purple-600' },
  email: { label: '邮件', icon: Mail, color: 'text-blue-600' },
  feishu: { label: '飞书', icon: MessageSquare, color: 'text-green-600' },
  webhook: { label: 'Webhook', icon: Webhook, color: 'text-gray-600' }
};

// ============================================
// 通知渠道配置类型
// ============================================
interface NotificationConfig {
  enabled: boolean;
  // 应用内
  in_app?: { enabled: boolean };
  // 邮件
  email?: {
    enabled: boolean;
    smtpHost: string;
    smtpPort: number;
    username: string;
    password: string;
    senderName: string;
    senderEmail: string;
    recipients: string; // 逗号分隔
  };
  // 飞书
  feishu?: {
    enabled: boolean;
    webhookUrl: string;
    secret: string; // 签名密钥（可选）
  };
  // Webhook
  webhook?: {
    enabled: boolean;
    url: string;
    method: 'POST' | 'GET';
    headers: string; // JSON 格式
  };
}

const CONFIG_STORAGE_KEY = 'datainsight_alert_config';

// 本地存储
const ALERTS_STORAGE_KEY = 'datainsight_alerts';
const HISTORY_STORAGE_KEY = 'datainsight_alert_history';

interface DataAlertingProps {
  data: ParsedData;
  fieldStats: FieldStat[];
  onAlertTrigger?: (rule: AlertRule, value: number) => void;
  className?: string;
}

export function DataAlerting({
  data,
  fieldStats,
  onAlertTrigger,
  className
}: DataAlertingProps) {
  // 状态
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('rules');
  const [activeChannelTab, setActiveChannelTab] = useState<'email' | 'feishu' | 'webhook' | 'advanced'>('email');
  const [previewResult, setPreviewResult] = useState<{ triggered: boolean; value: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState<string | null>(null);

  // 通知渠道配置
  const [channelConfig, setChannelConfig] = useState<NotificationConfig>({
    enabled: true,
    in_app: { enabled: true },
    email: {
      enabled: false,
      smtpHost: '',
      smtpPort: 465,
      username: '',
      password: '',
      senderName: 'DataInsight',
      senderEmail: '',
      recipients: '',
    },
    feishu: {
      enabled: false,
      webhookUrl: '',
      secret: '',
    },
    webhook: {
      enabled: false,
      url: '',
      method: 'POST',
      headers: '{"Content-Type":"application/json"}',
    },
  });

  // 加载保存的规则、历史和配置
  useEffect(() => {
    const savedRules = localStorage.getItem(ALERTS_STORAGE_KEY);
    const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
    const savedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);

    if (savedRules) {
      try { setRules(JSON.parse(savedRules)); } catch { /* ignore */ }
    }

    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch { /* ignore */ }
    }

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // 合并默认配置，确保新字段存在
        setChannelConfig({
          ...channelConfig,
          ...parsed,
          email: { ...channelConfig.email, ...parsed.email },
          feishu: { ...channelConfig.feishu, ...parsed.feishu },
          webhook: { ...channelConfig.webhook, ...parsed.webhook },
        });
      } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 保存规则
  useEffect(() => {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(rules));
  }, [rules]);

  // 保存历史
  useEffect(() => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 100)));
  }, [history]);

  // 保存渠道配置
  useEffect(() => {
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(channelConfig));
  }, [channelConfig]);

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // 测试发送通知（调用后端代理，真实发送飞书/Webhook）
  const handleTestNotification = async (channel: 'email' | 'feishu' | 'webhook') => {
    setIsSendingTest(channel);
    setTestResult(null);

    try {
      let payload: Record<string, unknown>;

      if (channel === 'email') {
        const { email } = channelConfig;
        if (!email?.smtpHost || !email?.recipients) {
          setTestResult({ success: false, message: '请先填写 SMTP 服务器和收件人邮箱' });
          setIsSendingTest(null);
          return;
        }
        payload = { channel: 'email', config: email };
      } else if (channel === 'feishu') {
        const { feishu } = channelConfig;
        if (!feishu?.webhookUrl) {
          setTestResult({ success: false, message: '请先填写飞书 Webhook 地址' });
          setIsSendingTest(null);
          return;
        }
        payload = { channel: 'feishu', config: feishu };
      } else {
        const { webhook } = channelConfig;
        if (!webhook?.url) {
          setTestResult({ success: false, message: '请先填写 Webhook URL' });
          setIsSendingTest(null);
          return;
        }
        payload = { channel: 'webhook', config: webhook };
      }

      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      setTestResult({
        success: result.success,
        message: result.success ? result.message : (result.error || '发送失败'),
      });
    } catch (err) {
      setTestResult({
        success: false,
        message: `发送失败: ${err instanceof Error ? err.message : '网络错误'}`,
      });
    } finally {
      setIsSendingTest(null);
    }
  };

  // 更新渠道配置
  const updateChannelConfig = <K extends keyof NotificationConfig>(
    key: K,
    value: NotificationConfig[K]
  ) => {
    setChannelConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateSubConfig = <T extends 'email' | 'feishu' | 'webhook'>(
    channel: T,
    updates: Partial<NonNullable<NotificationConfig[T]>>
  ) => {
    setChannelConfig(prev => ({
      ...prev,
      [channel]: { ...(prev[channel] as Record<string, unknown>), ...updates } as NonNullable<NotificationConfig[T]>,
    }));
  };

  // 创建新规则
  const handleCreateRule = () => {
    const numericFields = fieldStats.filter(f => f.type === 'number');
    setEditingRule({
      id: `alert-${Date.now()}`,
      name: '',
      description: '',
      field: numericFields[0]?.field || '',
      condition: 'gt',
      threshold: 0,
      severity: 'warning',
      channels: ['in_app'],
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      triggerCount: 0
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  // 编辑规则
  const handleEditRule = (rule: AlertRule) => {
    setEditingRule({ ...rule });
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  // 保存规则
  const handleSaveRule = () => {
    if (!editingRule) return;
    if (!editingRule.name || !editingRule.field) return;

    const updated = { ...editingRule, updatedAt: Date.now() };
    
    if (isCreating) {
      setRules(prev => [...prev, updated]);
    } else {
      setRules(prev => prev.map(r => r.id === editingRule.id ? updated : r));
    }

    setIsDialogOpen(false);
    setEditingRule(null);
  };

  // 删除规则
  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  // 切换启用状态
  const handleToggleEnabled = (id: string) => {
    setRules(prev => prev.map(r => 
      r.id === id ? { ...r, enabled: !r.enabled, updatedAt: Date.now() } : r
    ));
  };

  // 预览规则
  const handlePreview = useCallback(() => {
    if (!editingRule?.field) return;

    setIsTesting(true);
    
    // 模拟计算当前值
    const values = data.rows
      .map(r => Number(r[editingRule.field]))
      .filter(v => !isNaN(v));
    
    let currentValue = 0;
    
    switch (editingRule.condition) {
      case 'gt':
      case 'gte':
      case 'lt':
      case 'lte':
      case 'eq':
        currentValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) : 0;
        break;
      case 'change_up':
      case 'change_down':
        currentValue = 15.5; // 模拟环比变化
        break;
      case 'null':
        currentValue = data.rows.filter(r => r[editingRule.field] === null || r[editingRule.field] === '').length;
        break;
    }

    // 判断是否触发
    let triggered = false;
    switch (editingRule.condition) {
      case 'gt': triggered = currentValue > editingRule.threshold; break;
      case 'lt': triggered = currentValue < editingRule.threshold; break;
      case 'gte': triggered = currentValue >= editingRule.threshold; break;
      case 'lte': triggered = currentValue <= editingRule.threshold; break;
      case 'eq': triggered = currentValue === editingRule.threshold; break;
      case 'between': 
        triggered = editingRule.threshold2 
          ? currentValue > editingRule.threshold && currentValue < editingRule.threshold2 
          : false;
        break;
      case 'change_up': triggered = currentValue > editingRule.threshold; break;
      case 'change_down': triggered = currentValue > editingRule.threshold; break;
      case 'null': triggered = currentValue > 0; break;
    }

    setPreviewResult({ triggered, value: currentValue });
    setIsTesting(false);
  }, [editingRule, data]);

  // 测试告警
  const handleTestAlert = (rule: AlertRule) => {
    const testHistory: AlertHistory = {
      id: `test-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      triggeredAt: Date.now(),
      value: rule.threshold * 1.2,
      threshold: rule.threshold,
      severity: rule.severity,
      status: 'firing',
      notificationSent: false
    };

    setHistory(prev => [testHistory, ...prev]);
    
    // 显示通知
    if (rule.channels.includes('in_app')) {
      onAlertTrigger?.(rule, testHistory.value);
    }
  };

  // 获取条件显示文本
  const getConditionText = (rule: AlertRule): string => {
    const config = CONDITION_CONFIG.find(c => c.value === rule.condition);
    if (!config) return '';

    switch (rule.condition) {
      case 'between':
        return `${rule.threshold} < 值 < ${rule.threshold2}`;
      case 'change_up':
      case 'change_down':
        return `${config.label} ${rule.threshold}%`;
      case 'null':
        return '为空';
      default:
        return `${config.label} ${rule.threshold}`;
    }
  };

  // 格式化时间
  const formatTime = useCallback((timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return new Date(timestamp).toLocaleDateString();
  }, []);

  // 活跃规则
  const activeRules = useMemo(() => rules.filter(r => r.enabled), [rules]);
  const triggeredRules = useMemo(() => 
    history.filter(h => h.status === 'firing'), [history]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-orange-500" />
          <h3 className="font-medium">数据预警</h3>
          {triggeredRules.length > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {triggeredRules.length} 个告警
            </Badge>
          )}
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreateRule}>
              <Plus className="w-4 h-4 mr-1" />
              新建告警
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isCreating ? '创建告警规则' : '编辑告警规则'}
              </DialogTitle>
              <DialogDescription>
                设置数据监控条件，当数据异常时自动通知
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* 基本信息 */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">告警名称 *</Label>
                  <Input
                    id="rule-name"
                    placeholder="如：日销售额超过10万"
                    value={editingRule?.name || ''}
                    onChange={e => setEditingRule(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-desc">描述（可选）</Label>
                  <Textarea
                    id="rule-desc"
                    placeholder="描述这个告警的业务含义..."
                    rows={2}
                    value={editingRule?.description || ''}
                    onChange={e => setEditingRule(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>
              </div>

              {/* 条件配置 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>监控字段 *</Label>
                  <Select
                    value={editingRule?.field || ''}
                    onValueChange={v => setEditingRule(prev => prev ? { ...prev, field: v } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择字段" />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldStats.map(f => (
                        <SelectItem key={f.field} value={f.field}>
                          {f.field}
                          {f.type === 'number' && ' (数值)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>条件 *</Label>
                  <Select
                    value={editingRule?.condition || 'gt'}
                    onValueChange={v => setEditingRule(prev => prev ? { ...prev, condition: v as AlertCondition } : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONDITION_CONFIG.map(config => (
                        <SelectItem key={config.value} value={config.value}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 阈值 */}
              {editingRule?.condition !== 'null' && (
                <div className="space-y-2">
                  <Label>阈值 {editingRule?.condition === 'between' && '(下限)'} *</Label>
                  <Input
                    type="number"
                    placeholder="输入阈值..."
                    value={editingRule?.threshold || ''}
                    onChange={e => setEditingRule(prev => prev ? { ...prev, threshold: Number(e.target.value) } : null)}
                  />
                </div>
              )}

              {editingRule?.condition === 'between' && (
                <div className="space-y-2">
                  <Label>阈值上限 *</Label>
                  <Input
                    type="number"
                    placeholder="输入上限..."
                    value={editingRule?.threshold2 || ''}
                    onChange={e => setEditingRule(prev => prev ? { ...prev, threshold2: Number(e.target.value) } : null)}
                  />
                </div>
              )}

              {/* 严重程度 */}
              <div className="space-y-2">
                <Label>严重程度 *</Label>
                <div className="flex gap-2">
                  {(Object.entries(SEVERITY_CONFIG) as [AlertSeverity, typeof SEVERITY_CONFIG.critical][]).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setEditingRule(prev => prev ? { ...prev, severity: key } : null)}
                      className={cn(
                        'flex-1 p-3 rounded-lg border text-center transition-all',
                        editingRule?.severity === key
                          ? `border-2 ${config.color} ${config.bg}`
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <p className="font-medium">{config.label}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 通知渠道 */}
              <div className="space-y-2">
                <Label>通知渠道</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(CHANNEL_CONFIG) as [NotificationChannel, typeof CHANNEL_CONFIG.in_app][]).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = editingRule?.channels.includes(key);
                    
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (!editingRule) return;
                          const channels = isSelected
                            ? editingRule.channels.filter(c => c !== key)
                            : [...editingRule.channels, key];
                          setEditingRule({ ...editingRule, channels });
                        }}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-lg border transition-all',
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', config.color)} />
                        <span className="text-sm">{config.label}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 预览 */}
              {previewResult && (
                <div className={cn(
                  'p-3 rounded-lg',
                  previewResult.triggered ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
                )}>
                  <div className="flex items-center gap-2">
                    {previewResult.triggered ? (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    <div>
                      <p className={cn(
                        'font-medium',
                        previewResult.triggered ? 'text-red-700' : 'text-green-700'
                      )}>
                        {previewResult.triggered ? '将会触发告警' : '不会触发告警'}
                      </p>
                      <p className="text-sm text-gray-500">
                        当前值: {previewResult.value.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={handlePreview}
                disabled={isTesting || !editingRule?.field}
              >
                {isTesting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Eye className="w-4 h-4 mr-2" />
                )}
                预览
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveRule}>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rules" className="flex items-center gap-1">
            <Bell className="w-4 h-4" />
            告警规则
            {activeRules.length > 0 && (
              <Badge variant="secondary" className="ml-1">{activeRules.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="w-4 h-4" />
            告警历史
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-1">
            <Settings className="w-4 h-4" />
            设置
          </TabsTrigger>
        </TabsList>

        {/* 规则列表 */}
        <TabsContent value="rules" className="mt-4 space-y-3">
          {rules.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂未创建任何告警规则</p>
                <p className="text-sm text-gray-400 mt-1">创建规则后，当数据满足条件时会自动通知你</p>
              </CardContent>
            </Card>
          ) : (
            rules.map(rule => (
              <Card 
                key={rule.id}
                className={cn(
                  'transition-all',
                  rule.enabled && rule.triggerCount > 0 && 'border-orange-200'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {rule.enabled ? (
                          <BellRing className="w-4 h-4 text-orange-500" />
                        ) : (
                          <Bell className="w-4 h-4 text-gray-400" />
                        )}
                        <h4 className="font-medium">{rule.name}</h4>
                        <Badge className={SEVERITY_CONFIG[rule.severity].bg}>
                          <span className={SEVERITY_CONFIG[rule.severity].color}>
                            {SEVERITY_CONFIG[rule.severity].label}
                          </span>
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-gray-500 mb-2">
                        当 <code className="bg-gray-100 px-1 rounded">{rule.field}</code>{' '}
                        {getConditionText(rule)}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          {CHANNEL_CONFIG[rule.channels[0]] && (
                            <>
                              {React.createElement(CHANNEL_CONFIG[rule.channels[0]].icon, { className: 'w-3 h-3' })}
                              {rule.channels.length > 1 && `+${rule.channels.length - 1}`}
                            </>
                          )}
                        </span>
                        {rule.lastTriggered && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            上次触发: {formatTime(rule.lastTriggered)}
                          </span>
                        )}
                        <span>已触发 {rule.triggerCount} 次</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* 启用开关 */}
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={() => handleToggleEnabled(rule.id)}
                      />

                      {/* 测试按钮 */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTestAlert(rule)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>发送测试通知</TooltipContent>
                      </Tooltip>

                      {/* 编辑 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRule(rule)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>

                      {/* 删除 */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* 告警历史 */}
        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无告警历史</p>
                <p className="text-sm text-gray-400 mt-1">告警触发后会显示在这里</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map(item => (
                <Card key={item.id} className="border-l-4 border-l-orange-400">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className={cn(
                          'w-5 h-5',
                          item.severity === 'critical' ? 'text-red-500' :
                          item.severity === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                        )} />
                        <div>
                          <p className="font-medium">{item.ruleName}</p>
                          <p className="text-sm text-gray-500">
                            触发值: {item.value.toLocaleString()} | 阈值: {item.threshold}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={item.status === 'firing' ? 'destructive' : 'secondary'}>
                          {item.status === 'firing' ? '进行中' : item.status === 'resolved' ? '已解决' : '已确认'}
                        </Badge>
                        <span className="text-sm text-gray-400">
                          {formatTime(item.triggeredAt)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 设置 */}
        {/* ===== 设置 Tab ===== */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-base">通知渠道配置</h3>
              <p className="text-xs text-gray-500 mt-0.5">配置告警通知的发送渠道和凭证，配置后自动保存</p>
            </div>
          </div>

          <Tabs value={activeChannelTab} onValueChange={(v) => setActiveChannelTab(v as typeof activeChannelTab)}>
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value="email" className="text-xs flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                邮件
                {channelConfig.email?.enabled && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
              </TabsTrigger>
              <TabsTrigger value="feishu" className="text-xs flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                飞书
                {channelConfig.feishu?.enabled && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
              </TabsTrigger>
              <TabsTrigger value="webhook" className="text-xs flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Webhook
                {channelConfig.webhook?.enabled && <CheckCircle2 className="w-3 h-3 text-green-500 ml-1" />}
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs flex items-center gap-1">
                <Settings className="w-3.5 h-3.5" />
                高级
              </TabsTrigger>
            </TabsList>

            {/* ===== 邮件配置 ===== */}
            <TabsContent value="email">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 rounded-lg">
                        <Mail className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">邮件通知</CardTitle>
                        <CardDescription className="text-xs">通过 SMTP 发送告警邮件</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={channelConfig.email?.enabled ?? false}
                      onCheckedChange={(checked) => updateSubConfig('email', { enabled: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">SMTP 服务器</label>
                      <Input
                        placeholder="smtp.example.com"
                        value={channelConfig.email?.smtpHost ?? ''}
                        onChange={(e) => updateSubConfig('email', { smtpHost: e.target.value })}
                        disabled={!channelConfig.email?.enabled}
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">SMTP 端口</label>
                      <Input
                        placeholder="465"
                        type="number"
                        value={channelConfig.email?.smtpPort ?? 465}
                        onChange={(e) => updateSubConfig('email', { smtpPort: parseInt(e.target.value) || 465 })}
                        disabled={!channelConfig.email?.enabled}
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">用户名</label>
                      <Input
                        placeholder="your@email.com"
                        value={channelConfig.email?.username ?? ''}
                        onChange={(e) => updateSubConfig('email', { username: e.target.value })}
                        disabled={!channelConfig.email?.enabled}
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">密码 / 授权码</label>
                      <Input
                        type="password"
                        placeholder="邮箱密码或授权码"
                        value={channelConfig.email?.password ?? ''}
                        onChange={(e) => updateSubConfig('email', { password: e.target.value })}
                        disabled={!channelConfig.email?.enabled}
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">发件人名称</label>
                      <Input
                        placeholder="DataInsight"
                        value={channelConfig.email?.senderName ?? ''}
                        onChange={(e) => updateSubConfig('email', { senderName: e.target.value })}
                        disabled={!channelConfig.email?.enabled}
                        className="text-sm h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 mb-1 block">发件人邮箱</label>
                      <Input
                        placeholder="sender@example.com"
                        value={channelConfig.email?.senderEmail ?? ''}
                        onChange={(e) => updateSubConfig('email', { senderEmail: e.target.value })}
                        disabled={!channelConfig.email?.enabled}
                        className="text-sm h-9"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">收件人邮箱 <span className="text-red-500">*</span></label>
                    <Input
                      placeholder="receiver1@example.com, receiver2@example.com（多个用逗号分隔）"
                      value={channelConfig.email?.recipients ?? ''}
                      onChange={(e) => updateSubConfig('email', { recipients: e.target.value })}
                      disabled={!channelConfig.email?.enabled}
                      className="text-sm h-9"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">支持多个收件人，用英文逗号分隔</p>
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestNotification('email')}
                      disabled={!channelConfig.email?.enabled || !channelConfig.email?.smtpHost || !channelConfig.email?.recipients || isSendingTest === 'email'}
                    >
                      {isSendingTest === 'email' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                      发送测试邮件
                    </Button>
                  </div>
                  {/* 测试结果 */}
                  {testResult && isSendingTest === null && (
                    <div className={cn('mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2', testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                      {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      {testResult.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-3 bg-amber-50 border-amber-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-amber-700 space-y-0.5">
                      <p className="font-medium text-amber-800">常用邮箱 SMTP 配置参考</p>
                      <p>QQ邮箱：smtp.qq.com:587（SSL: smtp.qq.com:465）</p>
                      <p>163邮箱：smtp.163.com:465 | 阿里邮箱：smtp.aliyun.com:465</p>
                      <p>Gmail：smtp.gmail.com:587 | 企业邮箱：请咨询邮箱服务商</p>
                      <p className="mt-1 text-amber-900">建议使用企业邮箱或个人邮箱「授权码」而非登录密码</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== 飞书配置 ===== */}
            <TabsContent value="feishu">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-green-100 rounded-lg">
                        <MessageSquare className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">飞书 Webhook 通知</CardTitle>
                        <CardDescription className="text-xs">通过飞书群机器人发送告警卡片</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={channelConfig.feishu?.enabled ?? false}
                      onCheckedChange={(checked) => updateSubConfig('feishu', { enabled: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">
                      Webhook 地址 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxx"
                      value={channelConfig.feishu?.webhookUrl ?? ''}
                      onChange={(e) => updateSubConfig('feishu', { webhookUrl: e.target.value })}
                      disabled={!channelConfig.feishu?.enabled}
                      className="text-sm h-9 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">签名密钥（可选）</label>
                    <Input
                      type="password"
                      placeholder="开启签名校验后填写密钥，否则留空"
                      value={channelConfig.feishu?.secret ?? ''}
                      onChange={(e) => updateSubConfig('feishu', { secret: e.target.value })}
                      disabled={!channelConfig.feishu?.enabled}
                      className="text-sm h-9"
                    />
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestNotification('feishu')}
                      disabled={!channelConfig.feishu?.enabled || !channelConfig.feishu?.webhookUrl || isSendingTest === 'feishu'}
                    >
                      {isSendingTest === 'feishu' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                      发送测试消息
                    </Button>
                  </div>
                  {testResult && isSendingTest === null && (
                    <div className={cn('mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2', testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                      {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      {testResult.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-3 bg-green-50 border-green-200">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    <div className="text-xs text-green-700 space-y-1">
                      <p className="font-medium text-green-800">如何获取飞书 Webhook？</p>
                      <p>1. 打开飞书群 → 右上角「群设置」→「群机器人」→「添加机器人」</p>
                      <p>2. 选择「自定义机器人」→ 填写机器人名称</p>
                      <p>3. 复制 Webhook 地址（格式：.../hook/xxx-xxx-xxx）</p>
                      <p className="mt-1 text-green-900">如开启签名校验，保存密钥并在配置中填写</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== Webhook 配置 ===== */}
            <TabsContent value="webhook">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-100 rounded-lg">
                        <Zap className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">Webhook 通知</CardTitle>
                        <CardDescription className="text-xs">向任意 HTTP 端点发送告警请求</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={channelConfig.webhook?.enabled ?? false}
                      onCheckedChange={(checked) => updateSubConfig('webhook', { enabled: checked })}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">Webhook URL <span className="text-red-500">*</span></label>
                    <Input
                      placeholder="https://your-server.com/api/alert"
                      value={channelConfig.webhook?.url ?? ''}
                      onChange={(e) => updateSubConfig('webhook', { url: e.target.value })}
                      disabled={!channelConfig.webhook?.enabled}
                      className="text-sm h-9 font-mono"
                    />
                    {/* 平台自动检测提示 */}
                    {channelConfig.webhook?.url && (
                      <p className="text-[10px] mt-1 text-blue-600">
                        {channelConfig.webhook.url.includes('open.feishu.cn') || channelConfig.webhook.url.includes('open.larksuite.com')
                          ? '\u2713 检测到飞书 Webhook，将自动适配消息格式'
                          : channelConfig.webhook.url.includes('oapi.dingtalk.com')
                            ? '\u2713 检测到钉钉 Webhook，将自动适配消息格式'
                            : channelConfig.webhook.url.includes('qyapi.weixin.qq.com')
                              ? '\u2713 检测到企业微信 Webhook，将自动适配消息格式'
                              : '通用 Webhook，发送标准 JSON 格式'}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">请求方法</label>
                    <Select
                      value={channelConfig.webhook?.method ?? 'POST'}
                      onValueChange={(v) => updateSubConfig('webhook', { method: v as 'POST' | 'GET' })}
                      disabled={!channelConfig.webhook?.enabled}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="POST">POST</SelectItem>
                        <SelectItem value="GET">GET</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1 block">自定义请求头</label>
                    <Textarea
                      placeholder='{"Authorization":"Bearer xxx","Content-Type":"application/json"}'
                      value={channelConfig.webhook?.headers ?? ''}
                      onChange={(e) => updateSubConfig('webhook', { headers: e.target.value })}
                      disabled={!channelConfig.webhook?.enabled}
                      className="text-xs h-20 font-mono"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">JSON 格式，填写 Authorization 等认证 header</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-xs text-blue-700 font-medium mb-1.5">POST 请求 Body 示例</p>
                    <pre className="text-[10px] text-blue-600 font-mono whitespace-pre-wrap overflow-x-auto">
{`{
  "alert_name": "销售额告警",
  "severity": "warning",
  "message": "8月销售额低于阈值 10万",
  "metric": "销售额",
  "value": 85000,
  "threshold": 100000,
  "triggered_at": "2024-08-15T10:30:00Z"
}`}
                    </pre>
                  </div>
                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestNotification('webhook')}
                      disabled={!channelConfig.webhook?.enabled || !channelConfig.webhook?.url || isSendingTest === 'webhook'}
                    >
                      {isSendingTest === 'webhook' ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                      发送测试请求
                    </Button>
                  </div>
                  {testResult && isSendingTest === null && (
                    <div className={cn('mt-2 p-2.5 rounded-lg text-xs flex items-center gap-2', testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200')}>
                      {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      {testResult.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ===== 高级配置 ===== */}
            <TabsContent value="advanced">
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">告警抑制（去重）</CardTitle>
                    <CardDescription className="text-xs">同类告警在设定时间内不重复发送，避免告警风暴</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm">启用告警抑制</p>
                      <Switch defaultChecked />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-gray-600">冷却时间</label>
                      <Select defaultValue="30">
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 分钟（高频监控场景）</SelectItem>
                          <SelectItem value="15">15 分钟（标准场景）</SelectItem>
                          <SelectItem value="30">30 分钟（推荐）</SelectItem>
                          <SelectItem value="60">1 小时（低频监控）</SelectItem>
                          <SelectItem value="0">不限制</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">静默时段</CardTitle>
                    <CardDescription className="text-xs">设置不发送告警的时间段（如夜间维护窗口）</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">启用静默时段</p>
                        <p className="text-xs text-gray-500 mt-0.5">00:00 ~ 06:00 期间不发送告警</p>
                      </div>
                      <Switch />
                    </div>
                  </CardContent>
                </Card>

                {/* 应用内通知 */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-100 rounded-lg">
                          <Bell className="w-4 h-4 text-indigo-600" />
                        </div>
                        <div>
                          <CardTitle className="text-sm">应用内通知</CardTitle>
                          <CardDescription className="text-xs">在界面内实时显示告警弹窗（默认开启）</CardDescription>
                        </div>
                      </div>
                      <Switch checked disabled />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-gray-500">应用内通知无需额外配置，告警实时显示。此功能始终启用。</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DataAlerting;
