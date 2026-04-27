'use client';

import React, { useState, useCallback} from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Lightbulb,
  ArrowRight,
  Loader2,
  Plus,
  Search,
  BarChart3,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
  Layers,
  RefreshCw,
  MessageSquare,
  BookOpen,
} from 'lucide-react';

// 业务场景配置
const BUSINESS_SCENARIOS = [
  { id: 'retail', label: '零售/销售', icon: '🛒', color: 'bg-orange-100 text-orange-700', keywords: ['销售', '门店', '商品', '库存', '采购', '营收'] },
  { id: 'ecommerce', label: '电商', icon: '🛍️', color: 'bg-purple-100 text-purple-700', keywords: ['订单', '转化率', '流量', 'GMV', '退款'] },
  { id: 'user_operation', label: '用户运营', icon: '👥', color: 'bg-blue-100 text-blue-700', keywords: ['用户', '会员', 'DAU', '留存', 'ARPU'] },
  { id: 'finance', label: '财务/成本', icon: '💰', color: 'bg-green-100 text-green-700', keywords: ['成本', '利润', '预算', '收入', 'ROI'] },
  { id: 'hr', label: '人力/组织', icon: '👔', color: 'bg-indigo-100 text-indigo-700', keywords: ['员工', '招聘', '绩效', '考勤', '人效'] },
  { id: 'marketing', label: '市场营销', icon: '📢', color: 'bg-pink-100 text-pink-700', keywords: ['营销', '推广', '广告', 'ROI', '曝光'] },
  { id: 'supply_chain', label: '供应链/库存', icon: '📦', color: 'bg-amber-100 text-amber-700', keywords: ['库存', '周转', '补货', '物流'] },
  { id: 'education', label: '教育/培训', icon: '🎓', color: 'bg-cyan-100 text-cyan-700', keywords: ['学员', '课程', '续班', '师资'] },
  { id: 'general', label: '通用业务', icon: '📊', color: 'bg-gray-100 text-gray-700', keywords: [] },
];

// 指标类别配置
const METRIC_CATEGORIES = {
  kpi: { label: '核心KPI', color: 'bg-red-100 text-red-700', icon: Target },
  process: { label: '过程指标', color: 'bg-blue-100 text-blue-700', icon: Activity },
  composite: { label: '复合指标', color: 'bg-purple-100 text-purple-700', icon: Layers },
  trend: { label: '趋势指标', color: 'bg-green-100 text-green-700', icon: TrendingUp },
};

// AI 生成的指标结构
interface MetricItem {
  name: string;
  expression: string;
  category: 'kpi' | 'process' | 'composite' | 'trend';
  description: string;
  businessValue: string;
  businessMeaning?: string;
  dataQuality?: '高' | '中' | '低';
  dataQualityReason?: string;
  usageSuggestion?: string;
  alertThreshold?: string;
  value?: number | string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
}

// 指标解读对话记录
interface InsightMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MetricSemanticLayerProps {
  data: {
    headers: string[];
    rows: Record<string, string | number>[];
  };
  fieldStats: Array<{
    field: string;
    type: string;
    count: number;
    nullCount: number;
    uniqueCount: number;
    sampleValues?: unknown[];
    numericStats?: {
      min: number;
      max: number;
      mean: number;
    };
    min?: number;
    max?: number;
    completeness?: number;
  }>;
  modelConfig?: { apiKey: string; baseUrl: string; model: string } | null;
}

