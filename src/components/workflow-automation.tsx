'use client';

import { useState, useEffect } from 'react';
import {
  Zap, Plus, Trash2, Play, Pause, AlertTriangle, Bell, Mail, FileSpreadsheet,
  Clock, Webhook, Database, MessageCircle, Calendar, Send, Settings, ChevronDown,
  ChevronRight, Copy, Check, GitBranch, Filter, ArrowRight, Bot, FileText,
  Users, Edit3, SendHorizontal, ExternalLink, RefreshCw, Timer
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============= 类型定义 =============

// 触发器类型
type TriggerType = 'record_created' | 'record_updated' | 'record_deleted' | 'field_changed' | 'scheduled' | 'webhook';

// 操作类型
type ActionType = 
  | 'notify' | 'email' | 'feishu_group' | 'http_request'
  | 'create_record' | 'update_record' | 'delete_record' | 'set_field'
  | 'ai_generate' | 'create_task' | 'create_calendar' | 'add_button';

// 触发器配置
interface TriggerConfig {
  type: TriggerType;
  field?: string;           // 字段变更时使用
  conditions?: {            // 条件过滤
    field: string;
    operator: string;
    value: string;
  }[];
  schedule?: {              // 定时触发
    frequency: 'once' | 'daily' | 'weekly' | 'monthly';
    time?: string;          // HH:mm
    dayOfWeek?: number;     // 0-6
    dayOfMonth?: number;    // 1-31
  };
  webhookPath?: string;     // Webhook路径
}

// 操作配置
interface ActionConfig {
  type: ActionType;
  notifyMessage?: string;
  emailTo?: string;
  emailSubject?: string;
  emailBody?: string;
  feishuWebhook?: string;
  feishuMessage?: string;
  httpUrl?: string;
  httpMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  httpHeaders?: Record<string, string>;
  httpBody?: string;
  targetTable?: string;
  updateFields?: Record<string, string>;
  fieldToUpdate?: string;
  fieldValue?: string;
  aiPrompt?: string;
  taskTitle?: string;
  taskAssignee?: string;
  taskDueDate?: string;
  calendarTitle?: string;
  calendarStart?: string;
  calendarEnd?: string;
  calendarAttendees?: string[];
  buttonText?: string;
  buttonAction?: string;
}

// 工作流规则
interface WorkflowRule {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: TriggerConfig;
  conditions?: {            // 额外的条件过滤
    field: string;
    operator: string;
    value: string;
  }[];
  actions: ActionConfig[];
  lastRun?: Date;
  runCount: number;
  createdAt: Date;
}

// 预设模板
const WORKFLOW_TEMPLATES: { name: string; description: string; trigger: TriggerConfig; actions: ActionConfig[] }[] = [
  {
    name: '新订单通知',
    description: '当有新的订单记录时，自动发送邮件通知',
    trigger: { type: 'record_created', conditions: [{ field: '状态', operator: '=', value: '新订单' }] },
    actions: [{ type: 'email', emailSubject: '新订单提醒', emailBody: '您有一笔新订单需要处理' }],
  },
  {
    name: '库存预警',
    description: '当库存低于预警值时，发送通知',
    trigger: { type: 'field_changed', field: '库存量' },
    actions: [{ type: 'notify', notifyMessage: '库存不足预警' }],
  },
  {
    name: '每日数据汇总',
    description: '每天定时发送数据汇总报告',
    trigger: { type: 'scheduled', schedule: { frequency: 'daily', time: '09:00' } },
    actions: [{ type: 'ai_generate', aiPrompt: '生成今日数据汇总报告' }],
  },
  {
    name: '逾期提醒',
    description: '当任务逾期时自动更新状态并通知',
    trigger: { type: 'scheduled', schedule: { frequency: 'daily', time: '08:00' } },
    actions: [
      { type: 'set_field', fieldToUpdate: '状态', fieldValue: '已逾期' },
      { type: 'notify', notifyMessage: '任务已逾期，请及时处理' },
    ],
  },
  {
    name: 'Webhook数据同步',
    description: '当有数据变更时，通过Webhook同步到外部系统',
    trigger: { type: 'record_updated' },
    actions: [{ type: 'http_request', httpMethod: 'POST', httpUrl: 'https://api.example.com/sync' }],
  },
];

// 触发器选项
const TRIGGER_OPTIONS: { value: TriggerType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'record_created', label: '新增记录', icon: Plus, description: '当有新的记录被添加时触发' },
  { value: 'record_updated', label: '修改记录', icon: Edit3, description: '当记录被修改时触发' },
  { value: 'record_deleted', label: '删除记录', icon: Trash2, description: '当记录被删除时触发' },
  { value: 'field_changed', label: '字段变更', icon: RefreshCw, description: '当指定字段的值变更时触发' },
  { value: 'scheduled', label: '定时触发', icon: Timer, description: '按设定的时间周期自动触发' },
  { value: 'webhook', label: 'Webhook', icon: Webhook, description: '当收到Webhook请求时触发' },
];

