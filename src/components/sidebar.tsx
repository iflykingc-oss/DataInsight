'use client';

import {
  Home, Table2, Database, Brain, LayoutGrid, Target, PieChart, FileText,
  MessageSquare, Wrench, ChevronLeft, ChevronRight, Settings, Sparkles,
  AlertTriangle, Clock, BookTemplate,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: 'data' | 'analysis' | 'tools';
  needsData?: boolean;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: '工作台', icon: Home, group: 'data' },
  { id: 'ai-table-builder', label: 'AI 建表', icon: Sparkles, group: 'data', badge: 'AI' },
  { id: 'data-table', label: '数据表格', icon: Table2, group: 'data', needsData: true },
  { id: 'data-prep', label: '数据准备', icon: Database, group: 'data', needsData: true },
  { id: 'insights', label: '智能洞察', icon: Brain, group: 'analysis', needsData: true, badge: 'AI' },
  { id: 'visualization', label: '可视化', icon: LayoutGrid, group: 'analysis', needsData: true },
  { id: 'metrics', label: '指标体系', icon: Target, group: 'analysis', needsData: true },
  { id: 'chart-center', label: '图表中心', icon: PieChart, group: 'analysis', needsData: true },
  { id: 'chat', label: 'AI 问数', icon: MessageSquare, group: 'tools', needsData: true, badge: 'AI' },
  { id: 'sql-lab', label: 'SQL 查询', icon: Wrench, group: 'tools', needsData: true, badge: 'NEW' },
  { id: 'report-export', label: '报表导出', icon: FileText, group: 'tools', needsData: true },
];

const NAV_GROUPS = [
  { key: 'data' as const, label: '数据' },
  { key: 'analysis' as const, label: '分析' },
  { key: 'tools' as const, label: '工具' },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
  hasData: boolean;
  onSettingsOpen: () => void;
  alertCount: number;
  modelConfigured: boolean;
}

export default function Sidebar({
  collapsed,
  onToggle,
  activeView,
  onViewChange,
  hasData,
  onSettingsOpen,
  alertCount,
  modelConfigured,
}: SidebarProps) {
  return (
    <aside
      className={`${
        collapsed ? 'w-16' : 'w-56'
      } bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-200 shrink-0`}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-sidebar-border">
        {!collapsed && (
          <span className="text-base font-bold tracking-tight text-sidebar-primary">
            DataInsight
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground"
          onClick={onToggle}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const items = NAV_ITEMS.filter((item) => item.group === group.key);
          return (
            <div key={group.key} className="mb-1">
              {!collapsed && (
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.label}
                </div>
              )}
              {items.map((item) => {
                const disabled = item.needsData && !hasData;
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => !disabled && onViewChange(item.id)}
                    disabled={disabled}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors relative ${
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                        : disabled
                        ? 'text-sidebar-foreground/30 cursor-not-allowed'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                    } ${collapsed ? 'justify-center' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <Badge
                            variant="secondary"
                            className="ml-auto text-[10px] px-1.5 py-0 h-4 bg-sidebar-primary text-sidebar-primary-foreground"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                    {collapsed && item.badge && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        {alertCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => onViewChange('alerting')}
          >
            <AlertTriangle className="h-4 w-4 text-destructive" />
            {!collapsed && (
              <span>
                告警 <Badge variant="destructive" className="ml-1 text-[10px] h-4 px-1">{alertCount}</Badge>
              </span>
            )}
          </Button>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => onViewChange('version-history')}
        >
          <Clock className="h-4 w-4" />
          {!collapsed && <span>版本历史</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={() => onViewChange('template-manager')}
        >
          <BookTemplate className="h-4 w-4" />
          {!collapsed && <span>模板管理</span>}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={onSettingsOpen}
        >
          <Settings className="h-4 w-4" />
          {!collapsed && (
            <span>
              设置
              {!modelConfigured && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
              )}
            </span>
          )}
        </Button>
      </div>
    </aside>
  );
}
