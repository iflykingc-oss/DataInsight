'use client';

import { useState } from 'react';
import { Zap, Plus, Trash2, Play, Pause, AlertTriangle, Bell, Mail, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { field: string; operator: string; value: string };
  action: { type: string; config: Record<string, string> };
}

export function WorkflowAutomation({ headers }: { headers: string[] }) {
  const [rules, setRules] = useState<WorkflowRule[]>(() => {
    try { return JSON.parse(localStorage.getItem('datainsight-workflows') || '[]'); }
    catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState<Partial<WorkflowRule>>({
    trigger: { field: '', operator: '>', value: '' },
    action: { type: 'alert', config: {} },
  });

  const saveRules = (r: WorkflowRule[]) => {
    setRules(r);
    localStorage.setItem('datainsight-workflows', JSON.stringify(r));
  };

  const addRule = () => {
    if (!newRule.name || !newRule.trigger?.field) return;
    const rule: WorkflowRule = {
      id: `wf-${Date.now()}`,
      name: newRule.name,
      enabled: true,
      trigger: newRule.trigger as WorkflowRule['trigger'],
      action: newRule.action as WorkflowRule['action'],
    };
    saveRules([...rules, rule]);
    setShowAdd(false);
    setNewRule({ trigger: { field: '', operator: '>', value: '' }, action: { type: 'alert', config: {} } });
  };

  const toggleRule = (id: string) => {
    saveRules(rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const deleteRule = (id: string) => {
    saveRules(rules.filter(r => r.id !== id));
  };

  const actionIcons: Record<string, typeof AlertTriangle> = {
    alert: AlertTriangle,
    notify: Bell,
    email: Mail,
    export: FileSpreadsheet,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">自动化规则</h3>
          <Badge variant="secondary">{rules.filter(r => r.enabled).length}/{rules.length} 运行中</Badge>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> 新建规则
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>暂无自动化规则</p>
          <p className="text-xs mt-1">当数据满足条件时自动执行动作</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const ActionIcon = actionIcons[rule.action.type] || Zap;
            return (
              <Card key={rule.id} className={`p-3 ${!rule.enabled ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                    <div>
                      <p className="text-sm font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        当 <Badge variant="outline" className="text-[10px]">{rule.trigger.field}</Badge>
                        {' '}{rule.trigger.operator}{' '}
                        <Badge variant="outline" className="text-[10px]">{rule.trigger.value}</Badge>
                        {' '}→{' '}
                        <ActionIcon className="w-3 h-3 inline" /> {rule.action.type}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showAdd && (
        <Card className="p-4 space-y-3">
          <h4 className="text-sm font-medium">新建规则</h4>
          <Input
            placeholder="规则名称"
            value={newRule.name || ''}
            onChange={e => setNewRule({ ...newRule, name: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            <Select value={newRule.trigger?.field} onValueChange={v => setNewRule({ ...newRule, trigger: { ...newRule.trigger!, field: v } })}>
              <SelectTrigger><SelectValue placeholder="字段" /></SelectTrigger>
              <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={newRule.trigger?.operator} onValueChange={v => setNewRule({ ...newRule, trigger: { ...newRule.trigger!, operator: v } })}>
              <SelectTrigger><SelectValue placeholder="条件" /></SelectTrigger>
              <SelectContent>
                {['>', '<', '>=', '<=', '=', '!=', 'contains'].map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              placeholder="值"
              value={newRule.trigger?.value || ''}
              onChange={e => setNewRule({ ...newRule, trigger: { ...newRule.trigger!, value: e.target.value } })}
            />
          </div>
          <Select value={newRule.action?.type} onValueChange={v => setNewRule({ ...newRule, action: { type: v, config: {} } })}>
            <SelectTrigger><SelectValue placeholder="执行动作" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="alert">标记异常</SelectItem>
              <SelectItem value="notify">发送通知</SelectItem>
              <SelectItem value="email">发送邮件</SelectItem>
              <SelectItem value="export">导出数据</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>取消</Button>
            <Button size="sm" onClick={addRule} disabled={!newRule.name || !newRule.trigger?.field}>创建</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
