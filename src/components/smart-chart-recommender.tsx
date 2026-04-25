'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Sparkles,
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  AreaChart,
  ScatterChart,
  Radar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Lightbulb,
  Filter,
  Link2,
  RefreshCw,
  Eye,
  MousePointer2,
  Calculator,
  Target,
  Flame,
  Shield,
  Loader2,
  ChevronRight,
  X,
  Zap,
  Layers,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

// 图表类型
type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar';

// 图表推荐结果
interface ChartRecommendation {
  type: ChartType;
  confidence: number;
  reason: string;
  xAxis?: string;
  yAxis?: string;
  colorField?: string;
  description: string;
}

// 数据分级
interface DataLevel {
  level: 'critical' | 'warning' | 'normal' | 'low';
  value: number;
  label: string;
  color: string;
  badge: string;
  icon: React.ElementType;
}

// 数据解读
interface ChartInterpretation {
  title: string;
  summary: string;
  insights: string[];
  keyMetrics: { label: string; value: string; change?: string; trend?: 'up' | 'down' | 'stable' }[];
  anomalies: string[];
}

// 同比环比数据
interface PeriodComparison {
  current: number;
  previous: number;
  yoy: number; // 同比
  mom: number; // 环比
  trend: 'up' | 'down' | 'stable';
  label: string;
}

// 联动筛选状态
interface FilterState {
  field: string;
  values: string[];
}

// 图表配置
interface ChartConfig {
  type: ChartType;
  xAxis: string;
  yAxis: string;
  colorField?: string;
  showComparison?: boolean;
  showInterpretation?: boolean;
  enableDrilldown?: boolean;
}

// 图表类型元数据
const CHART_METADATA: Record<ChartType, { name: string; icon: React.ElementType; bestFor: string; color: string }> = {
  bar: { name: '柱状图', icon: BarChart3, bestFor: '比较分类数据', color: 'blue' },
  line: { name: '折线图', icon: LineChart, bestFor: '展示趋势变化', color: 'purple' },
  pie: { name: '饼图', icon: PieChartIcon, bestFor: '展示占比分布', color: 'pink' },
  area: { name: '面积图', icon: AreaChart, bestFor: '强调累积效果', color: 'cyan' },
  scatter: { name: '散点图', icon: ScatterChart, bestFor: '分析相关性', color: 'orange' },
  radar: { name: '雷达图', icon: Radar, bestFor: '多维度对比', color: 'indigo' },
};

