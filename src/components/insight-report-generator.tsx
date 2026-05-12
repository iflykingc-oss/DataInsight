'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  FileText,
  CheckSquare,
  Loader2,
  Download,
  Printer,
  Sparkles,
  TrendingUp,
  Shield,
  Lightbulb,
  BarChart3,
  Activity,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataAnalysis } from '@/lib/data-processor';

interface ReportModule {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  checked: boolean;
}

interface InsightReportGeneratorProps {
  analysis: DataAnalysis | null;
  fileName?: string;
}

export function InsightReportGenerator({ analysis, fileName }: InsightReportGeneratorProps) {
  const [modules, setModules] = useState<ReportModule[]>([
    { id: 'summary', label: '基础统计摘要', description: '数据规模、字段类型分布、基础统计量', icon: Target, color: 'text-blue-600', bgColor: 'bg-blue-50', checked: true },
    { id: 'health', label: '数据健康评分', description: '完整性、一致性、质量、可用性四维评分', icon: Shield, color: 'text-emerald-600', bgColor: 'bg-emerald-50', checked: true },
    { id: 'findings', label: '关键发现', description: '严重/警告/提示/正面四类关键洞察', icon: Lightbulb, color: 'text-amber-600', bgColor: 'bg-amber-50', checked: true },
    { id: 'correlation', label: '相关性分析', description: 'Pearson相关系数与关联强度', icon: Activity, color: 'text-purple-600', bgColor: 'bg-purple-50', checked: true },
    { id: 'distribution', label: '分布分析', description: '偏度、峰度、正态性检验', icon: BarChart3, color: 'text-cyan-600', bgColor: 'bg-cyan-50', checked: false },
    { id: 'trend', label: '趋势分析', description: '上升/下降/波动/稳定趋势识别', icon: TrendingUp, color: 'text-indigo-600', bgColor: 'bg-indigo-50', checked: false },
    { id: 'charts', label: '推荐图表', description: 'AI推荐的6种图表类型及理由', icon: BarChart3, color: 'text-pink-600', bgColor: 'bg-pink-50', checked: true },
    { id: 'actions', label: '行动建议', description: '按优先级排序的可执行优化方案', icon: Zap, color: 'text-orange-600', bgColor: 'bg-orange-50', checked: true },
  ]);

  const [generating, setGenerating] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const reportRef = useRef<HTMLDivElement>(null);

  const deep = analysis?.deepAnalysis;

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => m.id === id ? { ...m, checked: !m.checked } : m));
  };

  const toggleAll = (checked: boolean) => {
    setModules(prev => prev.map(m => ({ ...m, checked })));
  };

  const checkedCount = modules.filter(m => m.checked).length;

  const generateReport = async () => {
    setGenerating(true);
    // 模拟生成延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    setGenerating(false);
    setReportVisible(true);
    // 默认展开所有勾选模块
    const checkedIds = modules.filter(m => m.checked).map(m => m.id);
    setExpandedSections(new Set(checkedIds));
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !reportRef.current) return;

    const reportHtml = reportRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>数据洞察报告 - ${fileName || 'DataInsight'}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .subtitle { color: #666; font-size: 14px; margin-bottom: 24px; }
            h2 { font-size: 18px; margin-top: 24px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
            .section { margin-bottom: 16px; }
            .metric { display: inline-block; padding: 8px 16px; margin: 4px; background: #f5f5f5; border-radius: 6px; }
            .finding { padding: 12px; margin: 8px 0; border-radius: 6px; }
            .finding-critical { background: #fef2f2; border-left: 3px solid #ef4444; }
            .finding-warning { background: #fff7ed; border-left: 3px solid #f97316; }
            .finding-info { background: #eff6ff; border-left: 3px solid #3b82f6; }
            .finding-positive { background: #f0fdf4; border-left: 3px solid #22c55e; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            th, td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #eee; }
            th { background: #f9fafb; font-weight: 600; }
            .score-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
            .score-fill { height: 100%; border-radius: 4px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${reportHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!analysis || !deep) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">暂无分析数据，请先进行智能分析</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 模块选择 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-primary" />
            选择报告模块
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={checkedCount === modules.length}
                onCheckedChange={(checked) => toggleAll(checked as boolean)}
              />
              <span className="text-sm text-muted-foreground">
                已选择 {checkedCount}/{modules.length} 个模块
              </span>
            </div>
            <Button
              onClick={generateReport}
              disabled={generating || checkedCount === 0}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 mr-2" />
              )}
              一键生成报告
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {modules.map(module => (
              <div
                key={module.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-md border transition-colors cursor-pointer',
                  module.checked ? 'border-primary/30 bg-primary/5' : 'border-border hover:bg-muted'
                )}
                onClick={() => toggleModule(module.id)}
              >
                <Checkbox
                  checked={module.checked}
                  onCheckedChange={() => {}}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <module.icon className={cn('w-4 h-4', module.color)} />
                    <span className="font-medium text-sm">{module.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{module.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 报告预览 */}
      <Dialog open={reportVisible} onOpenChange={setReportVisible}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  数据洞察报告
                </DialogTitle>
                <DialogDescription>
                  {fileName || 'DataInsight'} · 生成时间：{new Date().toLocaleString()}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1" />
                  打印
                </Button>
                <Button variant="outline" size="sm" onClick={() => setReportVisible(false)}>
                  关闭
                </Button>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div ref={reportRef} className="p-6 space-y-6">
              {!analysis ? (
                <div className="text-center py-10 text-muted-foreground">暂无分析数据</div>
              ) : (
              <div className="space-y-6">
              {/* 报告标题 */}
              <div className="text-center pb-6 border-b">
                <h1 className="text-2xl font-bold">数据洞察报告</h1>
                <p className="text-muted-foreground mt-1">{fileName || 'DataInsight'}</p>
                <p className="text-sm text-muted-foreground">生成时间：{new Date().toLocaleString()}</p>
              </div>

              {/* 1. 基础统计摘要 */}
              {modules.find(m => m.id === 'summary')?.checked && (
                <ReportSection
                  title="1. 基础统计摘要"
                  icon={Target}
                  expanded={expandedSections.has('summary')}
                  onToggle={() => toggleSection('summary')}
                >
                  <div className="grid grid-cols-2 gap-4">
                    <MetricCard label="总行数" value={analysis.summary.totalRows.toLocaleString()} />
                    <MetricCard label="总列数" value={analysis.summary.totalColumns.toString()} />
                    <MetricCard label="数值列" value={analysis.fieldStats.filter(f => f.type === 'number').length.toString()} />
                    <MetricCard label="文本列" value={analysis.fieldStats.filter(f => f.type === 'string' || f.type === 'id').length.toString()} />
                  </div>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">字段概览</h4>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">字段名</th>
                          <th className="text-left py-2">类型</th>
                          <th className="text-left py-2">非空率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analysis.fieldStats.slice(0, 10).map(fs => (
                          <tr key={fs.field} className="border-b">
                            <td className="py-2">{fs.field}</td>
                            <td className="py-2">{fs.type}</td>
                            <td className="py-2">{fs.count > 0 ? `${((1 - fs.nullCount / fs.count) * 100).toFixed(1)}%` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportSection>
              )}

              {/* 2. 数据健康评分 */}
              {modules.find(m => m.id === 'health')?.checked && (
                <ReportSection
                  title="2. 数据健康评分"
                  icon={Shield}
                  expanded={expandedSections.has('health')}
                  onToggle={() => toggleSection('health')}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-primary">{deep.healthScore.overall}</div>
                      <div className="text-sm text-muted-foreground">综合评分</div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <ScoreBar label="完整性" score={deep.healthScore.completeness} color="bg-blue-500" />
                      <ScoreBar label="一致性" score={deep.healthScore.consistency} color="bg-green-500" />
                      <ScoreBar label="质量" score={deep.healthScore.quality} color="bg-amber-500" />
                      <ScoreBar label="可用性" score={deep.healthScore.usability} color="bg-purple-500" />
                    </div>
                  </div>
                </ReportSection>
              )}

              {/* 3. 关键发现 */}
              {modules.find(m => m.id === 'findings')?.checked && (
                <ReportSection
                  title="3. 关键发现"
                  icon={Lightbulb}
                  expanded={expandedSections.has('findings')}
                  onToggle={() => toggleSection('findings')}
                >
                  <div className="space-y-2">
                    {deep.keyFindings.map((finding, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'p-3 rounded-md border-l-4',
                          finding.severity === 'critical' && 'bg-red-50 border-l-red-500',
                          finding.severity === 'warning' && 'bg-orange-50 border-l-orange-500',
                          finding.severity === 'info' && 'bg-blue-50 border-l-blue-500',
                          finding.severity === 'positive' && 'bg-green-50 border-l-green-500',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            finding.severity === 'critical' && 'text-red-600 border-red-200',
                            finding.severity === 'warning' && 'text-orange-600 border-orange-200',
                            finding.severity === 'info' && 'text-blue-600 border-blue-200',
                            finding.severity === 'positive' && 'text-green-600 border-green-200',
                          )}>
                            {finding.severity === 'critical' ? '严重' : finding.severity === 'warning' ? '警告' : finding.severity === 'info' ? '提示' : '正面'}
                          </Badge>
                          <span className="font-medium text-sm">{finding.title}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{finding.detail}</p>
                        {finding.suggestion && (
                          <p className="text-xs text-primary mt-1">建议：{finding.suggestion}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ReportSection>
              )}

              {/* 4. 相关性分析 */}
              {modules.find(m => m.id === 'correlation')?.checked && deep.correlations.length > 0 && (
                <ReportSection
                  title="4. 相关性分析"
                  icon={Activity}
                  expanded={expandedSections.has('correlation')}
                  onToggle={() => toggleSection('correlation')}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">字段1</th>
                        <th className="text-left py-2">字段2</th>
                        <th className="text-left py-2">相关系数</th>
                        <th className="text-left py-2">关联强度</th>
                        <th className="text-left py-2">方向</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deep.correlations.slice(0, 10).map((c, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">{c.field1}</td>
                          <td className="py-2">{c.field2}</td>
                          <td className="py-2 font-mono">{c.coefficient.toFixed(3)}</td>
                          <td className="py-2">
                            <Badge variant="outline" className={cn(
                              'text-xs',
                              c.strength === 'strong' ? 'text-red-600' : c.strength === 'moderate' ? 'text-orange-600' : 'text-foreground'
                            )}>
                              {c.strength === 'strong' ? '强' : c.strength === 'moderate' ? '中等' : '弱'}
                            </Badge>
                          </td>
                          <td className="py-2">{c.direction === 'positive' ? '正相关' : '负相关'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ReportSection>
              )}

              {/* 5. 分布分析 */}
              {modules.find(m => m.id === 'distribution')?.checked && deep.distributions.length > 0 && (
                <ReportSection
                  title="5. 分布分析"
                  icon={BarChart3}
                  expanded={expandedSections.has('distribution')}
                  onToggle={() => toggleSection('distribution')}
                >
                  <div className="space-y-2">
                    {deep.distributions.map((d, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{d.field}</span>
                          <Badge variant="outline" className="text-xs">
                            {d.type === 'normal' ? '正态分布' : d.type === 'skewed_left' ? '左偏' : d.type === 'skewed_right' ? '右偏' : d.type === 'bimodal' ? '双峰' : '均匀'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          偏度: {d.skewness.toFixed(2)} · 峰度: {d.kurtosis.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">{d.description}</p>
                      </div>
                    ))}
                  </div>
                </ReportSection>
              )}

              {/* 6. 趋势分析 */}
              {modules.find(m => m.id === 'trend')?.checked && deep.trends.length > 0 && (
                <ReportSection
                  title="6. 趋势分析"
                  icon={TrendingUp}
                  expanded={expandedSections.has('trend')}
                  onToggle={() => toggleSection('trend')}
                >
                  <div className="space-y-2">
                    {deep.trends.map((t, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-md">
                        <div>
                          <span className="font-medium text-sm">{t.field}</span>
                          <p className="text-xs text-muted-foreground">{t.description}</p>
                        </div>
                        <Badge className={cn(
                          t.direction === 'up' ? 'bg-green-100 text-green-700' :
                          t.direction === 'down' ? 'bg-red-100 text-red-700' :
                          t.direction === 'volatile' ? 'bg-amber-100 text-amber-700' :
                          'bg-muted text-foreground'
                        )}>
                          {t.direction === 'up' ? '上升' : t.direction === 'down' ? '下降' : t.direction === 'volatile' ? '波动' : '稳定'}
                          {t.changeRate !== 0 && ` ${Math.abs(t.changeRate).toFixed(1)}%`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ReportSection>
              )}

              {/* 7. 推荐图表 */}
              {modules.find(m => m.id === 'charts')?.checked && deep.recommendedCharts.length > 0 && (
                <ReportSection
                  title="7. 推荐图表"
                  icon={BarChart3}
                  expanded={expandedSections.has('charts')}
                  onToggle={() => toggleSection('charts')}
                >
                  <div className="space-y-2">
                    {deep.recommendedCharts.slice(0, 6).map((chart, idx) => (
                      <div key={idx} className="p-3 bg-muted rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{chart.title}</span>
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            chart.priority === 'high' ? 'text-red-600' : chart.priority === 'medium' ? 'text-orange-600' : 'text-foreground'
                          )}>
                            {chart.priority === 'high' ? '高优先级' : chart.priority === 'medium' ? '中优先级' : '低优先级'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">类型: {chart.chartType} · X轴: {chart.xField} · Y轴: {chart.yField}</p>
                        <p className="text-xs text-primary mt-1">{chart.reason}</p>
                      </div>
                    ))}
                  </div>
                </ReportSection>
              )}

              {/* 8. 行动建议 */}
              {modules.find(m => m.id === 'actions')?.checked && deep.actionItems.length > 0 && (
                <ReportSection
                  title="8. 行动建议"
                  icon={Zap}
                  expanded={expandedSections.has('actions')}
                  onToggle={() => toggleSection('actions')}
                >
                  <div className="space-y-2">
                    {deep.actionItems.slice(0, 10).map((item, idx) => (
                      <div key={idx} className={cn(
                        'p-3 rounded-md border-l-4',
                        item.priority === 'high' ? 'bg-red-50 border-l-red-500' :
                        item.priority === 'medium' ? 'bg-orange-50 border-l-orange-500' :
                        'bg-blue-50 border-l-blue-500'
                      )}>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn(
                            'text-xs',
                            item.priority === 'high' ? 'text-red-600' : item.priority === 'medium' ? 'text-orange-600' : 'text-blue-600'
                          )}>
                            {item.priority === 'high' ? '高' : item.priority === 'medium' ? '中' : '低'}
                          </Badge>
                          <span className="font-medium text-sm">{item.action}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{item.detail}</p>
                        {item.expectedBenefit && (
                          <p className="text-xs text-green-600 mt-1">预期收益：{item.expectedBenefit}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ReportSection>
              )}

              {/* 报告底部 */}
              <div className="text-center pt-6 border-t text-sm text-muted-foreground">
                <p>本报告由 DataInsight AI 自动生成</p>
                <p className="mt-1">报告内容基于数据分析结果，仅供参考</p>
              </div>
              </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// 报告小节组件
function ReportSection({
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ElementType;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-md">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

// 指标卡片
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-muted rounded-md text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// 评分条
function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span>{label}</span>
        <span className="font-medium">{score}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
