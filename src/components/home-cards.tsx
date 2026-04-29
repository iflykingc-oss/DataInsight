'use client';

import {
  Brain, MessageSquare, LayoutGrid, Table2, Database, Target, PieChart,
  Wrench, FileText, Sparkles, ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface HomeCard {
  id: string;
  icon: LucideIcon;
  label: string;
  desc: string;
  color: string;
  bgColor: string;
  needsData: boolean;
  badge?: string;
  highlight?: boolean;
}

const HOME_CARDS: HomeCard[] = [
  { id: 'ai-table-builder', icon: Sparkles, label: 'AI 建表', desc: '场景模板+AI生成+迭代修改', color: 'text-violet-600', bgColor: 'bg-violet-50', needsData: false, badge: 'AI', highlight: true },
  { id: 'insights', icon: Brain, label: '智能洞察', desc: 'AI自动洞察+深度分析+一键报告', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, highlight: true },
  { id: 'chat', icon: MessageSquare, label: 'AI 问数', desc: '自然语言检索、统计、归因、预测', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: true, badge: 'AI', highlight: true },
  { id: 'visualization', icon: LayoutGrid, label: '可视化', desc: '自动仪表盘+AI生成+自定义设计', color: 'text-purple-600', bgColor: 'bg-purple-50', needsData: true, highlight: true },
  { id: 'data-table', icon: Table2, label: '数据表格', desc: '查看数据+AI字段捷径+AI生成公式', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: true },
  { id: 'data-prep', icon: Database, label: '数据准备', desc: '数据源管理+数据清洗+数据质量', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true },
  { id: 'metrics', icon: Target, label: '指标体系', desc: 'AI指标生成+预置指标库+自定义指标', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, badge: 'AI' },
  { id: 'chart-center', icon: PieChart, label: '图表中心', desc: 'AI推荐+高级图表+ECharts扩展', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true },
  { id: 'sql-lab', icon: Wrench, label: 'SQL 查询', desc: 'SQL查询表格数据，结果直接可视化', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: true, badge: 'NEW' },
  { id: 'report-export', icon: FileText, label: '报表导出', desc: '报表生成+图表导出+分享管理', color: 'text-green-600', bgColor: 'bg-green-50', needsData: true },
];

interface HomeCardsProps {
  hasData: boolean;
  onViewChange: (view: string) => void;
  fileName?: string;
  rowCount?: number;
}

export default function HomeCards({ hasData, onViewChange, fileName, rowCount }: HomeCardsProps) {
  return (
    <div className="space-y-6">
      {/* Status banner */}
      {hasData && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-l-4 border-l-green-500 bg-green-50/30">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <Database className="w-4 h-4 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">
              {fileName || '数据已就绪'}
            </p>
            <p className="text-xs text-muted-foreground">
              {rowCount ? `${rowCount} 行数据已加载，可以开始分析` : '数据已加载，可以开始分析'}
            </p>
          </div>
        </div>
      )}

      {!hasData && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">请先上传数据</h3>
          <p className="text-sm text-muted-foreground">上传Excel或CSV文件，解锁全部数据分析能力</p>
        </div>
      )}

      {/* Card grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {HOME_CARDS.map((card) => {
          const disabled = card.needsData && !hasData;
          return (
            <Card
              key={card.id}
              className={`group cursor-pointer transition-all hover:shadow-md ${
                disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : card.highlight
                  ? 'ring-1 ring-primary/20 hover:ring-primary/40'
                  : ''
              }`}
              onClick={() => !disabled && onViewChange(card.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-md ${card.bgColor} flex items-center justify-center`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  {card.badge && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">
                      {card.badge}
                    </Badge>
                  )}
                </div>
                <h4 className="text-sm font-medium mb-1">{card.label}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{card.desc}</p>
                {!disabled && (
                  <div className="mt-2 flex items-center text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    进入 <ArrowRight className="w-3 h-3 ml-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