// 智能图表推荐引擎
const generateChartRecommendations = (
  headers: string[],
  fieldStats: FieldStat[]
): ChartRecommendation[] => {
  const recommendations: ChartRecommendation[] = [];
  
  // 分析字段类型
  const numericFields = fieldStats.filter(f => f.type === 'number');
  const textFields = fieldStats.filter(f => f.type === 'string');
  const dateFields = fieldStats.filter(f => f.type === 'date');
  
  // 查找可能的X轴字段
  const potentialXFields = [...dateFields, ...textFields.slice(0, 3)];
  const potentialYFields = numericFields;
  
  // 1. 如果有数值和分类字段 -> 推荐柱状图
  if (numericFields.length > 0 && textFields.length > 0) {
    recommendations.push({
      type: 'bar',
      confidence: 0.92,
      reason: '适合比较不同类别的数值大小',
      xAxis: textFields[0]?.field || potentialXFields[0]?.field,
      yAxis: numericFields[0]?.field,
      description: `用柱状图比较 "${textFields[0]?.field}" 在 "${numericFields[0]?.field}" 上的差异`
    });
  }
  
  // 2. 如果有日期字段和数值字段 -> 推荐折线图
  if (dateFields.length > 0 && numericFields.length > 0) {
    recommendations.push({
      type: 'line',
      confidence: 0.95,
      reason: '最适合展示随时间变化的数据趋势',
      xAxis: dateFields[0]?.field,
      yAxis: numericFields[0]?.field,
      description: `用折线图展示 "${numericFields[0]?.field}" 随 "${dateFields[0]?.field}" 的变化趋势`
    });
  }
  
  // 3. 如果只有数值字段且少于5个 -> 推荐饼图
  if (numericFields.length > 0 && textFields.length === 0 && numericFields.length <= 5) {
    recommendations.push({
      type: 'pie',
      confidence: 0.78,
      reason: '展示单一数值的组成占比',
      yAxis: numericFields[0]?.field,
      description: `用饼图展示 "${numericFields[0]?.field}" 的组成比例`
    });
  }
  
  // 4. 如果有多个数值字段 -> 推荐散点图
  if (numericFields.length >= 2) {
    recommendations.push({
      type: 'scatter',
      confidence: 0.82,
      reason: '分析两个数值变量之间的相关性',
      xAxis: numericFields[0]?.field,
      yAxis: numericFields[1]?.field,
      description: `分析 "${numericFields[0]?.field}" 与 "${numericFields[1]?.field}" 的相关关系`
    });
  }
  
  // 5. 如果有多个维度 -> 推荐雷达图
  if (numericFields.length >= 3) {
    recommendations.push({
      type: 'radar',
      confidence: 0.75,
      reason: '多维度综合对比',
      yAxis: numericFields.slice(0, 5).map(f => f.field).join(', '),
      description: `用雷达图展示多维度 "${numericFields[0]?.field}" 等的综合对比`
    });
  }
  
  // 6. 如果有日期和数值 -> 也推荐面积图
  if (dateFields.length > 0 && numericFields.length > 0) {
    recommendations.push({
      type: 'area',
      confidence: 0.85,
      reason: '强调累积和总量效果',
      xAxis: dateFields[0]?.field,
      yAxis: numericFields[0]?.field,
      description: `用面积图展示 "${numericFields[0]?.field}" 的累积变化`
    });
  }
  
  // 按置信度排序
  return recommendations.sort((a, b) => b.confidence - a.confidence);
};

// 计算同比环比
const calculatePeriodComparison = (values: number[]): PeriodComparison | null => {
  if (values.length < 2) return null;
  
  const current = values[values.length - 1];
  const previous = values[values.length - 2];
  
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const yoy = change; // 简化：假设是月度数据
  const mom = change;
  
  return {
    current,
    previous,
    yoy,
    mom,
    trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
    label: '本期'
  };
};

// 数据分级标注
const calculateDataLevels = (
  values: number[],
  fieldName: string
): DataLevel[] => {
  if (values.length === 0) return [];
  
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const upperBound = q3 + 1.5 * iqr;
  const lowerBound = q1 - 1.5 * iqr;
  
  return values.map((value, index) => {
    let level: DataLevel['level'];
    let label: string;
    let color: string;
    let badge: string;
    let icon: React.ElementType;
    
    // 异常值检测（IQR方法）
    if (value > upperBound || value < lowerBound) {
      level = 'critical';
      label = '异常值';
      color = 'red';
      badge = '异常';
      icon = AlertTriangle;
    } else if (value > mean + std) {
      level = 'warning';
      label = '高于平均';
      color = 'orange';
      badge = '偏高';
      icon = ArrowUpRight;
    } else if (value < mean - std) {
      level = 'low';
      label = '低于平均';
      color = 'yellow';
      badge = '偏低';
      icon = ArrowDownRight;
    } else {
      level = 'normal';
      label = '正常范围';
      color = 'green';
      badge = '正常';
      icon = CheckCircle;
    }
    
    return { level, value, label, color, badge, icon };
  });
};

