'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileUploader, UploadFile } from '@/components/file-uploader';
import { DataTable } from '@/components/data-table';
import { DataInsights } from '@/components/data-insights';
import { Dashboard } from '@/components/dashboard';

import { ReportGenerator } from '@/components/report-generator';
import { DataSourceManager } from '@/components/data-source-manager';
import { DataCleaner } from '@/components/data-cleaner';
import { AdvancedCharts } from '@/components/advanced-charts';
import { DashboardDesigner } from '@/components/dashboard-designer';
import { EnhancedLLMAssistant } from '@/components/enhanced-llm-assistant';
import { ShareManager } from '@/components/share-manager';
import { GlobalAIAssistant } from '@/components/global-ai-assistant';
import { SmartChartRecommender } from '@/components/smart-chart-recommender';
import { AIModelSettings } from '@/components/ai-model-settings';
import { MetricSemanticLayer } from '@/components/metric-semantic-layer';
import { DataQualityChecker } from '@/components/data-quality-checker';
import { DataAlerting } from '@/components/data-alerting';
import { NL2Dashboard } from '@/components/nl2-dashboard';
import { VersionHistory } from '@/components/version-history';
import { TemplateManager } from '@/components/template-manager';
import { ChartExporter } from '@/components/chart-exporter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  FileSpreadsheet,
  BarChart3,
  Table2,
  Brain,
  Link,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Database,
  Filter,
  Sparkles,
  LayoutGrid,
  Settings,
  Wand2,
  Target,
  Shield,
  Bell,
  Bookmark,
  Download,
  History,
  Bot,
  Upload,
  Trash2
} from 'lucide-react';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

type ViewMode = 'table' | 'insights' | 'dashboard' | 'chat' | 'report' | 'source' | 'clean' | 'advanced' | 'designer' | 'share' | 'aiChart' | 'metric' | 'quality' | 'alert' | 'nl2dash' | 'version' | 'template' | 'export';

