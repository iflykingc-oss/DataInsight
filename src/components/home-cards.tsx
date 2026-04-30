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
  group: string;
  groupStep: string;
}

/**
 * 首页卡片 — 业务语言描述，按用户工作流分组
 */
const HOME_CARDS: HomeCard[] = [
  // 数据组：第一步
  { id: 'ai-table-builder', icon: Sparkles, label: '数据建模', desc: '用AI快速搭建销售、用户等场景的分析模型', color: 'text-violet-600', bgColor: 'bg-violet-50', needsData: false, badge: 'AI', highlight: true, group: '数据', groupStep: '1' },
  { id: 'data-prep', icon: Database, label: '数据工作台', desc: '连接数据源、清洗脏数据、检测数据质量', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true, group: '数据', groupStep: '1' },
  { id: 'data-table', icon: Table2, label: '数据预览', desc: '查看数据，用AI快速处理字段和计算公式', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: true, group: '数据', groupStep: '1' },
  // 分析组：核心
  { id: 'insights', icon: Brain, label: '自动分析', desc: '上传数据，AI自动分析、找问题、出报告', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, highlight: true, group: '分析', groupStep: '2' },
  { id: 'chat', icon: MessageSquare, label: '问答数据', desc: '直接用自然语言问数据问题，AI给你答案', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: true, badge: 'AI', group: '分析', groupStep: '2' },
  { id: 'metrics', icon: Target, label: '指标中心', desc: '自动生成和管理销售额、转化率等业务指标', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, badge: 'AI', group: '分析', groupStep: '2' },
  // 可视化组：看结果
  { id: 'visualization', icon: LayoutGrid, label: '仪表盘', desc: '拖拽搭建销售看板、运营大屏', color: 'text-purple-600', bgColor: 'bg-purple-50', needsData: true, highlight: true, group: '可视化', groupStep: '3' },
  { id: 'chart-center', icon: PieChart, label: '图表库', desc: '快速选图表，做柱状图、折线图等分析图', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true, group: '可视化', groupStep: '3' },
  // 工具组：辅助
  { id: 'sql-lab', icon: Wrench, label: 'SQL 查询', desc: '用SQL查数据，结果直接可视化', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: true, group: '工具', groupStep: '4' },
  { id: 'report-export', icon: FileText, label: '导出分享', desc: '导出PDF/图片报告，分享给团队', color: 'text-green-600', bgColor: 'bg-green-50', needsData: true, group: '工具', groupStep: '4' },
];

interface HomeCardsProps {
  hasData: boolean;
  onViewChange: (view: string) => void;
  fileName?: string;
  rowCount?: number;
}

export default function HomeCards({ hasData, onViewChange, fileName, rowCount }: HomeCardsProps) {
  // 按工作流分组
  const groups = HOME_CARDS.reduce<Record<string, HomeCard[]>>((acc, card) => {
    if (!acc[card.group]) acc[card.group] = [];
    acc[card.group].push(card);
    return acc;
  }, {});

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

      {/* Card groups by workflow */}
      {Object.entries(groups).map(([groupName, cards]) => {
        const firstCard = cards[0];
        return (
          <div key={groupName}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                {firstCard.groupStep}
              </span>
              <h3 className="text-sm font-semibold text-muted-foreground">{groupName}</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {cards.map((card) => {
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
      })}
    </div>
  );
}