export function MetricSemanticLayer({ data, fieldStats, modelConfig }: MetricSemanticLayerProps) {
  const [businessScenario, setBusinessScenario] = useState<string>('general');
  const [customDescription, setCustomDescription] = useState('');
  const [generatedMetrics, setGeneratedMetrics] = useState<MetricItem[]>([]);
  const [detectedScenario, setDetectedScenario] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<MetricItem | null>(null);
  const [showInsightDialog, setShowInsightDialog] = useState(false);
  const [insightMessages, setInsightMessages] = useState<InsightMessage[]>([]);
  const [insightInput, setInsightInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('generate');
  const [savedMetrics, setSavedMetrics] = useState<MetricItem[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    kpi: true,
    process: true,
    composite: false,
    trend: false,
  });

  // 计算选中业务场景的数据样本
  const getSampleRows = () => data.rows.slice(0, 5);

  // 使用 AI 生成指标
  const handleGenerateMetrics = useCallback(async () => {
    if (!data || data.rows.length === 0) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/metric-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: data.headers,
          rows: data.rows,
          userDescription: customDescription,
          fieldStats,
          modelConfig,
        }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        const metrics: MetricItem[] = result.data.metrics || [];
        setGeneratedMetrics(metrics);
        setDetectedScenario(result.data.detectedScenario || []);

        if (result.data.summary) {
          setInsightMessages([{
            role: 'assistant',
            content: `已识别您的业务场景：${(result.data.detectedScenario || []).join('、')}。\n\n这是为您设计的指标体系总览：\n${result.data.summary}`,
          }]);
        }
      }
    } catch (error) {
      console.error('Failed to generate metrics:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [data, customDescription, fieldStats]);

  // 自动检测业务场景
  const autoDetectScenario = useCallback(() => {
    const combined = data.headers.join(' ').toLowerCase();
    const detected: string[] = [];

    BUSINESS_SCENARIOS.forEach(scenario => {
      if (scenario.id === 'general') return;
      const matchCount = scenario.keywords.filter(kw =>
        combined.includes(kw.toLowerCase())
      ).length;
      if (matchCount >= 1) {
        detected.push(scenario.label);
      }
    });

    return detected.length > 0 ? detected : ['通用业务'];
  }, [data.headers]);

  // 一键使用推荐场景
  const handleUseRecommended = useCallback(() => {
    const detected = autoDetectScenario();
    const firstMatch = BUSINESS_SCENARIOS.find(s => detected.includes(s.label));
    if (firstMatch) {
      setBusinessScenario(firstMatch.id);
    }
    setDetectedScenario(detected);
  }, [autoDetectScenario]);

  // 打开指标解读对话
  const handleOpenInsight = (metric: MetricItem) => {
    setSelectedMetric(metric);
    setInsightMessages([{
      role: 'assistant',
      content: `让我为您深入解读「${metric.name}」这个指标：\n\n📌 **计算公式**: ${metric.expression}\n\n📌 **业务含义**: ${metric.businessMeaning || metric.description}\n\n您可以继续追问，例如：\n- "这个指标最近有什么变化？"\n- "有哪些因素影响了这个指标？"\n- "如何提升这个指标？"\n- "这个指标的行业标准是多少？"`,
    }]);
    setShowInsightDialog(true);
  };

  // 发送指标解读对话
  const handleSendInsight = useCallback(async () => {
    if (!insightInput.trim() || !selectedMetric) return;

    const userMsg: InsightMessage = { role: 'user', content: insightInput };
    setInsightMessages(prev => [...prev, userMsg]);
    setInsightInput('');
    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/metric-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          headers: data.headers,
          rows: data.rows,
          userDescription: `请解读指标「${selectedMetric.name}」: ${selectedMetric.expression}\n\n用户问题: ${insightInput}`,
          fieldStats,
          mode: 'insight',
        }),
      });

      const result = await response.json();
      if (result.success && result.data?.summary) {
        setInsightMessages(prev => [...prev, {
          role: 'assistant',
          content: result.data.summary,
        }]);
      } else {
        setInsightMessages(prev => [...prev, {
          role: 'assistant',
          content: '抱歉，我无法完成这次解读，请稍后重试。',
        }]);
      }
    } catch {
      setInsightMessages(prev => [...prev, {
        role: 'assistant',
        content: '网络错误，请检查连接后重试。',
      }]);
    } finally {
      setIsAnalyzing(false);
    }
  }, [insightInput, selectedMetric, data, fieldStats]);

  // 保存指标
  const handleSaveMetric = (metric: MetricItem) => {
    if (!savedMetrics.find(m => m.name === metric.name)) {
      setSavedMetrics(prev => [...prev, metric]);
    }
  };

  // 移除已保存的指标
  const handleRemoveMetric = (metricName: string) => {
    setSavedMetrics(prev => prev.filter(m => m.name !== metricName));
  };

  // 按类别分组指标
  const groupedMetrics = generatedMetrics.reduce((acc, metric) => {
    const cat = metric.category || 'kpi';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(metric);
    return acc;
  }, {} as Record<string, MetricItem[]>);

  // 计算指标的实际值（基于真实数据）
  const calculateMetricValue = (metric: MetricItem): { value: string; trend: 'up' | 'down' | 'stable' } => {
    const sample = getSampleRows();
    if (sample.length === 0) return { value: 'N/A', trend: 'stable' };

    try {
      const hasSum = metric.expression.toLowerCase().includes('sum') || metric.expression.toLowerCase().includes('总');
      const hasAvg = metric.expression.toLowerCase().includes('avg') || metric.expression.toLowerCase().includes('均');
      const hasCount = metric.expression.toLowerCase().includes('count') || metric.expression.toLowerCase().includes('数');

      let total = 0;
      const numericFields = data.headers.filter(h =>
        fieldStats?.find(s => s.field === h && s.type === 'number')
      );

      if (numericFields.length > 0) {
        numericFields.forEach(f => {
          sample.forEach(row => {
            const val = Number(row[f]);
            if (!isNaN(val)) total += val;
          });
        });
      }

      // 基于数据前后半段计算真实趋势
      const half = Math.floor(sample.length / 2);
      const firstHalf = sample.slice(0, half);
      const secondHalf = sample.slice(half);
      let firstTotal = 0, secondTotal = 0;
      numericFields.forEach(f => {
        firstHalf.forEach(row => { const v = Number(row[f]); if (!isNaN(v)) firstTotal += v; });
        secondHalf.forEach(row => { const v = Number(row[f]); if (!isNaN(v)) secondTotal += v; });
      });
      const trendRatio = firstTotal > 0 ? (secondTotal - firstTotal) / firstTotal : 0;
      const trend: 'up' | 'down' | 'stable' = trendRatio > 0.05 ? 'up' : trendRatio < -0.05 ? 'down' : 'stable';

      if (hasSum) {
        return { value: total.toFixed(2), trend };
      }
      if (hasAvg) {
        const avgVal = total / (numericFields.length * sample.length);
        return { value: avgVal.toFixed(2), trend };
      }
      if (hasCount) {
        return { value: sample.length.toString(), trend };
      }

      return { value: total.toFixed(2), trend };
    } catch {
      return { value: 'N/A', trend: 'stable' };
    }
  };

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const scenarioConfig = BUSINESS_SCENARIOS.find(s => s.id === businessScenario) || BUSINESS_SCENARIOS[8];

  return (
    <div className="space-y-4">
      {/* 场景选择 + 描述输入 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI 智能指标生成
            </CardTitle>
            {detectedScenario.length > 0 && (
              <Badge variant="outline" className="text-xs">
                已识别: {detectedScenario.join('、')}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 业务场景快速选择 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              选择业务场景（可选）
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {BUSINESS_SCENARIOS.map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => setBusinessScenario(scenario.id)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    businessScenario === scenario.id
                      ? `${scenario.color} ring-2 ring-offset-1 ring-gray-300`
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-1">{scenario.icon}</span>
                  {scenario.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleUseRecommended}
              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
            >
              <Zap className="w-3 h-3" /> 使用 AI 自动识别场景
            </button>
          </div>

          {/* 业务需求描述 */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              描述您的业务需求（可选，越详细越精准）
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="例如：我想分析门店的销售业绩，包括收入、成本、毛利率、客单价等核心指标..."
                value={customDescription}
                onChange={e => setCustomDescription(e.target.value)}
                className="flex-1"
              />
              <Button
                disabled={isGenerating || data.rows.length === 0}
                onClick={handleGenerateMetrics}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-1" />
                    生成指标
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              示例：分析用户留存和转化、分析销售业绩、分析营销投放ROI...
            </p>
          </div>

          {/* 快速提示 */}
          <div className="flex flex-wrap gap-2">
            {['分析销售业绩', '用户留存分析', '营销ROI分析', '库存周转分析'].map(hint => (
              <button
                key={hint}
                onClick={() => setCustomDescription(hint)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {hint}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 生成的指标体系 */}
      {generatedMetrics.length > 0 && (
        <>
          {/* 指标体系总览 */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-500" />
                  指标体系 — {scenarioConfig.icon} {scenarioConfig.label}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={handleGenerateMetrics} disabled={isGenerating}>
                    <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                    重新生成
                  </Button>
                  {savedMetrics.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      已保存 {savedMetrics.length} 个指标
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 统计概览 */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {Object.entries(groupedMetrics).map(([cat, metrics]) => {
                  const config = METRIC_CATEGORIES[cat as keyof typeof METRIC_CATEGORIES];
                  return (
                    <div key={cat} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${config?.color || 'bg-gray-100 text-gray-600'}`}>
                          {config?.label || cat}
                        </span>
                        <span className="text-lg font-bold">{metrics.length}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {cat === 'kpi' ? '核心KPI指标' :
                         cat === 'process' ? '业务过程指标' :
                         cat === 'composite' ? '复合计算指标' : '趋势对比指标'}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* 指标分类展示 */}
              <Tabs defaultValue="all" className="space-y-3">
                <TabsList className="grid grid-cols-5 w-auto">
                  <TabsTrigger value="all">全部</TabsTrigger>
                  {Object.entries(METRIC_CATEGORIES).map(([key, config]) =>
                    groupedMetrics[key] ? (
                      <TabsTrigger key={key} value={key}>
                        {config.label} ({groupedMetrics[key].length})
                      </TabsTrigger>
                    ) : null
                  )}
                </TabsList>

                <TabsContent value="all" className="space-y-4">
                  {Object.entries(groupedMetrics).map(([cat, metrics]) => {
                    const config = METRIC_CATEGORIES[cat as keyof typeof METRIC_CATEGORIES];
                    const Icon = config?.icon || Activity;
                    return (
                      <div key={cat} className="space-y-2">
                        <button
                          onClick={() => toggleCategory(cat)}
                          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                          {expandedCategories[cat] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                          <Icon className="w-4 h-4" />
                          {config?.label}（{metrics.length}个）
                        </button>
                        {expandedCategories[cat] && (
                          <div className="grid gap-2">
                            {metrics.map((metric, idx) => (
                              <MetricCard
                                key={`${cat}-${idx}`}
                                metric={metric}
                                calculation={calculateMetricValue(metric)}
                                onOpenInsight={handleOpenInsight}
                                onSave={handleSaveMetric}
                                isSaved={savedMetrics.some(m => m.name === metric.name)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </TabsContent>

                {Object.entries(groupedMetrics).map(([cat, metrics]) => {
                  const config = METRIC_CATEGORIES[cat as keyof typeof METRIC_CATEGORIES];
                  const _Icon = config?.icon || Activity;
                  return (
                    <TabsContent key={cat} value={cat} className="space-y-2">
                      {metrics.map((metric, idx) => (
                        <MetricCard
                          key={`${cat}-${idx}`}
                          metric={metric}
                          calculation={calculateMetricValue(metric)}
                          onOpenInsight={handleOpenInsight}
                          onSave={handleSaveMetric}
                          isSaved={savedMetrics.some(m => m.name === metric.name)}
                        />
                      ))}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>

          {/* 已保存的指标 */}
          {savedMetrics.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-green-500" />
                  我的指标库（{savedMetrics.length}）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {savedMetrics.map((metric, idx) => {
                    const config = METRIC_CATEGORIES[metric.category as keyof typeof METRIC_CATEGORIES];
                    return (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={`text-xs ${config?.color || ''}`}>
                            {config?.label}
                          </Badge>
                          <div>
                            <p className="text-sm font-medium">{metric.name}</p>
                            <p className="text-xs text-gray-500 font-mono">{metric.expression}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleOpenInsight(metric)}>
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveMetric(metric.name)}>
                            ✕
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 字段参考 */}
      {data && data.headers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-500" />
              可用字段参考
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {data.headers.map((header, idx) => {
                const stats = fieldStats?.find(s => s.field === header);
                return (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded text-xs">
                    <span className="font-mono font-medium">{header}</span>
                    <Badge variant="outline" className="text-xs">
                      {stats?.type === 'number' ? '数值' : stats?.type === 'date' ? '日期' : '文本'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 指标解读 Dialog */}
      <Dialog open={showInsightDialog} onOpenChange={setShowInsightDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              指标深度解读
              {selectedMetric && (
                <Badge variant="outline" className="ml-2">
                  {selectedMetric.name}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              基于您的数据和业务场景，深入分析指标含义与业务价值
            </DialogDescription>
          </DialogHeader>

          {/* 指标基本信息 */}
          {selectedMetric && (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">计算公式：</span>
                  <code className="ml-1 bg-white px-2 py-0.5 rounded text-purple-600">{selectedMetric.expression}</code>
                </div>
                <div>
                  <span className="text-gray-500">类别：</span>
                  <Badge variant="outline" className="ml-1 text-xs">
                    {METRIC_CATEGORIES[selectedMetric.category as keyof typeof METRIC_CATEGORIES]?.label}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-gray-700">
                <span className="font-medium">业务含义：</span>
                {selectedMetric.businessMeaning || selectedMetric.description}
              </p>
              {selectedMetric.usageSuggestion && (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">使用建议：</span>
                  {selectedMetric.usageSuggestion}
                </p>
              )}
            </div>
          )}

          {/* 对话历史 */}
          <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] border rounded-lg p-3 bg-gray-50">
            <div className="space-y-3">
              {insightMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAnalyzing && (
                <div className="flex justify-start">
                  <div className="bg-white border rounded-lg p-3 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI 正在分析...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 输入框 */}
          <div className="flex gap-2 pt-2">
            <Input
              placeholder="继续提问，例如：这个指标最近的趋势如何？"
              value={insightInput}
              onChange={e => setInsightInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendInsight()}
              disabled={isAnalyzing}
              className="flex-1"
            />
            <Button
              onClick={handleSendInsight}
              disabled={!insightInput.trim() || isAnalyzing}
            >
              {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 指标卡片组件
function MetricCard({
  metric,
  calculation,
  onOpenInsight,
  onSave,
  isSaved,
}: {
  metric: MetricItem;
  calculation: { value: string; trend: 'up' | 'down' | 'stable' };
  onOpenInsight: (m: MetricItem) => void;
  onSave: (m: MetricItem) => void;
  isSaved: boolean;
}) {
  const config = METRIC_CATEGORIES[metric.category as keyof typeof METRIC_CATEGORIES];
  const Icon = config?.icon || Activity;

  return (
    <div className="border rounded-lg p-4 hover:shadow-sm transition-shadow bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            config?.color || 'bg-gray-100'
          }`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">{metric.name}</h4>
              <code className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-mono">
                {metric.expression}
              </code>
            </div>
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {metric.businessMeaning || metric.description}
            </p>
            {metric.businessValue && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {metric.businessValue}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="text-right">
            <p className="text-lg font-bold">{calculation.value}</p>
            <div className="flex items-center gap-1">
              {calculation.trend === 'up' && <TrendingUp className="w-4 h-4 text-red-500" />}
              {calculation.trend === 'down' && <TrendingDown className="w-4 h-4 text-green-500" />}
              {calculation.trend === 'stable' && <Activity className="w-4 h-4 text-gray-400" />}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onOpenInsight(metric)} title="解读">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSave(metric)}
              title={isSaved ? '已保存' : '保存'}
              className={isSaved ? 'text-green-600' : ''}
            >
              {isSaved ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* 数据质量提示 */}
      {metric.dataQuality && (
        <div className={`mt-2 text-xs px-2 py-1 rounded inline-flex items-center gap-1 ${
          metric.dataQuality === '高' ? 'bg-green-50 text-green-600' :
          metric.dataQuality === '中' ? 'bg-yellow-50 text-yellow-600' :
          'bg-red-50 text-red-600'
        }`}>
          {metric.dataQuality === '高' && <CheckCircle2 className="w-3 h-3" />}
          {metric.dataQuality === '中' && <AlertCircle className="w-3 h-3" />}
          {metric.dataQuality === '低' && <AlertCircle className="w-3 h-3" />}
          数据质量: {metric.dataQuality}
          {metric.dataQualityReason && <span className="text-gray-400">({metric.dataQualityReason})</span>}
        </div>
      )}
    </div>
  );
}
