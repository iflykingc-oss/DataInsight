'use client';

import React from 'react';
import {
  BarChart3, LayoutDashboard, MessageSquare, FileSpreadsheet,
  Search, Brain, Table2, Target, TrendingUp, FileText, Zap,
  PieChart, ArrowRight
} from 'lucide-react';

// 规范: 4档字号(20/16/14/12), 4档间距(4/8/16/24), 2档圆角(4/6px), 3级阴影
// 主色#1677FF, 边框#E5E6EB, 文字#1D2129/#86909C

interface HomeCardsProps {
  hasData: boolean;
  onViewChange: (view: string) => void;
  fileName?: string;
  rowCount?: number;
  isLoggedIn: boolean;
  onLoginRequired: () => void;
  hasPermission: (perm: string) => boolean;
}

// 快捷入口 - 6个核心功能
const quickEntries = [
  { key: 'data-table', icon: Table2, label: '数据表格', desc: '编辑、筛选、多视图' },
  { key: 'insights', icon: Brain, label: '智能洞察', desc: 'AI深度数据分析' },
  { key: 'visualization', icon: LayoutDashboard, label: '可视化仪表盘', desc: '交互式图表看板' },
  { key: 'chat', icon: MessageSquare, label: 'AI 问数', desc: '自然语言查数据' },
  { key: 'sql-lab', icon: Search, label: 'SQL 查询', desc: '浏览器端即席查询' },
  { key: 'report-export', icon: FileText, label: '报表导出', desc: '生成报告并分享' },
] as const;

// 场景模板
const scenarios = [
  { key: 'retail', label: '零售电商', icon: '🛒' },
  { key: 'finance', label: '财务会计', icon: '💰' },
  { key: 'project', label: '项目管理', icon: '📋' },
  { key: 'hr', label: '人力资源', icon: '👥' },
  { key: 'education', label: '教育培训', icon: '📚' },
  { key: 'marketing', label: '市场运营', icon: '📢' },
  { key: 'logistics', label: '物流供应链', icon: '🚚' },
  { key: 'manufacturing', label: '制造生产', icon: '🏭' },
] as const;

const HomeCards = React.memo(function HomeCards({
  hasData,
  onViewChange,
  isLoggedIn,
  onLoginRequired,
}: HomeCardsProps) {
  const handleEntryClick = (viewKey: string) => {
    if (!isLoggedIn) {
      onLoginRequired();
      return;
    }
    onViewChange(viewKey);
  };

  return (
    <div className="space-y-6">
      {/* ===== 快捷入口 ===== */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">快捷入口</h3>
          {hasData && (
            <span className="text-xs text-muted-foreground">
              已加载数据，可直接使用以下功能
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {quickEntries.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.key}
                onClick={() => handleEntryClick(entry.key)}
                className="group flex flex-col items-start p-4 rounded-sm border border-border bg-card hover:border-primary/30 hover:shadow-float transition-all text-left"
              >
                <div className="w-8 h-8 rounded-sm bg-primary/8 flex items-center justify-center mb-3 group-hover:bg-primary/12 transition-colors">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground mb-1">{entry.label}</span>
                <span className="text-xs text-muted-foreground leading-tight">{entry.desc}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== 场景模板 ===== */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-2">行业场景</h3>
        <p className="text-xs text-muted-foreground mb-4">
          上传数据后系统会自动识别行业，也可手动选择场景获取预置分析模板
        </p>
        <div className="flex flex-wrap gap-2">
          {scenarios.map((scene) => (
            <button
              key={scene.key}
              onClick={() => {
                if (!isLoggedIn) { onLoginRequired(); return; }
                onViewChange('ai-table-builder');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-border bg-card text-sm text-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/4 transition-all"
            >
              <span className="text-base">{scene.icon}</span>
              <span>{scene.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== 数据洞察能力 ===== */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-4">分析能力</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="p-4 rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-chart-1" />
              <span className="text-sm font-semibold text-foreground">趋势分析</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              自动检测数据趋势，发现异常波动和变化规律
            </p>
          </div>
          <div className="p-4 rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-chart-2" />
              <span className="text-sm font-semibold text-foreground">相关性分析</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pearson 相关系数，揭示字段间的隐藏关联
            </p>
          </div>
          <div className="p-4 rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-chart-3" />
              <span className="text-sm font-semibold text-foreground">智能归因</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              AI驱动的根因分析，快速定位问题来源
            </p>
          </div>
        </div>
      </section>
    </div>
  );
});

export { HomeCards };
export default HomeCards;
