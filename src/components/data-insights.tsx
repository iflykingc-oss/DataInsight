'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Loader2, Sparkles, FileText, RefreshCw,
  Target, Activity, Brain, Info, Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { callLLM } from '@/lib/llm-client';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor/types';

interface DataInsightsProps {
  data: ParsedData;
  analysis: DataAnalysis;
  onViewVisualization?: () => void;
  onViewAI?: () => void;
}

export function DataInsights({ data, analysis }: DataInsightsProps) {
  const { t } = useI18n();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'report'>('analysis');
  const deep = analysis.deepAnalysis;

  const handleNarrative = useCallback(async () => {
    if (narrative || narrativeLoading) return;
    setNarrativeLoading(true);
    try {
      const findings = deep?.keyFindings?.slice(0, 5).map(f =>
        `[${f.severity}] ${f.title}: ${f.detail}`
      ).join('\n') ?? '';
      const prompt = `你是资深数据分析师。请根据以下数据关键发现，用中文生成1段不超过200字的执行摘要，要求：直接给出业务结论，不要解释方法，语言简洁专业，适合直接用于管理层汇报。\n\n关键发现：\n${findings}`;
      const text = await callLLM(prompt, { temperature: 0.4, maxTokens: 400 });
      setNarrative(text);
    } finally {
      setNarrativeLoading(false);
    }
  }, [deep, narrative, narrativeLoading]);

  if (!data || !analysis) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        {t('ai.noData')}
      </div>
    );
  }

  const fieldStats = analysis.fieldStats;
  const anomalies = analysis.anomalies ?? [];

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-0 border-b border-border/50 bg-background shrink-0">
          <TabsList className="h-8 bg-transparent p-0 gap-0 border-b-0">
            <TabsTrigger
              value="analysis"
              className="h-8 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"
            >
              <Brain className="w-3.5 h-3.5 mr-1.5" />
              {t('insights.analysis') || '深度洞察'}
              {deep?.keyFindings?.length ? (
                <Badge variant="secondary" className="ml-1.5 h-3.5 px-1 text-[9px]">{deep.keyFindings.length}</Badge>
              ) : null}
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="h-8 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {t('insights.report') || 'AI报告'}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ANALYSIS TAB: summary stats + key findings + trends + correlations + action items + field stats */}
        <TabsContent value="analysis" className="flex-1 overflow-auto m-0 p-4 space-y-4">
          {/* Stats row */}
          <div className={cn('grid gap-2', deep?.healthScore ? 'grid-cols-4' : 'grid-cols-3')}>
            {deep?.healthScore && (
              <div className="p-3 rounded-lg border bg-card text-center">
                <div className={cn('text-xl font-bold',
                  deep.healthScore.overall >= 80 ? 'text-green-600' :
                  deep.healthScore.overall >= 60 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {deep.healthScore.overall}
                </div>
                <div className="text-[11px] text-muted-foreground">{t('insights.healthScore') || '健康度'}</div>
              </div>
            )}
            <div className="p-3 rounded-lg border bg-card text-center">
              <div className="text-xl font-bold">{data.rows.length}</div>
              <div className="text-[11px] text-muted-foreground">{t('dataTable.rows')}</div>
            </div>
            <div className="p-3 rounded-lg border bg-card text-center">
              <div className="text-xl font-bold">{data.fields.length}</div>
              <div className="text-[11px] text-muted-foreground">{t('dataTable.fields')}</div>
            </div>
            <div className="p-3 rounded-lg border bg-card text-center">
              <div className="text-xl font-bold text-amber-600">{anomalies.length}</div>
              <div className="text-[11px] text-muted-foreground">{t('dataTable.anomalies')}</div>
            </div>
          </div>

          {!deep ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
              <Brain className="w-8 h-8 opacity-30" />
              <span>{t('insights.noDeep') || '暂无深度分析'}</span>
            </div>
          ) : (
            <>
              {deep.keyFindings && deep.keyFindings.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{t('insights.keyFindings') || '关键发现'}</div>
                  {deep.keyFindings.map((finding, i) => (
                    <div key={i} className={cn(
                      'p-3 rounded-lg border',
                      finding.severity === 'critical' ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30' :
                      finding.severity === 'warning' ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30' :
                      'border-border bg-card'
                    )}>
                      <div className="flex items-start gap-2">
                        {finding.severity === 'critical' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-500" /> :
                         finding.severity === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" /> :
                         finding.severity === 'info' ? <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-500" /> :
                         <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-green-500" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium">{finding.title}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{finding.detail}</div>
                          {finding.suggestion && (
                            <div className="text-[11px] text-primary/70 mt-1 flex items-center gap-1">
                              <Lightbulb className="w-3 h-3 shrink-0" />
                              {finding.suggestion}
                            </div>
                          )}
                        </div>
                        {finding.confidence && (
                          <span className="text-[10px] text-muted-foreground shrink-0">{(finding.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deep.trends && deep.trends.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{t('insights.trends') || '趋势分析'}</div>
                  {deep.trends.map((trend, i) => (
                    <div key={i} className="p-2.5 rounded-lg border bg-card/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">{trend.field}</span>
                        <div className="flex items-center gap-1">
                          {trend.recentTrend === 'up' ? <TrendingUp className="w-3.5 h-3.5 text-green-500" /> :
                           trend.recentTrend === 'down' ? <TrendingDown className="w-3.5 h-3.5 text-red-500" /> :
                           <Activity className="w-3.5 h-3.5 text-gray-400" />}
                          <span className="text-[11px] text-muted-foreground">
                            {trend.totalChange >= 0 ? '+' : ''}{trend.totalChange.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      {trend.peakPeriod && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          峰值: {trend.peakPeriod} | 谷值: {trend.valleyPeriod}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {deep.correlations && deep.correlations.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{t('insights.correlations') || '相关性'}</div>
                  {deep.correlations.filter(c => Math.abs(c.coefficient) >= 0.5).map((corr, i) => (
                    <div key={i} className="p-2.5 rounded-lg border bg-card/50 flex items-center justify-between">
                      <span className="text-[11px]">{corr.field1} ↔ {corr.field2}</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn('h-1.5 rounded-full', Math.abs(corr.coefficient) >= 0.7 ? 'bg-primary' : 'bg-muted-foreground/40')}
                          style={{ width: `${Math.abs(corr.coefficient) * 60}px` }}
                        />
                        <span className="text-[10px] tabular-nums text-muted-foreground">{corr.coefficient.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deep.actionItems && deep.actionItems.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">{t('insights.actionItems') || '行动建议'}</div>
                  {deep.actionItems.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-lg border bg-card/50 flex items-start gap-2">
                      <Target className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
                      <div className="flex-1 text-[11px]">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-muted-foreground">{item.description}</div>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-4 px-1 shrink-0">{item.priority}</Badge>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{t('insights.fieldStats') || '字段统计'}</div>
                {fieldStats.map((stat) => (
                  <div key={stat.field} className="p-2.5 rounded-lg border bg-card/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{stat.field}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">{stat.type}</Badge>
                    </div>
                    {stat.type === 'number' ? (
                      <div className="grid grid-cols-4 gap-1 text-[11px] text-muted-foreground">
                        <span>min: {stat.numericStats?.min?.toLocaleString()}</span>
                        <span>max: {stat.numericStats?.max?.toLocaleString()}</span>
                        <span>avg: {stat.numericStats?.mean?.toFixed(1)}</span>
                        <span>null: {((stat.nullCount / Math.max(1, stat.count)) * 100).toFixed(0)}%</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {stat.topValues?.slice(0, 5).map((tv, j) => (
                          <Badge key={j} variant="secondary" className="text-[10px] h-4 px-1.5">
                            {String(tv.value)} ({tv.count})
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* REPORT TAB: AI narrative */}
        <TabsContent value="report" className="flex-1 overflow-auto m-0 p-4">
          <div className="space-y-4">
            {!narrative && !narrativeLoading && (
              <div className="p-4 rounded-lg border border-dashed bg-card/50 text-center space-y-2">
                <Sparkles className="w-6 h-6 mx-auto text-primary/50" />
                <div className="text-xs text-muted-foreground">
                  {t('insights.narrativeHint') || '点击生成 AI 执行摘要，直接用于管理层汇报'}
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleNarrative}>
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {t('insights.generate') || '生成摘要'}
                </Button>
              </div>
            )}
            {narrativeLoading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                生成中...
              </div>
            )}
            {narrative && (
              <div className="p-4 rounded-lg border bg-card">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-primary/70" />
                  <span className="text-xs font-medium">{t('insights.executiveSummary') || '执行摘要'}</span>
                </div>
                <div className="text-xs leading-relaxed text-foreground/80 whitespace-pre-wrap">{narrative}</div>
                <Button variant="ghost" size="sm" className="mt-3 h-7 text-xs" onClick={() => setNarrative(null)}>
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  {t('insights.regenerate') || '重新生成'}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
