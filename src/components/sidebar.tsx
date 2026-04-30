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
  desc: string;
  icon: LucideIcon;
  group: 'data' | 'analysis' | 'visual' | 'tools';
  needsData?: boolean;
  badge?: string;
}

/**
 * 导航体系 — 按用户工作流分组，业务语言命名
 * 用户路径：准备数据 → 分析数据 → 看结果 → 导出分享
 */
const NAV_ITEMS: NavItem[] = [
  // 数据组：用户第一步，准备和处理数据
  { id: 'home', label: '工作台', desc: '首页概览', icon: Home, group: 'data' },
  { id: 'data-table', label: '数据预览', desc: '查看数据，用AI处理字段和计算', icon: Table2, group: 'data', needsData: true },
  { id: 'data-prep', label: '数据处理', desc: '清洗脏数据、检测数据质量', icon: Database, group: 'data', needsData: true },
  // 分析组：核心分析能力
  { id: 'insights', label: '自动分析', desc: 'AI自动分析数据，找问题出报告', icon: Brain, group: 'analysis', needsData: true, badge: 'AI' },
  { id: 'chat', label: '问答数据', desc: '用自然语言问数据问题', icon: MessageSquare, group: 'analysis', needsData: true, badge: 'AI' },
  { id: 'metrics', label: '指标中心', desc: '管理销售额、转化率等业务指标', icon: Target, group: 'analysis', needsData: true },
  // 可视化组：看结果
  { id: 'visualization', label: '仪表盘', desc: '搭建销售看板、运营大屏', icon: LayoutGrid, group: 'visual', needsData: true },
  { id: 'chart-center', label: '图表库', desc: '快速做柱状图、折线图等分析图', icon: PieChart, group: 'visual', needsData: true },
  // 工具组：辅助工具
  { id: 'sql-lab', label: 'SQL 查询', desc: '用SQL查数据，结果直接可视化', icon: Wrench, group: 'tools', needsData: true },
  { id: 'report-export', label: '导出分享', desc: '导出报告、图表，分享给团队', icon: FileText, group: 'tools', needsData: true },
];

const NAV_GROUPS = [
  { key: 'data' as const, label: '数据', step: '1' },
  { key: 'analysis' as const, label: '分析', step: '2' },
  { key: 'visual' as const, label: '可视化', step: '3' },
  { key: 'tools' as const, label: '工具', step: '4' },
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
                <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-sidebar-foreground/40 flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-sidebar-foreground/10 flex items-center justify-center text-[8px] font-bold text-sidebar-foreground/50">{group.step}</span>
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
                    title={collapsed ? `${item.label}：${item.desc}` : item.desc}
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
                    {collapsed && item.desc && (
                      <span className="sr-only">{item.desc}</span>
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
