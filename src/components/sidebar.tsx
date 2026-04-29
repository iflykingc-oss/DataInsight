'use client';

import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart3,
  Table2,
  Home,
  Database,
  Filter,
  LayoutGrid,
  Settings,
  Wand2,
  Target,
  Shield,
  Bookmark,
  Download,
  History,
  Bot,
  Upload,
  Trash2,
  FileSpreadsheet,
  FileText,
  Brain,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  PieChart,
  AlertTriangle,
  Share2,
  Palette,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode =
  | 'home'
  | 'ai-table-builder'
  | 'table' | 'source' | 'clean' | 'quality'
  | 'insights' | 'dashboard' | 'nl2dash' | 'metric' | 'aiChart'
  | 'chat' | 'report'
  | 'advanced' | 'designer'
  | 'alert' | 'version' | 'template' | 'export' | 'share'
  | 'ai-settings';

interface NavItem {
  id: ViewMode;
  label: string;
  icon: React.ElementType;
  color?: string;
  needsData?: boolean;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '总览',
    items: [
      { id: 'home', label: '工作台', icon: Home },
    ],
  },
  {
    label: '数据',
    items: [
      { id: 'ai-table-builder' as ViewMode, label: 'AI 智能建表', icon: Sparkles, color: 'text-primary', badge: 'NEW' },
      { id: 'table' as ViewMode, label: '数据表格', icon: Table2, needsData: true },
      { id: 'source' as ViewMode, label: '数据源管理', icon: Database },
      { id: 'clean' as ViewMode, label: '数据清洗', icon: Filter, needsData: true },
      { id: 'quality' as ViewMode, label: '数据质量', icon: Shield, needsData: true },
    ],
  },
  {
    label: '分析',
    items: [
      { id: 'insights', label: '智能分析', icon: Brain, needsData: true, color: 'text-orange-500' },
      { id: 'dashboard', label: '仪表盘', icon: LayoutGrid, needsData: true },
      { id: 'nl2dash', label: 'NL2Dashboard', icon: Wand2, needsData: true, color: 'text-violet-500', badge: 'AI' },
      { id: 'metric', label: '指标语义层', icon: Target, needsData: true, color: 'text-orange-500', badge: 'AI' },
      { id: 'aiChart', label: '智能图表', icon: PieChart, needsData: true },
    ],
  },
  {
    label: 'AI 助手',
    items: [
      { id: 'chat', label: 'AI 对话', icon: MessageSquare, needsData: true, color: 'text-blue-500' },
      { id: 'ai-settings', label: 'AI 模型配置', icon: Bot },
    ],
  },
  {
    label: '工具',
    items: [
      { id: 'report', label: '报表生成', icon: FileText, needsData: true },
      { id: 'designer', label: '仪表盘设计', icon: Palette, needsData: true },
      { id: 'advanced', label: '高级图表', icon: TrendingUp, needsData: true },
      { id: 'alert', label: '数据预警', icon: AlertTriangle, needsData: true },
      { id: 'export', label: '图表导出', icon: Download, needsData: true },
      { id: 'share', label: '分享管理', icon: Share2, needsData: true },
      { id: 'version', label: '版本快照', icon: History },
      { id: 'template', label: '模板管理', icon: Bookmark },
    ],
  },
];

interface SidebarProps {
  viewMode: ViewMode;
  onViewChange: (view: ViewMode) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  hasData?: boolean;
  className?: string;
}

export function Sidebar({ viewMode, onViewChange, collapsed, onToggleCollapse, hasData, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'relative flex flex-col bg-white border-r transition-all duration-300',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      <div className="flex items-center justify-between p-4 border-b">
        {!collapsed && (
          <h1 className="font-bold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            DataInsight
          </h1>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-4">
            {!collapsed && (
              <div className="px-4 mb-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
                {group.label}
              </div>
            )}
            <div className="space-y-1 px-2">
              {group.items.map((item) => {
                const isActive = viewMode === item.id;
                const isDisabled = item.needsData && !hasData;
                const Icon = item.icon;

                const button = (
                  <button
                    key={item.id}
                    onClick={() => !isDisabled && onViewChange(item.id)}
                    disabled={isDisabled}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : isDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100',
                      item.color
                    )}
                  >
                    <Icon className={cn('w-5 h-5 flex-shrink-0', item.color)} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {item.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.id} delayDuration={0}>
                      <TooltipTrigger asChild>{button}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.label}
                        {item.badge && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-primary/10 text-primary">
                            {item.badge}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return button;
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export { NAV_GROUPS };
export type { NavGroup, NavItem };
