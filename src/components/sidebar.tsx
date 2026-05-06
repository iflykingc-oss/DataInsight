'use client';

import { useState } from 'react';
import {
  Database, BarChart3, Wrench, Settings, LayoutDashboard, Table2,
  Brain, FileSpreadsheet, Sparkles, MessageSquare, Image,
  FileText, Code2, Download, ChevronDown, ChevronRight,
  Home, Shield, LucideIcon
} from 'lucide-react';

// ---- Types ----
export type ViewMode = string;

interface NavItem {
  id: ViewMode;
  label: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
}

interface NavGroup {
  key: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultOpen?: boolean;
}

// ---- Navigation Definition ----
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'data',
    label: '数据',
    icon: Database,
    defaultOpen: true,
    items: [
      { id: 'home', label: '工作台', icon: Home },
      { id: 'ai-table-builder', label: 'AI建表', icon: Sparkles, badge: 'AI' },
      { id: 'data-table', label: '数据表格', icon: Table2 },
      { id: 'data-prep', label: '数据准备', icon: FileSpreadsheet },
    ],
  },
  {
    key: 'analysis',
    label: '分析',
    icon: BarChart3,
    defaultOpen: true,
    items: [
      { id: 'insights', label: '智能洞察', icon: Brain, badge: 'AI' },
      { id: 'visualization', label: '可视化', icon: LayoutDashboard },
    ],
  },
  {
    key: 'tools',
    label: '工具',
    icon: Wrench,
    defaultOpen: true,
    items: [
      { id: 'ai-assistant', label: 'AI问数', icon: MessageSquare, badge: 'AI' },
      { id: 'form-collection', label: '表单收集', icon: FileSpreadsheet },
      { id: 'sql-lab', label: 'SQL查询', icon: Code2 },
      { id: 'report-export', label: '报表导出', icon: Download },
    ],
  },
];

// ---- Component ----
interface SidebarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isLoggedIn: boolean;
  onOpenSettings: () => void;
  onLoginClick: () => void;
  userName?: string;
  userRole?: string;
}

export default function Sidebar({
  activeView,
  onViewChange,
  collapsed,
  onToggleCollapse,
  isLoggedIn,
  onOpenSettings,
  onLoginClick,
  userName,
  userRole,
}: SidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(NAV_GROUPS.filter(g => g.defaultOpen).map(g => g.key))
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <aside
      className={`flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[56px]' : 'w-[220px]'
      }`}
    >
      {/* ---- Logo / Brand ---- */}
      <div className="flex items-center h-12 px-3 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-sidebar-foreground tracking-tight truncate">
              DataInsight
            </span>
          )}
        </div>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 sidebar-scrollbar">
        {NAV_GROUPS.map(group => {
          const isExpanded = expandedGroups.has(group.key);
          return (
            <div key={group.key} className="mb-1">
              {/* Group Header */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center w-full px-2 py-1.5 text-[11px] font-medium text-sidebar-foreground/40 uppercase tracking-wider hover:text-sidebar-foreground/60 transition-colors rounded"
                >
                  <span className="flex-1 text-left">{group.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>
              )}

              {/* Collapsed: show group icon */}
              {collapsed && (
                <div className="flex items-center justify-center py-2 mb-0.5">
                  <group.icon className="w-4 h-4 text-sidebar-foreground/30" />
                </div>
              )}

              {/* Group Items */}
              {(isExpanded || collapsed) && (
                <div className={collapsed ? 'flex flex-col items-center gap-0.5' : ''}>
                  {group.items.map(item => {
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        title={collapsed ? item.label : undefined}
                        className={`
                          group relative flex items-center gap-2 w-full rounded-md text-[13px] transition-all duration-150
                          ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[7px]'}
                          ${
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                              : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                          }
                        `}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
                        )}
                        <item.icon className={`w-[16px] h-[16px] shrink-0 ${isActive ? 'text-primary' : ''}`} />
                        {!collapsed && (
                          <>
                            <span className="truncate flex-1">{item.label}</span>
                            {item.badge && (
                              <span
                                className={`
                                  text-[9px] font-semibold px-1.5 py-[1px] rounded-full leading-none shrink-0
                                  ${item.badge === 'AI' ? 'bg-primary/15 text-primary' : ''}
                                  ${item.badge === 'NEW' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : ''}
                                `}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ---- Bottom Section ---- */}
      <div className="border-t border-sidebar-border p-2 space-y-1 shrink-0">
        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title={collapsed ? '设置' : undefined}
          className={`
            flex items-center gap-2 w-full rounded-md text-[13px] transition-colors
            text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground
            ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[7px]'}
          `}
        >
          <Settings className="w-[16px] h-[16px] shrink-0" />
          {!collapsed && <span>设置</span>}
        </button>

        {/* User / Login */}
        {isLoggedIn ? (
          <button
            onClick={onOpenSettings}
            title={collapsed ? userName : undefined}
            className={`
              flex items-center gap-2 w-full rounded-md text-[13px] transition-colors
              text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground
              ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[7px]'}
            `}
          >
            <div className="w-[16px] h-[16px] rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-primary">
                {(userName || 'U')[0].toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="truncate text-sidebar-foreground/80">{userName}</div>
                {userRole === 'admin' && (
                  <div className="text-[10px] text-sidebar-foreground/40">管理员</div>
                )}
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            title={collapsed ? '登录' : undefined}
            className={`
              flex items-center gap-2 w-full rounded-md text-[13px] transition-colors
              text-primary hover:bg-primary/10
              ${collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-[7px]'}
            `}
          >
            <div className="w-[16px] h-[16px] rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-primary">?</span>
            </div>
            {!collapsed && <span>登录</span>}
          </button>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          className={`
            flex items-center gap-2 w-full rounded-md text-[13px] transition-colors
            text-sidebar-foreground/40 hover:text-sidebar-foreground/60 hover:bg-sidebar-accent/30
            ${collapsed ? 'justify-center px-0 py-1.5' : 'px-2.5 py-1.5'}
          `}
        >
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
            )}
          </svg>
          {!collapsed && <span>收起</span>}
        </button>
      </div>
    </aside>
  );
}
