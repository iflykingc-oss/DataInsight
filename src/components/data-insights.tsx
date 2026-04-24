'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Lightbulb,
  Loader2,
  RefreshCw,
  Copy,
  Share2,
  ChevronDown,
  ChevronUp,
  Info,
  Percent,
  Hash,
  Calendar,
  Flame,
  Shield,
  Zap,
  BookOpen,
  LineChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataAnalysis, FieldStat } from '@/lib/data-processor';

interface AIAnalysisInsight {
  id: string;
  type: 'summary' | 'trend' | 'comparison' | 'anomaly' | 'suggestion';
  title: string;
  content: string;
  confidence: number;
  icon: React.ElementType;
  color: string;
  badge?: string;
  details?: string[];
  metrics?: { label: string; value: string; change?: string; trend?: 'up' | 'down' }[];
}

interface DataInsightsProps {
  data: {
    headers: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    columnCount: number;
  };
  analysis: DataAnalysis;
  onRefresh?: () => void;
}

// 智能生成解读文案
const generateBusinessInsight = (
  headers: string[],
  rows: Record<string, unknown>[],
  fieldStats: FieldStat[]
): AIAnalysisInsight[] => {
  const insights: AIAnalysisInsight[] = [];
  
  // 1. 数据概览
  const totalRows = rows.length;
  const totalCols = headers.length;
  const numericFields = fieldStats.filter(f => f.type === 'number');
  const textFields = fieldStats.filter(f => f.type === 'string');
  
  insights.push({
    id: 'overview',
    type: 'summary',
    title: '数据概览',
    content: `该数据集包含 ${totalRows} 条记录，${totalCols} 个字段。其中 ${numericFields.length} 个数值型字段，${textFields.length} 个文本型字段。数据规模适中，适合进行多维度分析。`,
    confidence: 0.98,
    icon: BarChart3,
    color: 'blue',
    details: [
      `总记录数：${totalRows.toLocaleString()} 条`,
      `字段数量：${totalCols} 个`,
      `数值字段：${numericFields.length} 个`,
      `文本字段：${textFields.length} 个`,
    ],
    metrics: [
      { label: '总记录数', value: totalRows.toLocaleString() },
      { label: '字段数', value: totalCols.toString() },
    ]
  });

  // 2. 数值字段分析
  numericFields.slice(0, 3).forEach(field => {
    const min = field.min ?? 0;
    const max = field.max ?? 0;
    const mean = field.mean ?? 0;
    const sum = field.sum ?? 0;
    
    if (max > min) {
      const range = max - min;
      
      insights.push({
        id: `numeric-${field.field}`,
        type: 'summary',
        title: `${field.field} 字段分析`,
        content: `${field.field} 的数值范围为 ${min.toLocaleString()} 到 ${max.toLocaleString()}，平均值为 ${mean.toLocaleString()}。数据分布较为 ${range > mean ? '分散' : '集中'}。`,
        confidence: 0.92,
        icon: Hash,
        color: 'purple',
        details: [
          `最小值：${min.toLocaleString()}`,
          `最大值：${max.toLocaleString()}`,
          `平均值：${mean.toLocaleString()}`,
          `总和：${sum.toLocaleString()}`,
        ],
        metrics: [
          { label: '最小值', value: min.toLocaleString() },
          { label: '最大值', value: max.toLocaleString() },
          { label: '平均值', value: mean.toLocaleString() },
        ]
      });
    }
  });

  // 3. 空值分析
  const fieldsWithNulls = fieldStats.filter(f => (f.nullCount || 0) > 0);
  if (fieldsWithNulls.length > 0) {
    const totalNulls = fieldsWithNulls.reduce((sum, f) => sum + (f.nullCount || 0), 0);
    const nullRate = (totalNulls / (totalRows * fieldsWithNulls.length)) * 100;
    
    insights.push({
      id: 'null-analysis',
      type: 'anomaly',
      title: '数据完整性提示',
      content: `发现 ${fieldsWithNulls.length} 个字段存在空值，共计 ${totalNulls} 个空值记录。整体空值率为 ${nullRate.toFixed(1)}%，数据质量 ${nullRate < 5 ? '良好' : '需要关注'}。`,
      confidence: 0.95,
      icon: AlertTriangle,
      color: nullRate < 5 ? 'green' : 'orange',
      badge: nullRate < 5 ? '数据完整' : '需要处理',
      details: fieldsWithNulls.slice(0, 5).map(f => 
        `${f.field}：${f.nullCount} 个空值 (${((f.nullCount || 0) / totalRows * 100).toFixed(1)}%)`
      ),
    });
  } else {
    insights.push({
      id: 'complete-data',
      type: 'summary',
      title: '数据完整',
      content: '所有字段均无空值，数据完整性良好，可以直接进行分析。',
      confidence: 0.99,
      icon: CheckCircle,
      color: 'green',
      badge: '完美',
    });
  }

  // 4. 文本字段分析
  textFields.slice(0, 2).forEach(field => {
    const uniqueCount = field.uniqueCount || 0;
    const topValues = field.topValues?.slice(0, 3) || [];
    
    if (topValues.length > 0) {
      const firstValue = topValues[0];
      insights.push({
        id: `text-${field.field}`,
        type: 'summary',
        title: `${field.field} 字段分布`,
        content: `${field.field} 共有 ${uniqueCount} 个不同取值。最常见的值是"${firstValue?.value}"，出现 ${firstValue?.count} 次。`,
        confidence: 0.88,
        icon: PieChart,
        color: 'cyan',
        details: topValues.map((v: { value: string; count: number; percentage: number }) => `"${v.value}"：${v.count} 次 (${v.percentage.toFixed(1)}%)`),
      });
    }
  });

  // 5. 智能建议
  const suggestions: string[] = [];
  
  if (totalRows > 1000) {
    suggestions.push('数据量较大，建议使用采样或筛选功能提高分析效率');
  }
  if (numericFields.length >= 2) {
    suggestions.push('检测到多个数值字段，可以尝试进行相关性分析');
  }
  if (fieldsWithNulls.length > 0) {
    suggestions.push('建议先进行数据清洗，处理空值后再进行分析');
  }
  if (textFields.length > 0 && numericFields.length > 0) {
    suggestions.push('可以尝试按文本字段分组，查看数值字段的分布差异');
  }
  
  if (suggestions.length > 0) {
    insights.push({
      id: 'suggestions',
      type: 'suggestion',
      title: '分析建议',
      content: suggestions[0],
      confidence: 0.85,
      icon: Lightbulb,
      color: 'yellow',
      details: suggestions,
    });
  }

  return insights;
};