// 生成图表解读
const generateChartInterpretation = (
  chartType: ChartType,
  xField: string,
  yField: string,
  data: { x: string; y: number }[]
): ChartInterpretation => {
  const values = data.map(d => d.y);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const maxItem = data.find(d => d.y === max);
  const minItem = data.find(d => d.y === min);
  
  const insights: string[] = [];
  const anomalies: string[] = [];
  
  // 根据图表类型生成洞察
  switch (chartType) {
    case 'bar':
      insights.push(`最高的 "${xField}" 是 "${maxItem?.x}"，值为 ${max.toLocaleString()}`);
      insights.push(`最低的 "${xField}" 是 "${minItem?.x}"，值为 ${min.toLocaleString()}`);
      insights.push(`平均值为 ${avg.toLocaleString()}`);
      break;
    case 'line':
      const trend = values[values.length - 1] > values[0] ? '上升' : '下降';
      insights.push(`整体趋势呈${trend}态势`);
      const changeRate = ((values[values.length - 1] - values[0]) / values[0] * 100).toFixed(1);
      insights.push(`累计变化幅度: ${changeRate}%`);
      break;
    case 'pie':
      insights.push(`总和为 ${sum.toLocaleString()}`);
      insights.push(`最大值占比: ${(max / sum * 100).toFixed(1)}%`);
      break;
    case 'scatter':
      insights.push(`数据点数量: ${data.length}`);
      insights.push(`X轴范围: ${min.toLocaleString()} ~ ${max.toLocaleString()}`);
      break;
  }
  
  // 检测异常
  const std = Math.sqrt(values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length);
  data.forEach((d, i) => {
    if (Math.abs(d.y - avg) > 2 * std) {
      anomalies.push(`数据点 "${d.x}" 偏离正常范围 (${d.y.toLocaleString()})`);
    }
  });
  
  return {
    title: `${CHART_METADATA[chartType].name} 分析报告`,
    summary: `基于 ${data.length} 个数据点的 "${yField}" 分析，${insights[0] || '数据分布合理'}`,
    insights,
    keyMetrics: [
      { label: '总计', value: sum.toLocaleString() },
      { label: '平均', value: avg.toFixed(2).toLocaleString() },
      { label: '最大', value: max.toLocaleString() },
      { label: '最小', value: min.toLocaleString() },
    ],
    anomalies
  };
};

interface SmartChartRecommenderProps {
  data: ParsedData;
  fieldStats: FieldStat[];
  onChartSelect?: (config: ChartConfig) => void;
  linkedFilters?: FilterState[];
  onFilterChange?: (filters: FilterState[]) => void;
}

