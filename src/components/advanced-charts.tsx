'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  FunnelChart,
  Funnel,
  LabelList,
  Treemap,
} from 'recharts';
import {
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  TrendingUp,
  GitCompare,
  Grid3X3,
  Box,
  Circle
} from 'lucide-react';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

interface AdvancedChartsProps {
  data: ParsedData;
  fieldStats: FieldStat[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#14b8a6'
];

const CHART_TYPES = [
  { id: 'bar', name: '柱状图', icon: BarChart3, description: '适用于分类数据对比' },
  { id: 'line', name: '折线图', icon: LineChartIcon, description: '适用于趋势展示' },
  { id: 'area', name: '面积图', icon: TrendingUp, description: '适用于累积量展示' },
  { id: 'pie', name: '饼图', icon: PieChartIcon, description: '适用于占比分析' },
  { id: 'scatter', name: '散点图', icon: Circle, description: '适用于相关性分析' },
  { id: 'radar', name: '雷达图', icon: Activity, description: '适用于多维对比' },
  { id: 'funnel', name: '漏斗图', icon: GitCompare, description: '适用于转化分析' },
  { id: 'treemap', name: '矩形树图', icon: Grid3X3, description: '适用于层级占比' },
  { id: 'composed', name: '组合图', icon: Box, description: '适用于多指标分析' },
];

export function AdvancedCharts({ data, fieldStats }: AdvancedChartsProps) {
  const [selectedChartType, setSelectedChartType] = useState('bar');
  const [xAxisField, setXAxisField] = useState(data.headers[0] || '');
  const [yAxisFields, setYAxisFields] = useState<string[]>([]);
  
  const numericFields = useMemo(() =>
    fieldStats.filter(f => f.type === 'number'),
    [fieldStats]
  );
  
  const textFields = useMemo(() =>
    fieldStats.filter(f => f.type === 'string' || f.type === 'mixed'),
    [fieldStats]
  );
  
  // 处理散点图数据
  const scatterData = useMemo(() => {
    if (numericFields.length < 2) return [];
    const [field1, field2] = numericFields.slice(0, 2);
    return data.rows.slice(0, 50).map(row => ({
      x: Number(row[field1.field]) || 0,
      y: Number(row[field2.field]) || 0,
      name: row[data.headers[0]] || ''
    }));
  }, [data, numericFields]);
  
  // 处理雷达图数据
  const radarData = useMemo(() => {
    if (numericFields.length < 3) return [];
    const topFields = numericFields.slice(0, 6);
    return topFields.map(field => {
      const values = data.rows.map(r => Number(r[field.field])).filter(v => !isNaN(v));
      return {
        field: field.field.length > 8 ? field.field.substring(0, 8) : field.field,
        fullName: field.field,
        value: field.numericStats?.mean || 0,
        max: field.numericStats?.max || 0,
        min: field.numericStats?.min || 0
      };
    });
  }, [data, numericFields]);
  
  // 处理漏斗图数据
  const funnelData = useMemo(() => {
    if (!xAxisField) return [];
    const grouped = new Map<string, number>();
    data.rows.forEach(row => {
      const key = String(row[xAxisField] || '未知');
      grouped.set(key, (grouped.get(key) || 0) + 1);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value], index) => ({
        name: name.length > 10 ? name.substring(0, 10) + '...' : name,
        fullName: name,
        value,
        fill: COLORS[index % COLORS.length]
      }));
  }, [data, xAxisField]);
  
  // 处理矩形树图数据
  const treemapData = useMemo(() => {
    if (numericFields.length === 0) return [];
    const field = numericFields[0];
    return data.rows.slice(0, 20).map(row => {
      const name = row[data.headers[0]] || '未知';
      return {
        name: String(name).substring(0, 15),
        size: Math.abs(Number(row[field.field])) || 0,
        fill: COLORS[Math.abs(hashCode(String(name))) % COLORS.length]
      };
    });
  }, [data, numericFields]);
  
