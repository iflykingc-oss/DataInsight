'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Plus,
  Trash2,
  Save,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Info,
  BookOpen,
  ChevronRight,
  Sparkles,
  Gauge,
  Filter,
  Search,
  Copy,
  Zap,
} from 'lucide-react';
import {
  PRESET_METRICS,
  SCENARIO_LABELS,
  CATEGORY_LABELS,
  detectApplicableMetrics,
  computeMetric,
  formatMetricValue,
  checkThresholdStatus,
  loadCustomMetrics,
  saveCustomMetrics,
  createCustomMetric,
  type MetricDefinition,
  type ComputeContext,
} from '@/lib/metric-engine';

interface MetricManagerProps {
  data: {
    headers: string[];
    rows: Record<string, import('@/lib/data-processor').CellValue>[];
  };
  detectedScenario?: string;
}

export function MetricManager({ data, detectedScenario = 'general' }: MetricManagerProps) {
  const [activeTab, setActiveTab] = useState('preset');
  const [selectedScenario, setSelectedScenario] = useState(detectedScenario);
  const [searchQuery, setSearchQuery] = useState('');
  const [customMetrics, setCustomMetrics] = useState<MetricDefinition[]>([]);
  const [computedResults, setComputedResults] = useState<
    Record<string, { value: number | null; error?: string; computedAt: number }>
  >({});
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  // 创建自定义指标表单
  const [newMetricForm, setNewMetricForm] = useState({
    name: '',
    description: '',
    category: 'custom' as MetricDefinition['category'],
    formula: '',
    dependencies: [] as string[],
    unit: '',
    format: 'number' as MetricDefinition['format'],
    precision: 2,
  });

  // 加载自定义指标
  useEffect(() => {
    setCustomMetrics(loadCustomMetrics());
  }, []);

  // 计算上下文
  const computeContext = useMemo<ComputeContext>(
    () => ({
      data: {
        headers: data.headers,
        rows: data.rows,
      },
    }),
    [data]
  );

  // 检测适配的预置指标
  const applicablePresets = useMemo(() => {
    return detectApplicableMetrics(data.headers, []);
  }, [data.headers]);

  // 过滤预置指标
  const filteredPresets = useMemo(() => {
    let result = applicablePresets;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        m =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [applicablePresets, searchQuery]);

  // 过滤自定义指标
  const filteredCustom = useMemo(() => {
    if (!searchQuery) return customMetrics;
    const q = searchQuery.toLowerCase();
    return customMetrics.filter(
      m =>
        m.name.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.tags.some(t => t.toLowerCase().includes(q))
    );
  }, [customMetrics, searchQuery]);

  // 计算单个指标
  const computeSingleMetric = useCallback(
    (metric: MetricDefinition) => {
      const result = computeMetric(metric, computeContext);
      setComputedResults(prev => ({ ...prev, [metric.id]: { value: result, computedAt: Date.now() } }));
      return result;
    },
    [computeContext]
  );

  // 计算所有可见指标
  const computeAllVisible = useCallback(() => {
    const allMetrics =
      activeTab === 'preset' ? filteredPresets : activeTab === 'custom' ? filteredCustom : [...filteredPresets, ...filteredCustom];

    const newResults: Record<string, { value: number | null; error?: string; computedAt: number }> =
      {};
    allMetrics.forEach((metric: MetricDefinition) => {
      newResults[metric.id] = { value: computeMetric(metric, computeContext), computedAt: Date.now() };
    });
    setComputedResults(newResults);
  }, [activeTab, filteredPresets, filteredCustom, computeContext]);

  // 自动计算
  useEffect(() => {
    computeAllVisible();
  }, [computeAllVisible]);

  // 创建自定义指标
  const handleCreateMetric = useCallback(() => {
    if (!newMetricForm.name || !newMetricForm.formula) return;

    const metric = createCustomMetric(
      newMetricForm.name,
      newMetricForm.formula,
      [newMetricForm.category]
    );

    const updated = [...customMetrics, metric];
    setCustomMetrics(updated);
    saveCustomMetrics(updated);
    setShowCreateDialog(false);
    setNewMetricForm({
      name: '',
      description: '',
      category: 'custom',
      formula: '',
      dependencies: [],
      unit: '',
      format: 'number',
      precision: 2,
    });
  }, [newMetricForm, customMetrics]);

  // 删除自定义指标
  const handleDeleteMetric = useCallback(
    (id: string) => {
      const updated = customMetrics.filter(m => m.id !== id);
      setCustomMetrics(updated);
      saveCustomMetrics(updated);
      setComputedResults(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [customMetrics]
  );

  // 查看指标详情
  const handleViewDetail = useCallback(
    (metric: MetricDefinition) => {
      if (!computedResults[metric.id]) {
        computeSingleMetric(metric);
      }
      setSelectedMetric(metric);
      setShowDetailDialog(true);
    },
    [computedResults, computeSingleMetric]
  );

  // 复制公式
  const handleCopyFormula = useCallback((formula: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(formula);
    }
  }, []);

  // 渲染指标卡片
  const renderMetricCard = (metric: MetricDefinition, showActions = true) => {
    const result = computedResults[metric.id];
    const value = result?.value ?? null;
    const error = result?.error;
    const categoryLabel = CATEGORY_LABELS[metric.category] || CATEGORY_LABELS.custom;

    let thresholdStatus: 'normal' | 'warning' | 'critical' | 'success' = 'normal';
    let thresholdMessage: string | undefined;
    if (value !== null && metric.thresholds) {
      thresholdStatus = checkThresholdStatus(value, metric);
      if (thresholdStatus === 'success') thresholdMessage = '达标';
      else if (thresholdStatus === 'warning') thresholdMessage = '预警';
      else if (thresholdStatus === 'critical') thresholdMessage = '危急';
    }

    return (
      <Card
        key={metric.id}
        className="group hover:shadow-md transition-shadow cursor-pointer border-border/60"
        onClick={() => handleViewDetail(metric)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{categoryLabel}</Badge>
              {metric.isPreset && (
                <Badge variant="outline" className="text-xs">
                  <BookOpen className="w-3 h-3 mr-1" />
                  预置
                </Badge>
              )}
            </div>
            {showActions && !metric.isPreset && (
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteMetric(metric.id);
                }}
              >
                <Trash2 className="w-3 h-3 text-destructive" />
              </Button>
            )}
          </div>

          <h4 className="font-semibold text-sm mb-1">{metric.name}</h4>
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{metric.description}</p>

          <div className="flex items-end justify-between">
            <div>
              {error ? (
                <span className="text-xs text-destructive">{error}</span>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {formatMetricValue(value, metric)}
                  </span>
                </div>
              )}
            </div>

            {thresholdStatus !== 'normal' && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge
                      variant={
                        thresholdStatus === 'critical'
                          ? 'destructive'
                          : thresholdStatus === 'warning'
                            ? 'secondary'
                            : 'default'
                      }
                      className="text-xs"
                    >
                      {thresholdStatus === 'critical' && (
                        <AlertTriangle className="w-3 h-3 mr-1" />
                      )}
                      {thresholdStatus === 'success' && (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      )}
                      {thresholdMessage}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{thresholdMessage}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="mt-2 flex items-center gap-1 flex-wrap">
            {metric.tags.map(tag => (
              <span key={tag} className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 场景选项
  const scenarioOptions = Object.entries(SCENARIO_LABELS).map(([key, label]) => ({
    value: key,
    label,
  }));

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="w-6 h-6 text-primary" />
            指标管理中心
          </h2>
          <p className="text-muted-foreground mt-1">预置指标库 + 自定义指标，统一管理和计算</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={computeAllVisible}>
            <Zap className="w-4 h-4 mr-1" />
            全部计算
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-1" />
            自定义指标
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索指标名称、标签..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedScenario} onValueChange={setSelectedScenario}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue placeholder="选择场景" />
          </SelectTrigger>
          <SelectContent>
            {scenarioOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{applicablePresets.length}</div>
            <div className="text-xs text-muted-foreground">适配预置指标</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{customMetrics.length}</div>
            <div className="text-xs text-muted-foreground">自定义指标</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {Object.values(computedResults).filter(r => r.value !== null && !r.error).length}
            </div>
            <div className="text-xs text-muted-foreground">成功计算</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-destructive">
              {Object.values(computedResults).filter(r => r.error).length}
            </div>
            <div className="text-xs text-muted-foreground">计算异常</div>
          </CardContent>
        </Card>
      </div>

      {/* 指标列表 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="preset">
            <BookOpen className="w-4 h-4 mr-1" />
            预置指标 ({filteredPresets.length})
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Sparkles className="w-4 h-4 mr-1" />
            自定义指标 ({filteredCustom.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            <Layers className="w-4 h-4 mr-1" />
            全部 ({filteredPresets.length + filteredCustom.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="preset" className="mt-4">
          {filteredPresets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>当前场景暂无适配的预置指标</p>
              <p className="text-sm">尝试切换其他场景或上传包含更多字段的数据</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPresets.map(metric => renderMetricCard(metric, false))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          {filteredCustom.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>暂无自定义指标</p>
              <Button className="mt-3" size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                创建第一个自定义指标
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustom.map(metric => renderMetricCard(metric, true))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...filteredPresets, ...filteredCustom].map(metric => renderMetricCard(metric, !metric.isPreset))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 创建自定义指标对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              创建自定义指标
            </DialogTitle>
            <DialogDescription>通过公式定义您自己的业务指标</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">指标名称</label>
              <Input
                placeholder="例如：客户终身价值"
                value={newMetricForm.name}
                onChange={e => setNewMetricForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">描述</label>
              <Input
                placeholder="简要说明指标的业务含义"
                value={newMetricForm.description}
                onChange={e => setNewMetricForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">分类</label>
                <Select
                  value={newMetricForm.category}
                  onValueChange={(v: MetricDefinition['category']) =>
                    setNewMetricForm(prev => ({ ...prev, category: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kpi">核心KPI</SelectItem>
                    <SelectItem value="process">过程指标</SelectItem>
                    <SelectItem value="composite">复合指标</SelectItem>
                    <SelectItem value="trend">趋势指标</SelectItem>
                    <SelectItem value="custom">自定义</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">显示格式</label>
                <Select
                  value={newMetricForm.format || 'number'}
                  onValueChange={(v: string) =>
                    setNewMetricForm(prev => ({ ...prev, format: v as MetricDefinition['format'] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="number">数值</SelectItem>
                    <SelectItem value="percent">百分比</SelectItem>
                    <SelectItem value="currency">货币</SelectItem>
                    <SelectItem value="ratio">比率</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">计算公式</label>
              <div className="relative">
                <Input
                  placeholder="例如：SUM(销售额) / COUNT(客户ID)"
                  value={newMetricForm.formula}
                  onChange={e => setNewMetricForm(prev => ({ ...prev, formula: e.target.value }))}
                  className="font-mono"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                支持：SUM, AVG, COUNT, COUNT_DISTINCT, MAX, MIN, MEDIAN 及四则运算
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">依赖字段</label>
              <div className="flex flex-wrap gap-2">
                {data.headers.map(h => (
                  <Badge
                    key={h}
                    variant={newMetricForm.dependencies.includes(h) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setNewMetricForm(prev => ({
                        ...prev,
                        dependencies: prev.dependencies.includes(h)
                          ? prev.dependencies.filter(d => d !== h)
                          : [...prev.dependencies, h],
                      }));
                    }}
                  >
                    {h}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">单位</label>
                <Input
                  placeholder="例如：元、人、%"
                  value={newMetricForm.unit}
                  onChange={e => setNewMetricForm(prev => ({ ...prev, unit: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">小数位数</label>
                <Input
                  type="number"
                  min={0}
                  max={10}
                  value={newMetricForm.precision}
                  onChange={e =>
                    setNewMetricForm(prev => ({ ...prev, precision: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>

            {/* 公式预览 */}
            {newMetricForm.formula && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">公式预览</div>
                <code className="text-sm font-mono">{newMetricForm.formula}</code>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleCreateMetric}
              disabled={!newMetricForm.name || !newMetricForm.formula}
            >
              <Save className="w-4 h-4 mr-1" />
              创建指标
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 指标详情对话框 */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedMetric?.name}</DialogTitle>
            <DialogDescription>{selectedMetric?.description}</DialogDescription>
          </DialogHeader>

          {selectedMetric && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge>{CATEGORY_LABELS[selectedMetric.category] || CATEGORY_LABELS.custom}</Badge>
                {selectedMetric.isPreset && (
                  <Badge variant="outline">
                    <BookOpen className="w-3 h-3 mr-1" />
                    预置
                  </Badge>
                )}
              </div>

              <div className="bg-muted p-4 rounded-lg text-center">
                <div className="text-4xl font-bold">
                  {formatMetricValue(
                    computedResults[selectedMetric.id]?.value ?? null,
                    selectedMetric
                  )}
                </div>
                {computedResults[selectedMetric.id]?.error && (
                  <div className="text-sm text-destructive mt-2">
                    {computedResults[selectedMetric.id]?.error}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                  <Calculator className="w-4 h-4" />
                  计算公式
                </h4>
                <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
                  <code className="text-sm font-mono">{selectedMetric.formula}</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyFormula(selectedMetric.formula)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">依赖字段</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedMetric.dependencies.map(dep => (
                    <Badge key={dep} variant="secondary">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </div>

              {selectedMetric.thresholds && (
                <div>
                  <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    阈值配置
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedMetric.thresholds.target !== undefined && (
                      <div className="bg-green-50 p-2 rounded text-center">
                        <div className="text-xs text-muted-foreground">目标值</div>
                        <div className="font-semibold">{selectedMetric.thresholds.target}</div>
                      </div>
                    )}
                    {selectedMetric.thresholds.warning !== undefined && (
                      <div className="bg-amber-50 p-2 rounded text-center">
                        <div className="text-xs text-muted-foreground">警告值</div>
                        <div className="font-semibold">{selectedMetric.thresholds.warning}</div>
                      </div>
                    )}
                    {selectedMetric.thresholds.critical !== undefined && (
                      <div className="bg-red-50 p-2 rounded text-center">
                        <div className="text-xs text-muted-foreground">临界值</div>
                        <div className="font-semibold">{selectedMetric.thresholds.critical}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {selectedMetric.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
