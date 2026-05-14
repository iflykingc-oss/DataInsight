'use client';

import React, { useState, memo } from 'react';
import {
  BarChart3, Settings, LayoutDashboard, Table2,
  Brain, FileSpreadsheet, Sparkles, MessageSquare,
  FileText, Code2, Download, ChevronDown, ChevronRight,
  Home, Shield, Target, LineChart, BookOpen, Building2,
  ShieldCheck, Layers, Cpu, CreditCard, LucideIcon
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

// ---- Types ----
export type ViewMode = string;

interface NavItem {
  id: ViewMode;
  labelKey: string;
  icon: LucideIcon;
  badge?: string;
  descriptionKey?: string;
}

interface NavGroup {
  key: string;
  labelKey: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

// ---- Navigation Definition ----
// 规范：2组导航，核心功能5项 + 更多工具9项
const NAV_GROUPS: NavGroup[] = [
  {
    key: 'core',
    labelKey: 'sidebar.coreFeatures',
    defaultOpen: true,
    items: [
      { id: 'data-table', labelKey: 'sidebar.dataTable', icon: Table2, descriptionKey: 'dataTable.emptyHint' },
      { id: 'insights', labelKey: 'sidebar.insights', icon: Brain, descriptionKey: 'ai.insight' },
      { id: 'visualization', labelKey: 'sidebar.visualization', icon: LayoutDashboard, descriptionKey: 'viz.dashboard' },
      { id: 'ai-assistant', labelKey: 'sidebar.aiChat', icon: MessageSquare, descriptionKey: 'ai.askPlaceholder' },
      { id: 'chart-center', labelKey: 'sidebar.chartCenter', icon: LineChart, descriptionKey: 'viz.chartCenter' },
    ],
  },
  {
    key: 'tools',
    labelKey: 'sidebar.moreTools',
    defaultOpen: false,
    items: [
      { id: 'ai-table-builder', labelKey: 'sidebar.aiTableBuilder', icon: Sparkles, descriptionKey: 'ai.generate' },
      { id: 'data-prep', labelKey: 'sidebar.dataPrep', icon: FileSpreadsheet, descriptionKey: 'dataPrep.title' },
      { id: 'metric-system', labelKey: 'sidebar.metricSystem', icon: Target, descriptionKey: 'metric.semantic' },
      { id: 'data-story', labelKey: 'sidebar.dataStory', icon: BookOpen, descriptionKey: 'story.title' },
      { id: 'industry-scenario', labelKey: 'sidebar.industryScene', icon: Building2, descriptionKey: 'industry.title' },
      { id: 'multimodal', labelKey: 'sidebar.aiMultimodal', icon: Cpu, descriptionKey: 'multimodal.generateImage' },
      { id: 'form-collection', labelKey: 'sidebar.formCollection', icon: Layers, descriptionKey: 'form.builder' },
      { id: 'sql-lab', labelKey: 'sidebar.sqlLab', icon: Code2, descriptionKey: 'sql.title' },
      { id: 'report-export', labelKey: 'sidebar.reportExport', icon: Download, descriptionKey: 'report.title' },
      { id: 'pricing', labelKey: 'sidebar.pricing', icon: CreditCard, descriptionKey: 'pricing.title' },
      { id: 'data-compliance', labelKey: 'sidebar.dataCompliance', icon: ShieldCheck, descriptionKey: 'compliance.title' },
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
  onLogout?: () => void;
}

/*
 * Sidebar — 规范改造要点：
 * - 间距：仅4/8/16px三档（侧边栏内无24px场景）
 * - 字号：分组标题12px、导航项14px、辅助文字12px
 * - 主色：选中态/图标统一用sidebar-primary (#1677FF系)
 * - 选中态：左侧3px主色条 + 背景微亮 + 图标主色
 * - 圆角：6px（导航项）
 * - 层级：分组标题缩进8px，子项缩进8px（图标+4px间距+文字）
 * - 低噪：去阴影、去多余装饰
 */
function Sidebar({
  activeView,
  onViewChange,
  collapsed,
  onToggleCollapse,
  isLoggedIn,
  onOpenSettings,
  onLoginClick,
  userName,
  userRole,
  onLogout,
}: SidebarProps) {
  const { t } = useI18n();
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

  const isHomeActive = activeView === 'home';
  const isAdmin = userRole === 'admin';
  const isAdminActive = activeView === 'admin';

  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[52px]' : 'w-[216px]'
      }`}
    >
      {/* ---- Logo / Brand ---- 规范：h-11, 间距8px */}
      <div className="flex items-center h-11 px-2 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-sidebar-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-[14px] font-semibold text-sidebar-foreground tracking-tight truncate">
              DataInsight
            </span>
          )}
        </div>
      </div>

      {/* ---- Navigation ---- 规范：py-8px px-4px */}
      <nav className="flex-1 overflow-y-auto py-2 px-1 sidebar-scrollbar">
        {/* 工作台 - Top level */}
        <button
          onClick={() => onViewChange('home')}
          title={collapsed ? t('sidebar.workspace') : undefined}
          className={`
            group relative flex items-center gap-2 w-full rounded-md text-[14px] transition-all duration-150 mb-0.5
            ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-2'}
            ${
              isHomeActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90'
            }
          `}
        >
          {isHomeActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-sidebar-primary" />
          )}
          <Home className={`w-4 h-4 shrink-0 ${isHomeActive ? 'text-sidebar-primary' : ''}`} />
          {!collapsed && <span className="truncate flex-1 text-left">{t('sidebar.workspace')}</span>}
        </button>

        {/* Divider — 规范间距8px */}
        <div className="my-2 mx-2 border-t border-sidebar-border/40" />

        {/* Grouped navigation */}
        {NAV_GROUPS.map(group => {
          const isExpanded = expandedGroups.has(group.key);
          return (
            <div key={group.key} className="mb-0.5">
              {/* Group Header — 规范：12px浅灰大写 */}
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="flex items-center w-full px-2 py-1.5 text-xs font-medium text-sidebar-foreground/35 uppercase tracking-wider hover:text-sidebar-foreground/55 transition-colors rounded"
                >
                  <span className="flex-1 text-left">{t(group.labelKey)}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 opacity-50" />
                  ) : (
                    <ChevronRight className="w-3 h-3 opacity-50" />
                  )}
                </button>
              )}

              {/* Collapsed: divider dot */}
              {collapsed && (
                <div className="flex items-center justify-center py-1 my-0.5">
                  <div className="w-1 h-1 rounded-full bg-sidebar-foreground/15" />
                </div>
              )}

              {/* Group Items — 规范：14px字号, 8px图标间距, 6px圆角 */}
              {(isExpanded || collapsed) && (
                <div className={collapsed ? 'flex flex-col items-center gap-0.5' : 'space-y-0.5'}>
                  {group.items.map(item => {
                    const isActive = activeView === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onViewChange(item.id)}
                        title={collapsed ? t(item.labelKey) : (item.descriptionKey ? t(item.descriptionKey) : undefined)}
                        className={`
                          group/item relative flex items-center gap-2 w-full rounded-md text-[14px] transition-all duration-150
                          ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5'}
                          ${
                            isActive
                              ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                              : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90'
                          }
                        `}
                      >
                        {/* Active indicator — 规范3px主色条 */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-sidebar-primary" />
                        )}
                        <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sidebar-primary' : ''}`} />
                        {!collapsed && (
                          <span className="truncate flex-1 text-left">{t(item.labelKey)}</span>
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

      {/* ---- Bottom Section ---- 规范：px-4px, gap-4px */}
      <div className="border-t border-sidebar-border p-1 space-y-0.5 shrink-0">
        {/* Admin Entry */}
        {isLoggedIn && isAdmin && (
          <button
            onClick={() => onViewChange('admin')}
            title={collapsed ? t('sidebar.adminPanel') : undefined}
            className={`
              group relative flex items-center gap-2 w-full rounded-md text-[14px] transition-all duration-150
              ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5'}
              ${
                isAdminActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/75'
              }
            `}
          >
            {isAdminActive && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-sidebar-primary" />
            )}
            <ShieldCheck className={`w-4 h-4 shrink-0 ${isAdminActive ? 'text-sidebar-primary' : ''}`} />
            {!collapsed && <span className="truncate flex-1 text-left">{t('sidebar.adminPanel')}</span>}
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title={collapsed ? t('sidebar.settings') : undefined}
          className={`
            flex items-center gap-2 w-full rounded-md text-[14px] transition-colors duration-150
            text-sidebar-foreground/40 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/75
            ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5'}
          `}
        >
          <Settings className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="text-left">{t('sidebar.settings')}</span>}
        </button>

        {/* User / Login */}
        {isLoggedIn ? (
          <button
            onClick={onOpenSettings}
            title={collapsed ? userName : undefined}
            className={`
              flex items-center gap-2 w-full rounded-md text-[14px] transition-colors duration-150
              text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground/90
              ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5'}
            `}
          >
            <div className="w-5 h-5 rounded-full bg-sidebar-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-sidebar-primary">
                {(userName || 'U')[0].toUpperCase()}
              </span>
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="truncate text-sidebar-foreground/80 text-[14px]">{userName}</div>
              </div>
            )}
          </button>
        ) : (
          <button
            onClick={onLoginClick}
            title={collapsed ? t('sidebar.login') : undefined}
            className={`
              flex items-center gap-2 w-full rounded-md text-[14px] transition-colors duration-150
              text-sidebar-primary hover:bg-sidebar-primary/10
              ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5'}
            `}
          >
            <div className="w-5 h-5 rounded-full bg-sidebar-primary/15 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-sidebar-primary">?</span>
            </div>
            {!collapsed && <span className="text-left">{t('sidebar.login')}</span>}
          </button>
        )}

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className={`
            flex items-center gap-2 w-full rounded-md text-xs transition-colors duration-150
            text-sidebar-foreground/25 hover:text-sidebar-foreground/45 hover:bg-sidebar-accent/30
            ${collapsed ? 'justify-center px-0 py-1' : 'px-2 py-1'}
          `}
        >
          <svg
            className="w-3.5 h-3.5 shrink-0"
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
          {!collapsed && <span>{t('sidebar.collapse')}</span>}
        </button>
      </div>

      {/* Footer Links */}
      {!collapsed && (
        <div className="px-3 pb-3 flex items-center gap-3 text-[10px] text-sidebar-foreground/20">
          <a href="/privacy" target="_blank" className="hover:text-sidebar-foreground/40 transition-colors">{t('sidebar.privacy')}</a>
          <span>·</span>
          <button onClick={() => onViewChange('pricing')} className="hover:text-sidebar-foreground/40 transition-colors">{t('sidebar.pricing')}</button>
          <span>·</span>
          <button onClick={() => onViewChange('data-compliance')} className="hover:text-sidebar-foreground/40 transition-colors">{t('sidebar.dataCompliance')}</button>
        </div>
      )}
    </aside>
  );
}

export default memo(Sidebar);