  // 处理组合图数据
  const composedData = useMemo(() => {
    if (!xAxisField || numericFields.length < 2) return [];
    const grouped = new Map<string, { value1: number; value2: number }>();
    data.rows.forEach(row => {
      const key = String(row[xAxisField] || '未知');
      const existing = grouped.get(key) || { value1: 0, value2: 0 };
      grouped.set(key, {
        value1: existing.value1 + (Number(row[numericFields[0].field]) || 0),
        value2: existing.value2 + (Number(row[numericFields[1].field]) || 0)
      });
    });
    return Array.from(grouped.entries()).slice(0, 15).map(([name, data]) => ({
      name: name.length > 8 ? name.substring(0, 8) + '...' : name,
      fullName: name,
      ...data
    }));
  }, [data, xAxisField, numericFields]);
  
  // 通用图表数据处理
  const chartData = useMemo(() => {
    if (!xAxisField) return [];
    const grouped = new Map<string, { sum: number; count: number }>();
    const yField = yAxisFields[0] || numericFields[0]?.field;
    if (!yField) return [];
    
    data.rows.forEach(row => {
      const xValue = String(row[xAxisField] || '未知');
      const yValue = Number(row[yField]);
      if (!isNaN(yValue)) {
        const existing = grouped.get(xValue) || { sum: 0, count: 0 };
        grouped.set(xValue, {
          sum: existing.sum + yValue,
          count: existing.count + 1
        });
      }
    });
    
    return Array.from(grouped.entries()).map(([name, data]) => ({
      name: name.length > 12 ? name.substring(0, 12) + '...' : name,
      fullName: name,
      value: data.sum,
      avg: data.count > 0 ? data.sum / data.count : 0
    })).slice(0, 20);
  }, [data, xAxisField, yAxisFields, numericFields]);
  
  // 饼图数据
  const pieData = useMemo(() => {
    return chartData.slice(0, 8).map(item => ({
      name: item.name,
      value: item.value
    }));
  }, [chartData]);
  
