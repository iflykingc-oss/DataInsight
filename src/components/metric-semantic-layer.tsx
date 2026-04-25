'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calculator,
  Sparkles,
  Save,
  Trash2,
  Edit2,
  Play,
  Plus,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  BarChart3,
  Database,
  Target,
  Lightbulb,
  Loader2,
  Copy,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

// ============================================
// 类型定义
// ============================================

// 指标类型
type MetricType = 'sum' | 'avg' | 'count' | 'count_distinct' | 'min' | 'max' | 'custom';

// 指标定义
export interface MetricDefinition {
  id: string;
  name: string;                    // 指标名称
  description: string;             // 业务描述
  type: MetricType;                // 聚合类型
  formula?: string;                // 自定义公式
  field: string;                   // 计算字段
  dataSource?: string;             // 数据源
  tags: string[];                  // 标签分类
  createdAt: number;
  updatedAt: number;
}

// 指标计算结果
interface MetricResult {
  metric: MetricDefinition;
  value: number;
  formattedValue: string;
  dataContext: {
    totalRows: number;
    nullCount: number;
    sampleSize: number;
  };
}

// 预设指标模板
const PRESET_METRICS: Omit<MetricDefinition, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '总计',
    description: '计算指定字段的总和',
    type: 'sum',
    field: '',
    tags: ['基础']
  },
  {
    name: '平均值',
    description: '计算指定字段的平均值',
    type: 'avg',
    field: '',
    tags: ['基础']
  },
  {
    name: '计数',
    description: '计算记录总数',
    type: 'count',
    field: '',
    tags: ['基础']
  },
  {
    name: '去重计数',
    description: '计算指定字段的去重数量',
    type: 'count_distinct',
    field: '',
    tags: ['基础']
  },
  {
    name: '最大值',
    description: '获取指定字段的最大值',
    type: 'max',
    field: '',
    tags: ['基础']
  },
  {
    name: '最小值',
    description: '获取指定字段的最小值',
    type: 'min',
    field: '',
    tags: ['基础']
  }
];

// 聚合函数映射
const AGGREGATE_FUNCTIONS: Record<string, { label: string; icon: string; example: string }> = {
  sum: { label: '求和', icon: 'Σ', example: 'Sum(销售额)' },
  avg: { label: '平均值', icon: 'μ', example: 'Avg(评分)' },
  count: { label: '计数', icon: 'N', example: 'Count(*)' },
  count_distinct: { label: '去重计数', icon: 'U', example: 'Count(DISTINCT 用户ID)' },
  min: { label: '最小值', icon: '↓', example: 'Min(价格)' },
  max: { label: '最大值', icon: '↑', example: 'Max(日期)' },
  custom: { label: '自定义', icon: '?', example: '自定义公式' }
};

// 本地存储
const METRICS_STORAGE_KEY = 'datainsight_metrics';

interface MetricSemanticLayerProps {
  data: ParsedData;
  fieldStats: FieldStat[];
  onMetricUse?: (metric: MetricDefinition, result: number) => void;
  className?: string;
}