export default function HomePage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('datainsight-darkmode') === 'true';
    }
    return false;
  });
  const [showSettings, setShowSettings] = useState(false);
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // 页面加载时应用保存的深色模式
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);
  
  const handleFileUpload = async (uploadedFiles: UploadFile[]) => {
    setFiles(uploadedFiles);
    setIsLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      uploadedFiles.forEach(uploadFile => {
        formData.append('files', uploadFile.file);
      });
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('文件处理失败');
      }
      
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const firstData = result.data[0];
        setParsedData(firstData);
        
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
  
  const handleDataCleaned = (cleanedData: ParsedData) => {
    setParsedData(cleanedData);
    // 重新分析清洗后的数据
    handleAnalyzeWith(cleanedData);
  };

  const handleAnalyze = () => {
    if (parsedData) handleAnalyzeWith(parsedData);
  };

  const handleAnalyzeWith = (data: ParsedData) => {
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
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
        <div className={`min-h-screen flex ${darkMode ? 'dark' : ''}`}>
          {/* 左侧导航菜单 - RuoYi风格 */}
          <aside className="w-64 bg-[#1890ff] text-white flex-shrink-0">
            {/* Logo区域 */}
            <div className="h-16 flex items-center px-4 border-b border-blue-400/30">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3">
                <BarChart3 className="w-6 h-6 text-[#1890ff]" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">DataInsight</h1>
                <p className="text-xs text-blue-200">智能数据分析平台</p>
              </div>
            </div>
            
            {/* 菜单 */}
            <nav className="py-4">
              <div className="px-4 py-2 text-xs text-blue-200 uppercase tracking-wider">数据中心</div>
              <button
                onClick={() => setViewMode('table')}
                className={`w-full flex items-center px-4 py-3 transition-colors text-left ${viewMode === 'table' ? 'bg-[#006bb3] border-l-4 border-white' : 'hover:bg-[#006bb3]'}`}
              >
                <Database className="w-5 h-5 mr-3" />
                <span>数据导入</span>
              </button>
              <button
                onClick={() => setViewMode('source')}
                className={`w-full flex items-center px-4 py-3 transition-colors text-left ${viewMode === 'source' ? 'bg-[#006bb3] border-l-4 border-white' : 'hover:bg-[#006bb3]'}`}
              >
                <FileText className="w-5 h-5 mr-3" />
                <span>数据源管理</span>
              </button>
              <button
                onClick={() => setViewMode('clean')}
                className={`w-full flex items-center px-4 py-3 transition-colors text-left ${viewMode === 'clean' ? 'bg-[#006bb3] border-l-4 border-white' : 'hover:bg-[#006bb3]'}`}
              >
                <Link className="w-5 h-5 mr-3" />
                <span>数据清洗</span>
              </button>

              <div className="px-4 py-2 text-xs text-blue-200 uppercase tracking-wider mt-4">配置中心</div>
              <button
                onClick={() => setShowSettings(true)}
                className="w-full flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors text-left"
              >
                <Bot className="w-5 h-5 mr-3" />
                <span>AI模型配置</span>
              </button>
              <button
                onClick={() => setViewMode('metric')}
                className={`w-full flex items-center px-4 py-3 transition-colors text-left ${viewMode === 'metric' ? 'bg-[#006bb3] border-l-4 border-white' : 'hover:bg-[#006bb3]'}`}
              >
                <Target className="w-5 h-5 mr-3" />
                <span>指标语义层</span>
              </button>

              <div className="px-4 py-2 text-xs text-blue-200 uppercase tracking-wider mt-4">工具箱</div>
              <button
                onClick={() => setViewMode('nl2dash')}
                className={`w-full flex items-center px-4 py-3 transition-colors text-left ${viewMode === 'nl2dash' ? 'bg-[#006bb3] border-l-4 border-white' : 'hover:bg-[#006bb3]'}`}
              >
                <Wand2 className="w-5 h-5 mr-3" />
                <span>NL2Dashboard</span>
              </button>
              <button
                onClick={() => setViewMode('export')}
                className={`w-full flex items-center px-4 py-3 transition-colors text-left ${viewMode === 'export' ? 'bg-[#006bb3] border-l-4 border-white' : 'hover:bg-[#006bb3]'}`}
              >
                <Download className="w-5 h-5 mr-3" />
                <span>图表导出</span>
              </button>
              <button
                onClick={() => setViewMode('version')}
                className={`w-full flex items-center px-4 py-3 transition-colors text-left ${viewMode === 'version' ? 'bg-[#006bb3] border-l-4 border-white' : 'hover:bg-[#006bb3]'}`}
              >
                <History className="w-5 h-5 mr-3" />
                <span>版本快照</span>
              </button>
              <button
                onClick={() => setViewMode('template')}
                className={`w-full flex items-center px-4 py-3 transition-colors text-left ${viewMode === 'template' ? 'bg-[#006bb3] border-l-4 border-white' : 'hover:bg-[#006bb3]'}`}
              >
                <Bookmark className="w-5 h-5 mr-3" />
                <span>模板管理</span>
              </button>
            </nav>
          </aside>

          {/* 右侧内容区 */}
          <div className="flex-1 flex flex-col">
            {/* 顶部导航 */}
            <header className="h-16 bg-white border-b flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <span className="text-gray-500">首页</span>
              </div>
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm">
                  <Bell className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2 ml-4 pl-4 border-l">
                  <div className="w-8 h-8 bg-[#1890ff] rounded-full flex items-center justify-center text-white text-sm font-medium">
                    A
                  </div>
                  <span className="text-sm">管理员</span>
                </div>
              </div>
            </header>

            {/* 主内容区 */}
            <main className="flex-1 bg-[#f0f2f5] p-6">
              {/* 欢迎卡片 */}
              <div className="bg-white rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-2">欢迎使用 DataInsight</h2>
                <p className="text-gray-500">上传您的数据文件，开始智能数据分析之旅</p>
              </div>

              {/* 数据导入区域 */}
              <div className="grid lg:grid-cols-3 gap-6">
                {/* 上传区域 */}
                <div className="lg:col-span-2 bg-white rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <Upload className="w-5 h-5 mr-2 text-[#1890ff]" />
                    数据导入
                  </h3>
                  <FileUploader onFileUpload={handleFileUpload} />
                </div>

                {/* AI配置 */}
                <div className="bg-white rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                    <Bot className="w-5 h-5 mr-2 text-[#1890ff]" />
                    AI模型配置
                  </h3>
                  <AIModelSettings />
                </div>
              </div>

              {/* 快捷入口 */}
              <div className="grid md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white rounded-lg p-4 flex items-center cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <Filter className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">数据清洗</h4>
                    <p className="text-xs text-gray-500">智能数据预处理</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-center cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">数据分析</h4>
                    <p className="text-xs text-gray-500">自动生成洞察报告</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-center cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    <LayoutGrid className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">仪表盘</h4>
                    <p className="text-xs text-gray-500">拖拽式可视化</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-center cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                    <Wand2 className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-800">NL2SQL</h4>
                    <p className="text-xs text-gray-500">自然语言查询</p>
                  </div>
                </div>
              </div>

              {/* 底部说明 */}
              <div className="mt-6 text-center text-sm text-gray-400">
                DataInsight Pro v1.0 - 企业级智能数据分析平台
              </div>
            </main>
          </div>
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
        
        {/* 视图切换 - 侧边栏优先结构 */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid w-full grid-cols-10 overflow-x-auto">
            <TabsTrigger value="table" className="flex items-center gap-1">
              <Table2 className="w-4 h-4" />
              <span className="hidden xl:inline">数据导入</span>
            </TabsTrigger>
            <TabsTrigger value="source" className="flex items-center gap-1">
              <Database className="w-4 h-4" />
              <span className="hidden xl:inline">数据源</span>
            </TabsTrigger>
            <TabsTrigger value="clean" className="flex items-center gap-1">
              <Filter className="w-4 h-4" />
              <span className="hidden xl:inline">数据清洗</span>
            </TabsTrigger>
            <TabsTrigger value="metric" className="flex items-center gap-1 text-orange-600">
              <Target className="w-4 h-4" />
              <span className="hidden xl:inline">指标层</span>
            </TabsTrigger>
            <TabsTrigger value="nl2dash" className="flex items-center gap-1 text-purple-600">
              <Wand2 className="w-4 h-4" />
              <span className="hidden xl:inline">NL2Dash</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              <span className="hidden xl:inline">导出</span>
            </TabsTrigger>
            <TabsTrigger value="version" className="flex items-center gap-1">
              <History className="w-4 h-4" />
              <span className="hidden xl:inline">版本</span>
            </TabsTrigger>
            <TabsTrigger value="template" className="flex items-center gap-1">
              <Bookmark className="w-4 h-4" />
              <span className="hidden xl:inline">模板</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1 text-orange-600">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden xl:inline">分析</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-1 text-orange-600">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden xl:inline">仪表盘</span>
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
          
          <TabsContent value="clean" className="mt-6">
            {analysis && (
              <DataCleaner
                data={parsedData}
                fieldStats={analysis.fieldStats}
                onDataChange={handleDataCleaned}
              />
            )}
          </TabsContent>
          
          <TabsContent value="insights" className="mt-6">
            {analysis ? (
              <DataInsights data={parsedData} analysis={analysis} onAnalyze={handleAnalyze} />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="aiChart" className="mt-6">
            {analysis ? (
              <SmartChartRecommender
                data={parsedData}
                analysis={analysis}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="dashboard" className="mt-6">
            {analysis && (
              <Dashboard data={parsedData} analysis={analysis} />
            )}
          </TabsContent>
          
          <TabsContent value="chat" className="mt-6">
            {analysis ? (
              <div className="grid lg:grid-cols-2 gap-6">
                <EnhancedLLMAssistant data={parsedData} analysis={analysis} />
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">NL2SQL 功能说明</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800 mb-2">支持的分析意图</h4>
                      <ul className="text-sm text-blue-600 space-y-1">
                        <li>趋势分析 - &ldquo;分析销售趋势&rdquo;</li>
                        <li>占比分析 - &ldquo;各品类占比&rdquo;</li>
                        <li>异常检测 - &ldquo;找出异常值&rdquo;</li>
                        <li>排序对比 - &ldquo;按销售额排序&rdquo;</li>
                        <li>数据筛选 - &ldquo;查看华东地区&rdquo;</li>
                      </ul>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">使用示例</h4>
                      <div className="space-y-2 text-sm text-green-600">
                        <p>&ldquo;哪些产品销量最高&rdquo;</p>
                        <p>&ldquo;月度收入变化趋势&rdquo;</p>
                        <p>&ldquo;用户年龄分布&rdquo;</p>
                      </div>
                    </div>
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
                  <ReportGenerator data={parsedData} analysis={analysis} />
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
          
          <TabsContent value="share" className="mt-6">
            <ShareManager dashboardName={parsedData.fileName} />
          </TabsContent>

          {/* 扁平化的更多工具视图 */}
          <TabsContent value="source" className="mt-6">
            <DataSourceManager onDataSourceChange={setParsedData} currentData={parsedData} />
          </TabsContent>

          <TabsContent value="metric" className="mt-6">
            {parsedData && analysis ? (
              <MetricSemanticLayer data={parsedData} fieldStats={analysis.fieldStats} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">请先加载数据</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="nl2dash" className="mt-6">
            {parsedData && analysis ? (
              <NL2Dashboard data={parsedData} fieldStats={analysis.fieldStats} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Wand2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">请先加载数据</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="quality" className="mt-6">
            {parsedData && analysis ? (
              <DataQualityChecker data={parsedData} fieldStats={analysis.fieldStats} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">请先加载数据</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="alert" className="mt-6">
            {parsedData ? (
              <DataAlerting data={parsedData} fieldStats={analysis?.fieldStats || []} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">请先加载数据</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="version" className="mt-6">
            <VersionHistory
              currentContent={parsedData ? { data: { rows: parsedData.rows } } : undefined}
            />
          </TabsContent>

          <TabsContent value="template" className="mt-6">
            <TemplateManager />
          </TabsContent>

          <TabsContent value="export" className="mt-6">
            <ChartExporter chartName={parsedData?.fileName || '图表'} />
          </TabsContent>

          {/* 更多工具 - DashboardDesigner */}
          <TabsContent value="designer" className="mt-6">
            {parsedData && analysis ? (
              <DashboardDesigner data={parsedData} fieldStats={analysis.fieldStats} />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">请先加载数据</p>
                </CardContent>
              </Card>
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
                <h1 className="font-bold text-lg">DataInsight Pro</h1>
                <p className="text-xs text-gray-500">企业级智能数据分析平台</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {parsedData && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  数据已加载
                </Badge>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 mr-1" />
                设置
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 设置弹窗 */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>系统设置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">深色模式</p>
                <p className="text-sm text-gray-500">{darkMode ? '已开启深色主题' : '开启深色主题'}</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={(checked) => {
                setDarkMode(checked);
                localStorage.setItem('datainsight-darkmode', String(checked));
                if (checked) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">数据缓存</p>
                <p className="text-sm text-gray-500">本地存储分析数据</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">自动保存</p>
                <p className="text-sm text-gray-500">每5分钟自动保存</p>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="space-y-2">
              <p className="font-medium text-sm">其他设置</p>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { alert('功能开发中'); setShowSettings(false); }}>
                <Download className="w-4 h-4 mr-2" />
                导出配置
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => { if(confirm('确定清除所有缓存数据？')) { localStorage.clear(); alert('已清除'); setShowSettings(false); } }}>
                <Trash2 className="w-4 h-4 mr-2" />
                清除缓存
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>
      
      {/* Global AI Assistant */}
      <GlobalAIAssistant 
        hasData={!!parsedData} 
        rowCount={parsedData?.rowCount}
      />
      
      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-500">
            DataInsight Pro - 企业级智能数据分析平台 | 支持 NL2SQL | 多数据源 | 拖拽式仪表盘
          </p>
        </div>
      </footer>
    </div>
  );
}