// 操作选项
const ACTION_OPTIONS: { value: ActionType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'notify', label: '发送通知', icon: Bell, description: '在应用内发送通知提醒' },
  { value: 'email', label: '发送邮件', icon: Mail, description: '发送邮件到指定邮箱' },
  { value: 'feishu_group', label: '飞书群消息', icon: MessageCircle, description: '发送消息到飞书群' },
  { value: 'http_request', label: 'HTTP请求', icon: ExternalLink, description: '向外部系统发送HTTP请求' },
  { value: 'update_record', label: '更新记录', icon: Edit3, description: '更新当前记录指定字段的值' },
  { value: 'set_field', label: '设置字段值', icon: Database, description: '设置记录中指定字段的值' },
  { value: 'ai_generate', label: 'AI生成文本', icon: Bot, description: '使用AI生成内容填充字段' },
  { value: 'create_task', label: '创建任务', icon: Calendar, description: '创建待办任务' },
  { value: 'add_button', label: '添加快捷按钮', icon: SendHorizontal, description: '在记录中添加可点击的按钮' },
];

interface WorkflowAutomationProps {
  headers: string[];
  tableName?: string;
}

export function WorkflowAutomation({ headers, tableName = '当前表' }: WorkflowAutomationProps) {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [activeTab, setActiveTab] = useState('rules');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  // 加载规则
  useEffect(() => {
    try {
      const saved = localStorage.getItem('datainsight-workflows');
      if (saved) {
        const parsed = JSON.parse(saved) as WorkflowRule[];
        parsed.forEach(r => {
          r.createdAt = new Date(r.createdAt);
          if (r.lastRun) r.lastRun = new Date(r.lastRun);
        });
        setRules(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // 保存规则
  const saveRules = (newRules: WorkflowRule[]) => {
    setRules(newRules);
    localStorage.setItem('datainsight-workflows', JSON.stringify(newRules));
  };

  // 添加规则
  const addRule = (rule: WorkflowRule) => {
    saveRules([...rules, rule]);
    setShowAdd(false);
  };

  // 更新规则
  const updateRule = (updated: WorkflowRule) => {
    saveRules(rules.map(r => r.id === updated.id ? updated : r));
    setEditingRule(null);
  };

  // 删除规则
  const deleteRule = (id: string) => {
    saveRules(rules.filter(r => r.id !== id));
  };

  // 切换规则启用状态
  const toggleRule = (id: string) => {
    saveRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  // 立即运行规则（模拟）
  const runRule = (rule: WorkflowRule) => {
    saveRules(rules.map(r => r.id === rule.id ? { ...r, lastRun: new Date(), runCount: r.runCount + 1 } : r));
    alert(`规则 "${rule.name}" 已触发执行`);
  };

  // 从模板创建
  const createFromTemplate = (template: typeof WORKFLOW_TEMPLATES[0]) => {
    const newRule: WorkflowRule = {
      id: `wf-${crypto.randomUUID()}`,
      name: template.name,
      description: template.description,
      enabled: false,
      trigger: template.trigger,
      conditions: template.trigger.conditions,
      actions: template.actions,
      runCount: 0,
      createdAt: new Date(),
    };
    addRule(newRule);
    setShowTemplates(false);
  };

  // 获取触发器图标
  const getTriggerIcon = (type: TriggerType) => {
    const option = TRIGGER_OPTIONS.find(t => t.value === type);
    return option?.icon || Zap;
  };

  // 获取操作图标
  const getActionIcon = (type: ActionType) => {
    const option = ACTION_OPTIONS.find(a => a.value === type);
    return option?.icon || Zap;
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">自动化工作流</h3>
          <Badge variant="secondary">
            {rules.filter(r => r.enabled).length}/{rules.length} 启用
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>
            <FileText className="w-4 h-4 mr-1" />
            从模板创建
          </Button>
          <Button size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-1" />
            新建工作流
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      {rules.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">总规则数</p>
            <p className="text-2xl font-bold">{rules.length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">启用中</p>
            <p className="text-2xl font-bold text-green-600">{rules.filter(r => r.enabled).length}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">总执行次数</p>
            <p className="text-2xl font-bold">{rules.reduce((sum, r) => sum + r.runCount, 0)}</p>
          </Card>
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">最近执行</p>
            <p className="text-sm font-medium truncate">
              {rules.find(r => r.lastRun)?.lastRun?.toLocaleDateString() || '暂无'}
            </p>
          </Card>
        </div>
      )}

      {/* 规则列表 */}
      {rules.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <GitBranch className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="font-medium mb-1">暂无自动化规则</h3>
              <p className="text-sm text-muted-foreground mb-3">
                自动化工作流可以在数据满足条件时自动执行操作
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTemplates(true)}>
                <FileText className="w-4 h-4 mr-1" />
                从模板创建
              </Button>
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-1" />
                新建工作流
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const TriggerIcon = getTriggerIcon(rule.trigger.type);
            const isExpanded = expandedRule === rule.id;
            
            return (
              <Card key={rule.id} className={`overflow-hidden ${!rule.enabled ? 'opacity-60' : ''}`}>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Switch 
                        checked={rule.enabled} 
                        onCheckedChange={() => toggleRule(rule.id)} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{rule.name}</p>
                          {rule.description && (
                            <Badge variant="outline" className="text-[10px] h-5 truncate max-w-[200px]">
                              {rule.description}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TriggerIcon className="w-3 h-3" />
                            {TRIGGER_OPTIONS.find(t => t.value === rule.trigger.type)?.label}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="flex items-center gap-1">
                            {rule.actions.slice(0, 2).map((a, i) => {
                              const ActionIcon = getActionIcon(a.type);
                              return (
                                <span key={i} className="flex items-center gap-1">
                                  <ActionIcon className="w-3 h-3" />
                                  {ACTION_OPTIONS.find(opt => opt.value === a.type)?.label}
                                  {i < Math.min(rule.actions.length, 2) - 1 && <span>+{rule.actions.length - 1}</span>}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => runRule(rule)}
                        title="立即运行"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setEditingRule(rule)}
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* 展开详情 */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-3">
                      {/* 触发器详情 */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-medium">触发器</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <p>{TRIGGER_OPTIONS.find(t => t.value === rule.trigger.type)?.description}</p>
                          {rule.trigger.field && (
                            <p className="mt-1">监控字段: <Badge variant="outline">{rule.trigger.field}</Badge></p>
                          )}
                          {rule.trigger.schedule && (
                            <p className="mt-1">
                              执行频率: 
                              <Badge variant="outline" className="ml-1">
                                {rule.trigger.schedule.frequency === 'daily' && '每天'}
                                {rule.trigger.schedule.frequency === 'weekly' && `每周${['日','一','二','三','四','五','六'][rule.trigger.schedule.dayOfWeek || 0]}`}
                                {rule.trigger.schedule.frequency === 'monthly' && `每月${rule.trigger.schedule.dayOfMonth}日`}
                                {rule.trigger.schedule.frequency === 'once' && '仅一次'}
                              </Badge>
                              {rule.trigger.schedule.time && ` ${rule.trigger.schedule.time}`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 条件详情 */}
                      {rule.conditions && rule.conditions.length > 0 && (
                        <div className="bg-muted/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Filter className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-medium">触发条件</span>
                          </div>
                          <div className="space-y-1">
                            {rule.conditions.map((c, i) => (
                              <p key={i} className="text-xs">
                                当 <Badge variant="outline">{c.field}</Badge> {c.operator} <Badge variant="outline">{c.value}</Badge>
                              </p>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 操作详情 */}
                      <div className="bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <GitBranch className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-medium">执行操作</span>
                        </div>
                        <div className="space-y-2">
                          {rule.actions.map((action, i) => {
                            const ActionIcon = getActionIcon(action.type);
                            return (
                              <div key={i} className="flex items-start gap-2 text-xs">
                                <span className="text-muted-foreground">{i + 1}.</span>
                                <ActionIcon className="w-3 h-3 mt-0.5 shrink-0" />
                                <div>
                                  <Badge variant="outline" className="text-[10px]">
                                    {ACTION_OPTIONS.find(a => a.value === action.type)?.label}
                                  </Badge>
                                  {action.notifyMessage && (
                                    <p className="text-muted-foreground ml-1">消息: {action.notifyMessage}</p>
                                  )}
                                  {action.emailTo && (
                                    <p className="text-muted-foreground ml-1">发送至: {action.emailTo}</p>
                                  )}
                                  {action.httpUrl && (
                                    <p className="text-muted-foreground ml-1">URL: {action.httpUrl}</p>
                                  )}
                                  {action.fieldToUpdate && (
                                    <p className="text-muted-foreground ml-1">
                                      设置字段: {action.fieldToUpdate} = {action.fieldValue}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 统计信息 */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>已执行 {rule.runCount} 次</span>
                        {rule.lastRun && <span>最近: {rule.lastRun.toLocaleString()}</span>}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* 新建/编辑对话框 */}
      <WorkflowEditorDialog
        open={showAdd || !!editingRule}
        onOpenChange={(open) => {
          if (!open) {
            setShowAdd(false);
            setEditingRule(null);
          }
        }}
        rule={editingRule}
        headers={headers}
        tableName={tableName}
        onSave={editingRule ? updateRule : addRule}
      />

      {/* 模板选择对话框 */}
      <Dialog open={showTemplates} onOpenChange={setShowTemplates}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>工作流模板</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-auto p-1">
            {WORKFLOW_TEMPLATES.map((template, i) => (
              <Card
                key={i}
                className="p-4 cursor-pointer hover:border-primary transition-colors"
                onClick={() => createFromTemplate(template)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <GitBranch className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <Badge variant="outline" className="text-[10px] h-5">
                        {TRIGGER_OPTIONS.find(t => t.value === template.trigger.type)?.label}
                      </Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge variant="outline" className="text-[10px] h-5">
                        {ACTION_OPTIONS.find(a => a.value === template.actions[0].type)?.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============= 工作流编辑器 =============

interface WorkflowEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: WorkflowRule | null;
  headers: string[];
  tableName: string;
  onSave: (rule: WorkflowRule) => void;
}

function WorkflowEditorDialog({
  open,
  onOpenChange,
  rule,
  headers,
  tableName,
  onSave,
}: WorkflowEditorDialogProps) {
  const [name, setName] = useState(rule?.name || '');
  const [description, setDescription] = useState(rule?.description || '');
  type ScheduleType = {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  time?: string;
  dayOfWeek?: number;
  dayOfMonth?: number;
};

const [triggerType, setTriggerType] = useState<TriggerType>(rule?.trigger.type || 'record_created');
  const [triggerField, setTriggerField] = useState(rule?.trigger.field || '');
  const [conditions, setConditions] = useState(rule?.conditions || []);
  const [schedule, setSchedule] = useState<ScheduleType>(rule?.trigger.schedule || { frequency: 'daily', time: '09:00' });
  const [actions, setActions] = useState<ActionConfig[]>(rule?.actions || [{ type: 'notify' }]);
  const [activeAction, setActiveAction] = useState(0);

  const handleSave = () => {
    if (!name.trim()) return;

    const newRule: WorkflowRule = {
      id: rule?.id || `wf-${Date.now()}`,
      name: name.trim(),
      description: description.trim() || undefined,
      enabled: rule?.enabled || false,
      trigger: {
        type: triggerType,
        field: triggerType === 'field_changed' ? triggerField : undefined,
        schedule: triggerType === 'scheduled' ? schedule : undefined,
      },
      conditions,
      actions,
      runCount: rule?.runCount || 0,
      createdAt: rule?.createdAt || new Date(),
      lastRun: rule?.lastRun,
    };

    onSave(newRule);
    onOpenChange(false);
  };

  const addCondition = () => {
    setConditions([...conditions, { field: headers[0] || '', operator: '=', value: '' }]);
  };

  const updateCondition = (index: number, updates: Partial<typeof conditions[0]>) => {
    setConditions(conditions.map((c, i) => i === index ? { ...c, ...updates } : c));
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const addAction = () => {
    setActions([...actions, { type: 'notify' }]);
    setActiveAction(actions.length);
  };

  const updateAction = (index: number, updates: Partial<ActionConfig>) => {
    setActions(actions.map((a, i) => i === index ? { ...a, ...updates } : a));
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
    if (activeAction >= actions.length - 1) {
      setActiveAction(Math.max(0, activeAction - 1));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{rule ? '编辑工作流' : '新建工作流'}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="space-y-6 p-1">
            {/* 基本信息 */}
            <div className="space-y-3">
              <Label>基本信息</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">工作流名称</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="例如：库存预警通知"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">描述（可选）</Label>
                  <Input
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="简要描述工作流的用途"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* 触发器 */}
            <div className="space-y-3">
              <Label>触发器</Label>
              <div className="grid grid-cols-3 gap-2">
                {TRIGGER_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        triggerType === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setTriggerType(option.value)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{option.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{option.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* 触发器配置 */}
              {triggerType === 'field_changed' && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <Label className="text-xs mb-2 block">监控字段</Label>
                  <Select value={triggerField} onValueChange={setTriggerField}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择字段" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {triggerType === 'scheduled' && (
                <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">执行频率</Label>
                      <Select
                        value={schedule.frequency}
                        onValueChange={(v: typeof schedule.frequency) =>
                          setSchedule({ ...schedule, frequency: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="once">仅一次</SelectItem>
                          <SelectItem value="daily">每天</SelectItem>
                          <SelectItem value="weekly">每周</SelectItem>
                          <SelectItem value="monthly">每月</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">执行时间</Label>
                      <Input
                        type="time"
                        value={schedule.time || '09:00'}
                        onChange={e => setSchedule({ ...schedule, time: e.target.value })}
                      />
                    </div>
                    {schedule.frequency === 'weekly' && (
                      <div className="space-y-1">
                        <Label className="text-xs">星期</Label>
                        <Select
                          value={String(schedule.dayOfWeek || 1)}
                          onValueChange={v => setSchedule({ ...schedule, dayOfWeek: Number(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, i) => (
                              <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {schedule.frequency === 'monthly' && (
                      <div className="space-y-1">
                        <Label className="text-xs">日期</Label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={schedule.dayOfMonth || 1}
                          onChange={e => setSchedule({ ...schedule, dayOfMonth: Number(e.target.value) })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* 触发条件 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>触发条件</Label>
                <Button variant="outline" size="sm" onClick={addCondition}>
                  <Plus className="w-3 h-3 mr-1" />
                  添加条件
                </Button>
              </div>
              {conditions.length === 0 ? (
                <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">
                  暂未设置条件，任何触发事件都会执行操作
                </p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((condition, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        value={condition.field}
                        onValueChange={v => updateCondition(i, { field: v })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="字段" />
                        </SelectTrigger>
                        <SelectContent>
                          {headers.map(h => (
                            <SelectItem key={h} value={h}>{h}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={condition.operator}
                        onValueChange={v => updateCondition(i, { operator: v })}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['=', '!=', '>', '<', '>=', '<=', 'contains'].map(op => (
                            <SelectItem key={op} value={op}>{op}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="flex-1"
                        value={condition.value}
                        onChange={e => updateCondition(i, { value: e.target.value })}
                        placeholder="值"
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeCondition(i)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* 执行操作 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>执行操作</Label>
                <Button variant="outline" size="sm" onClick={addAction}>
                  <Plus className="w-3 h-3 mr-1" />
                  添加操作
                </Button>
              </div>

              <div className="grid grid-cols-5 gap-2">
                {ACTION_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      className={`p-2 rounded-lg border text-center transition-colors ${
                        actions[activeAction]?.type === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:border-muted-foreground/50'
                      }`}
                      onClick={() => updateAction(activeAction, { type: option.value })}
                    >
                      <Icon className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 操作列表 */}
              <div className="space-y-2">
                {actions.map((action, i) => {
                  const option = ACTION_OPTIONS.find(a => a.value === action.type);
                  const Icon = option?.icon || Zap;

                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border cursor-pointer ${
                        activeAction === i ? 'border-primary' : 'border-border'
                      }`}
                      onClick={() => setActiveAction(i)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{i + 1}</span>
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium">{option?.label}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeAction(i); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* 操作配置 */}
                      {activeAction === i && (
                        <div className="mt-3 space-y-3 pl-6 border-l-2 border-primary/20">
                          {action.type === 'notify' && (
                            <div>
                              <Label className="text-xs mb-1 block">通知消息</Label>
                              <Textarea
                                value={action.notifyMessage || ''}
                                onChange={e => updateAction(i, { notifyMessage: e.target.value })}
                                placeholder="输入通知内容..."
                                rows={2}
                              />
                            </div>
                          )}

                          {action.type === 'email' && (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs mb-1 block">收件人</Label>
                                <Input
                                  value={action.emailTo || ''}
                                  onChange={e => updateAction(i, { emailTo: e.target.value })}
                                  placeholder="email@example.com"
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block">邮件主题</Label>
                                <Input
                                  value={action.emailSubject || ''}
                                  onChange={e => updateAction(i, { emailSubject: e.target.value })}
                                  placeholder="邮件主题"
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block">邮件正文</Label>
                                <Textarea
                                  value={action.emailBody || ''}
                                  onChange={e => updateAction(i, { emailBody: e.target.value })}
                                  placeholder="邮件内容..."
                                  rows={3}
                                />
                              </div>
                            </div>
                          )}

                          {action.type === 'feishu_group' && (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs mb-1 block">Webhook URL</Label>
                                <Input
                                  value={action.feishuWebhook || ''}
                                  onChange={e => updateAction(i, { feishuWebhook: e.target.value })}
                                  placeholder="飞书群机器人Webhook地址"
                                />
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block">消息内容</Label>
                                <Textarea
                                  value={action.feishuMessage || ''}
                                  onChange={e => updateAction(i, { feishuMessage: e.target.value })}
                                  placeholder="发送的消息内容..."
                                  rows={2}
                                />
                              </div>
                            </div>
                          )}

                          {action.type === 'http_request' && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-4 gap-2">
                                <div className="col-span-1">
                                  <Label className="text-xs mb-1 block">方法</Label>
                                  <Select
                                    value={action.httpMethod || 'POST'}
                                    onValueChange={v => updateAction(i, { httpMethod: v as typeof action.httpMethod })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {['GET', 'POST', 'PUT', 'DELETE'].map(m => (
                                        <SelectItem key={m} value={m}>{m}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="col-span-3">
                                  <Label className="text-xs mb-1 block">URL</Label>
                                  <Input
                                    value={action.httpUrl || ''}
                                    onChange={e => updateAction(i, { httpUrl: e.target.value })}
                                    placeholder="https://api.example.com/endpoint"
                                  />
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block">请求体 (JSON)</Label>
                                <Textarea
                                  value={action.httpBody || ''}
                                  onChange={e => updateAction(i, { httpBody: e.target.value })}
                                  placeholder='{"key": "value"}'
                                  rows={3}
                                />
                              </div>
                            </div>
                          )}

                          {action.type === 'set_field' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs mb-1 block">字段</Label>
                                <Select
                                  value={action.fieldToUpdate || ''}
                                  onValueChange={v => updateAction(i, { fieldToUpdate: v })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="选择字段" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {headers.map(h => (
                                      <SelectItem key={h} value={h}>{h}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs mb-1 block">值</Label>
                                <Input
                                  value={action.fieldValue || ''}
                                  onChange={e => updateAction(i, { fieldValue: e.target.value })}
                                  placeholder="设置的值"
                                />
                              </div>
                            </div>
                          )}

                          {action.type === 'ai_generate' && (
                            <div>
                              <Label className="text-xs mb-1 block">AI提示词</Label>
                              <Textarea
                                value={action.aiPrompt || ''}
                                onChange={e => updateAction(i, { aiPrompt: e.target.value })}
                                placeholder="描述你想要AI生成的内容..."
                                rows={3}
                              />
                            </div>
                          )}

                          {action.type === 'create_task' && (
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs mb-1 block">任务标题</Label>
                                <Input
                                  value={action.taskTitle || ''}
                                  onChange={e => updateAction(i, { taskTitle: e.target.value })}
                                  placeholder="任务名称"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-xs mb-1 block">负责人</Label>
                                  <Input
                                    value={action.taskAssignee || ''}
                                    onChange={e => updateAction(i, { taskAssignee: e.target.value })}
                                    placeholder="人员名称"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs mb-1 block">截止日期</Label>
                                  <Input
                                    type="date"
                                    value={action.taskDueDate || ''}
                                    onChange={e => updateAction(i, { taskDueDate: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {rule ? '保存修改' : '创建工作流'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
