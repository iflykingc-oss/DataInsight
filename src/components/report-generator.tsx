'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  FileText,
  Download,
  FileSpreadsheet,
  Image,
  Printer,
  CheckCircle,
  Loader2
} from 'lucide-react';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

interface ReportData {
  title: string;
  template: ReportTemplate;
  data: ParsedData;
  analysis: DataAnalysis;
  options: ReportExportOptions;
}

interface ReportSection {
  title: string;
  content: string;
}

interface ReportGeneratorProps {
  data: ParsedData;
  analysis: DataAnalysis;
  onExport?: (format: string, options: ReportExportOptions) => void;
}

type ReportTemplate = 'summary' | 'business' | 'financial' | 'operation';
type ExportFormat = 'pdf' | 'excel' | 'image';

export function ReportGenerator({ data, analysis, onExport }: ReportGeneratorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate>('summary');
  const [reportTitle, setReportTitle] = useState('数据分析报告');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeRawData, setIncludeRawData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  
  const templates = [
    {
      id: 'summary',
      name: '汇总报告',
      description: '包含基础统计和关键洞察',
      icon: FileText
    },
    {
      id: 'business',
      name: '业务报告',
      description: '适合运营和销售数据展示',
      icon: FileSpreadsheet
    },
    {
      id: 'financial',
      name: '财务报表',
      description: '包含财务指标和趋势分析',
      icon: FileText
    },
    {
      id: 'operation',
      name: '运营报告',
      description: '全面运营数据和分析建议',
      icon: FileText
    }
  ];
  
  const handleExport = async (format: ExportFormat) => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      // 模拟导出进度
      const progressInterval = setInterval(() => {
        setExportProgress(prev => Math.min(prev + 10, 90));
      }, 200);
      
      // 准备报告数据
      const reportData = {
        title: reportTitle,
        template: selectedTemplate,
        data,
        analysis,
        options: {
          includeCharts,
          includeRawData
        }
      };
      
      // 根据格式导出
      switch (format) {
        case 'pdf':
          await exportToPDF(reportData);
          break;
        case 'excel':
          await exportToExcel(reportData);
          break;
        case 'image':
          await exportToImage(reportData);
          break;
      }
      
      clearInterval(progressInterval);
      setExportProgress(100);
      
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
      
    } catch (error) {
      console.error('导出失败:', error);
      setIsExporting(false);
      setExportProgress(0);
    }
  };
  
  const exportToPDF = async (reportData: ReportData) => {
    // 生成PDF内容
    const content = generateReportContent(reportData);
    console.log('生成PDF:', content);
    // 实际应用中这里会调用PDF生成库
  };
  
  const exportToExcel = async (reportData: ReportData) => {
    // 生成Excel内容
    console.log('生成Excel:', reportData);
    // 实际应用中这里会调用Excel生成库
  };
  
  const exportToImage = async (reportData: ReportData) => {
    // 生成图片内容
    console.log('生成图片:', reportData);
    // 实际应用中这里会调用图片生成库
  };
  
  const generateReportContent = (reportData: ReportData): { title: string; sections: ReportSection[] } => {
    return {
      title: reportData.title,
      sections: [
        {
          title: '数据概览',
          content: `总行数: ${reportData.analysis.summary.totalRows}
总列数: ${reportData.analysis.summary.totalColumns}
空值数: ${reportData.analysis.summary.nullValues}`
        },
        {
          title: '关键洞察',
          content: reportData.analysis.insights.join('\n')
        }
      ]
    };
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-500" />
          报表生成
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 报告标题 */}
        <div className="space-y-2">
          <Label htmlFor="reportTitle">报告标题</Label>
          <Input
            id="reportTitle"
            value={reportTitle}
            onChange={e => setReportTitle(e.target.value)}
            placeholder="输入报告标题"
          />
        </div>
        
        {/* 模板选择 */}
        <div className="space-y-3">
          <Label>报告模板</Label>
          <div className="grid grid-cols-2 gap-3">
            {templates.map(template => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedTemplate(template.id as ReportTemplate)}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 ${
                      selectedTemplate === template.id ? 'text-primary' : 'text-gray-400'
                    }`} />
                    <div>
                      <p className="font-medium text-sm">{template.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                    </div>
                  </div>
                  {selectedTemplate === template.id && (
                    <CheckCircle className="absolute top-2 right-2 w-4 h-4 text-primary" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        {/* 选项 */}
        <div className="space-y-3">
          <Label>导出选项</Label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeCharts}
                onChange={e => setIncludeCharts(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">包含图表</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRawData}
                onChange={e => setIncludeRawData(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">包含原始数据（表格）</span>
            </label>
          </div>
        </div>
        
        {/* 导出按钮 */}
        <div className="space-y-3">
          <Label>导出格式</Label>
          {isExporting ? (
            <div className="space-y-2">
              <Progress value={exportProgress} />
              <p className="text-sm text-gray-500 text-center">
                正在生成报表... {exportProgress}%
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => handleExport('pdf')}
              >
                <FileText className="w-6 h-6" />
                <span className="text-xs">PDF</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => handleExport('excel')}
              >
                <FileSpreadsheet className="w-6 h-6" />
                <span className="text-xs">Excel</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => handleExport('image')}
              >
                <Image className="w-6 h-6" />
                <span className="text-xs">图片</span>
              </Button>
            </div>
          )}
        </div>
        
        {/* 打印预览 */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full">
              <Printer className="w-4 h-4 mr-2" />
              打印预览
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>{reportTitle}</DialogTitle>
              <DialogDescription>
                报告模板: {templates.find(t => t.id === selectedTemplate)?.name}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 p-4 border rounded-lg">
              {/* 报告预览内容 */}
              <div>
                <h3 className="text-lg font-bold mb-4">数据概览</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-2xl font-bold">{analysis.summary.totalRows.toLocaleString()}</p>
                    <p className="text-sm text-gray-500">总行数</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-2xl font-bold">{analysis.summary.totalColumns}</p>
                    <p className="text-sm text-gray-500">总列数</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-2xl font-bold">{analysis.summary.numericColumns}</p>
                    <p className="text-sm text-gray-500">数值列</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-2xl font-bold">{analysis.summary.nullValues}</p>
                    <p className="text-sm text-gray-500">空值数</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-4">智能洞察</h3>
                <ul className="space-y-2">
                  {analysis.insights.slice(0, 3).map((insight, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-500">•</span>
                      <span className="text-sm">{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {includeCharts && (
                <div>
                  <h3 className="text-lg font-bold mb-4">数据图表</h3>
                  <div className="h-48 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                    图表预览区域
                  </div>
                </div>
              )}
              
              {includeRawData && (
                <div>
                  <h3 className="text-lg font-bold mb-4">原始数据（前10行）</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          {data.headers.map(h => (
                            <th key={h} className="text-left p-2 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.slice(0, 10).map((row, i) => (
                          <tr key={i} className="border-b">
                            {data.headers.map(h => (
                              <td key={h} className="p-2">{String(row[h] || '')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" />
                打印
              </Button>
              <Button onClick={() => handleExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                下载PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