export function SmartChartRecommender({
  data,
  fieldStats,
  onChartSelect,
  linkedFilters = [],
  onFilterChange
}: SmartChartRecommenderProps) {
  // 状态
  const [selectedChart, setSelectedChart] = useState<ChartConfig>({
    type: 'bar',
    xAxis: data.headers[0] || '',
    yAxis: data.headers[1] || '',
    showInterpretation: true,
    enableDrilldown: true
  });
  const [hoveredPoint, setHoveredPoint] = useState<{ x: string; y: number; index: number } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [interpretation, setInterpretation] = useState<ChartInterpretation | null>(null);
  const [dataLevels, setDataLevels] = useState<DataLevel[]>([]);
  const [comparison, setComparison] = useState<PeriodComparison | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 生成推荐
  const recommendations = useMemo(() => {
    return generateChartRecommendations(data.headers, fieldStats);
  }, [data.headers, fieldStats]);

  // 准备图表数据
  const chartData = useMemo(() => {
    const xField = selectedChart.xAxis;
    const yField = selectedChart.yAxis;
    
    if (!xField || !yField) return [];
    
    const grouped: Record<string, number> = {};
    data.rows.forEach(row => {
      const x = String(row[xField] ?? '未知');
      const y = Number(row[yField]) || 0;
      grouped[x] = (grouped[x] || 0) + y;
    });
    
    return Object.entries(grouped).map(([x, y]) => ({ x, y }));
  }, [data.rows, selectedChart.xAxis, selectedChart.yAxis]);

  // 计算数据分级
  useEffect(() => {
    if (chartData.length > 0) {
      const values = chartData.map(d => d.y);
      setDataLevels(calculateDataLevels(values, selectedChart.yAxis));
      setComparison(calculatePeriodComparison(values));
    }
  }, [chartData, selectedChart.yAxis]);

  // 生成解读
  const generateInterpretation = useCallback(() => {
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = generateChartInterpretation(
        selectedChart.type,
        selectedChart.xAxis,
        selectedChart.yAxis,
        chartData
      );
      setInterpretation(result);
      setIsAnalyzing(false);
    }, 800);
  }, [selectedChart, chartData]);

  // 选择推荐图表
  const selectRecommendation = (rec: ChartRecommendation) => {
    const newChart = {
      type: rec.type,
      xAxis: rec.xAxis || selectedChart.xAxis,
      yAxis: rec.yAxis || selectedChart.yAxis,
      colorField: rec.colorField,
      showComparison: selectedChart.showComparison,
      showInterpretation: selectedChart.showInterpretation,
      enableDrilldown: selectedChart.enableDrilldown
    };
    setSelectedChart(newChart);
    onChartSelect?.(newChart);
  };

  // 处理图表点击（联动筛选）
  const handleChartClick = (point: { x: string; y: number }) => {
    if (!selectedChart.enableDrilldown) return;
    
    const newFilter: FilterState = {
      field: selectedChart.xAxis,
      values: [point.x]
    };
    
    // 更新联动筛选
    const existingIndex = linkedFilters.findIndex(f => f.field === newFilter.field);
    let newFilters: FilterState[];
    if (existingIndex >= 0) {
      newFilters = linkedFilters.filter((_, i) => i !== existingIndex);
    } else {
      newFilters = [...linkedFilters, newFilter];
    }
    
    onFilterChange?.(newFilters);
  };

  // 获取数据点分级样式
  const getLevelStyle = (index: number): { color: string; glow: string; level: string; badge: string; label: string } => {
    const level = dataLevels[index];
    if (!level) return { color: 'bg-green-500', glow: '', level: 'normal', badge: '正常', label: '常规数据' };
    
    const styles: Record<string, string> = {
      red: 'bg-red-500',
      orange: 'bg-orange-500',
      yellow: 'bg-yellow-500',
      green: 'bg-green-500'
    };
    
    return {
      color: styles[level.color] || styles.green,
      glow: level.level === 'critical' ? 'shadow-red-500/50' : '',
      level: level.level,
      badge: level.badge,
      label: level.label
    };
  };

  // 获取趋势图标
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* AI 智能推荐区域 */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI 智能图表推荐
            <Badge variant="secondary" className="ml-auto">
              {recommendations.length} 个推荐
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[140px]">
            <div className="flex gap-3">
              {recommendations.map((rec, index) => {
                const meta = CHART_METADATA[rec.type];
                const Icon = meta.icon;
                
                return (
                  <div
                    key={rec.type + index}
                    onClick={() => selectRecommendation(rec)}
                    className={cn(
                      'flex-shrink-0 w-[200px] p-4 rounded-xl border-2 cursor-pointer transition-all',
                      'hover:shadow-lg hover:scale-[1.02]',
                      selectedChart.type === rec.type 
                        ? 'border-purple-500 bg-white shadow-purple-200' 
                        : 'border-transparent bg-white/80 hover:border-purple-300'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('p-1.5 rounded-lg', `bg-${meta.color}-100`)}>
                        <Icon className={cn('w-4 h-4', `text-${meta.color}-600`)} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{meta.name}</p>
                        <p className="text-xs text-gray-500">{meta.bestFor}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {Math.round(rec.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{rec.description}</p>
                    {selectedChart.type === rec.type && (
                      <div className="mt-2 flex items-center gap-1 text-purple-600">
                        <CheckCircle className="w-3 h-3" />
                        <span className="text-xs font-medium">已选中</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* 图表配置与展示 */}
      <div className="grid grid-cols-3 gap-6">
        {/* 左侧：配置面板 */}
        <div className="space-y-4">
          {/* 字段选择 */}
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="w-4 h-4" />
                图表配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 图表类型 */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">图表类型</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.entries(CHART_METADATA) as [ChartType, typeof CHART_METADATA[ChartType]][]).map(([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedChart(prev => ({ ...prev, type }))}
                        className={cn(
                          'p-2 rounded-lg border text-center transition-all',
                          selectedChart.type === type 
                            ? 'border-primary bg-primary/10' 
                            : 'border-gray-200 hover:border-primary/50'
                        )}
                      >
                        <Icon className="w-5 h-5 mx-auto mb-1" />
                        <span className="text-xs">{meta.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* X轴 */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">X轴 / 分类</Label>
                <select
                  value={selectedChart.xAxis}
                  onChange={e => setSelectedChart(prev => ({ ...prev, xAxis: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">选择字段</option>
                  {data.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* Y轴 */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Y轴 / 数值</Label>
                <select
                  value={selectedChart.yAxis}
                  onChange={e => setSelectedChart(prev => ({ ...prev, yAxis: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">选择字段</option>
                  {data.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              {/* 选项 */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">显示选项</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedChart.showInterpretation}
                      onChange={e => setSelectedChart(prev => ({ ...prev, showInterpretation: e.target.checked }))}
                      className="rounded"
                    />
                    显示AI解读
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedChart.enableDrilldown}
                      onChange={e => setSelectedChart(prev => ({ ...prev, enableDrilldown: e.target.checked }))}
                      className="rounded"
                    />
                    启用联动筛选
                  </label>
                </div>
              </div>

              {/* 联动状态 */}
              {linkedFilters.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 text-xs text-blue-600 mb-2">
                    <Link2 className="w-3 h-3" />
                    <span>已启用联动筛选</span>
                  </div>
                  {linkedFilters.map((filter, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{filter.field}</Badge>
                      <span className="text-gray-500">=</span>
                      <Badge>{filter.values[0]}</Badge>
                    </div>
                  ))}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="mt-2 w-full h-7 text-xs"
                    onClick={() => onFilterChange?.([])}
                  >
                    <X className="w-3 h-3 mr-1" />
                    清除筛选
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 同比环比 */}
          {comparison && (
            <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-orange-500" />
                  同比/环比分析
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-xs text-gray-500">本期</p>
                    <p className="text-lg font-bold">{comparison.current.toLocaleString()}</p>
                  </div>
                  <div className="text-center p-2 bg-white rounded-lg">
                    <p className="text-xs text-gray-500">上期</p>
                    <p className="text-lg font-bold">{comparison.previous.toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 p-2 bg-white rounded-lg">
                  {getTrendIcon(comparison.trend)}
                  <div>
                    <p className="text-xs text-gray-500">环比</p>
                    <p className={cn(
                      'text-lg font-bold',
                      comparison.mom > 0 ? 'text-green-600' : comparison.mom < 0 ? 'text-red-600' : 'text-gray-600'
                    )}>
                      {comparison.mom > 0 ? '+' : ''}{comparison.mom.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 中间：图表展示 */}
        <div className="col-span-2">
          <Card className="h-full">
            <CardHeader className="py-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm flex items-center gap-2">
                {React.createElement(CHART_METADATA[selectedChart.type].icon, { className: 'w-4 h-4' })}
                {CHART_METADATA[selectedChart.type].name}
                <span className="text-gray-400">-</span>
                <span className="text-gray-600 font-normal">
                  {selectedChart.yAxis} vs {selectedChart.xAxis}
                </span>
              </CardTitle>
              <Button size="sm" variant="outline" onClick={generateInterpretation}>
                {isAnalyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
                <span className="ml-1">AI解读</span>
              </Button>
            </CardHeader>
            <CardContent>
              {/* 简化的图表渲染 */}
              <div className="relative h-[300px]">
                {/* 图表内容 */}
                <div className="h-full flex items-end justify-around gap-2 px-4">
                  {chartData.slice(0, 10).map((point, index) => {
                    const maxValue = Math.max(...chartData.map(d => d.y));
                    const height = maxValue > 0 ? (point.y / maxValue) * 250 : 0;
                    const levelStyle = getLevelStyle(index);
                    const isFiltered = linkedFilters.some(f => f.field === selectedChart.xAxis && f.values.includes(point.x));
                    
                    return (
                      <Popover key={point.x}>
                        <PopoverTrigger asChild>
                          <div
                            className={cn(
                              'flex-1 max-w-[60px] rounded-t-lg cursor-pointer transition-all relative group',
                              isFiltered && 'ring-2 ring-primary',
                              levelStyle.level === 'critical' && 'animate-pulse'
                            )}
                            style={{
                              height: `${Math.max(height, 10)}px`,
                              backgroundColor: levelStyle.color
                            }}
                            onClick={() => handleChartClick(point)}
                          >
                            {/* 顶部标注 */}
                            {levelStyle.level !== 'normal' && (
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                                <Badge 
                                  variant="outline" 
                                  className={cn(
                                    'text-[10px] px-1 py-0',
                                    levelStyle.level === 'critical' && 'border-red-500 text-red-600 bg-red-50',
                                    levelStyle.level === 'warning' && 'border-orange-500 text-orange-600 bg-orange-50'
                                  )}
                                >
                                  {levelStyle.badge}
                                </Badge>
                              </div>
                            )}
                            
                            {/* 悬停效果 */}
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-t-lg flex items-center justify-center">
                              <span className="text-xs font-medium text-white drop-shadow">
                                {point.y.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-[200px] p-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{point.x}</span>
                              <Badge 
                                variant="outline"
                                className={cn(
                                  levelStyle.level === 'critical' && 'border-red-500 text-red-600',
                                  levelStyle.level === 'warning' && 'border-orange-500 text-orange-600',
                                  levelStyle.level === 'normal' && 'border-green-500 text-green-600'
                                )}
                              >
                                {levelStyle.badge}
                              </Badge>
                            </div>
                            <div className="text-2xl font-bold">
                              {point.y.toLocaleString()}
                            </div>
                            <p className="text-xs text-gray-500">
                              {selectedChart.yAxis} = {point.y.toLocaleString()}
                            </p>
                            {levelStyle.level === 'critical' && (
                              <div className="flex items-start gap-1 text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{levelStyle.label}，偏离正常范围</span>
                              </div>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    );
                  })}
                </div>
                
                {/* X轴标签 */}
                <div className="flex justify-around gap-2 mt-2 px-4">
                  {chartData.slice(0, 10).map((point, index) => (
                    <div 
                      key={point.x} 
                      className="flex-1 max-w-[60px] text-center"
                    >
                      <span className="text-[10px] text-gray-500 truncate block" title={point.x}>
                        {point.x.length > 8 ? point.x.slice(0, 8) + '...' : point.x}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI 解读面板 */}
              {selectedChart.showInterpretation && (
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">AI 数据解读</span>
                    {!interpretation && (
                      <Button size="sm" variant="ghost" onClick={generateInterpretation} className="ml-auto">
                        生成解读
                      </Button>
                    )}
                  </div>
                  
                  {interpretation ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">{interpretation.summary}</p>
                      
                      {/* 关键指标 */}
                      <div className="grid grid-cols-4 gap-2">
                        {interpretation.keyMetrics.map((metric, i) => (
                          <div key={i} className="p-2 bg-gray-50 rounded-lg text-center">
                            <p className="text-[10px] text-gray-500">{metric.label}</p>
                            <p className="text-sm font-bold">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                      
                      {/* 洞察 */}
                      {interpretation.insights.length > 0 && (
                        <div className="space-y-1">
                          {interpretation.insights.map((insight, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                              <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                              <span>{insight}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* 异常警告 */}
                      {interpretation.anomalies.length > 0 && (
                        <div className="p-2 bg-red-50 rounded-lg space-y-1">
                          <div className="flex items-center gap-2 text-xs text-red-600">
                            <AlertTriangle className="w-3 h-3" />
                            <span className="font-medium">检测到异常</span>
                          </div>
                          {interpretation.anomalies.map((anomaly, i) => (
                            <p key={i} className="text-xs text-red-500 ml-5">{anomaly}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : isAnalyzing ? (
                    <div className="flex items-center justify-center py-4 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      正在分析数据...
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">
                      点击「AI解读」按钮生成数据分析
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 数据分级图例 */}
      {dataLevels.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Layers className="w-4 h-4" />
              数据分级标注
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {[
                { level: 'critical', label: '异常值', color: 'bg-red-500', count: dataLevels.filter(l => l.level === 'critical').length },
                { level: 'warning', label: '偏高/低', color: 'bg-orange-500', count: dataLevels.filter(l => l.level === 'warning' || l.level === 'low').length },
                { level: 'normal', label: '正常', color: 'bg-green-500', count: dataLevels.filter(l => l.level === 'normal').length },
              ].map(item => (
                <div key={item.level} className="flex items-center gap-2">
                  <div className={cn('w-3 h-3 rounded-full', item.color)} />
                  <span className="text-sm">{item.label}</span>
                  <Badge variant="outline" className="text-xs">{item.count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