export function DataInsights({ data, analysis, onRefresh }: DataInsightsProps) {
  const [insights, setInsights] = useState<AIAnalysisInsight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);

  // 生成解读
  const generateInsights = useCallback(async () => {
    setIsGenerating(true);
    setGeneratingProgress(0);
    
    // 模拟生成进度
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 150));
      setGeneratingProgress(i);
    }
    
    const newInsights = generateBusinessInsight(
      data.headers,
      data.rows,
      analysis.fieldStats
    );
    
    setInsights(newInsights);
    setIsGenerating(false);
  }, [data, analysis.fieldStats]);

  // 初始生成
  useEffect(() => {
    if (data.rows.length > 0) {
      generateInsights();
    }
  }, [data.rows.length]);

  // 复制内容
  const copyContent = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // 获取图标样式
  const getIconStyle = (color: string) => {
    const styles: Record<string, string> = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600',
      purple: 'bg-purple-100 text-purple-600',
      cyan: 'bg-cyan-100 text-cyan-600',
    };
    return styles[color] || styles.blue;
  };

  // 获取颜色徽章
  const getColorBadge = (color: string) => {
    const styles: Record<string, string> = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200',
      green: 'bg-green-50 text-green-600 border-green-200',
      yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
      orange: 'bg-orange-50 text-orange-600 border-orange-200',
      purple: 'bg-purple-50 text-purple-600 border-purple-200',
      cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    };
    return styles[color] || styles.blue;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI 数据解读
            <Badge variant="secondary" className="ml-2">
              {insights.length} 条洞察
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={generateInsights}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span className="ml-1">重新解读</span>
            </Button>
          </div>
        </CardTitle>
        
        {/* 生成进度 */}
        {isGenerating && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>正在分析数据...</span>
              <span>{generatingProgress}%</span>
            </div>
            <Progress value={generatingProgress} className="h-1" />
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {insights.length === 0 && !isGenerating ? (
          <div className="text-center py-12 text-gray-500">
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>点击「重新解读」生成 AI 分析</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              {insights.map((insight) => {
                const Icon = insight.icon;
                const isExpanded = expandedId === insight.id;
                
                return (
                  <div 
                    key={insight.id}
                    className={cn(
                      'border rounded-lg overflow-hidden transition-all',
                      'hover:shadow-md'
                    )}
                  >
                    {/* 头部 */}
                    <div 
                      className="p-4 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn('p-2 rounded-lg flex-shrink-0', getIconStyle(insight.color))}>
                          <Icon className="w-5 h-5" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{insight.title}</h4>
                            {insight.badge && (
                              <Badge className={cn('text-xs border', getColorBadge(insight.color))}>
                                {insight.badge}
                              </Badge>
                            )}
                            <Badge variant="outline" className="ml-auto text-xs">
                              置信度 {Math.round(insight.confidence * 100)}%
                            </Badge>
                          </div>
                          
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {insight.content}
                          </p>
                          
                          {/* 指标卡片 */}
                          {insight.metrics && (
                            <div className="flex gap-4 mt-3">
                              {insight.metrics.map((metric, idx) => (
                                <div key={idx} className="bg-gray-50 rounded-lg px-3 py-1.5">
                                  <p className="text-xs text-gray-500">{metric.label}</p>
                                  <p className="text-sm font-medium">{metric.value}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {/* 展开详情 */}
                    {isExpanded && insight.details && insight.details.length > 0 && (
                      <div className="px-4 pb-4 border-t bg-gray-50">
                        <div className="pt-3 space-y-2">
                          <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            详细数据
                          </h5>
                          <ul className="space-y-1.5">
                            {insight.details.map((detail, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                                <span className="text-gray-600">{detail}</span>
                              </li>
                            ))}
                          </ul>
                          
                          {/* 操作按钮 */}
                          <div className="flex gap-2 pt-2">
                            <Button size="sm" variant="outline" onClick={() => copyContent(insight.content)}>
                              <Copy className="w-3 h-3 mr-1" />
                              复制
                            </Button>
                            <Button size="sm" variant="outline">
                              <Share2 className="w-3 h-3 mr-1" />
                              分享
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
