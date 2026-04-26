'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3, LayoutGrid, Download,
  TrendingUp, PieChart, LineChart, Activity, Layers
} from 'lucide-react';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';
import {
  BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell,
  AreaChart as RechartsArea, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DashboardProps {
  data: ParsedData;
  analysis: DataAnalysis | null;
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'];

interface ChartWidget {
  id: string;
  type: 'kpi' | 'bar' | 'line' | 'pie' | 'area' | 'radar';
  title: string;
  xField: string;
  yField: string;
  data: Record<string, string | number>[];
  priority: number;
}

export function Dashboard({ data, analysis }: DashboardProps) {
  const [chartType, setChartType] = useState<string>('auto');
  
  // 自动生成仪表盘图表
  const allWidgets = useMemo(() => generateDashboard(data, analysis), [data, analysis]);

  // KPI 卡片
  const kpiWidgets = allWidgets.filter(w => w.type === 'kpi');
  // 根据图表类型筛选
  const chartWidgets = chartType === 'auto' 
    ? allWidgets.filter(w => w.type !== 'kpi') 
    : allWidgets.filter(w => w.type !== 'kpi' && w.type === chartType);

  if (allWidgets.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">需要至少1个数值字段才能生成仪表盘</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI 指标卡片 */}
      {kpiWidgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiWidgets.map(widget => (
            <Card key={widget.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{widget.title}</span>
                  <Activity className="w-4 h-4 text-[#1890ff]" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{widget.data[0]?.value as string || '-'}</div>
                <p className="text-xs text-gray-400 mt-1">{widget.data[0]?.sub as string || ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="图表类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">全部类型</SelectItem>
              <SelectItem value="bar">柱状图</SelectItem>
              <SelectItem value="line">折线图</SelectItem>
              <SelectItem value="pie">饼图</SelectItem>
              <SelectItem value="area">面积图</SelectItem>
              <SelectItem value="radar">雷达图</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {chartWidgets.length} 个图表
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const el = document.getElementById('dashboard-chart-area');
              if (el) {
                import('html2canvas').then(mod => {
                  mod.default(el).then((canvas: HTMLCanvasElement) => {
                    const link = document.createElement('a');
                    link.download = 'dashboard.png';
                    link.href = canvas.toDataURL();
                    link.click();
                  });
                }).catch(() => {
                  /* html2canvas not available */
                });
              }
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            导出图片
          </Button>
        </div>
      </div>

      {/* 图表网格 */}
      <div id="dashboard-chart-area" className="grid md:grid-cols-2 gap-4">
        {chartWidgets.map(widget => (
          <Card key={widget.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                <Badge variant="outline" className="text-xs">
                  {widget.type === 'bar' ? '柱状图' :
                   widget.type === 'line' ? '折线图' :
                   widget.type === 'pie' ? '饼图' :
                   widget.type === 'area' ? '面积图' :
                   widget.type === 'radar' ? '雷达图' : widget.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                {renderChart(widget)}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function renderChart(widget: ChartWidget) {
  const { type, xField, yField, data: chartData } = widget;
  
  switch (type) {
    case 'bar':
      return (
        <BarChart data={chartData.slice(0, 20)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Bar dataKey={yField} fill="#1890ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    case 'line':
      return (
        <RechartsLineChart data={chartData.slice(0, 30)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Line type="monotone" dataKey={yField} stroke="#1890ff" strokeWidth={2} dot={{ r: 3 }} />
        </RechartsLineChart>
      );
    case 'pie':
      return (
        <RechartsPieChart>
          <Pie
            data={chartData.slice(0, 10)}
            dataKey={yField}
            nameKey={xField}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }: { name: string; percent: number }) => 
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={{ strokeWidth: 1 }}
          >
            {chartData.slice(0, 10).map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Legend />
        </RechartsPieChart>
      );
    case 'area':
      return (
        <RechartsArea data={chartData.slice(0, 30)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Area type="monotone" dataKey={yField} stroke="#1890ff" fill="#1890ff" fillOpacity={0.2} strokeWidth={2} />
        </RechartsArea>
      );
    case 'radar':
      return (
        <RadarChart cx="50%" cy="50%" outerRadius={100} data={chartData.slice(0, 8)}>
          <PolarGrid />
          <PolarAngleAxis dataKey={xField} tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          <Radar name={yField} dataKey={yField} stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
          <Tooltip />
        </RadarChart>
      );
    default:
      return <div className="flex items-center justify-center h-full text-gray-400">不支持的图表类型</div>;
  }
}

function generateDashboard(data: ParsedData, analysis: DataAnalysis | null): ChartWidget[] {
  const widgets: ChartWidget[] = [];
  if (!data || !data.rows || data.rows.length === 0) return widgets;
  
  const headers = data.headers;
  const rows = data.rows;
  
  // 识别字段类型
  const numericCols: Array<{ name: string; idx: number }> = [];
  const textCols: Array<{ name: string; idx: number; uniqueCount: number }> = [];
  const dateCols: Array<{ name: string; idx: number }> = [];
  
  headers.forEach((h, idx) => {
    const sampleValues = rows.slice(0, 10).map(r => r[h]);
    const numericCount = sampleValues.filter(v => !isNaN(Number(v)) && v !== '' && v !== null).length;
    
    if (numericCount >= sampleValues.length * 0.7) {
      numericCols.push({ name: h, idx });
    } else {
      // 检测日期
      const datePatterns = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;
      const dateCount = sampleValues.filter(v => datePatterns.test(String(v))).length;
      if (dateCount >= sampleValues.length * 0.5) {
        dateCols.push({ name: h, idx });
      } else {
        const uniqueValues = new Set(rows.map(r => String(r[h])));
        textCols.push({ name: h, idx, uniqueCount: uniqueValues.size });
      }
    }
  });
  
  // 1. KPI 卡片 - 数值字段的汇总
  numericCols.slice(0, 4).forEach((col, i) => {
    const values = rows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? sum / values.length : 0;
    const max = Math.max(...values);
    
    const metrics = [
      { label: `总${col.name}`, value: sum.toLocaleString(), sub: `共 ${values.length} 条数据` },
      { label: `平均${col.name}`, value: avg.toLocaleString(undefined, { maximumFractionDigits: 2 }), sub: `范围: ${Math.min(...values).toLocaleString()} ~ ${max.toLocaleString()}` },
      { label: `最大${col.name}`, value: max.toLocaleString(), sub: `最小: ${Math.min(...values).toLocaleString()}` },
      { label: `${col.name}方差`, value: calculateVariance(values).toLocaleString(undefined, { maximumFractionDigits: 2 }), sub: `标准差: ${Math.sqrt(calculateVariance(values)).toLocaleString(undefined, { maximumFractionDigits: 2 })}` }
    ];
    
    const metric = metrics[i % metrics.length];
    widgets.push({
      id: `kpi-${col.name}`,
      type: 'kpi',
      title: metric.label,
      xField: '',
      yField: col.name,
      data: [{ value: metric.value, sub: metric.sub }],
      priority: 10
    });
  });
  
  // 2. 分类字段+数值字段 → 柱状图
  const goodTextCols = textCols.filter(c => c.uniqueCount >= 2 && c.uniqueCount <= 30);
  if (goodTextCols.length > 0 && numericCols.length > 0) {
    const xCol = goodTextCols[0];
    const yCol = numericCols[0];
    
    // 按分类聚合
    const grouped = groupByField(rows, xCol.name, yCol.name);
    const chartData = Object.entries(grouped)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 15)
      .map(([key, val]) => ({ [xCol.name]: key, [yCol.name]: val }));
    
    widgets.push({
      id: `bar-${xCol.name}-${yCol.name}`,
      type: 'bar',
      title: `${yCol.name} by ${xCol.name}`,
      xField: xCol.name,
      yField: yCol.name,
      data: chartData,
      priority: 9
    });
  }
  
  // 3. 饼图 - 分类占比
  if (goodTextCols.length > 0) {
    const col = goodTextCols[0];
    const counts: Record<string, number> = {};
    rows.forEach(r => {
      const key = String(r[col.name]);
      counts[key] = (counts[key] || 0) + 1;
    });
    const chartData = Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([key, val]) => ({ [col.name]: key, count: val }));
    
    if (chartData.length >= 2) {
      widgets.push({
        id: `pie-${col.name}`,
        type: 'pie',
        title: `${col.name} 占比分布`,
        xField: col.name,
        yField: 'count',
        data: chartData,
        priority: 8
      });
    }
  }
  
  // 4. 日期字段+数值字段 → 折线图
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    const numCol = numericCols[0];
    const chartData = rows.slice(0, 30).map(r => ({
      [dateCol.name]: String(r[dateCol.name]),
      [numCol.name]: Number(r[numCol.name]) || 0
    }));
    
    widgets.push({
      id: `line-${dateCol.name}-${numCol.name}`,
      type: 'line',
      title: `${numCol.name} 趋势`,
      xField: dateCol.name,
      yField: numCol.name,
      data: chartData,
      priority: 9
    });
  }
  
  // 5. 面积图
  if (numericCols.length > 0) {
    const xAxisField = dateCols.length > 0 ? dateCols[0].name : (goodTextCols.length > 0 ? goodTextCols[0].name : '');
    const yCol = numericCols[0];
    if (xAxisField) {
      const chartData = rows.slice(0, 25).map(r => ({
        [xAxisField]: String(r[xAxisField]),
        [yCol.name]: Number(r[yCol.name]) || 0
      }));
      widgets.push({
        id: `area-${xAxisField}-${yCol.name}`,
        type: 'area',
        title: `${yCol.name} 累积趋势`,
        xField: xAxisField,
        yField: yCol.name,
        data: chartData,
        priority: 7
      });
    }
  }
  
  // 6. 多数值字段对比柱状图
  if (goodTextCols.length > 0 && numericCols.length >= 2) {
    const xCol = goodTextCols[0];
    const grouped: Record<string, Record<string, number>> = {};
    rows.forEach(r => {
      const key = String(r[xCol.name]);
      if (!grouped[key]) grouped[key] = {};
      numericCols.slice(0, 3).forEach(nc => {
        grouped[key][nc.name] = (grouped[key][nc.name] || 0) + (Number(r[nc.name]) || 0);
      });
    });
    const chartData = Object.entries(grouped)
      .slice(0, 10)
      .map(([key, vals]) => ({ [xCol.name]: key, ...vals }));
    
    widgets.push({
      id: `multi-bar-${xCol.name}`,
      type: 'bar',
      title: `多维对比 by ${xCol.name}`,
      xField: xCol.name,
      yField: numericCols[1].name,
      data: chartData,
      priority: 6
    });
  }
  
  // 7. 雷达图
  if (goodTextCols.length > 0 && numericCols.length >= 2) {
    const xCol = goodTextCols[0];
    const categories = [...new Set(rows.map(r => String(r[xCol.name])))].slice(0, 6);
    const chartData = categories.map(cat => {
      const catRows = rows.filter(r => String(r[xCol.name]) === cat);
      const entry: Record<string, string | number> = { [xCol.name]: cat };
      numericCols.slice(0, 4).forEach(nc => {
        const vals = catRows.map(r => Number(r[nc.name])).filter(v => !isNaN(v));
        entry[nc.name] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });
      return entry;
    });
    
    widgets.push({
      id: `radar-${xCol.name}`,
      type: 'radar',
      title: `${xCol.name} 多维雷达图`,
      xField: xCol.name,
      yField: numericCols[0].name,
      data: chartData,
      priority: 5
    });
  }
  
  return widgets.sort((a, b) => b.priority - a.priority);
}

function groupByField(rows: Record<string, string | number>[], groupField: string, valueField: string): Record<string, number> {
  const grouped: Record<string, number> = {};
  rows.forEach(r => {
    const key = String(r[groupField]);
    const val = Number(r[valueField]) || 1;
    grouped[key] = (grouped[key] || 0) + val;
  });
  return grouped;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}
