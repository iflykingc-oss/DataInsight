'use client';

import { useState } from 'react';
import { Shield, Eye, EyeOff, Lock, Unlock, Plus, Trash2, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface PermissionRule {
  id: string;
  name: string;
  type: 'row' | 'field' | 'view';
  target: string;
  condition?: { field: string; operator: string; value: string };
  enabled: boolean;
}

export function RowPermissions({ headers }: { headers: string[] }) {
  const [rules, setRules] = useState<PermissionRule[]>(() => {
    try { return JSON.parse(localStorage.getItem('datainsight-permissions') || '[]'); }
    catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState<Partial<PermissionRule>>({ type: 'field', target: '', enabled: true });

  const saveRules = (r: PermissionRule[]) => {
    setRules(r);
    localStorage.setItem('datainsight-permissions', JSON.stringify(r));
  };

  const addRule = () => {
    if (!newRule.name || !newRule.target) return;
    const rule: PermissionRule = {
      id: `perm-${Date.now()}`,
      name: newRule.name,
      type: newRule.type as PermissionRule['type'],
      target: newRule.target,
      enabled: true,
    };
    saveRules([...rules, rule]);
    setShowAdd(false);
    setNewRule({ type: 'field', target: '', enabled: true });
  };

  const typeLabels: Record<string, string> = { row: '行级', field: '字段级', view: '视图级' };
  const typeIcons: Record<string, typeof Eye> = { row: Lock, field: EyeOff, view: Shield };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium">权限控制</h3>
          <Badge variant="secondary">{rules.filter(r => r.enabled).length} 生效</Badge>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" /> 新建规则
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>暂无权限规则</p>
          <p className="text-xs mt-1">控制不同角色可见的数据范围</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => {
            const Icon = typeIcons[rule.type] || Eye;
            return (
              <Card key={rule.id} className={`p-3 ${!rule.enabled ? 'opacity-60' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch checked={rule.enabled} onCheckedChange={() => saveRules(rules.map(r => r.id === rule.id ? { ...r, enabled: !r.enabled } : r))} />
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">{typeLabels[rule.type]}</Badge>
                        {' '}→ {rule.target}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => saveRules(rules.filter(r => r.id !== rule.id))}>
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
          <h4 className="text-sm font-medium">新建权限规则</h4>
          <Input placeholder="规则名称" value={newRule.name || ''} onChange={e => setNewRule({ ...newRule, name: e.target.value })} />
          <Select value={newRule.type} onValueChange={v => setNewRule({ ...newRule, type: v as PermissionRule['type'], target: '' })}>
            <SelectTrigger><SelectValue placeholder="权限类型" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="field">字段级（隐藏字段）</SelectItem>
              <SelectItem value="row">行级（过滤行）</SelectItem>
              <SelectItem value="view">视图级（禁用视图）</SelectItem>
            </SelectContent>
          </Select>
          {newRule.type === 'field' && (
            <Select value={newRule.target} onValueChange={v => setNewRule({ ...newRule, target: v })}>
              <SelectTrigger><SelectValue placeholder="选择要隐藏的字段" /></SelectTrigger>
              <SelectContent>{headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {newRule.type === 'row' && (
            <Input placeholder="行过滤条件（如：状态=草稿）" value={newRule.target} onChange={e => setNewRule({ ...newRule, target: e.target.value })} />
          )}
          {newRule.type === 'view' && (
            <Select value={newRule.target} onValueChange={v => setNewRule({ ...newRule, target: v })}>
              <SelectTrigger><SelectValue placeholder="选择要禁用的视图" /></SelectTrigger>
              <SelectContent>
                {['数据表格', '仪表盘', '智能洞察', 'SQL查询'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAdd(false)}>取消</Button>
            <Button size="sm" onClick={addRule} disabled={!newRule.name || !newRule.target}>创建</Button>
          </div>
        </Card>
      )}

      <Card className="p-3">
        <h4 className="text-xs font-medium mb-2">权限说明</h4>
        <div className="space-y-1 text-[11px] text-muted-foreground">
          <p><Eye className="w-3 h-3 inline mr-1" /> 字段级：隐藏敏感字段（如薪资、身份证号）</p>
          <p><Lock className="w-3 h-3 inline mr-1" /> 行级：按条件过滤可见行（如只看本部门）</p>
          <p><Shield className="w-3 h-3 inline mr-1" /> 视图级：禁用特定功能入口</p>
        </div>
      </Card>
    </div>
  );
}
