'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  Brain,
  Wand2,
  MessageSquare,
  Target,
  LayoutGrid,
  PieChart,
  FileText,
  Table2,
  Filter,
  Shield,
  Database,
  TrendingUp,
  Palette,
  AlertTriangle,
  Download,
  Share2,
  History,
  Bookmark,
  Bot,
} from 'lucide-react';
import type { ViewMode } from './sidebar';

interface HomeCard {
  id: ViewMode;
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  bgColor: string;
  needsData: boolean;
  badge?: string;
  highlight?: boolean;
}

const HOME_CARDS: HomeCard[] = [
  { id: 'ai-table-builder' as ViewMode, icon: Sparkles, label: 'AI 智能建表', desc: 'AI 一键生成标准化经营台账', color: 'text-primary', bgColor: 'bg-primary/5', needsData: false, badge: 'NEW', highlight: true },
  { id: 'insights', icon: Brain, label: '智能分析', desc: 'AI 自动洞察数据规律与健康评分', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, highlight: true },
  { id: 'nl2dash', icon: Wand2, label: 'NL2Dashboard', desc: '对话生成业务仪表盘', color: 'text-violet-600', bgColor: 'bg-violet-50', needsData: true, badge: 'AI', highlight: true },
  { id: 'chat', icon: MessageSquare, label: 'AI 问数', desc: '自然语言检索、统计、归因、预测', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: true, badge: 'AI', highlight: true },
  { id: 'metric', icon: Target, label: '指标语义层', desc: 'AI 生成业务指标体系与解读', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, badge: 'AI' },
  { id: 'dashboard', icon: LayoutGrid, label: '自动仪表盘', desc: '一键生成可视化仪表盘', color: 'text-purple-600', bgColor: 'bg-purple-50', needsData: true },
  { id: 'aiChart', icon: PieChart, label: '智能图表', desc: 'AI 推荐最佳图表类型', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true },
  { id: 'report', icon: FileText, label: '报表生成', desc: '一键生成分析报表并导出', color: 'text-green-600', bgColor: 'bg-green-50', needsData: true },
  { id: 'table', icon: Table2, label: '数据表格', desc: '查看、排序、筛选原始数据', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: true },
  { id: 'clean', icon: Filter, label: '数据清洗', desc: '去重、空值处理、异常值修复', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true },
  { id: 'quality', icon: Shield, label: '数据质量', desc: '完整性/一致性/质量/可用性评估', color: 'text-emerald-600', bgColor: 'bg-emerald-50', needsData: true },
  { id: 'source', icon: Database, label: '数据源管理', desc: '连接数据库、API、平台集成', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: false },
  { id: 'advanced', icon: TrendingUp, label: '高级图表', desc: '6种高级图表类型与数据映射', color: 'text-indigo-600', bgColor: 'bg-indigo-50', needsData: true },
  { id: 'designer', icon: Palette, label: '仪表盘设计', desc: '拖拽式自定义仪表盘布局', color: 'text-pink-600', bgColor: 'bg-pink-50', needsData: true },
  { id: 'alert', icon: AlertTriangle, label: '数据预警', desc: '阈值/趋势/异常预警与通知', color: 'text-amber-600', bgColor: 'bg-amber-50', needsData: true },
  { id: 'export', icon: Download, label: '图表导出', desc: 'PNG/PDF/Excel/复制导出', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: true },
  { id: 'share', icon: Share2, label: '分享管理', desc: '生成分享链接与权限控制', color: 'text-sky-600', bgColor: 'bg-sky-50', needsData: true },
  { id: 'version', icon: History, label: '版本快照', desc: '创建/恢复/导出数据快照', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: false },
  { id: 'template', icon: Bookmark, label: '模板管理', desc: '创建/收藏/应用分析模板', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: false },
  { id: 'ai-settings', icon: Bot, label: 'AI 模型配置', desc: '配置模型参数与测试连接', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: false },
];

interface HomeCardsProps {
  onNavigate: (view: ViewMode) => void;
  hasData?: boolean;
  className?: string;
}

export function HomeCards({ onNavigate, hasData, className }: HomeCardsProps) {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
      {HOME_CARDS.map((card) => {
        const Icon = card.icon;
        const isDisabled = card.needsData && !hasData;

        return (
          <button
            key={card.id}
            onClick={() => !isDisabled && onNavigate(card.id)}
            disabled={isDisabled}
            className={cn(
              'relative p-4 rounded-xl border text-left transition-all',
              isDisabled
                ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                : card.highlight
                ? 'bg-white border-primary/20 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5'
                : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm',
              className
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn('p-2 rounded-lg', card.bgColor)}>
                <Icon className={cn('w-5 h-5', card.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900 truncate">{card.label}</h3>
                  {card.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{card.desc}</p>
              </div>
            </div>
            {isDisabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 rounded-xl">
                <span className="text-sm text-gray-400">请先上传数据</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { HOME_CARDS };
export type { HomeCard };
