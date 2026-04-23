'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileUploader } from '@/components/file-uploader';
import { DataTable } from '@/components/data-table';
import { DataInsights } from '@/components/data-insights';
import { Dashboard } from '@/components/dashboard';
import { LLMAssistant } from '@/components/llm-assistant';
import { FeishuIntegration } from '@/components/feishu-integration';
import { ReportGenerator } from '@/components/report-generator';
import {
  FileSpreadsheet,
  BarChart3,
  Table2,
  Brain,
  Link2,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

type ViewMode = 'table' | 'insights' | 'dashboard' | 'chat' | 'report';

export default function HomePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  
  const handleFileUpload = async (uploadedFiles: File[]) => {
    setFiles(uploadedFiles);
    setIsLoading(true);
    setError(null);
    
    try {
      // 创建 FormData
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('files', file);
      });
      
      // 上传并解析文件
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('文件处理失败');
      }
      
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        // 合并多个文件的数据（如果需要）
        const firstData = result.data[0];
        setParsedData(firstData);
        
        // 请求数据分析
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: firstData })
        });
        
        if (analyzeResponse.ok) {
          const analyzeResult = await analyzeResponse.json();
          setAnalysis(analyzeResult.analysis);
        }
      }
      
    } catch (err) {
      console.error('文件处理错误:', err);
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleFeishuImport = (data: { headers: string[]; rows: Record<string, string | number>[] }) => {
    setParsedData({
      headers: data.headers,
      rows: data.rows,
      fileName: 'feishu_import',
      rowCount: data.rows.length,
      columnCount: data.headers.length
    });
    
    // 分析导入的数据
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          headers: data.headers,
          rows: data.rows,
          fileName: 'feishu_import',
          rowCount: data.rows.length,
          columnCount: data.headers.length
        }
      })
    })
      .then(res => res.json())
      .then(result => setAnalysis(result.analysis))
      .catch(console.error);
  };
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-gray-600">正在解析文件...</p>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => {
            setError(null);
            setFiles([]);
            setParsedData(null);
            setAnalysis(null);
          }}>
            重新上传
          </Button>
        </div>
      );
    }
    
    if (!parsedData) {
      return (
        <div className="space-y-8">
          {/* Hero Section */}
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              智能表格数据处理与可视化
            </h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-8">
              轻量化数据分析工具，支持Excel/CSV上传，自动清洗分析，一键生成交互式报表与仪表盘
            </p>
            
            {/* 功能特点 */}
            <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-12">
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <FileSpreadsheet className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <h3 className="font-medium">多格式支持</h3>
                <p className="text-sm text-gray-500">Excel、CSV、飞书表格</p>
              </div>
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <h3 className="font-medium">智能分析</h3>
                <p className="text-sm text-gray-500">自动数据清洗与统计</p>
              </div>
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <Table2 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <h3 className="font-medium">交互仪表盘</h3>
                <p className="text-sm text-gray-500">可视化图表组件</p>
              </div>
              <div className="p-4 bg-white rounded-lg border shadow-sm">
                <Brain className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h3 className="font-medium">AI 洞察</h3>
                <p className="text-sm text-gray-500">智能数据解读</p>
              </div>
            </div>
          </div>
          
          {/* 上传区域 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">上传数据文件</CardTitle>
            </CardHeader>
            <CardContent>
              <FileUploader onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>
          
          {/* 飞书集成 */}
          <FeishuIntegration onImportData={handleFeishuImport} />
        </div>
      );
    }
    
    // 已加载数据，渲染内容
    return (
      <div className="space-y-6">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="font-medium">{parsedData.fileName}</h2>
              <p className="text-sm text-gray-500">
                {parsedData.rowCount.toLocaleString()} 行 × {parsedData.columnCount} 列
              </p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setParsedData(null);
              setAnalysis(null);
              setFiles([]);
            }}
          >
            上传新文件
          </Button>
        </div>
        
        {/* 视图切换 */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="table" className="flex items-center gap-2">
              <Table2 className="w-4 h-4" />
              <span className="hidden sm:inline">数据表</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">分析</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">仪表盘</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <span className="hidden sm:inline">AI助手</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">报表</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="table" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">数据表格</CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable data={parsedData} fieldStats={analysis?.fieldStats} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="insights" className="mt-6">
            {analysis ? (
              <DataInsights analysis={analysis} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="dashboard" className="mt-6">
            {analysis ? (
              <Dashboard data={parsedData} fieldStats={analysis.fieldStats} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="chat" className="mt-6">
            {analysis ? (
              <div className="grid lg:grid-cols-2 gap-6">
                <LLMAssistant data={parsedData} analysis={analysis} />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">快速操作</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setViewMode('insights')}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      查看完整分析报告
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setViewMode('dashboard')}
                    >
                      <BarChart3 className="w-4 h-4 mr-2" />
                      进入可视化仪表盘
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => setViewMode('report')}
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      生成导出报表
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="report" className="mt-6">
            {analysis ? (
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <ReportGenerator
                    data={parsedData}
                    analysis={analysis}
                  />
                </div>
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">报表模板</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-sm">汇总报告</h4>
                        <p className="text-xs text-gray-500">基础统计 + 关键洞察</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm">业务报告</h4>
                        <p className="text-xs text-gray-500">运营/销售数据</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm">财务报表</h4>
                        <p className="text-xs text-gray-500">财务指标 + 趋势</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-sm">运营报告</h4>
                        <p className="text-xs text-gray-500">全面分析建议</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">DataInsight</h1>
                <p className="text-xs text-gray-500">智能数据处理平台</p>
              </div>
            </div>
            
            {parsedData && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                数据已加载
              </Badge>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            DataInsight - 轻量化智能表格数据处理与可视化工具
          </p>
        </div>
      </footer>
    </div>
  );
}
