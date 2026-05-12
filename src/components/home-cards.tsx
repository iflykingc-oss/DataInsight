'use client';

import React from 'react';
import {
  LayoutDashboard, MessageSquare,
  Search, Brain, Table2, Target, TrendingUp, FileText, Zap,
  ArrowRight
} from 'lucide-react';
import { useI18n } from '@/lib/i18n';

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

// 快捷入口 - 6个核心功能 (label/desc now use i18n keys)
const quickEntries = [
  { key: 'data-table', icon: Table2, labelKey: 'sidebar.dataTable', descKey: 'dataTable.tableView' },
  { key: 'insights', icon: Brain, labelKey: 'sidebar.insights', descKey: 'ai.deepAnalysis' },
  { key: 'visualization', icon: LayoutDashboard, labelKey: 'home.visualDashboard', descKey: 'viz.dashboard' },
  { key: 'chat', icon: MessageSquare, labelKey: 'sidebar.aiChat', descKey: 'ai.askPlaceholder' },
  { key: 'sql-lab', icon: Search, labelKey: 'sidebar.sqlLab', descKey: 'sql.title' },
  { key: 'report-export', icon: FileText, labelKey: 'sidebar.reportExport', descKey: 'report.title' },
] as const;

// 场景模板 (labelKey maps to i18n)
const scenarios = [
  { key: 'retail', labelKey: 'industry.retail', icon: '🛒' },
  { key: 'finance', labelKey: 'industry.finance', icon: '💰' },
  { key: 'project', labelKey: 'industry.hrm', icon: '📋' },
  { key: 'hr', labelKey: 'industry.hrm', icon: '👥' },
  { key: 'education', labelKey: 'industry.education', icon: '📚' },
  { key: 'marketing', labelKey: 'industry.tech', icon: '📢' },
  { key: 'logistics', labelKey: 'industry.logistics', icon: '🚚' },
  { key: 'manufacturing', labelKey: 'industry.manufacturing', icon: '🏭' },
] as const;

const HomeCards = React.memo(function HomeCards({
  hasData,
  onViewChange,
  isLoggedIn,
  onLoginRequired,
}: HomeCardsProps) {
  const { t } = useI18n();
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
          <h3 className="text-base font-semibold text-foreground">{t('home.quickStart')}</h3>
          {hasData && (
            <span className="text-xs text-muted-foreground">
              {t('home.noDataHint')}
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
                <span className="text-sm font-medium text-foreground mb-1">{t(entry.labelKey)}</span>
                <span className="text-xs text-muted-foreground leading-tight">{t(entry.descKey)}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== 场景模板 ===== */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-2">{t('home.sceneSelect')}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t('industry.title')}
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
              <span>{t(scene.labelKey)}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== 数据洞察能力 ===== */}
      <section>
        <h3 className="text-base font-semibold text-foreground mb-4">{t('ai.deepAnalysis')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="p-4 rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-chart-1" />
              <span className="text-sm font-semibold text-foreground">{t('ai.prediction')}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('ai.insight')}
            </p>
          </div>
          <div className="p-4 rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-chart-2" />
              <span className="text-sm font-semibold text-foreground">{t('ai.attribution')}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('ai.attribution')}
            </p>
          </div>
          <div className="p-4 rounded-sm border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-chart-3" />
              <span className="text-sm font-semibold text-foreground">{t('ai.deepAnalysis')}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t('ai.deepAnalysis')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
});

export { HomeCards };
export default HomeCards;
