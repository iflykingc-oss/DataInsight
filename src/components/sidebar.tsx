'use client';

import {
  Home, Table2, Database, Brain, LayoutGrid, Target, PieChart, FileText,
  MessageSquare, Wrench, ChevronLeft, ChevronRight, Settings, Sparkles,
  AlertTriangle, Clock, BookTemplate, Grid3x3, Image, ClipboardList,
  Bot, BookOpen, Building2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  // 数据组
  { id: 'home', label: '工作台', desc: '首页概览', icon: Home, group: 'data' },
  { id: 'data-table', label: '数据预览', desc: '查看数据，用AI处理字段和计算', icon: Table2, group: 'data', needsData: true },
  { id: 'data-prep', label: '数据处理', desc: '清洗脏数据、检测数据质量', icon: Database, group: 'data', needsData: true },
  // 分析组
  { id: 'insights', label: '自动分析', desc: 'AI自动分析数据，找问题出报告', icon: Brain, group: 'analysis', needsData: true, badge: 'AI' },
  { id: 'data-story', label: '数据故事', desc: 'AI生成数据叙事故事', icon: BookOpen, group: 'analysis', needsData: true, badge: 'NEW' },
  { id: 'industry-scenario', label: '行业场景', desc: 'AI识别行业，加载行业指标', icon: Building2, group: 'analysis', needsData: true, badge: 'NEW' },
  { id: 'chat', label: '问答数据', desc: '用自然语言问数据问题', icon: MessageSquare, group: 'analysis', needsData: true, badge: 'AI' },
  { id: 'metrics', label: '指标中心', desc: '管理销售额、转化率等业务指标', icon: Target, group: 'analysis', needsData: true },
  { id: 'pivot-table', label: '透视表', desc: '拖拽字段做交叉分析', icon: Grid3x3, group: 'analysis', needsData: true },
  // 可视化组
  { id: 'visualization', label: '仪表盘', desc: '搭建销售看板、运营大屏', icon: LayoutGrid, group: 'visual', needsData: true },
  { id: 'chart-center', label: '图表库', desc: '快速做柱状图、折线图等分析图', icon: PieChart, group: 'visual', needsData: true },
  // 工具组
  { id: 'sql-lab', label: 'SQL 查询', desc: '用SQL查数据，结果直接可视化', icon: Wrench, group: 'tools', needsData: true },
  { id: 'spreadsheet-agent', label: 'AI 表格助手', desc: '自然语言处理表格', icon: Bot, group: 'tools', badge: 'AI' },
  { id: 'multimodal', label: '多模态 AI', desc: 'AI生图、图生文、图片转表格', icon: Image, group: 'tools', badge: 'AI' },
  { id: 'form-collection', label: '表单收集', desc: '创建表单、收集数据', icon: ClipboardList, group: 'tools' },
  { id: 'report-export', label: '导出分享', desc: '导出报告、分享给团队', icon: FileText, group: 'tools', needsData: true },
];

const NAV_GROUPS = [
  { key: 'data' as const, label: '数据' },
  { key: 'analysis' as const, label: '分析' },
  { key: 'visual' as const, label: '可视化' },
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
  isLoggedIn?: boolean;
  onLoginRequired?: () => void;
  hasPermission?: (permission: string) => boolean;
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
  isLoggedIn = false,
  onLoginRequired,
  hasPermission,
}: SidebarProps) {
  const AI_FEATURES = ['insights', 'chat', 'metrics', 'ai-table-builder', 'multimodal', 'chart-center', 'visualization', 'spreadsheet-agent'];
  
  const isAIDisabled = (itemId: string) => {
    if (!AI_FEATURES.includes(itemId)) return false;
    return hasPermission ? !hasPermission('ai_analyze') : false;
  };
  
  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={`${
          collapsed ? 'w-[52px]' : 'w-56'
        } bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col transition-all duration-200 shrink-0`}
      >
        {/* Logo / Brand */}
        <div className="h-13 flex items-center gap-2 px-3 border-b border-sidebar-border">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight text-sidebar-primary truncate">
              DataInsight
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 ml-auto text-sidebar-foreground/40 hover:text-sidebar-foreground/80 hover:bg-transparent"
            onClick={onToggle}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-1.5 overflow-y-auto scrollbar-thin">
          {NAV_GROUPS.map((group, groupIdx) => {
            const items = NAV_ITEMS.filter((item) => item.group === group.key);
            return (
              <div key={group.key} className={groupIdx > 0 ? 'mt-2' : ''}>
                {!collapsed && (
                  <div className="px-3 py-1 text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/30">
                    {group.label}
                  </div>
                )}
                {collapsed && groupIdx > 0 && (
                  <div className="mx-3 my-1 border-t border-sidebar-border/50" />
                )}
                {items.map((item) => {
                  const noData = item.needsData && !hasData;
                  const aiDisabled = isAIDisabled(item.id);
                  const disabled = noData || aiDisabled;
                  const isActive = activeView === item.id;
                  const handleClick = () => {
                    if (disabled) return;
                    if (AI_FEATURES.includes(item.id) && !isLoggedIn && onLoginRequired) {
                      onLoginRequired();
                      return;
                    }
                    onViewChange(item.id);
                  };

                  const btn = (
                    <button
                      key={item.id}
                      onClick={handleClick}
                      disabled={noData}
                      className={`w-full flex items-center gap-2 text-[13px] transition-all relative group/nav ${
                        collapsed ? 'px-0 justify-center py-2 mx-auto w-10 h-10 rounded-lg' : 'px-3 py-1.5 rounded-md'
                      } ${
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : disabled
                          ? 'text-sidebar-foreground/25 cursor-not-allowed'
                          : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
                      }`}
                    >
                      <item.icon className={`shrink-0 ${collapsed ? 'h-4 w-4' : 'h-[15px] w-[15px]'}`} />
                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.badge && (
                            <Badge
                              variant="secondary"
                              className={`ml-auto text-[9px] px-1 py-0 h-3.5 leading-none font-medium ${
                                item.badge === 'AI'
                                  ? 'bg-primary/15 text-primary'
                                  : item.badge === 'NEW'
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-sidebar-primary text-sidebar-primary-foreground'
                              }`}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                          item.badge === 'NEW' ? 'bg-emerald-500' : 'bg-primary'
                        }`} />
                      )}
                    </button>
                  );

                  // 折叠态用 Tooltip
                  if (collapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>
                          {btn}
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8} className="text-xs">
                          {item.label}
                          {aiDisabled && <span className="ml-1 text-muted-foreground">（无权限）</span>}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return btn;
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-1.5 space-y-0.5">
          {alertCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-[13px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={() => onViewChange('alerting')}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              {!collapsed && (
                <span>
                  告警 <Badge variant="destructive" className="ml-1 text-[9px] h-3.5 px-1">{alertCount}</Badge>
                </span>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-[13px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => onViewChange('version-history')}
          >
            <Clock className="h-3.5 w-3.5" />
            {!collapsed && <span>版本历史</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-[13px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => onViewChange('template-manager')}
          >
            <BookTemplate className="h-3.5 w-3.5" />
            {!collapsed && <span>模板管理</span>}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 text-[13px] text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={onSettingsOpen}
          >
            <Settings className="h-3.5 w-3.5" />
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
    </TooltipProvider>
  );
}
