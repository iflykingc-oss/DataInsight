'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
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
  Sparkles,
  Crosshair,
  Flame,
  LayoutTemplate,
  Layers,
  Loader2,
  Brain,
  Compass,
  Download
} from 'lucide-react';
import type { ParsedData, DataAnalysis, InsightCard } from '@/lib/data-processor';
import type { AnalysisPlan } from '@/lib/data-processor/types';
import { quickDetectScene, enhanceAnalysisWithAI, SCENE_DISPLAY, AnalysisScene } from '@/lib/analysis';
import type { AIEnhancedResult, StepResult } from '@/lib/analysis';
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
  modelConfig?: { apiKey: string; baseUrl: string; model: string } | null;
  onNavigateToCharts?: (chart: { chartType: string; xField: string; yField?: string; title: string }) => void;
}

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/5', border: 'border-destructive/20', label: '严重' },
  warning: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning/5', border: 'border-warning/20', label: '警告' },
  info: { icon: Info, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/20', label: '提示' },
  positive: { icon: ThumbsUp, color: 'text-success', bg: 'bg-success/5', border: 'border-success/20', label: '正面' }
};

const CHART_COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];

export function DataInsights({ data, analysis, onAnalyze, modelConfig, onNavigateToCharts }: DataInsightsProps) {
  const { t } = useI18n();
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIEnhancedResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState({ step: 0, total: 0, name: '' });
  const [expandedAiStep, setExpandedAiStep] = useState<string | null>(null);
  const [analysisPlan, setAnalysisPlan] = useState<{ plan: AnalysisPlan; reasoning: string } | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const handleNarrative = useCallback(async () => {
    if (!modelConfig || !analysis?.deepAnalysis) return;
    setNarrativeLoading(true);
    try {
      const { callLLM } = await import('@/lib/llm');
      const findings = analysis.deepAnalysis.keyFindings
        .filter(f => f.isBusinessInsight || f.severity === 'warning' || f.severity === 'critical')
        .slice(0, 8)
        .map(f => `- [${f.category}] ${f.title}: ${f.detail} (${f.impact})`);
      const profileSummary = analysis.deepAnalysis.dataProfile.summary;
      const result = await callLLM(
        modelConfig,
        [
          { role: 'system', content: '你是一位数据分析师，请用简洁专业的中文，将以下数据洞察整理成一段200字以内的执行摘要，要求：1.直接给出最重要的业务结论 2.包含具体数字 3.末尾给出1-2条优先行动建议 4.语气像汇报给管理层' },
          { role: 'user', content: `数据概况：${profileSummary}\n\n关键发现：\n${findings.join('\n')}` },
        ],
        { temperature: 0.4, max_tokens: 400 }
      );
      setNarrative(result.trim());
    } catch (err) {
      console.error('Narrative generation failed:', err);
    } finally {
      setNarrativeLoading(false);
    }
  }, [modelConfig, analysis]);

  // 导出分析结果
  const handleExportInsights = useCallback((format: 'csv' | 'json') => {
    const deep = analysis?.deepAnalysis;
    if (!deep) return;

    const keyFindings = deep.keyFindings || [];
    const correlations = deep.correlations || [];

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      const rows = [
        ['类别', '标题', '严重程度', '详情', '影响', '建议', '相关字段', '可信度'].join(','),
        ...keyFindings.map((f) => [
          f.category,
          `"${(f.title || '').replace(/"/g, '""')}"`,
          f.severity,
          `"${(f.detail || '').replace(/"/g, '""')}"`,
          `"${(f.impact || '').replace(/"/g, '""')}"`,
          `"${(f.suggestion || '').replace(/"/g, '""')}"`,
          `"${(f.relatedFields || []).join(';')}"`,
          f.confidence,
        ].join(',')),
        ...correlations.map((c) => [
          'correlation',
          `${c.field1} ↔ ${c.field2}`,
          c.strength,
          `系数: ${c.coefficient}`,
          c.direction === 'positive' ? '正相关' : '负相关',
          '相关性分析',
          `${c.field1};${c.field2}`,
          '',
        ].join(',')),
      ];
      content = rows.join('\n');
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
    } else {
      content = JSON.stringify({
        summary: analysis?.summary,
        fieldStats: analysis?.fieldStats,
        healthScore: deep.healthScore,
        keyFindings,
        correlations,
        distributions: deep.distributions,
        trends: deep.trends,
        exportTime: new Date().toISOString(),
      }, null, 2);
      mimeType = 'application/json;charset=utf-8;';
      extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `数据分析报告_${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [analysis]);
  const deep = analysis?.deepAnalysis;

  useEffect(() => {
    if (!analysis) onAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAIEnhance = useCallback(async () => {
    if (!modelConfig || !analysis) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    try {
      const result = await enhanceAnalysisWithAI(
        data.headers,
        analysis.fieldStats,
        analysis.deepAnalysis,
        data.rowCount,
        modelConfig,
        (stepIndex, totalSteps, stepName) => {
          setAiProgress({ step: stepIndex + 1, total: totalSteps, name: stepName });
        }
      );
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI 增强分析失败');
    } finally {
      setAiLoading(false);
    }
  }, [modelConfig, analysis, data]);

  // 分析规划：调用模型做轻量决策
  const handlePlanAnalysis = useCallback(async () => {
    if (!modelConfig || !analysis) return;
    setPlanLoading(true);
    try {
      const plan = await fetch('/api/analysis-planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
        },
        body: JSON.stringify({
          fieldStats: analysis.fieldStats.map(f => ({
            field: f.field,
            type: f.type,
            uniqueCount: f.uniqueCount,
            nullCount: f.nullCount,
            numericStats: f.numericStats ? {
              min: f.numericStats.min,
              max: f.numericStats.max,
              mean: f.numericStats.mean,
            } : undefined,
          })),
          rowCount: data.rowCount || data.rows.length,
          userIntent: '通用数据分析',
          modelConfig,
        }),
      }).then(r => r.json());

      if (plan.plan) {
        setAnalysisPlan({ plan: plan.plan, reasoning: plan.reasoning || '基于数据特征自动规划分析路径' });
        // 基于规划执行筛选后的分析（可选：调用带 plan 的分析函数）
        // 当前版本只展示规划结果，后续版本可集成到深度分析执行流程
      }
    } catch (err) {
      console.error('分析规划失败:', err);
    } finally {
      setPlanLoading(false);
    }
  }, [modelConfig, analysis, data]);

  // 场景快速识别
  const sceneInfo = analysis ? quickDetectScene(data.headers) : null;

  if (!analysis) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">{t('txt.正在分析数据')}</p>
        </CardContent>
      </Card>
    );
  }

  if (!deep) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">{t('txt.深度分析不可用请重新分析')}</p>
          <Button onClick={onAnalyze}>{t('txt.重新分析')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 执行摘要 */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary/80 mb-1.5 uppercase tracking-wide">执行摘要</p>
              {narrative ? (
                <p className="text-sm leading-relaxed text-foreground">{narrative}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {deep.dataProfile.summary}
                </p>
              )}
            </div>
            {modelConfig ? (
              <Button
                size="sm"
                variant={narrative ? 'outline' : 'default'}
                onClick={handleNarrative}
                disabled={narrativeLoading}
                className="shrink-0"
              >
                {narrativeLoading ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />生成中...</>
                ) : (
                  <><Sparkles className="w-3.5 h-3.5 mr-1.5" />{narrative ? '重新生成' : 'AI 生成汇报摘要'}</>
                )}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground shrink-0 mt-1">配置 AI 后可生成汇报摘要</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 0. AI 增强深度分析（置顶，最显眼位置） */}
      {sceneInfo && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              AI 业务解读
              {sceneInfo.template && (
                <Badge variant="secondary" className="ml-1">
                  {sceneInfo.displayName}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {sceneInfo.template
                ? `自动识别为${sceneInfo.displayName}场景，AI 基于统计算法结果给出业务级深度解读与建议`
                : 'AI 基于统计算法结果给出专业的业务洞察与建议'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!modelConfig ? (
              <div className="text-center py-4">
                <AlertCircle className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('txt.请先在设置中配置AI模型即可使用AI业务解读')}</p>
              </div>
            ) : aiLoading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <div>
                    <p className="text-sm font-medium">AI 分析中...</p>
                    <p className="text-xs text-muted-foreground">
                      步骤 {aiProgress.step}/{aiProgress.total}：{aiProgress.name}
                    </p>
                  </div>
                </div>
                <Progress value={(aiProgress.step / Math.max(aiProgress.total, 1)) * 100} className="h-2" />
              </div>
            ) : aiError ? (
              <div className="text-center py-4">
                <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-2" />
                <p className="text-sm text-destructive mb-2">{aiError}</p>
                <Button variant="outline" size="sm" onClick={handleAIEnhance}>{t('txt.重试')}</Button>
              </div>
            ) : aiResult ? (
              <div className="space-y-3">
                {/* 场景标签 */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="default">{SCENE_DISPLAY[aiResult.scene].icon} {SCENE_DISPLAY[aiResult.scene].name}</Badge>
                  {aiResult.template && (
                    <Badge variant="outline">{aiResult.template.name}</Badge>
                  )}
                  <Badge variant="secondary">{aiResult.stepResults.length} 个分析步骤</Badge>
                </div>

                {/* 各步骤结果 */}
                {aiResult.stepResults.map((step: StepResult) => (
                  <div key={step.stepId} className="border rounded-md bg-background">
                    <button
                      className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedAiStep(expandedAiStep === step.stepId ? null : step.stepId)}
                    >
                      <div className="flex items-center gap-2">
                        {step.content.startsWith('\u274c') ? (
                          <AlertCircle className="w-4 h-4 text-destructive" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-success" />
                        )}
                        <span className="text-sm font-medium">{step.stepName}</span>
                        {step.isRequired && <Badge variant="outline" className="text-xs py-0">{t('txt.必选')}</Badge>}
                      </div>
                      {expandedAiStep === step.stepId ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    {expandedAiStep === step.stepId && (
                      <div className="px-3 pb-3 border-t">
                        <div className="prose prose-sm max-w-none mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                          {step.content}
                        </div>
                        {step.recommendedChartTypes.length > 0 && (
                          <div className="mt-3 flex items-center gap-1">
                            <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{t('txt.推荐图表')}</span>
                            {step.recommendedChartTypes.map((ct: string) => (
                              <Badge key={ct} variant="secondary" className="text-xs py-0">{ct}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* 重新分析按钮 */}
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleAIEnhance}>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    重新分析
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <Brain className="w-8 h-8 text-primary/60 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">
                  {sceneInfo.template
                    ? `识别为${sceneInfo.displayName}场景，包含 ${sceneInfo.template.steps.length} 个分析步骤`
                    : '让 AI 基于统计数据给出业务级深度解读'
                  }
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleAIEnhance}>
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    开始 AI 业务解读
                  </Button>
                  {modelConfig && (
                    <Button variant="outline" onClick={handlePlanAnalysis} disabled={planLoading}>
                      {planLoading ? (
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                      ) : (
                        <Compass className="w-4 h-4 mr-1.5" />
                      )}
                      定制分析方案
                    </Button>
                  )}
                </div>
                {/* 分析规划结果展示 */}
                {analysisPlan && (
                  <div className="mt-3 p-3 border rounded-md bg-background text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Compass className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">{t('txt.分析规划')}</span>
                      <Badge variant="secondary" className="text-xs">置信度 {analysisPlan.plan.confidence}%</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{analysisPlan.reasoning}</p>
                    {analysisPlan.plan && (
                      <div className="space-y-1.5">
                        <div className="text-xs">
                          <span className="font-medium">{t('txt.相关字段')}</span>
                          {analysisPlan.plan.relevantFields.join('、') || '全量字段'}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">{t('txt.分析维度')}</span>
                          {analysisPlan.plan.recommendedDimensions.join('、') || '无'}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">{t('txt.核心指标')}</span>
                          {analysisPlan.plan.keyMetrics.join('、') || '无'}
                        </div>
                        <div className="text-xs">
                          <span className="font-medium">{t('txt.执行顺序')}</span>
                          {analysisPlan.plan.analysisSequence.join(' → ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 1. 数据画像 + 健康评分 */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* 数据画像 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              数据画像
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground mb-4">{deep.dataProfile.summary}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="bg-primary/5 rounded-md p-3">
                <p className="text-xs text-primary mb-1">{t('txt.数据类型')}</p>
                <p className="font-semibold text-foreground text-sm">{deep.dataProfile.dataType}</p>
              </div>
              <div className="bg-chart-4/5 rounded-md p-3">
                <p className="text-xs text-chart-4 mb-1">{t('txt.推测行业')}</p>
                <p className="font-semibold text-chart-4 text-sm">{deep.dataProfile.suggestedIndustry}</p>
              </div>
              {deep.dataProfile.subScenario && (
                <div className="bg-chart-4/5 rounded-md p-3">
                  <p className="text-xs text-chart-4 mb-1">{t('txt.细分场景')}</p>
                  <p className="font-semibold text-chart-4 text-sm">{deep.dataProfile.subScenario}</p>
                </div>
              )}
              {deep.dataProfile.periodFeature && (
                <div className="bg-primary/5 rounded-md p-3">
                  <p className="text-xs text-primary mb-1">{t('txt.数据周期')}</p>
                  <p className="font-semibold text-primary text-sm">{deep.dataProfile.periodFeature}</p>
                </div>
              )}
              {deep.dataProfile.scaleFeature && (
                <div className="bg-success/5 rounded-md p-3">
                  <p className="text-xs text-success mb-1">{t('txt.数据规模')}</p>
                  <p className="font-semibold text-success text-sm">{deep.dataProfile.scaleFeature}</p>
                </div>
              )}
              <div className="bg-success/5 rounded-md p-3">
                <p className="text-xs text-success mb-1">{t('txt.分析潜力')}</p>
                <p className="font-semibold text-success text-sm">
                  {deep.dataProfile.analysisPotential === 'high' ? '高' :
                   deep.dataProfile.analysisPotential === 'medium' ? '中' : '低'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据健康度 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              数据健康度
            </CardTitle>
            <CardDescription>{t('txt.你的数据质量是否足够支撑可靠的分析结论')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-4">
              <div className="text-5xl font-bold" style={{ color: getScoreColor(deep.healthScore.overall) }}>
                {deep.healthScore.overall}
              </div>
              <p className="text-sm mt-1">
                {deep.healthScore.overall >= 80 ? '数据质量很好，可以放心分析' :
                 deep.healthScore.overall >= 60 ? '数据基本可用，部分字段建议修复' :
                 deep.healthScore.overall >= 40 ? '数据质量一般，建议先清洗再分析' :
                 '数据质量较差，强烈建议先做数据清洗'}
              </p>
            </div>
            <div className="space-y-2">
              {[
                { label: '完整性', value: deep.healthScore.completeness, tip: '缺值越少越好' },
                { label: '一致性', value: deep.healthScore.consistency, tip: '格式统一越好' },
                { label: '质量', value: deep.healthScore.quality, tip: '异常值越少越好' },
                { label: '可用性', value: deep.healthScore.usability, tip: '分析友好程度' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-12">{item.label}</span>
                  <Progress value={item.value} className="flex-1 h-2" />
                  <span className="text-xs font-medium w-8 text-right">{item.value}</span>
                  <span className="text-xs text-muted-foreground w-24">{item.tip}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. 场景化分析模板 */}
      {deep.scenarioAnalysis && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutTemplate className="w-5 h-5 text-primary" />
              场景化分析
              <Badge variant="secondary">{deep.scenarioAnalysis.detectedScenario}</Badge>
              <Badge variant={deep.scenarioAnalysis.confidence === 'high' ? 'default' : 'outline'} className="text-xs">
                {deep.scenarioAnalysis.confidence === 'high' ? '高置信度' : deep.scenarioAnalysis.confidence === 'medium' ? '中置信度' : '低置信度'}
              </Badge>
            </CardTitle>
            <CardDescription>
              基于数据特征自动匹配 {deep.scenarioAnalysis.detectedScenario} 场景，推荐以下分析指标与维度
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* 推荐 KPI */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
                <Target className="w-4 h-4 text-primary" />
                推荐核心指标
              </h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deep.scenarioAnalysis.kpiRecommendations.map((kpi, idx) => (
                  <div key={idx} className={`p-3 rounded-md border ${
                    kpi.priority === 'p0' ? 'border-l-4 border-l-red-400 bg-destructive/5/30' :
                    kpi.priority === 'p1' ? 'border-l-4 border-l-orange-400 bg-warning/5/30' :
                    'border-l-4 border-l-blue-400 bg-primary/5/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{kpi.name}</span>
                      <Badge variant="outline" className="text-xs py-0">
                        {kpi.priority === 'p0' ? 'P0' : kpi.priority === 'p1' ? 'P1' : 'P2'}
                      </Badge>
                    </div>
                    <code className="text-xs text-muted-foreground block mb-1">{kpi.expression}</code>
                    <p className="text-xs text-foreground">{kpi.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 推荐维度 */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
                <Layers className="w-4 h-4 text-chart-4" />
                推荐分析维度
              </h4>
              <div className="flex flex-wrap gap-2">
                {deep.scenarioAnalysis.recommendedDimensions.map((dim, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm py-1 px-3">
                    {dim}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 行业化建议 */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
                <Lightbulb className="w-4 h-4 text-warning" />
                行业化分析建议
              </h4>
              <div className="space-y-2">
                {deep.scenarioAnalysis.industrySuggestions.map((s, idx) => (
                  <div key={idx} className={`flex items-start gap-3 p-3 rounded-md ${
                    s.priority === 'high' ? 'bg-destructive/5/50 border-l-4 border-l-red-400' :
                    s.priority === 'medium' ? 'bg-warning/5/50 border-l-4 border-l-orange-400' :
                    'bg-primary/5/50 border-l-4 border-l-blue-400'
                  }`}>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{s.title}</p>
                      <p className="text-xs text-foreground mt-1">{s.description}</p>
                    </div>
                    <Badge variant="outline" className="text-xs py-0 flex-shrink-0">
                      {s.priority === 'high' ? '高优先级' : s.priority === 'medium' ? '中优先级' : '低优先级'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. 关键发现 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              关键发现
              <Badge variant="secondary">{deep.keyFindings.length}</Badge>
            </CardTitle>
            {analysis?.deepAnalysis && deep.keyFindings.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportInsights('csv')}
                  className="gap-1.5 h-8"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出 CSV
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportInsights('json')}
                  className="gap-1.5 h-8"
                >
                  <Download className="w-3.5 h-3.5" />
                  导出 JSON
                </Button>
              </div>
            )}
          </div>
          <CardDescription>AI 自动发现数据中的问题和机会</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {deep.keyFindings.map((finding, idx) => {
              const config = SEVERITY_CONFIG[finding.severity];
              const Icon = config.icon;
              const isExpanded = expandedFinding === `${idx}`;
              
              return (
                <div key={idx} className={`rounded-md border ${config.border} ${config.bg} overflow-hidden`}>
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
                      <p className="text-xs text-foreground">{finding.detail}</p>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 ml-8 border-t border-border">
                      <div className="mt-2 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{t('txt.影响')}</p>
                            <p className="text-xs text-muted-foreground">{finding.impact}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-foreground">{t('txt.建议')}</p>
                            <p className="text-xs text-muted-foreground">{finding.suggestion}</p>
                          </div>
                        </div>
                        {finding.relatedFields.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-xs text-muted-foreground">{t('txt.相关字段')}</span>
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

      {/* 3. 趋势速览 + 行动建议 */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* 趋势速览 - 业务语言 */}
        {deep.trends.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                趋势速览
              </CardTitle>
              <CardDescription>{t('txt.数据变化趋势的业务解读')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deep.trends.map((trend, idx) => {
                  const TrendIcon = trend.direction === 'up' ? TrendingUp : 
                                     trend.direction === 'down' ? TrendingDown : 
                                     trend.direction === 'volatile' ? Activity : Minus;
                  const trendColor = trend.direction === 'up' ? 'text-success' :
                                     trend.direction === 'down' ? 'text-destructive' :
                                     trend.direction === 'volatile' ? 'text-warning' : 'text-foreground';
                  const trendBg = trend.direction === 'up' ? 'bg-success/5' :
                                  trend.direction === 'down' ? 'bg-destructive/5' :
                                  trend.direction === 'volatile' ? 'bg-warning/5' : 'bg-muted/30';
                  // 业务化趋势描述
                  const bizDirection = trend.direction === 'up' ? '增长' :
                                       trend.direction === 'down' ? '下降' :
                                       trend.direction === 'volatile' ? '波动' : '稳定';
                  const bizAction = trend.direction === 'up' ? '持续关注增长动力' :
                                    trend.direction === 'down' ? '需排查下降原因' :
                                    trend.direction === 'volatile' ? '建议平滑波动分析' : '维持现状即可';
                  
                  return (
                    <div key={idx} className={`p-3 rounded-md ${trendBg}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-md flex items-center justify-center ${trendBg} border`}>
                          <TrendIcon className={`w-5 h-5 ${trendColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm">{trend.field}</span>
                            <Badge variant="outline" className={`text-xs ${trendColor}`}>
                              {bizDirection} {trend.changeRate !== 0 && `${Math.abs(trend.changeRate).toFixed(1)}%`}
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground">{trend.description}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" /> {bizAction}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 数据分布 - 业务解读替代技术指标 */}
        {deep.distributions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                数据分布
              </CardTitle>
              <CardDescription>{t('txt.了解数据的业务含义和分布特征')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deep.distributions.slice(0, 6).map((dist, idx) => {
                  // 业务化分布解读
                  const bizType = dist.type === 'normal' ? '均衡分布' :
                                  dist.type === 'skewed_right' ? '多数偏低' :
                                  dist.type === 'skewed_left' ? '多数偏高' :
                                  dist.type === 'bimodal' ? '两极分化' : '均匀分布';
                  const bizMeaning = dist.type === 'normal' ? '数据分布均匀，适合常规统计' :
                                     dist.type === 'skewed_right' ? '大部分值偏低，少数极端高值拉高了均值，建议关注中位数' :
                                     dist.type === 'skewed_left' ? '大部分值偏高，少数低值，注意低值端是否有异常' :
                                     dist.type === 'bimodal' ? '数据存在两个集中区间，可能包含两类不同群体，建议分组分析' :
                                     '数据较均匀，无明显集中趋势';
                  
                  return (
                    <div key={idx} className="p-3 bg-muted/30 rounded-md">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{dist.field}</span>
                        <Badge variant="secondary" className="text-xs">{bizType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{bizMeaning}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 4. 异常原因分析 */}
      {deep.attribution && deep.attribution.anomalyMetrics.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crosshair className="w-5 h-5 text-primary" />
              异常原因分析
              <Badge variant="secondary">{deep.attribution.anomalyMetrics.length}</Badge>
            </CardTitle>
            <CardDescription>{deep.attribution.summary}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 异常指标 */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
                <Flame className="w-4 h-4 text-warning" />
                异常指标检测
              </h4>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deep.attribution.anomalyMetrics.map((metric, idx) => {
                  const dirIcon = metric.direction === 'spike_up' ? TrendingUp :
                                  metric.direction === 'drop_down' ? TrendingDown : Activity;
                  const DirIcon = dirIcon;
                  const dirColor = metric.direction === 'spike_up' ? 'text-success bg-success/5' :
                                   metric.direction === 'drop_down' ? 'text-destructive bg-destructive/5' : 'text-warning bg-warning/5';
                  const sevColor = metric.severity === 'high' ? 'border-l-4 border-l-red-400' :
                                   metric.severity === 'medium' ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-blue-400';
                  
                  return (
                    <div key={idx} className={`p-3 rounded-md border ${sevColor} ${dirColor}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{metric.field}</span>
                        <DirIcon className="w-4 h-4" />
                      </div>
                      <p className="text-xs opacity-80 mb-2">{metric.description}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span>基线: {metric.baseline}</span>
                        <span>实际: {metric.actualValue}</span>
                        <Badge variant="outline" className="text-xs py-0">
                          {metric.severity === 'high' ? '高' : metric.severity === 'medium' ? '中' : '低'}
                        </Badge>
                      </div>
                      {metric.changeRate > 0 && (
                        <div className="mt-1 text-xs font-medium">
                          偏离率: {metric.changeRate}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 维度拆解 */}
            {deep.attribution.dimensionBreakdowns.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  维度拆解
                </h4>
                <div className="space-y-4">
                  {deep.attribution.dimensionBreakdowns.slice(0, 4).map((breakdown, idx) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-md">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-medium">{breakdown.metricField}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-foreground">按 {breakdown.dimensionField} 拆解</span>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-xs ml-auto">
                          核心驱动: {breakdown.keyDriver} ({Math.abs(breakdown.keyDriverContribution).toFixed(1)}%)
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {breakdown.segments.slice(0, 6).map((seg, si) => (
                          <div key={si} className="flex items-center gap-3">
                            <span className="text-xs text-foreground w-24 truncate" title={seg.segmentValue}>
                              {seg.segmentValue}
                            </span>
                            <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden relative">
                              <div
                                className={`h-full rounded-full ${seg.isKeyDriver ? 'bg-primary' : Math.abs(seg.contribution) > 20 ? 'bg-primary/30' : 'bg-muted-foreground/30'}`}
                                style={{ width: `${Math.min(Math.abs(seg.contribution), 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono w-14 text-right">
                              {seg.contribution.toFixed(1)}%
                            </span>
                            {seg.isKeyDriver && (
                              <Badge className="bg-primary text-white hover:bg-primary text-xs py-0 px-1.5">{t('txt.驱动')}</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 根因分析 */}
            {deep.attribution.rootCauses.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-1">
                  <Crosshair className="w-4 h-4 text-destructive" />
                  根因定位
                </h4>
                <div className="space-y-3">
                  {deep.attribution.rootCauses.map((rc, idx) => {
                    const confColor = rc.confidence === 'high' ? 'border-l-4 border-l-red-400 bg-destructive/5/30' :
                                      rc.confidence === 'medium' ? 'border-l-4 border-l-orange-400 bg-warning/5/30' :
                                      'border-l-4 border-l-blue-400 bg-primary/5/30';
                    
                    return (
                      <div key={idx} className={`p-3 rounded-md ${confColor}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-sm">{rc.metric}</span>
                          <Badge variant="outline" className="text-xs">
                            置信度: {rc.confidence === 'high' ? '高' : rc.confidence === 'medium' ? '中' : '低'}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground mb-2">{rc.cause}</p>
                        {/* 证据链 */}
                        <div className="mb-2">
                          <p className="text-xs text-muted-foreground mb-1">{t('txt.证据链')}</p>
                          {rc.evidence.map((ev, ei) => (
                            <div key={ei} className="flex items-start gap-1 ml-2">
                              <span className="text-xs text-muted-foreground mt-0.5">•</span>
                              <span className="text-xs text-foreground">{ev}</span>
                            </div>
                          ))}
                        </div>
                        {/* 相关维度 */}
                        {rc.relatedDimensions.length > 0 && (
                          <div className="flex items-center gap-1 mb-2">
                            <span className="text-xs text-muted-foreground">{t('txt.相关维度')}</span>
                            {rc.relatedDimensions.map(d => (
                              <Badge key={d} variant="outline" className="text-xs py-0">{d}</Badge>
                            ))}
                          </div>
                        )}
                        {/* 建议 */}
                        <div className="flex items-start gap-1.5 mt-2 p-2 bg-success/5/50 rounded">
                          <CheckCircle className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-foreground">{rc.suggestion}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 5. 关联发现 - 业务语言 */}
      {deep.correlations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              关联发现
              <Badge variant="secondary">{deep.correlations.length}</Badge>
            </CardTitle>
            <CardDescription>{t('txt.数据之间的关联关系帮你发现隐藏规律')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {deep.correlations.slice(0, 9).map((corr, idx) => {
                const strengthColor = corr.strength === 'strong' ? 'text-destructive bg-destructive/5' :
                                      corr.strength === 'moderate' ? 'text-warning bg-warning/5' : 'text-primary bg-primary/5';
                const dirIcon = corr.direction === 'positive' ? '↑' : '↓';
                // 业务化关联解读
                const bizRelation = corr.direction === 'positive' 
                  ? `${corr.field1}越高，${corr.field2}也越高` 
                  : `${corr.field1}越高，${corr.field2}反而越低`;
                const bizStrength = corr.strength === 'strong' ? '强关联' : 
                                    corr.strength === 'moderate' ? '中等关联' : '弱关联';
                const bizAction = corr.strength === 'strong' 
                  ? (corr.direction === 'positive' 
                    ? `可以联动优化：提升${corr.field1}可能同时提升${corr.field2}` 
                    : `需权衡：提升${corr.field1}可能降低${corr.field2}`)
                  : `关联较弱，可分开独立分析`;
                
                return (
                  <div key={idx} className={`p-3 rounded-md border ${strengthColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">
                        {corr.field1} {dirIcon} {corr.field2}
                      </span>
                      <Badge variant="outline" className="text-xs">{bizStrength}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <Progress value={Math.abs(corr.coefficient) * 100} className="flex-1 h-2" />
                      <span className="text-xs font-mono font-medium">{(Math.abs(corr.coefficient) * 100).toFixed(0)}%</span>
                    </div>
                    <p className="text-xs mt-1 font-medium opacity-80">{bizRelation}</p>
                    <p className="text-xs mt-1 text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> {bizAction}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. 智能图表推荐 - 可直接操作 */}
      {deep.recommendedCharts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              推荐这样看数据
            </CardTitle>
            <CardDescription>{t('txt.一键生成适合你数据的图表快速发现规律')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {deep.recommendedCharts.map((rec, idx) => {
                const priorityColor = rec.priority === 'high' ? 'border-l-4 border-l-red-400' :
                                      rec.priority === 'medium' ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-blue-400';
                const chartLabel = rec.chartType === 'bar' ? '柱状图' :
                                   rec.chartType === 'line' ? '折线图' :
                                   rec.chartType === 'pie' ? '饼图' :
                                   rec.chartType === 'scatter' ? '散点图' :
                                   rec.chartType === 'area' ? '面积图' :
                                   rec.chartType === 'radar' ? '雷达图' : rec.chartType;
                
                return (
                  <div key={idx} className={`p-4 bg-white border rounded-md ${priorityColor} hover:shadow-md transition-shadow group`}>
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <span className="font-medium text-sm">{rec.title}</span>
                    </div>
                    <Badge variant="outline" className="text-xs mb-2">{chartLabel}</Badge>
                    <p className="text-xs text-muted-foreground mt-2">{rec.reason}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>X: {rec.xField}</span>
                      {rec.yField && <><ArrowRight className="w-3 h-3" /><span>Y: {rec.yField}</span></>}
                    </div>
                    <Button 
                      size="sm" variant="outline" 
                      className="w-full mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onNavigateToCharts?.(rec)}
                    >
                      一键生成此图表
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 7. 行动建议 - 业务场景化 */}
      {deep.actionItems.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              下一步怎么做
            </CardTitle>
            <CardDescription>{t('txt.基于数据分析给你可执行的行动方案')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* 立即行动 */}
              {deep.actionItems.filter(i => i.priority === 'high').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10">{t('txt.本周可落地')}</Badge>
                    <span className="text-xs text-muted-foreground">{t('txt.低成本零依赖立刻执行')}</span>
                  </div>
                  <div className="space-y-2">
                    {deep.actionItems.filter(i => i.priority === 'high').map((item, idx) => (
                      <div key={`h-${idx}`} className="p-3 rounded-md border-l-4 border-l-red-400 bg-destructive/5/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Zap className="w-3.5 h-3.5 text-destructive" />
                          <span className="font-medium text-sm">{item.action}</span>
                        </div>
                        <p className="text-xs text-foreground ml-5">{item.detail}</p>
                        <p className="text-xs text-success ml-5 mt-1">预期收益: {item.expectedBenefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 短期优化 */}
              {deep.actionItems.filter(i => i.priority === 'medium').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-warning/10 text-warning hover:bg-warning/10">{t('txt.本月内落地')}</Badge>
                    <span className="text-xs text-muted-foreground">{t('txt.需要少量资源和协调')}</span>
                  </div>
                  <div className="space-y-2">
                    {deep.actionItems.filter(i => i.priority === 'medium').map((item, idx) => (
                      <div key={`m-${idx}`} className="p-3 rounded-md border-l-4 border-l-orange-400 bg-warning/5/30">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-3.5 h-3.5 text-warning" />
                          <span className="font-medium text-sm">{item.action}</span>
                        </div>
                        <p className="text-xs text-foreground ml-5">{item.detail}</p>
                        <p className="text-xs text-success ml-5 mt-1">预期收益: {item.expectedBenefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* 中期规划 */}
              {deep.actionItems.filter(i => i.priority === 'low').length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{t('txt.本季度规划')}</Badge>
                    <span className="text-xs text-muted-foreground">{t('txt.需要系统建设和资源投入')}</span>
                  </div>
                  <div className="space-y-2">
                    {deep.actionItems.filter(i => i.priority === 'low').map((item, idx) => (
                      <div key={`l-${idx}`} className="p-3 rounded-md border-l-4 border-l-blue-400 bg-primary/5/30">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium text-sm">{item.action}</span>
                        </div>
                        <p className="text-xs text-foreground ml-5">{item.detail}</p>
                        <p className="text-xs text-success ml-5 mt-1">预期收益: {item.expectedBenefit}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 8. 趋势预测 - 自动识别日期+数值字段 */}
      {(() => {
        const dateField = analysis.fieldStats.find(f => f.type === 'date');
        const numField = analysis.fieldStats.find(f => f.type === 'number' && f.numericStats);
        if (!dateField || !numField || data.rows.length < 5) return null;

        const timeSeries = data.rows
          .map(r => ({ date: String(r[dateField.field]), value: Number(r[numField.field]) || 0 }))
          .filter(d => !isNaN(new Date(d.date).getTime()))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 30);

        if (timeSeries.length < 5) return null;

        const n = timeSeries.length;
        const sumX = timeSeries.reduce((s, _, i) => s + i, 0);
        const sumY = timeSeries.reduce((s, d) => s + d.value, 0);
        const sumXY = timeSeries.reduce((s, d, i) => s + i * d.value, 0);
        const sumXX = timeSeries.reduce((s, _, i) => s + i * i, 0);
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        const nextValue = Math.round(intercept + slope * n);
        const lastValue = timeSeries[timeSeries.length - 1].value;
        const changePct = lastValue > 0 ? ((nextValue - lastValue) / lastValue * 100).toFixed(1) : '0';
        const trend = slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable';

        return (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                趋势预测
                <Badge variant="secondary">{numField.field}</Badge>
              </CardTitle>
              <CardDescription>基于 {timeSeries.length} 个历史数据点，预测下一周期走势</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-md text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('txt.当前值')}</p>
                  <p className="text-2xl font-bold">{lastValue.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-primary/5 rounded-md text-center">
                  <p className="text-xs text-primary mb-1">{t('txt.下一周期预测')}</p>
                  <p className="text-2xl font-bold text-primary">{nextValue.toLocaleString()}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-md text-center">
                  <p className="text-xs text-muted-foreground mb-1">{t('txt.预计变化')}</p>
                  <div className={`flex items-center justify-center gap-1 text-2xl font-bold ${
                    trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-foreground'
                  }`}>
                    {trend === 'up' ? <TrendingUp className="w-5 h-5" /> : trend === 'down' ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                    {Number(changePct) > 0 ? '+' : ''}{changePct}%
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-3">
                预测方法：线性趋势分析 | 数据周期：{timeSeries[0].date} ~ {timeSeries[timeSeries.length - 1].date}
              </p>
            </CardContent>
          </Card>
        );
      })()}

      {/* 9. 基础统计 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            字段统计详情
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-foreground">{t('txt.字段')}</th>
                  <th className="text-left py-2 px-3 font-medium text-foreground">{t('txt.类型')}</th>
                  <th className="text-right py-2 px-3 font-medium text-foreground">{t('txt.非空')}</th>
                  <th className="text-right py-2 px-3 font-medium text-foreground">{t('txt.唯一值')}</th>
                  <th className="text-right py-2 px-3 font-medium text-foreground">{t('txt.最小值')}</th>
                  <th className="text-right py-2 px-3 font-medium text-foreground">{t('txt.最大值')}</th>
                  <th className="text-right py-2 px-3 font-medium text-foreground">{t('txt.均值')}</th>
                  <th className="text-left py-2 px-3 font-medium text-foreground">{t('txt.示例')}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.fieldStats.map((stat, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 font-medium">{stat.field}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs">
                        {stat.type === 'id' ? 'ID' : stat.type === 'number' ? '数值' : stat.type === 'date' ? '日期' : '文本'}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className={stat.nullCount > 0 ? 'text-warning' : 'text-success'}>
                        {stat.count - stat.nullCount}/{stat.count}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">{stat.uniqueCount}</td>
                    <td className="py-2 px-3 text-right">{stat.numericStats?.min ?? '-'}</td>
                    <td className="py-2 px-3 text-right">{stat.numericStats?.max ?? '-'}</td>
                    <td className="py-2 px-3 text-right">{stat.numericStats?.mean?.toFixed(2) ?? '-'}</td>
                    <td className="py-2 px-3 text-muted-foreground truncate max-w-[120px]">
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
