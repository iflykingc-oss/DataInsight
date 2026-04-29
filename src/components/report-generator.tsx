'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
import {
  FileText,
  Download,
  FileSpreadsheet,
  Image,
  Printer,
  CheckCircle,
  Loader2,
  BarChart3,
  Shield,
  Target,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  Clock,
  User,
  Building,
  Activity
} from 'lucide-react';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

type ReportTemplate = 'summary' | 'business' | 'financial' | 'operation';
type ExportFormat = 'pdf' | 'excel' | 'image';

interface ReportGeneratorProps {
  data: ParsedData;
  analysis: DataAnalysis;
}

export function ReportGenerator({ data, analysis }: ReportGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('summary');
  const [reportTitle, setReportTitle] = useState('数据分析报告');
  const [reportAuthor, setReportAuthor] = useState('DataInsight');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);

  const deep = analysis.deepAnalysis;

  const templates = [
    { id: 'summary' as const, name: '汇总报告', description: '数据概览+关键洞察+统计摘要', icon: FileText, color: 'text-blue-600 bg-blue-50' },
    { id: 'business' as const, name: '业务报告', description: '业务洞察+趋势分析+行动建议', icon: Building, color: 'text-green-600 bg-green-50' },
    { id: 'financial' as const, name: '财务报表', description: '财务指标+健康评分+风险预警', icon: Activity, color: 'text-orange-600 bg-orange-50' },
    { id: 'operation' as const, name: '运营报告', description: '全面运营分析+优化方案+预期收益', icon: Target, color: 'text-purple-600 bg-purple-50' },
  ];

  // 生成报告内容（包含深度分析）
  const reportSections = useMemo(() => {
    const sections: Array<{ title: string; icon: React.ElementType; content: React.ReactNode }> = [];

    // 1. 数据概览
    sections.push({
      title: '数据概览',
      icon: BarChart3,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-700">{analysis.summary.totalRows.toLocaleString()}</p>
              <p className="text-xs text-blue-500">总行数</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-700">{analysis.summary.totalColumns}</p>
              <p className="text-xs text-green-500">总列数</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-700">{analysis.summary.numericColumns}</p>
              <p className="text-xs text-orange-500">数值列</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg text-center">
              <p className="text-2xl font-bold text-red-700">{analysis.summary.nullValues}</p>
              <p className="text-xs text-red-500">空值数</p>
            </div>
          </div>
          {deep && (
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-purple-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-purple-700">{deep.dataProfile.dataType}</p>
                <p className="text-xs text-purple-500">数据类型</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-indigo-700">{deep.dataProfile.suggestedIndustry}</p>
                <p className="text-xs text-indigo-500">推测行业</p>
              </div>
              <div className="p-3 bg-cyan-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-cyan-700">
                  {deep.dataProfile.dataMaturity === 'raw' ? '原始' :
                   deep.dataProfile.dataMaturity === 'cleaned' ? '已清洗' :
                   deep.dataProfile.dataMaturity === 'structured' ? '结构化' : '已分析'}
                </p>
                <p className="text-xs text-cyan-500">数据成熟度</p>
              </div>
              <div className="p-3 bg-teal-50 rounded-lg text-center">
                <p className="text-2xl font-bold text-teal-700">
                  {deep.dataProfile.analysisPotential === 'high' ? '高' :
                   deep.dataProfile.analysisPotential === 'medium' ? '中' : '低'}
                </p>
                <p className="text-xs text-teal-500">分析潜力</p>
              </div>
            </div>
          )}
        </div>
      )
    });

    // 2. 健康评分（如有深度分析）
    if (deep) {
      sections.push({
        title: '数据健康评分',
        icon: Shield,
        content: (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold" style={{ color: getScoreColor(deep.healthScore.overall) }}>
                  {deep.healthScore.overall}
                </div>
                <p className="text-sm text-gray-500 mt-1">综合评分</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: '完整性', value: deep.healthScore.completeness, color: '#1890ff' },
                { label: '一致性', value: deep.healthScore.consistency, color: '#52c41a' },
                { label: '质量', value: deep.healthScore.quality, color: '#faad14' },
                { label: '可用性', value: deep.healthScore.usability, color: '#722ed1' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <Progress value={item.value} className="h-2 mb-1" />
                  <p className="text-xs text-gray-500">{item.label}: {item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )
      });
    }

    // 3. 关键发现
    if (deep && deep.keyFindings.length > 0) {
      sections.push({
        title: '关键发现',
        icon: Lightbulb,
        content: (
          <div className="space-y-2">
            {deep.keyFindings.slice(0, 8).map((finding, idx) => (
              <div key={idx} className={`p-3 rounded-lg border ${
                finding.severity === 'critical' ? 'border-red-200 bg-red-50' :
                finding.severity === 'warning' ? 'border-orange-200 bg-orange-50' :
                finding.severity === 'positive' ? 'border-green-200 bg-green-50' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-xs ${
                    finding.severity === 'critical' ? 'text-red-600 border-red-300' :
                    finding.severity === 'warning' ? 'text-orange-600 border-orange-300' :
                    finding.severity === 'positive' ? 'text-green-600 border-green-300' :
                    'text-blue-600 border-blue-300'
                  }`}>
                    {finding.severity === 'critical' ? '严重' :
                     finding.severity === 'warning' ? '警告' :
                     finding.severity === 'positive' ? '正面' : '提示'}
                  </Badge>
                  <span className="font-medium text-sm">{finding.title}</span>
                </div>
                <p className="text-xs text-gray-600">{finding.detail}</p>
                <p className="text-xs text-green-600 mt-1">建议: {finding.suggestion}</p>
              </div>
            ))}
          </div>
        )
      });
    }

    // 4. 趋势分析
    if (deep && deep.trends.length > 0) {
      sections.push({
        title: '趋势分析',
        icon: TrendingUp,
        content: (
          <div className="space-y-2">
            {deep.trends.map((trend, idx) => (
              <div key={idx} className={`p-3 rounded-lg ${
                trend.direction === 'up' ? 'bg-green-50' :
                trend.direction === 'down' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${
                    trend.direction === 'up' ? 'text-green-600' :
                    trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                  <span className="font-medium text-sm">{trend.field}</span>
                  <Badge variant="outline" className="text-xs">
                    {trend.direction === 'up' ? '上升' :
                     trend.direction === 'down' ? '下降' :
                     trend.direction === 'volatile' ? '波动' : '稳定'}
                    {trend.changeRate !== 0 && ` ${Math.abs(trend.changeRate)}%`}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{trend.description}</p>
              </div>
            ))}
          </div>
        )
      });
    }

    // 5. 行动建议
    if (deep && deep.actionItems.length > 0) {
      sections.push({
        title: '行动建议',
        icon: Target,
        content: (
          <div className="space-y-2">
            {deep.actionItems.map((item, idx) => (
              <div key={idx} className={`p-3 rounded-lg border-l-4 ${
                item.priority === 'high' ? 'border-l-red-400 bg-red-50/50' :
                item.priority === 'medium' ? 'border-l-orange-400 bg-orange-50/50' :
                'border-l-blue-400 bg-blue-50/50'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {item.priority === 'high' ? '高优' : item.priority === 'medium' ? '中优' : '低优'}
                  </Badge>
                  <span className="font-medium text-sm">{item.action}</span>
                </div>
                <p className="text-xs text-gray-600">{item.detail}</p>
                <p className="text-xs text-green-600 mt-1">预期收益: {item.expectedBenefit}</p>
              </div>
            ))}
          </div>
        )
      });
    }

    // 6. 字段统计
    sections.push({
      title: '字段统计',
      icon: BarChart3,
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-3 font-medium">字段</th>
                <th className="text-left py-2 px-3 font-medium">类型</th>
                <th className="text-right py-2 px-3 font-medium">非空</th>
                <th className="text-right py-2 px-3 font-medium">唯一值</th>
                <th className="text-right py-2 px-3 font-medium">最小值</th>
                <th className="text-right py-2 px-3 font-medium">最大值</th>
                <th className="text-right py-2 px-3 font-medium">均值</th>
              </tr>
            </thead>
            <tbody>
              {analysis.fieldStats.map((stat, idx) => (
                <tr key={idx} className="border-b">
                  <td className="py-2 px-3 font-medium">{stat.field}</td>
                  <td className="py-2 px-3">
                    <Badge variant="outline" className="text-xs">
                      {stat.type === 'number' ? '数值' : stat.type === 'date' ? '日期' : '文本'}
                    </Badge>
                  </td>
                  <td className="py-2 px-3 text-right">{stat.count - stat.nullCount}/{stat.count}</td>
                  <td className="py-2 px-3 text-right">{stat.uniqueCount}</td>
                  <td className="py-2 px-3 text-right">{stat.numericStats?.min ?? '-'}</td>
                  <td className="py-2 px-3 text-right">{stat.numericStats?.max ?? '-'}</td>
                  <td className="py-2 px-3 text-right">{stat.numericStats?.mean?.toFixed(2) ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    });

    return sections;
  }, [analysis, deep]);

  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportProgress(0);

    const progressInterval = setInterval(() => {
      setExportProgress(prev => Math.min(prev + 15, 90));
    }, 200);

    try {
      if (format === 'pdf') {
        clearInterval(progressInterval);
        setExportProgress(30);

        try {
          const response = await fetch('/api/export/pdf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: reportTitle,
              subtitle: `${reportAuthor} • ${new Date().toLocaleDateString()}`,
              tableData: {
                headers: data.headers,
                rows: data.rows.slice(0, 50).map(row =>
                  data.headers.map(h => row[h] ?? '')
                ),
              },
            }),
          });

          if (response.ok) {
            setExportProgress(70);
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${reportTitle.replace(/\s+/g, '_')}.pdf`;
            link.click();
            URL.revokeObjectURL(url);
            setExportProgress(100);
          } else {
            window.print();
            setExportProgress(100);
          }
        } catch {
          window.print();
          setExportProgress(100);
        }

        setIsExporting(false);
        setExportProgress(0);
        return;
      }

      if (format === 'image') {
        // 使用 html2canvas 导出图片
        try {
          const html2canvas = (await import('html2canvas')).default;
          if (reportRef.current) {
            const canvas = await html2canvas(reportRef.current, {
              scale: 2, // 高清导出
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            });
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${reportTitle}.png`;
                link.click();
                URL.revokeObjectURL(url);
              }
            }, 'image/png');
          }
        } catch (error) {
          console.error('图片导出失败:', error);
        }
        clearInterval(progressInterval);
        setExportProgress(100);
        setTimeout(() => {
          setIsExporting(false);
          setExportProgress(0);
        }, 1000);
        return;
      }

      if (format === 'excel') {
        // 动态导入 xlsx 生成 Excel
        const XLSX = await import('xlsx');
        const ws = XLSX.utils.json_to_sheet(data.rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '数据');
        
        // 添加分析摘要sheet
        const summaryData = analysis.fieldStats.map(s => ({
          字段: s.field,
          类型: s.type,
          非空数: s.count - s.nullCount,
          唯一值数: s.uniqueCount,
          最小值: s.numericStats?.min ?? '',
          最大值: s.numericStats?.max ?? '',
          均值: s.numericStats?.mean?.toFixed(2) ?? ''
        }));
        const ws2 = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, ws2, '统计摘要');

        XLSX.writeFile(wb, `${reportTitle}.xlsx`);
      }

      clearInterval(progressInterval);
      setExportProgress(100);
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    } catch (error) {
      console.error('导出失败:', error);
      clearInterval(progressInterval);
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const getTemplateName = () => templates.find(t => t.id === selectedTemplate)?.name || '';

  return (
    <div className="space-y-4">
      {/* 配置区 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            报表配置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>报告标题</Label>
              <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} placeholder="输入报告标题" />
            </div>
            <div className="space-y-2">
              <Label>报告作者</Label>
              <Input value={reportAuthor} onChange={e => setReportAuthor(e.target.value)} placeholder="输入作者" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>报告模板</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {templates.map(template => {
                const Icon = template.icon;
                const isSelected = selectedTemplate === template.id;
                return (
                  <div
                    key={template.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${template.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="font-medium text-sm">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                    {isSelected && <CheckCircle className="w-4 h-4 text-primary mt-1" />}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>导出</Label>
            {isExporting ? (
              <div className="space-y-2">
                <Progress value={exportProgress} />
                <p className="text-sm text-gray-500 text-center">正在生成报表... {exportProgress}%</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" onClick={() => handleExport('pdf')}>
                  <FileText className="w-5 h-5" />
                  <span className="text-xs">打印/PDF</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="w-5 h-5" />
                  <span className="text-xs">Excel</span>
                </Button>
                <Button variant="outline" className="flex flex-col items-center gap-1 h-auto py-3" onClick={() => handleExport('image')}>
                  <Image className="w-5 h-5" />
                  <span className="text-xs">图片</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 报告预览 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              报告预览
            </CardTitle>
            <Badge variant="outline">{getTemplateName()}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={reportRef} className="border rounded-lg p-6 bg-white space-y-6 print:shadow-none">
            {/* 报告头 */}
            <div className="border-b pb-4">
              <h1 className="text-2xl font-bold text-gray-900">{reportTitle}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date().toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><User className="w-3 h-3" />{reportAuthor}</span>
                <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{data.fileName}</span>
              </div>
            </div>

            {/* 报告章节 */}
            {reportSections.map((section, idx) => {
              const Icon = section.icon;
              return (
                <div key={idx}>
                  <h2 className="text-lg font-semibold flex items-center gap-2 mb-3 text-gray-800">
                    <Icon className="w-5 h-5 text-primary" />
                    {idx + 1}. {section.title}
                  </h2>
                  {section.content}
                </div>
              );
            })}

            {/* 报告尾 */}
            <div className="border-t pt-4 text-center text-xs text-gray-400">
              <p>本报告由 DataInsight Pro 自动生成 | {new Date().toLocaleString()}</p>
              <p>数据来源: {data.fileName} | 行数: {data.rowCount} | 列数: {data.columnCount}</p>
            </div>
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
