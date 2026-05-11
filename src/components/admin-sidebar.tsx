'use client';

import {
  Users, LogIn, Brain, BarChart3, Settings2,
  ArrowLeft, Shield, CreditCard, Megaphone
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---- Types ----
export type AdminTab = 'users' | 'logs' | 'ai-config' | 'stats' | 'plans' | 'announcements';

interface AdminNavItem {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
}

const ADMIN_NAV: AdminNavItem[] = [
  { id: 'users', label: '用户管理', icon: Users },
  { id: 'logs', label: '登录日志', icon: LogIn },
  { id: 'ai-config', label: 'AI模型配置', icon: Brain },
  { id: 'stats', label: '使用统计', icon: BarChart3 },
  { id: 'plans', label: '套餐配置', icon: CreditCard },
  { id: 'announcements', label: '公告管理', icon: Megaphone },
];

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onBackToUser: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function AdminSidebar({
  activeTab,
  onTabChange,
  onBackToUser,
  collapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  return (
    <aside
      className={`flex flex-col h-screen bg-[#13161c] border-r border-white/[0.06] transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[52px]' : 'w-[200px]'
      }`}
    >
      {/* ---- Brand ---- */}
      <div className="flex items-center h-11 px-3 border-b border-white/[0.06] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-[13px] font-semibold text-white/80 tracking-tight truncate">
              管理后台
            </span>
          )}
        </div>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto py-1.5 px-1.5 sidebar-scrollbar">
        {ADMIN_NAV.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                group relative flex items-center gap-2 w-full rounded-md text-[13px] transition-all duration-150 mb-0.5
                ${collapsed ? 'justify-center px-0 py-[7px]' : 'px-2 py-[6px]'}
                ${
                  isActive
                    ? 'bg-white/[0.08] text-white/90'
                    : 'text-white/45 hover:bg-white/[0.04] hover:text-white/75'
                }
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
              )}
              <item.icon className={`w-[15px] h-[15px] shrink-0 ${isActive ? 'text-primary' : ''}`} />
              {!collapsed && (
                <span className={`truncate flex-1 ${isActive ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ---- Bottom Section ---- */}
      <div className="border-t border-white/[0.06] p-1.5 space-y-0.5 shrink-0">
        {/* System Settings */}
        <button
          className={`
            flex items-center gap-2 w-full rounded-md text-[13px] transition-colors duration-150
            text-white/30 hover:bg-white/[0.04] hover:text-white/60
            ${collapsed ? 'justify-center px-0 py-[7px]' : 'px-2 py-[6px]'}
          `}
        >
          <Settings2 className="w-[15px] h-[15px] shrink-0" />
          {!collapsed && <span>系统设置</span>}
        </button>

        {/* Return to User Side */}
        <button
          onClick={onBackToUser}
          className={`
            flex items-center gap-2 w-full rounded-md text-[13px] transition-colors duration-150
            text-primary/80 hover:bg-primary/10 hover:text-primary
            ${collapsed ? 'justify-center px-0 py-[7px]' : 'px-2 py-[6px]'}
          `}
        >
          <ArrowLeft className="w-[15px] h-[15px] shrink-0" />
          {!collapsed && <span>返回用户端</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className={`
            flex items-center gap-2 w-full rounded-md text-[13px] transition-colors duration-150
            text-white/20 hover:text-white/40 hover:bg-white/[0.03]
            ${collapsed ? 'justify-center px-0 py-1.5' : 'px-2 py-1.5'}
          `}
        >
          <svg
            className="w-[14px] h-[14px] shrink-0"
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
