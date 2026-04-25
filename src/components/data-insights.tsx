'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Shield,
  Target,
  Lightbulb,
  BarChart3,
  Zap,
  ArrowRight,
  AlertCircle,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';
import type { ParsedData, DataAnalysis, DeepAnalysis } from '@/lib/data-processor';
import {
  BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell,
  ScatterChart as RechartsScatter, Scatter,
  AreaChart as RechartsArea, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface DataInsightsProps {
  data: ParsedData;
  analysis: DataAnalysis | null;
  onAnalyze: () => void;
}

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: '严重' },
  warning: { icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: '警告' },
  info: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: '提示' },
  positive: { icon: ThumbsUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: '正面' }
};

const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

export function DataInsights({ data, analysis, onAnalyze }: DataInsightsProps) {
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const deep = analysis?.deepAnalysis;

  useEffect(() => {
    if (!analysis) onAnalyze();
  }, []);

  if (!analysis) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">正在分析数据...</p>
        </CardContent>
      </Card>
    );
  }

  if (!deep) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">深度分析不可用，请重新分析</p>
          <Button onClick={onAnalyze}>重新分析</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. 数据画像 + 健康评分 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* 数据画像 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-[#1890ff]" />
              数据画像
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">{deep.dataProfile.summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 mb-1">数据类型</p>
                <p className="font-semibold text-blue-900">{deep.dataProfile.dataType}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <p className="text-xs text-purple-600 mb-1">推测行业</p>
                <p className="font-semibold text-purple-900">{deep.dataProfile.suggestedIndustry}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 mb-1">数据成熟度</p>
                <p className="font-semibold text-green-900">
                  {deep.dataProfile.dataMaturity === 'raw' ? '原始数据' :
                   deep.dataProfile.dataMaturity === 'cleaned' ? '已清洗' :
                   deep.dataProfile.dataMaturity === 'structured' ? '结构化' : '已分析'}
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-600 mb-1">分析潜力</p>
                <p className="font-semibold text-orange-900">
                  {deep.dataProfile.analysisPotential === 'high' ? '高' :
                   deep.dataProfile.analysisPotential === 'medium' ? '中' : '低'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 健康评分 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#1890ff]" />
              数据健康评分
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-5xl font-bold" style={{ color: getScoreColor(deep.healthScore.overall) }}>
                {deep.healthScore.overall}
              </div>
              <p className="text-sm text-gray-500 mt-1">综合评分</p>
            </div>
            <div className="space-y-2">
              {[
                { label: '完整性', value: deep.healthScore.completeness },
                { label: '一致性', value: deep.healthScore.consistency },
                { label: '质量', value: deep.healthScore.quality },
                { label: '可用性', value: deep.healthScore.usability },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-12">{item.label}</span>
                  <Progress value={item.value} className="flex-1 h-2" />
                  <span className="text-xs font-medium w-8 text-right">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. 关键发现 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-[#1890ff]" />
            关键发现
            <Badge variant="secondary">{deep.keyFindings.length}</Badge>
          </CardTitle>
          <CardDescription>AI 自动发现数据中的问题和机会</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deep.keyFindings.map((finding, idx) => {
              const config = SEVERITY_CONFIG[finding.severity];
              const Icon = config.icon;
              const isExpanded = expandedFinding === `${idx}`;
              
              return (
                <div key={idx} className={`rounded-lg border ${config.border} ${config.bg} overflow-hidden`}>
                  <div 
                    className="flex items-start gap-3 p-3 cursor-pointer"
                    onClick={() => setExpandedFinding(isExpanded ? null : `${idx}`)}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-xs ${config.color} border-current`}>
                          {config.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {finding.category === 'quality' ? '数据质量' :
                           finding.category === 'distribution' ? '数据分布' :
                           finding.category === 'trend' ? '趋势' :
                           finding.category === 'correlation' ? '相关性' :
                           finding.category === 'anomaly' ? '异常' : '洞察'}
                        </Badge>
                        <span className="font-medium text-sm">{finding.title}</span>
                      </div>
                      <p className="text-xs text-gray-600">{finding.detail}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 ml-8 border-t border-gray-100">
                      <div className="mt-2 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">影响</p>
                            <p className="text-xs text-gray-500">{finding.impact}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-gray-700">建议</p>
                            <p className="text-xs text-gray-500">{finding.suggestion}</p>
                          </div>
                        </div>
                        {finding.relatedFields.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-gray-400">相关字段:</span>
                            {finding.relatedFields.map(f => (
                              <Badge key={f} variant="outline" className="text-xs py-0">{f}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 3. 趋势 + 分布 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* 趋势分析 */}
        {deep.trends.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#1890ff]" />
                趋势分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deep.trends.map((trend, idx) => {
                  const TrendIcon = trend.direction === 'up' ? TrendingUp : 
                                     trend.direction === 'down' ? TrendingDown : 
                                     trend.direction === 'volatile' ? Activity : Minus;
                  const trendColor = trend.direction === 'up' ? 'text-green-600' :
                                     trend.direction === 'down' ? 'text-red-600' :
                                     trend.direction === 'volatile' ? 'text-orange-600' : 'text-gray-600';
                  const trendBg = trend.direction === 'up' ? 'bg-green-50' :
                                  trend.direction === 'down' ? 'bg-red-50' :
                                  trend.direction === 'volatile' ? 'bg-orange-50' : 'bg-gray-50';
                  
                  return (
                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg ${trendBg}`}>
                      <TrendIcon className={`w-8 h-8 ${trendColor}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{trend.field}</span>
                          <Badge variant="outline" className={`text-xs ${trendColor}`}>
                            {trend.direction === 'up' ? '上升' :
                             trend.direction === 'down' ? '下降' :
                             trend.direction === 'volatile' ? '波动' : '稳定'}
                            {trend.changeRate !== 0 && ` ${Math.abs(trend.changeRate)}%`}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{trend.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 分布分析 */}
        {deep.distributions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#1890ff]" />
                分布分析
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deep.distributions.slice(0, 6).map((dist, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{dist.field}</span>
                      <Badge variant="outline" className="text-xs">
                        {dist.type === 'normal' ? '正态' :
                         dist.type === 'skewed_right' ? '右偏' :
                         dist.type === 'skewed_left' ? '左偏' :
                         dist.type === 'bimodal' ? '双峰' : '均匀'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{dist.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>偏度: {dist.skewness}</span>
                      <span>峰度: {dist.kurtosis}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 4. 相关性分析 */}
      {deep.correlations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-[#1890ff]" />
              字段相关性
              <Badge variant="secondary">{deep.correlations.length}</Badge>
            </CardTitle>
            <CardDescription>发现字段间的潜在关联关系</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {deep.correlations.slice(0, 9).map((corr, idx) => {
                const strengthColor = corr.strength === 'strong' ? 'text-red-600 bg-red-50' :
                                      corr.strength === 'moderate' ? 'text-orange-600 bg-orange-50' : 'text-blue-600 bg-blue-50';
                const dirIcon = corr.direction === 'positive' ? '↑' : '↓';
                
                return (
                  <div key={idx} className={`p-3 rounded-lg border ${strengthColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {corr.field1} {dirIcon} {corr.field2}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {corr.strength === 'strong' ? '强' : corr.strength === 'moderate' ? '中' : '弱'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.abs(corr.coefficient) * 100} 
                        className="flex-1 h-2" 
                      />
                      <span className="text-xs font-mono font-medium">{(corr.coefficient * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs mt-1 opacity-70">
                      {corr.direction === 'positive' ? '正相关：一个增大另一个也增大' : '负相关：一个增大另一个减小'}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. 推荐图表 */}
      {deep.recommendedCharts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#1890ff]" />
              智能图表推荐
            </CardTitle>
            <CardDescription>根据数据特征自动推荐最佳可视化方案</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {deep.recommendedCharts.map((rec, idx) => {
                const priorityColor = rec.priority === 'high' ? 'border-l-4 border-l-red-400' :
                                      rec.priority === 'medium' ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-blue-400';
                
                return (
                  <div key={idx} className={`p-4 bg-white border rounded-lg ${priorityColor} hover:shadow-md transition-shadow`}>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-[#1890ff]" />
                      <span className="font-medium text-sm">{rec.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs mb-2">
                      {rec.chartType === 'bar' ? '柱状图' :
                       rec.chartType === 'line' ? '折线图' :
                       rec.chartType === 'pie' ? '饼图' :
                       rec.chartType === 'scatter' ? '散点图' :
                       rec.chartType === 'area' ? '面积图' :
                       rec.chartType === 'radar' ? '雷达图' : rec.chartType}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-2">{rec.reason}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>X: {rec.xField}</span>
                      {rec.yField && <><ArrowRight className="w-3 h-3" /><span>Y: {rec.yField}</span></>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. 行动建议 */}
      {deep.actionItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-[#1890ff]" />
              行动建议
            </CardTitle>
            <CardDescription>基于分析结果的可操作建议</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {deep.actionItems.map((item, idx) => {
                const priorityStyle = item.priority === 'high' ? 'border-l-4 border-l-red-400 bg-red-50/50' :
                                      item.priority === 'medium' ? 'border-l-4 border-l-orange-400 bg-orange-50/50' : 
                                      'border-l-4 border-l-blue-400 bg-blue-50/50';
                const priorityLabel = item.priority === 'high' ? '高优' : item.priority === 'medium' ? '中优' : '低优';
                
                return (
                  <div key={idx} className={`p-4 rounded-lg border ${priorityStyle}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-xs ${
                        item.priority === 'high' ? 'text-red-600 border-red-300' :
                        item.priority === 'medium' ? 'text-orange-600 border-orange-300' : 'text-blue-600 border-blue-300'
                      }`}>
                        {priorityLabel}
                      </Badge>
                      <span className="font-medium text-sm">{item.action}</span>
                    </div>
                    <p className="text-xs text-gray-600 ml-14">{item.detail}</p>
                    <p className="text-xs text-green-600 ml-14 mt-1">预期收益: {item.expectedBenefit}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. 基础统计 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#1890ff]" />
            字段统计详情
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-gray-600">字段</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">类型</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">非空</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">唯一值</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">最小值</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">最大值</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600">均值</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">示例</th>
                </tr>
              </thead>
              <tbody>
                {analysis.fieldStats.map((stat, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-3 font-medium">{stat.field}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">
                        {stat.type === 'number' ? '数值' : stat.type === 'date' ? '日期' : '文本'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={stat.nullCount > 0 ? 'text-orange-600' : 'text-green-600'}>
                        {stat.count - stat.nullCount}/{stat.count}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">{stat.uniqueCount}</td>
                    <td className="py-2 px-3 text-right">{stat.numericStats?.min ?? '-'}</td>
                    <td className="py-2 px-3 text-right">{stat.numericStats?.max ?? '-'}</td>
                    <td className="py-2 px-3 text-right">{stat.numericStats?.mean?.toFixed(2) ?? '-'}</td>
                    <td className="py-2 px-3 text-gray-400 truncate max-w-[120px]">
                      {stat.sampleValues.slice(0, 2).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#52c41a';
  if (score >= 60) return '#faad14';
  if (score >= 40) return '#fa8c16';
  return '#f5222d';
}
