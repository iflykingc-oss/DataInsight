'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {} from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList} from '@/components/ui/tabs';
import {
  Sparkles, BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon,
  AreaChart as AreaChartIcon, ScatterChart as ScatterChartIcon,
  Lightbulb, RefreshCw, LayoutGrid, List
} from 'lucide-react';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart as RechartsArea, Area,
  ScatterChart as RechartsScatter, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface SmartChartRecommenderProps {
  data: ParsedData;
  analysis: DataAnalysis | null;
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
type ChartType = 'bar' | 'line' | 'pie' | 'area' | 'scatter' | 'radar';

interface ChartRecommendation {
  type: ChartType;
  title: string;
  reason: string;
  xField: string;
  yField: string;
  data: Record<string, string | number>[];
  score: number; // 推荐分数 0-100
}

export function SmartChartRecommender({ data, analysis }: SmartChartRecommenderProps) {
  const { t } = useI18n();
  const [selectedChart, setSelectedChart] = useState<string>('0');
  const [customXField, setCustomXField] = useState<string>('');
  const [customYField, setCustomYField] = useState<string>('');
  const [customChartType, setCustomChartType] = useState<ChartType>('bar');

  // 生成推荐图表
  const recommendations = useMemo(() => generateRecommendations(data, analysis), [data, analysis]);
  
  // 自定义图表数据
  const customChartData = useMemo(() => {
    if (!customXField || !customYField) return [];
    return data.rows.slice(0, 50).map(r => ({
      [customXField]: String(r[customXField]),
      [customYField]: Number(r[customYField]) || 0
    }));
  }, [data, customXField, customYField]);

  const currentRecommendation = recommendations[Number(selectedChart)] || recommendations[0];

  return (
    <div className="space-y-4">
      {/* AI推荐区 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI 智能图表推荐
          </CardTitle>
          <CardDescription>
            基于数据特征自动推荐最佳可视化方案，共 {recommendations.length} 种推荐
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('txt.需要至少一个数值字段才能生成图表推荐')}</p>
          ) : (
            <div className="space-y-4">
              {/* 推荐选择器 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {recommendations.map((rec, idx) => {
                  const Icon = rec.type === 'bar' ? BarChart3 :
                               rec.type === 'line' ? LineChartIcon :
                               rec.type === 'pie' ? PieChartIcon :
                               rec.type === 'area' ? AreaChartIcon :
                               rec.type === 'scatter' ? ScatterChartIcon : BarChart3;
                  const isSelected = selectedChart === String(idx);
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedChart(String(idx))}
                      className={`p-3 rounded-md border text-left transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5 shadow-sm' 
                          : 'border-border hover:border-border hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                          {rec.type === 'bar' ? '柱状图' :
                           rec.type === 'line' ? '折线图' :
                           rec.type === 'pie' ? '饼图' :
                           rec.type === 'area' ? '面积图' :
                           rec.type === 'scatter' ? '散点图' : '雷达图'}
                        </span>
                        <Badge variant="outline" className="text-xs ml-auto">{rec.score}分</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{rec.title}</p>
                    </button>
                  );
                })}
              </div>
              
              {/* 当前推荐图表 */}
              {currentRecommendation && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-500" />
                    <p className="text-sm text-foreground">{currentRecommendation.reason}</p>
                  </div>
                  <div className="bg-white border rounded-md p-4">
                    <h4 className="font-medium text-sm mb-2">{currentRecommendation.title}</h4>
                    <ResponsiveContainer width="100%" height={350}>
                      {renderChart(currentRecommendation.type, currentRecommendation.xField, currentRecommendation.yField, currentRecommendation.data)}
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 自定义图表 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            自定义图表
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('txt.图表类型')}</label>
              <Select value={customChartType} onValueChange={v => setCustomChartType(v as ChartType)}>
                <SelectTrigger><SelectValue placeholder={t("ph.选择类型")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">{t('txt.柱状图')}</SelectItem>
                  <SelectItem value="line">{t('txt.折线图')}</SelectItem>
                  <SelectItem value="pie">{t('txt.饼图')}</SelectItem>
                  <SelectItem value="area">{t('txt.面积图')}</SelectItem>
                  <SelectItem value="scatter">{t('txt.散点图')}</SelectItem>
                  <SelectItem value="radar">{t('txt.雷达图')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">X轴字段</label>
              <Select value={customXField} onValueChange={setCustomXField}>
                <SelectTrigger><SelectValue placeholder={t("ph.选择字段")} /></SelectTrigger>
                <SelectContent>
                  {data.headers.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Y轴字段</label>
              <Select value={customYField} onValueChange={setCustomYField}>
                <SelectTrigger><SelectValue placeholder={t("ph.选择字段")} /></SelectTrigger>
                <SelectContent>
                  {data.headers.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {customChartData.length > 0 ? (
            <div className="bg-white border rounded-md p-4">
              <h4 className="font-medium text-sm mb-2">
                {customChartType === 'bar' ? '柱状图' :
                 customChartType === 'line' ? '折线图' :
                 customChartType === 'pie' ? '饼图' :
                 customChartType === 'area' ? '面积图' :
                 customChartType === 'scatter' ? '散点图' : '雷达图'}: {customXField} vs {customYField}
              </h4>
              <ResponsiveContainer width="100%" height={350}>
                {renderChart(customChartType, customXField, customYField, customChartData)}
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">{t('txt.请选择X轴和Y轴字段')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function renderChart(type: ChartType, xField: string, yField: string, chartData: Record<string, string | number>[]) {
  switch (type) {
    case 'bar':
      return (
        <BarChart data={chartData.slice(0, 20)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Bar dataKey={yField} fill="#1890ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      );
    case 'line':
      return (
        <LineChart data={chartData.slice(0, 30)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Line type="monotone" dataKey={yField} stroke="#1890ff" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      );
    case 'pie':
      return (
        <PieChart>
          <Pie
            data={chartData.slice(0, 10)}
            dataKey={yField}
            nameKey={xField}
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={({ name, percent }: { name: string; percent: number }) => 
              `${name} ${(percent * 100).toFixed(0)}%`
            }
          >
            {chartData.slice(0, 10).map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Legend />
        </PieChart>
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
    case 'scatter':
      return (
        <RechartsScatter margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} name={xField} tick={{ fontSize: 11 }} />
          <YAxis dataKey={yField} name={yField} tick={{ fontSize: 11 }} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name={`${xField} vs ${yField}`} data={chartData.slice(0, 100)} fill="#1890ff" />
        </RechartsScatter>
      );
    case 'radar':
      return (
        <RadarChart cx="50%" cy="50%" outerRadius={120} data={chartData.slice(0, 8)}>
          <PolarGrid />
          <PolarAngleAxis dataKey={xField} tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          <Radar name={yField} dataKey={yField} stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} />
          <Tooltip />
        </RadarChart>
      );
    default:
      return <div />;
  }
}

function generateRecommendations(data: ParsedData, analysis: DataAnalysis | null): ChartRecommendation[] {
  const recs: ChartRecommendation[] = [];
  if (!data || !data.rows || data.rows.length === 0) return recs;
  
  const headers = data.headers;
  const rows = data.rows;
  
  // 识别字段类型
  const numericCols: string[] = [];
  const textCols: Array<{ name: string; uniqueCount: number }> = [];
  const dateCols: string[] = [];
  
  headers.forEach(h => {
    const sample = rows.slice(0, 10).map(r => r[h]);
    const numCount = sample.filter(v => !isNaN(Number(v)) && v !== '' && v !== null).length;
    if (numCount >= sample.length * 0.7) {
      numericCols.push(h);
    } else {
      const datePatterns = /\d{4}[-/]\d{1,2}[-/]\d{1,2}/;
      const dateCount = sample.filter(v => datePatterns.test(String(v))).length;
      if (dateCount >= sample.length * 0.5) {
        dateCols.push(h);
      } else {
        const uniqueValues = new Set(rows.map(r => String(r[h])));
        textCols.push({ name: h, uniqueCount: uniqueValues.size });
      }
    }
  });
  
  const goodTextCols = textCols.filter(c => c.uniqueCount >= 2 && c.uniqueCount <= 30);
  
  // 1. 分类柱状图（优先级最高）
  if (goodTextCols.length > 0 && numericCols.length > 0) {
    const xCol = goodTextCols[0];
    numericCols.slice(0, 2).forEach(yCol => {
      const grouped: Record<string, number> = {};
      rows.forEach(r => {
        const key = String(r[xCol.name]);
        grouped[key] = (grouped[key] || 0) + (Number(r[yCol]) || 0);
      });
      const chartData = Object.entries(grouped)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15)
        .map(([k, v]) => ({ [xCol.name]: k, [yCol]: v }));
      
      recs.push({
        type: 'bar',
        title: `${yCol} by ${xCol.name}`,
        reason: `"${xCol.name}"有${xCol.uniqueCount}个类别，用柱状图可直观对比各组的${yCol}差异`,
        xField: xCol.name,
        yField: yCol,
        data: chartData,
        score: xCol.uniqueCount <= 10 ? 95 : 80
      });
    });
  }
  
  // 2. 折线趋势
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    numericCols.slice(0, 2).forEach(numCol => {
      const chartData = rows.slice(0, 30).map(r => ({
        [dateCol]: String(r[dateCol]),
        [numCol]: Number(r[numCol]) || 0
      }));
      recs.push({
        type: 'line',
        title: `${numCol} 趋势`,
        reason: `时间序列数据用折线图展示${numCol}的变化趋势最合适`,
        xField: dateCol,
        yField: numCol,
        data: chartData,
        score: 90
      });
    });
  }
  
  // 3. 饼图
  const pieCols = textCols.filter(c => c.uniqueCount >= 2 && c.uniqueCount <= 8);
  if (pieCols.length > 0) {
    const col = pieCols[0];
    const counts: Record<string, number> = {};
    rows.forEach(r => { counts[String(r[col.name])] = (counts[String(r[col.name])] || 0) + 1; });
    const chartData = Object.entries(counts).map(([k, v]) => ({ [col.name]: k, count: v }));
    
    recs.push({
      type: 'pie',
      title: `${col.name} 占比分布`,
      reason: `"${col.name}"有${col.uniqueCount}个类别，饼图可清晰展示各类别的占比`,
      xField: col.name,
      yField: 'count',
      data: chartData,
      score: 85
    });
  }
  
  // 4. 面积图
  if (numericCols.length > 0) {
    const xField = dateCols[0] || (goodTextCols[0]?.name || headers[0]);
    const yField = numericCols[0];
    const chartData = rows.slice(0, 25).map(r => ({
      [xField]: String(r[xField]),
      [yField]: Number(r[yField]) || 0
    }));
    recs.push({
      type: 'area',
      title: `${yField} 累积趋势`,
      reason: '面积图可直观展示数据量的累积变化和趋势走向',
      xField,
      yField,
      data: chartData,
      score: 75
    });
  }
  
  // 5. 散点图
  if (numericCols.length >= 2) {
    const chartData = rows.slice(0, 100).map(r => ({
      [numericCols[0]]: Number(r[numericCols[0]]) || 0,
      [numericCols[1]]: Number(r[numericCols[1]]) || 0
    }));
    recs.push({
      type: 'scatter',
      title: `${numericCols[0]} vs ${numericCols[1]}`,
      reason: `散点图可揭示"${numericCols[0]}"与"${numericCols[1]}"的相关关系`,
      xField: numericCols[0],
      yField: numericCols[1],
      data: chartData,
      score: 70
    });
  }
  
  // 6. 雷达图
  if (goodTextCols.length > 0 && numericCols.length >= 2) {
    const xCol = goodTextCols[0];
    const categories = [...new Set(rows.map(r => String(r[xCol.name])))].slice(0, 6);
    const chartData = categories.map(cat => {
      const catRows = rows.filter(r => String(r[xCol.name]) === cat);
      const entry: Record<string, string | number> = { [xCol.name]: cat };
      numericCols.slice(0, 4).forEach(nc => {
        const vals = catRows.map(r => Number(r[nc])).filter(v => !isNaN(v));
        entry[nc] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });
      return entry;
    });
    recs.push({
      type: 'radar',
      title: `${xCol.name} 多维雷达图`,
      reason: '雷达图可同时对比多个维度在不同分组下的表现',
      xField: xCol.name,
      yField: numericCols[0],
      data: chartData,
      score: 65
    });
  }
  
  return recs.sort((a, b) => b.score - a.score);
}
