'use client';

import {
  Users, LogIn, Brain, BarChart3, Settings2,
  ArrowLeft, Shield, CreditCard, Megaphone, Activity, Cpu, MessageSquare
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ---- Types ----
export type AdminTab = 'users' | 'logs' | 'activity-logs' | 'ai-config' | 'ai-usage' | 'stats' | 'plans' | 'announcements' | 'feedback';

interface AdminNavItem {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
}

const ADMIN_NAV: AdminNavItem[] = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'logs', label: 'Login Logs', icon: LogIn },
  { id: 'activity-logs', label: 'Activity Logs', icon: Activity },
  { id: 'ai-config', label: 'AI Config', icon: Brain },
  { id: 'ai-usage', label: 'AI Usage', icon: Cpu },
  { id: 'stats', label: 'Statistics', icon: BarChart3 },
  { id: 'plans', label: 'Plans', icon: CreditCard },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'feedback', label: 'Feedback', icon: MessageSquare },
];

interface AdminSidebarProps {
  activeTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onBackToUser: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings?: () => void;
}

export default function AdminSidebar({
  activeTab,
  onTabChange,
  onBackToUser,
  collapsed,
  onToggleCollapse,
  onOpenSettings,
}: AdminSidebarProps) {
  return (
    <aside
      className={`flex flex-col h-screen bg-card border-r border-border transition-all duration-200 ease-in-out ${
        collapsed ? 'w-[52px]' : 'w-[200px]'
      }`}
    >
      {/* ---- Brand ---- */}
      <div className="flex items-center h-10 px-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-sm bg-primary flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-semibold text-foreground tracking-tight truncate">
              Admin
            </span>
          )}
        </div>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 overflow-y-auto py-1 px-1">
        {ADMIN_NAV.map(item => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              title={collapsed ? item.label : undefined}
              className={`
                group relative flex items-center gap-2 w-full rounded-sm text-sm transition-all duration-150 mb-px
                ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5'}
                ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }
              `}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />
              )}
              <item.icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-primary' : ''}`} />
              {!collapsed && (
                <span className={`truncate flex-1 text-left ${isActive ? 'font-medium' : ''}`}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* ---- Bottom Section ---- */}
      <div className="border-t border-border px-1 py-1 space-y-px shrink-0">
        {/* System Settings */}
        <button
          onClick={onOpenSettings}
          className={`
            flex items-center gap-2 w-full rounded-sm text-sm transition-colors duration-150
            text-muted-foreground/60 hover:bg-muted/50 hover:text-muted-foreground
            ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5'}
          `}
        >
          <Settings2 className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* Return to User Side */}
        <button
          onClick={onBackToUser}
          className={`
            flex items-center gap-2 w-full rounded-sm text-sm transition-colors duration-150
            text-primary/80 hover:bg-primary/10 hover:text-primary
            ${collapsed ? 'justify-center px-0 py-2' : 'px-2 py-1.5'}
          `}
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Back to App</span>}
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className={`
            flex items-center gap-2 w-full rounded-sm text-xs transition-colors duration-150
            text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/30
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
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