  const renderChart = () => {
    const commonProps = {
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };
    
    const tooltipContent = ({ active, payload }: any) => {
      if (active && payload && payload.length) {
        const data = payload[0]?.payload;
        return (
          <div className="bg-white p-3 border rounded shadow-lg">
            <p className="font-medium">{data?.fullName || data?.name}</p>
            {data?.value !== undefined && <p className="text-sm text-gray-600">值: {Number(data.value).toLocaleString()}</p>}
            {data?.avg !== undefined && <p className="text-sm text-gray-600">均值: {Number(data.avg).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>}
          </div>
        );
      }
      return null;
    };
    
    switch (selectedChartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={tooltipContent} />
              <Legend />
              <Bar dataKey="value" name={yAxisFields[0] || '数值'} fill={COLORS[0]} radius={[4, 4, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={tooltipContent} />
              <Legend />
              <Line type="monotone" dataKey="value" name={yAxisFields[0] || '数值'} stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartData} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={tooltipContent} />
              <Legend />
              <Area type="monotone" dataKey="value" name={yAxisFields[0] || '数值'} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={140}
                innerRadius={60}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={tooltipContent} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" name={numericFields[0]?.field} tick={{ fontSize: 12 }} />
              <YAxis dataKey="y" name={numericFields[1]?.field} tick={{ fontSize: 12 }} />
              <Tooltip content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0]?.payload;
                  return (
                    <div className="bg-white p-3 border rounded shadow-lg">
                      <p className="font-medium">{data?.name}</p>
                      <p className="text-sm">{numericFields[0]?.field}: {data?.x}</p>
                      <p className="text-sm">{numericFields[1]?.field}: {data?.y}</p>
                    </div>
                  );
                }
                return null;
              }} />
              <Scatter data={scatterData} fill={COLORS[0]} />
            </ScatterChart>
          </ResponsiveContainer>
        );
        
      case 'radar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="field" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} />
              <Radar name="均值" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
              <Radar name="最大值" dataKey="max" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} />
              <Legend />
              <Tooltip content={tooltipContent} />
            </RadarChart>
          </ResponsiveContainer>
        );
        
      case 'funnel':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <FunnelChart>
              <Tooltip content={tooltipContent} />
              <Funnel
                dataKey="value"
                data={funnelData}
                isAnimationActive
              >
                <LabelList
                  position="right"
                  fill="#000"
                  stroke="none"
                  dataKey="name"
                  formatter={(val: string) => val}
                />
                <LabelList
                  position="center"
                  fill="#fff"
                  stroke="none"
                  dataKey="value"
                  formatter={(val: number) => val.toLocaleString()}
                />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        );
        
      case 'treemap':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              fill="#8884d8"
            />
          </ResponsiveContainer>
        );
        
      case 'composed':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={composedData} {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={tooltipContent} />
              <Legend />
              <Bar dataKey="value1" name={numericFields[0]?.field} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="value2" name={numericFields[1]?.field} stroke={COLORS[1]} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 图表选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">高级图表</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedChartType} onValueChange={setSelectedChartType}>
            <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
              {CHART_TYPES.map(chart => {
                const Icon = chart.icon;
                return (
                  <TabsTrigger key={chart.id} value={chart.id} className="flex items-center gap-1" title={chart.description}>
                    <Icon className="w-4 h-4" />
                    <span className="hidden xl:inline">{chart.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* 图表配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">图表配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>X轴字段 (分类)</Label>
              <Select value={xAxisField} onValueChange={setXAxisField}>
                <SelectTrigger>
                  <SelectValue placeholder="选择X轴字段" />
                </SelectTrigger>
                <SelectContent>
                  {data.headers.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Y轴字段 (数值)</Label>
              <Select value={yAxisFields[0] || ''} onValueChange={v => setYAxisFields([v])}>
                <SelectTrigger>
                  <SelectValue placeholder="选择Y轴字段" />
                </SelectTrigger>
                <SelectContent>
                  {numericFields.map(f => (
                    <SelectItem key={f.field} value={f.field}>{f.field}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>当前图表</Label>
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = CHART_TYPES.find(c => c.id === selectedChartType)?.icon || BarChart3;
                    return <Icon className="w-5 h-5 text-primary" />;
                  })()}
                  <span className="font-medium">
                    {CHART_TYPES.find(c => c.id === selectedChartType)?.name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {CHART_TYPES.find(c => c.id === selectedChartType)?.description}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 图表展示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            <span>{CHART_TYPES.find(c => c.id === selectedChartType)?.name} 展示</span>
            <Badge variant="secondary">{chartData.length} 个数据点</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderChart()}
        </CardContent>
      </Card>
      
      {/* 图表特点说明 */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">适用场景</h4>
              <p className="text-sm text-blue-600">
                {selectedChartType === 'bar' && '分类数据对比、数量统计'}
                {selectedChartType === 'line' && '数据趋势、时间序列分析'}
                {selectedChartType === 'area' && '累积量变化、流量分析'}
                {selectedChartType === 'pie' && '占比分析、百分比展示'}
                {selectedChartType === 'scatter' && '相关性分析、异常检测'}
                {selectedChartType === 'radar' && '多维度对比、能力评估'}
                {selectedChartType === 'funnel' && '转化漏斗、流程分析'}
                {selectedChartType === 'treemap' && '层级占比、目录结构'}
                {selectedChartType === 'composed' && '多指标综合分析'}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">数据要求</h4>
              <p className="text-sm text-green-600">
                {selectedChartType === 'scatter' && '需要至少2个数值字段'}
                {selectedChartType !== 'scatter' && '需要1个分类字段 + 1个数值字段'}
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">优化建议</h4>
              <p className="text-sm text-purple-600">
                数据量控制在20条以内效果最佳，过多数据建议先聚合
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// 辅助函数：字符串哈希
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash;
}
