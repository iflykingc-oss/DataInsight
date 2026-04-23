'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { LayoutGrid, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Settings, Download } from 'lucide-react';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

interface DashboardProps {
  data: ParsedData;
  fieldStats: FieldStat[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

type ChartType = 'bar' | 'line' | 'area' | 'pie';

interface ChartConfig {
  type: ChartType;
  xAxis: string;
  yAxis: string;
  title: string;
}

export function Dashboard({ data, fieldStats }: DashboardProps) {
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([
    { type: 'bar', xAxis: data.headers[0] || '', yAxis: data.headers[1] || '', title: '主图表' }
  ]);
  const [selectedXField, setSelectedXField] = useState(data.headers[0] || '');
  const [selectedYField, setSelectedYField] = useState(data.headers[1] || '');
  const [chartType, setChartType] = useState<ChartType>('bar');
  
  // 获取数值字段
  const numericFields = useMemo(() =>
    fieldStats.filter(f => f.type === 'number'),
    [fieldStats]
  );
  
  // 获取文本字段（用于分类）
  const textFields = useMemo(() =>
    fieldStats.filter(f => f.type === 'string' || f.type === 'mixed'),
    [fieldStats]
  );
  
  // 准备图表数据
  const chartData = useMemo(() => {
    if (!selectedXField || !selectedYField) return [];
    
    // 按X轴字段分组，计算Y轴字段的总和/均值
    const grouped = new Map<string, { sum: number; count: number }>();
    
    data.rows.forEach(row => {
      const xValue = String(row[selectedXField] || '未知');
      const yValue = Number(row[selectedYField]);
      
      if (!isNaN(yValue)) {
        const existing = grouped.get(xValue) || { sum: 0, count: 0 };
        grouped.set(xValue, {
          sum: existing.sum + yValue,
          count: existing.count + 1
        });
      }
    });
    
    return Array.from(grouped.entries()).map(([name, data]) => ({
      name: name.length > 15 ? name.substring(0, 15) + '...' : name,
      fullName: name,
      value: data.sum,
      avg: data.count > 0 ? data.sum / data.count : 0
    })).slice(0, 20); // 限制显示20条
  }, [data.rows, selectedXField, selectedYField]);
  
  // 饼图数据 - 取前8个分类
  const pieData = useMemo(() => {
    return chartData.slice(0, 8).map((item, index) => ({
      name: item.name,
      value: item.value
    }));
  }, [chartData]);
  
  const renderChart = (config: ChartConfig) => {
    if (chartData.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center text-gray-500">
          请选择有效的X轴和Y轴字段
        </div>
      );
    }
    
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };
    
    switch (config.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{data.fullName}</p>
                        <p className="text-sm text-gray-600">总和: {data.value.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">均值: {data.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="value" name={selectedYField} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{data.fullName}</p>
                        <p className="text-sm text-gray-600">值: {data.value.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="value" name={selectedYField} stroke={COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{data.fullName}</p>
                        <p className="text-sm text-gray-600">值: {data.value.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Area type="monotone" dataKey="value" name={selectedYField} stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                innerRadius={50}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <p className="font-medium">{data.name}</p>
                        <p className="text-sm text-gray-600">值: {data.value.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* 图表配置 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="w-5 h-5" />
            图表配置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-sm font-medium text-gray-700">图表类型</label>
              <Select value={chartType} onValueChange={(v: ChartType) => setChartType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      柱状图
                    </div>
                  </SelectItem>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChartIcon className="w-4 h-4" />
                      折线图
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div className="flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" />
                      面积图
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" />
                      饼图
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-sm font-medium text-gray-700">X轴字段 (分类)</label>
              <Select value={selectedXField} onValueChange={setSelectedXField}>
                <SelectTrigger>
                  <SelectValue placeholder="选择X轴字段" />
                </SelectTrigger>
                <SelectContent>
                  {data.headers.map(header => (
                    <SelectItem key={header} value={header}>
                      {header}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-sm font-medium text-gray-700">Y轴字段 (数值)</label>
              <Select value={selectedYField} onValueChange={setSelectedYField}>
                <SelectTrigger>
                  <SelectValue placeholder="选择Y轴字段" />
                </SelectTrigger>
                <SelectContent>
                  {numericFields.map(field => (
                    <SelectItem key={field.field} value={field.field}>
                      {field.field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button
              variant="outline"
              onClick={() => setChartConfigs([{ type: chartType, xAxis: selectedXField, yAxis: selectedYField, title: '图表' }])}
            >
              重置图表
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* 主图表展示 */}
      <Tabs defaultValue="main" className="space-y-4">
        <TabsList>
          <TabsTrigger value="main">
            <LayoutGrid className="w-4 h-4 mr-2" />
            主视图
          </TabsTrigger>
          <TabsTrigger value="all">
            <BarChart3 className="w-4 h-4 mr-2" />
            多图表
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="main">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {chartType === 'bar' ? '柱状图' : chartType === 'line' ? '折线图' : chartType === 'area' ? '面积图' : '饼图'}: {selectedXField} vs {selectedYField}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderChart({ type: chartType, xAxis: selectedXField, yAxis: selectedYField, title: '主图表' })}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="all">
          <div className="grid md:grid-cols-2 gap-6">
            {/* 柱状图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  柱状图
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart({ type: 'bar', xAxis: selectedXField, yAxis: selectedYField, title: '柱状图' })}
              </CardContent>
            </Card>
            
            {/* 折线图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LineChartIcon className="w-4 h-4" />
                  折线图
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart({ type: 'line', xAxis: selectedXField, yAxis: selectedYField, title: '折线图' })}
              </CardContent>
            </Card>
            
            {/* 面积图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  面积图
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart({ type: 'area', xAxis: selectedXField, yAxis: selectedYField, title: '面积图' })}
              </CardContent>
            </Card>
            
            {/* 饼图 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4" />
                  饼图
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderChart({ type: 'pie', xAxis: selectedXField, yAxis: selectedYField, title: '饼图' })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      {/* 关键指标卡片 */}
      {numericFields.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {numericFields.slice(0, 4).map(field => (
            <Card key={field.field}>
              <CardContent className="pt-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 truncate" title={field.field}>
                    {field.field}
                  </p>
                  {field.numericStats && (
                    <>
                      <p className="text-2xl font-bold">
                        {field.numericStats.sum.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          均值: {field.numericStats.mean.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