export function MetricSemanticLayer({
  data,
  fieldStats,
  onMetricUse,
  className
}: MetricSemanticLayerProps) {
  // 状态
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [editingMetric, setEditingMetric] = useState<MetricDefinition | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [activeTab, setActiveTab] = useState('metrics');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [metricResults, setMetricResults] = useState<Map<string, MetricResult>>(new Map());

  // 加载保存的指标
  useEffect(() => {
    const saved = localStorage.getItem(METRICS_STORAGE_KEY);
    if (saved) {
      try {
        setMetrics(JSON.parse(saved));
      } catch {
        console.error('Failed to load metrics');
      }
    }
  }, []);

  // 保存指标
  useEffect(() => {
    if (metrics.length > 0) {
      localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(metrics));
    }
  }, [metrics]);

  // 计算指标值
  const calculateMetric = useCallback((metric: MetricDefinition): number => {
    const values = data.rows
      .map(row => row[metric.field])
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => Number(v));

    if (values.length === 0) return 0;

    switch (metric.type) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'count':
        return data.rows.length;
      case 'count_distinct':
        return new Set(data.rows.map(row => row[metric.field])).size;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'custom':
        // 解析自定义公式（简化版）
        if (metric.formula) {
          try {
            // 这里可以解析更复杂的公式
            return evaluateCustomFormula(metric.formula, data.rows, metric.field);
          } catch {
            return 0;
          }
        }
        return 0;
      default:
        return 0;
    }
  }, [data]);

  // 简化公式求值
  const evaluateCustomFormula = (formula: string, rows: Record<string, unknown>[], field: string): number => {
    // 支持简单表达式如: "销售额 * 1.1", "利润 / 销售额 * 100"
    const values = rows.map(r => Number(r[field])).filter(v => !isNaN(v));
    const sum = values.reduce((a, b) => a + b, 0);
    
    if (formula.includes('*')) {
      const match = formula.match(/(\w+)\s*\*\s*([\d.]+)/);
      if (match) return sum * Number(match[2]);
    }
    if (formula.includes('/')) {
      const match = formula.match(/(\w+)\s*\/\s*(\w+)/);
      if (match) {
        const field1 = rows.map(r => Number(r[match[1]])).filter(v => !isNaN(v)).reduce((a, b) => a + b, 0);
        const field2 = rows.map(r => Number(r[match[2]])).filter(v => !isNaN(v)).reduce((a, b) => a + b, 0);
        return field2 !== 0 ? field1 / field2 : 0;
      }
    }
    return sum;
  };

  // 格式化数值
  const formatValue = (value: number, type: MetricType): string => {
    switch (type) {
      case 'avg':
        return value.toFixed(2);
      case 'count':
      case 'count_distinct':
        return value.toLocaleString();
      default:
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
    }
  };

  // 创建新指标
  const handleCreateMetric = () => {
    const numericFields = fieldStats.filter(f => f.type === 'number');
    setEditingMetric({
      id: `metric-${Date.now()}`,
      name: '',
      description: '',
      type: 'sum',
      field: numericFields[0]?.field || '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  // 使用预设创建
  const handleCreateFromPreset = (preset: typeof PRESET_METRICS[0]) => {
    const numericFields = fieldStats.filter(f => f.type === 'number');
    setEditingMetric({
      id: `metric-${Date.now()}`,
      name: preset.name,
      description: preset.description,
      type: preset.type,
      field: numericFields[0]?.field || '',
      tags: preset.tags,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  // 保存指标
  const handleSaveMetric = () => {
    if (!editingMetric) return;
    if (!editingMetric.name || !editingMetric.field) {
      return; // 验证
    }

    const updated = { ...editingMetric, updatedAt: Date.now() };
    
    if (isCreating) {
      setMetrics(prev => [...prev, updated]);
    } else {
      setMetrics(prev => prev.map(m => m.id === editingMetric.id ? updated : m));
    }

    // 计算并缓存结果
    const result = calculateMetric(updated);
    const metricResult: MetricResult = {
      metric: updated,
      value: result,
      formattedValue: formatValue(result, updated.type),
      dataContext: {
        totalRows: data.rows.length,
        nullCount: data.rows.filter(r => r[updated.field] === null || r[updated.field] === '').length,
        sampleSize: Math.min(100, data.rows.length)
      }
    };
    setMetricResults(prev => new Map(prev).set(updated.id, metricResult));

    setIsDialogOpen(false);
    setEditingMetric(null);
    onMetricUse?.(updated, result);
  };

  // 删除指标
  const handleDeleteMetric = (id: string) => {
    setMetrics(prev => prev.filter(m => m.id !== id));
    setMetricResults(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  // AI 生成指标
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) return;

    setIsAIGenerating(true);

    try {
      // 模拟 AI 生成指标逻辑
      const generated = await generateMetricFromPrompt(aiPrompt, fieldStats, data);
      
      setMetrics(prev => [...prev, ...generated]);
      
      // 计算每个生成指标的结果
      generated.forEach(metric => {
        const result = calculateMetric(metric);
        const metricResult: MetricResult = {
          metric,
          value: result,
          formattedValue: formatValue(result, metric.type),
          dataContext: {
            totalRows: data.rows.length,
            nullCount: data.rows.filter(r => r[metric.field] === null || r[metric.field] === '').length,
            sampleSize: Math.min(100, data.rows.length)
          }
        };
        setMetricResults(prev => new Map(prev).set(metric.id, metricResult));
      });

      setAiPrompt('');
      setActiveTab('metrics');
    } catch (error) {
      console.error('AI generation failed:', error);
    } finally {
      setIsAIGenerating(false);
    }
  };

  // AI 生成指标的核心逻辑
  const generateMetricFromPrompt = async (
    prompt: string,
    fieldStats: FieldStat[],
    data: ParsedData
  ): Promise<MetricDefinition[]> => {
    const numericFields = fieldStats.filter(f => f.type === 'number');
    const generated: MetricDefinition[] = [];
    
    const promptLower = prompt.toLowerCase();

    // 分析意图
    if (promptLower.includes('总') || promptLower.includes('sum') || promptLower.includes('合计')) {
      numericFields.forEach(field => {
        generated.push({
          id: `metric-ai-${Date.now()}-${field.field}`,
          name: `${field.field}总计`,
          description: `AI生成: 计算${field.field}的总和`,
          type: 'sum',
          field: field.field,
          tags: ['AI生成', '求和'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });
    }

    if (promptLower.includes('平均') || promptLower.includes('avg') || promptLower.includes('均')) {
      numericFields.forEach(field => {
        generated.push({
          id: `metric-ai-${Date.now()}-avg-${field.field}`,
          name: `${field.field}平均值`,
          description: `AI生成: 计算${field.field}的平均值`,
          type: 'avg',
          field: field.field,
          tags: ['AI生成', '平均'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      });
    }

    if (promptLower.includes('增长') || promptLower.includes('同比') || promptLower.includes('环比')) {
      const dateFields = fieldStats.filter(f => f.type === 'date');
      if (dateFields.length > 0 && numericFields.length > 0) {
        generated.push({
          id: `metric-ai-${Date.now()}-growth`,
          name: `${numericFields[0].field}增长率`,
          description: 'AI生成: 计算指标的环比增长率',
          type: 'custom',
          formula: '增长率 = (本期 - 上期) / 上期 * 100',
          field: numericFields[0].field,
          tags: ['AI生成', '增长分析'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    if (promptLower.includes('占比') || promptLower.includes('比例') || promptLower.includes('percent')) {
      if (numericFields.length >= 2) {
        generated.push({
          id: `metric-ai-${Date.now()}-ratio`,
          name: `${numericFields[0].field}占${numericFields[1].field}比例`,
          description: 'AI生成: 计算两个指标的比例',
          type: 'custom',
          formula: `${numericFields[0].field} / ${numericFields[1].field}`,
          field: numericFields[0].field,
          tags: ['AI生成', '占比分析'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
    }

    // 如果没有匹配，返回默认推荐
    if (generated.length === 0 && numericFields.length > 0) {
      generated.push({
        id: `metric-ai-${Date.now()}-default`,
        name: `${numericFields[0].field}求和`,
        description: `AI生成: ${prompt}`,
        type: 'sum',
        field: numericFields[0].field,
        tags: ['AI生成'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    // 模拟 API 延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    return generated;
  };

  // 复制指标 SQL
  const handleCopySQL = (metric: MetricDefinition) => {
    const field = metric.field;
    let sql = '';
    
    switch (metric.type) {
      case 'sum':
        sql = `SUM(${field})`;
        break;
      case 'avg':
        sql = `AVG(${field})`;
        break;
      case 'count':
        sql = `COUNT(*)`;
        break;
      case 'count_distinct':
        sql = `COUNT(DISTINCT ${field})`;
        break;
      case 'min':
        sql = `MIN(${field})`;
        break;
      case 'max':
        sql = `MAX(${field})`;
        break;
      case 'custom':
        sql = metric.formula || field;
        break;
    }

    navigator.clipboard.writeText(sql);
  };

  // 获取聚合函数图标
  const getAggIcon = (type: MetricType) => {
    const func = AGGREGATE_FUNCTIONS[type];
    return <span className="text-sm font-mono">{func?.icon || '?'}</span>;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-purple-500" />
          <h3 className="font-medium">指标语义层</h3>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={handleCreateMetric}>
              <Plus className="w-4 h-4 mr-1" />
              新建指标
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {isCreating ? '创建新指标' : '编辑指标'}
              </DialogTitle>
              <DialogDescription>
                定义业务指标，统一数据口径
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* 快速模板 */}
              {isCreating && (
                <div className="space-y-2">
                  <Label className="text-xs text-gray-500">快速创建</Label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_METRICS.slice(0, 4).map((preset, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateFromPreset(preset)}
                      >
                        {getAggIcon(preset.type)}
                        <span className="ml-1">{preset.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* 表单 */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="metric-name">指标名称 *</Label>
                  <Input
                    id="metric-name"
                    placeholder="如：月活跃用户数、季度销售额"
                    value={editingMetric?.name || ''}
                    onChange={e => setEditingMetric(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metric-desc">业务描述</Label>
                  <Textarea
                    id="metric-desc"
                    placeholder="描述这个指标的业务含义..."
                    rows={2}
                    value={editingMetric?.description || ''}
                    onChange={e => setEditingMetric(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>聚合函数 *</Label>
                    <Select
                      value={editingMetric?.type || 'sum'}
                      onValueChange={v => setEditingMetric(prev => prev ? { ...prev, type: v as MetricType } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(AGGREGATE_FUNCTIONS).map(([key, func]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-sm">{func.icon}</span>
                              {func.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>计算字段 *</Label>
                    <Select
                      value={editingMetric?.field || ''}
                      onValueChange={v => setEditingMetric(prev => prev ? { ...prev, field: v } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择字段" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldStats.map(f => (
                          <SelectItem key={f.field} value={f.field}>
                            {f.field}
                            {f.type === 'number' && <span className="ml-2 text-gray-400">数值</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* 自定义公式 */}
                {editingMetric?.type === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="formula">计算公式</Label>
                    <Input
                      id="formula"
                      placeholder="如: 销售额 * 1.1 或 利润 / 销售额 * 100"
                      value={editingMetric.formula || ''}
                      onChange={e => setEditingMetric(prev => prev ? { ...prev, formula: e.target.value } : null)}
                    />
                    <p className="text-xs text-gray-500">
                      支持 + - * / 运算符，字段名用花括号包裹
                    </p>
                  </div>
                )}

                {/* 预览 */}
                {editingMetric?.name && editingMetric?.field && (
                  <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 text-purple-700">
                      <Info className="w-4 h-4" />
                      <span className="text-sm font-medium">预览</span>
                    </div>
                    <p className="mt-1 text-sm text-purple-600">
                      {AGGREGATE_FUNCTIONS[editingMetric.type]?.example?.replace(/\w+/, editingMetric.field) || editingMetric.field}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleSaveMetric}>
                <Save className="w-4 h-4 mr-2" />
                保存指标
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="metrics" className="flex items-center gap-1">
            <Calculator className="w-4 h-4" />
            我的指标
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            AI 生成
          </TabsTrigger>
          <TabsTrigger value="guide" className="flex items-center gap-1">
            <Lightbulb className="w-4 h-4" />
            使用指南
          </TabsTrigger>
        </TabsList>

        {/* 指标列表 */}
        <TabsContent value="metrics" className="mt-4">
          <div className="grid gap-3">
            {metrics.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <Calculator className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">暂未创建任何指标</p>
                  <p className="text-sm text-gray-400 mt-1">点击上方按钮创建第一个指标</p>
                </CardContent>
              </Card>
            ) : (
              metrics.map(metric => {
                const result = metricResults.get(metric.id);
                
                return (
                  <Card key={metric.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              'p-1.5 rounded-lg',
                              metric.type === 'custom' ? 'bg-purple-100' : 'bg-blue-100'
                            )}>
                              {getAggIcon(metric.type)}
                            </div>
                            <div>
                              <h4 className="font-medium">{metric.name}</h4>
                              <p className="text-sm text-gray-500">{metric.description}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {AGGREGATE_FUNCTIONS[metric.type]?.label}
                            </Badge>
                            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                              {metric.field}
                            </code>
                            {metric.tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* 计算结果 */}
                        <div className="text-right mr-4">
                          <div className="text-2xl font-bold text-purple-600">
                            {result?.formattedValue || '--'}
                          </div>
                          {result && (
                            <p className="text-xs text-gray-400">
                              基于 {result.dataContext.totalRows.toLocaleString()} 条数据
                            </p>
                          )}
                        </div>

                        {/* 操作 */}
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleCopySQL(metric)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>复制 SQL</TooltipContent>
                          </Tooltip>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMetric(metric.id)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* AI 生成 */}
        <TabsContent value="ai" className="mt-4">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI 智能生成指标
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>描述你的需求</Label>
                <Textarea
                  placeholder="例如：
- 计算所有数值字段的总和
- 生成平均值的指标
- 创建销售额增长率指标
- 生成各项占比分析"
                  rows={4}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAIGenerate}
                disabled={!aiPrompt.trim() || isAIGenerating}
              >
                {isAIGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 正在分析并生成指标...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    智能生成指标
                  </>
                )}
              </Button>

              {/* 提示示例 */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">试试这样说：</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    '计算所有金额字段的总计',
                    '生成各项的平均值',
                    '创建增长率分析指标',
                    '计算占比和比例指标'
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setAiPrompt(example)}
                      className="text-xs px-3 py-1.5 bg-white border rounded-full hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 使用指南 */}
        <TabsContent value="guide" className="mt-4">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">什么是指标语义层？</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      指标语义层是将复杂的技术数据转换为统一、易于理解的业务术语的中间层。
                      定义一次，处处使用，确保数据口径一致。
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">使用场景</h4>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1 list-disc list-inside">
                      <li>统一{'"'}月活用户{'"'}的口径定义</li>
                      <li>定义{'"'}转化率{'"'}等复合指标</li>
                      <li>标准化各部门的数据报表</li>
                      <li>快速复用已计算的指标</li>
                    </ul>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Database className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">最佳实践</h4>
                    <ul className="text-sm text-gray-600 mt-1 space-y-1 list-disc list-inside">
                      <li>使用业务语言命名（如{'"'}订单量{'"'}而非{'"'}count_orders{'"'}）</li>
                      <li>添加清晰的描述，方便团队理解</li>
                      <li>使用标签分类管理大量指标</li>
                      <li>定期审核指标定义，确保准确性</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default MetricSemanticLayer;
