'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
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
} from 'recharts';
import { AlertCircle, TrendingUp, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import type { DataAnalysis, FieldStat } from '@/lib/data-processor';

interface DataInsightsProps {
  analysis: DataAnalysis;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function DataInsights({ analysis }: DataInsightsProps) {
  const { summary, fieldStats, insights, anomalies } = analysis;
  
  // 准备图表数据
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  const topFields = numericFields.slice(0, 6);
  
  // 柱状图数据 - 字段唯一值统计
  const uniqueValuesData = fieldStats.slice(0, 8).map(f => ({
    name: f.field.length > 10 ? f.field.substring(0, 10) + '...' : f.field,
    fullName: f.field,
    unique: f.uniqueCount,
    total: f.count
  }));
  
  // 饼图数据 - 字段类型分布
  const typeDistribution = [
    { name: '数值', value: summary.numericColumns, color: COLORS[0] },
    { name: '文本', value: summary.textColumns, color: COLORS[1] },
    { name: '日期', value: summary.dateColumns, color: COLORS[2] },
    { name: '混合', value: summary.totalColumns - summary.numericColumns - summary.textColumns - summary.dateColumns, color: COLORS[3] }
  ].filter(d => d.value > 0);
  
  // 雷达图数据 - 数值字段对比
  const radarData = topFields.map(f => ({
    field: f.field.length > 8 ? f.field.substring(0, 8) : f.field,
    min: f.numericStats!.min,
    max: f.numericStats!.max,
    mean: f.numericStats!.mean
  }));
  
  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalRows.toLocaleString()}</p>
                <p className="text-xs text-gray-500">总行数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.totalColumns}</p>
                <p className="text-xs text-gray-500">总列数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.nullValues.toLocaleString()}</p>
                <p className="text-xs text-gray-500">空值数</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary.duplicateRows}</p>
                <p className="text-xs text-gray-500">重复行</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* 图表区域 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 字段唯一值统计 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">字段唯一值统计</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={uniqueValuesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-medium">{data.fullName}</p>
                          <p className="text-sm text-gray-600">唯一值: {data.unique.toLocaleString()}</p>
                          <p className="text-sm text-gray-600">总行数: {data.total.toLocaleString()}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="unique" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* 字段类型分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">字段类型分布</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {typeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        
        {/* 数值字段范围对比 */}
        {radarData.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">数值字段范围对比 (雷达图)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="field" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis tick={{ fontSize: 10 }} />
                  <Radar name="最小值" dataKey="min" stroke={COLORS[2]} fill={COLORS[2]} fillOpacity={0.3} />
                  <Radar name="均值" dataKey="mean" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} />
                  <Radar name="最大值" dataKey="max" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* 字段详情 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">字段详情</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {fieldStats.map(stat => (
              <div key={stat.field} className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{stat.field}</span>
                    <Badge variant="outline" className="text-xs">
                      {stat.type}
                    </Badge>
                    {stat.nullCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {stat.nullCount} 空值
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stat.type === 'number' && stat.numericStats ? (
                      <span>
                        范围: {stat.numericStats.min.toLocaleString()} ~ {stat.numericStats.max.toLocaleString()}，
                        均值: {stat.numericStats.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}，
                        总和: {stat.numericStats.sum.toLocaleString()}
                      </span>
                    ) : (
                      <span>
                        {stat.uniqueCount.toLocaleString()} 个唯一值
                      </span>
                    )}
                  </div>
                  {stat.sampleValues.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {stat.sampleValues.slice(0, 3).map((val, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {String(val).substring(0, 20)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* 自动洞察 */}
      {insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              智能洞察
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-gray-700">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
      
      {/* 异常数据 */}
      {anomalies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              异常数据 ({anomalies.length > 10 ? '显示前10条' : `共 ${anomalies.length} 条`})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalies.slice(0, 10).map((anomaly, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    anomaly.type === 'null'
                      ? 'bg-gray-50 border-gray-400'
                      : anomaly.type === 'outlier'
                      ? 'bg-red-50 border-red-400'
                      : 'bg-amber-50 border-amber-400'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={
                        anomaly.type === 'null'
                          ? 'secondary'
                          : anomaly.type === 'outlier'
                          ? 'destructive'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {anomaly.type}
                    </Badge>
                    <span className="text-sm font-medium">{anomaly.field}</span>
                  </div>
                  <p className="text-sm text-gray-600">{anomaly.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
