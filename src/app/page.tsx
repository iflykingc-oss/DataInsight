'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileUploader, UploadFile } from '@/components/file-uploader';
import { DataTable } from '@/components/data-table';
import { DataInsights } from '@/components/data-insights';
import { Dashboard } from '@/components/dashboard';
import { LLMAssistant } from '@/components/llm-assistant';
import { FeishuIntegration } from '@/components/feishu-integration';
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
  Share2,
  Zap,
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
import type { ParsedData, DataAnalysis, FieldStat } from '@/lib/data-processor';

type ViewMode = 'table' | 'insights' | 'dashboard' | 'chat' | 'report' | 'source' | 'clean' | 'advanced' | 'designer' | 'share' | 'aiChart' | 'metric' | 'quality' | 'alert' | 'nl2dash' | 'version' | 'template' | 'export';

export default function HomePage() {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [linkedFilters, setLinkedFilters] = useState<{ field: string; values: string[] }[]>([]);
  
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
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: cleanedData })
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
        <div className="min-h-screen flex">
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
              <a href="#" className="flex items-center px-4 py-3 bg-[#006bb3] border-l-4 border-white">
                <Database className="w-5 h-5 mr-3" />
                <span>数据导入</span>
              </a>
              <a href="#" className="flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors">
                <FileText className="w-5 h-5 mr-3" />
                <span>数据源管理</span>
              </a>
              <a href="#" className="flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors">
                <Link className="w-5 h-5 mr-3" />
                <span>飞书集成</span>
              </a>
              
              <div className="px-4 py-2 text-xs text-blue-200 uppercase tracking-wider mt-4">配置中心</div>
              <a href="#" className="flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors">
                <Bot className="w-5 h-5 mr-3" />
                <span>AI模型配置</span>
              </a>
              <a href="#" className="flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors">
                <Target className="w-5 h-5 mr-3" />
                <span>指标语义层</span>
              </a>
              
              <div className="px-4 py-2 text-xs text-blue-200 uppercase tracking-wider mt-4">工具箱</div>
              <a href="#" className="flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors">
                <Wand2 className="w-5 h-5 mr-3" />
                <span>NL2Dashboard</span>
              </a>
              <a href="#" className="flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors">
                <Download className="w-5 h-5 mr-3" />
                <span>图表导出</span>
              </a>
              <a href="#" className="flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors">
                <History className="w-5 h-5 mr-3" />
                <span>版本快照</span>
              </a>
              <a href="#" className="flex items-center px-4 py-3 hover:bg-[#006bb3] transition-colors">
                <Bookmark className="w-5 h-5 mr-3" />
                <span>模板管理</span>
              </a>
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
                <Button variant="ghost" size="sm">
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
        
        {/* 视图切换 */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="table" className="flex items-center gap-1">
              <Table2 className="w-4 h-4" />
              <span className="hidden lg:inline">数据表</span>
            </TabsTrigger>
            <TabsTrigger value="clean" className="flex items-center gap-1">
              <Filter className="w-4 h-4" />
              <span className="hidden lg:inline">清洗</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden lg:inline">分析</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-1">
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden lg:inline">仪表盘</span>
            </TabsTrigger>
            <TabsTrigger value="aiChart" className="flex items-center gap-1 text-purple-600">
              <Wand2 className="w-4 h-4" />
              <span className="hidden lg:inline">AI图表</span>
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-1 text-purple-600">
              <Brain className="w-4 h-4" />
              <span className="hidden lg:inline">AI助手</span>
            </TabsTrigger>
            <TabsTrigger value="report" className="flex items-center gap-1">
              <FileText className="w-4 h-4" />
              <span className="hidden lg:inline">报表</span>
            </TabsTrigger>
            <TabsTrigger value="advanced-tools" className="flex items-center gap-1 text-orange-600">
              <Sparkles className="w-4 h-4" />
              <span className="hidden lg:inline">更多</span>
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
              <DataInsights data={parsedData} analysis={analysis} />
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
                fieldStats={analysis.fieldStats}
                linkedFilters={linkedFilters}
                onFilterChange={(filters) => setLinkedFilters(filters)}
              />
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="advanced" className="mt-6">
            {analysis && (
              <AdvancedCharts data={parsedData} fieldStats={analysis.fieldStats} />
            )}
          </TabsContent>
          
          <TabsContent value="dashboard" className="mt-6">
            {analysis && (
              <Dashboard data={parsedData} fieldStats={analysis.fieldStats} />
            )}
          </TabsContent>
          
          <TabsContent value="designer" className="mt-6">
            {analysis && (
              <DashboardDesigner data={parsedData} fieldStats={analysis.fieldStats} />
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
          
          <TabsContent value="source" className="mt-6">
            <DataSourceManager onDataSourceChange={setParsedData} currentData={parsedData} />
          </TabsContent>

          {/* 更多工具 Tab */}
          <TabsContent value="advanced-tools" className="mt-6">
            <Tabs defaultValue="template" className="w-full">
              <TabsList className="grid w-full grid-cols-5 mb-4">
                <TabsTrigger value="template" className="flex items-center gap-1 text-xs">
                  <Bookmark className="w-3 h-3" />
                  模板管理
                </TabsTrigger>
                <TabsTrigger value="metric" className="flex items-center gap-1 text-xs">
                  <Target className="w-3 h-3" />
                  指标层
                </TabsTrigger>
                <TabsTrigger value="quality" className="flex items-center gap-1 text-xs">
                  <Shield className="w-3 h-3" />
                  质量检测
                </TabsTrigger>
                <TabsTrigger value="alert" className="flex items-center gap-1 text-xs">
                  <Bell className="w-3 h-3" />
                  数据预警
                </TabsTrigger>
                <TabsTrigger value="nl2dash" className="flex items-center gap-1 text-xs">
                  <Wand2 className="w-3 h-3" />
                  NL2Dash
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template">
                <TemplateManager />
              </TabsContent>

              <TabsContent value="metric">
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

              <TabsContent value="quality">
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

              <TabsContent value="alert">
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

              <TabsContent value="nl2dash">
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
            </Tabs>

            {/* 第二行工具 */}
            <Tabs defaultValue="version" className="w-full mt-6">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="version" className="flex items-center gap-1 text-xs">
                  <History className="w-3 h-3" />
                  版本快照
                </TabsTrigger>
                <TabsTrigger value="template" className="flex items-center gap-1 text-xs">
                  <Bookmark className="w-3 h-3" />
                  模板库
                </TabsTrigger>
                <TabsTrigger value="export" className="flex items-center gap-1 text-xs">
                  <Download className="w-3 h-3" />
                  图表导出
                </TabsTrigger>
                <TabsTrigger value="designer" className="flex items-center gap-1 text-xs">
                  <LayoutGrid className="w-3 h-3" />
                  设计器
                </TabsTrigger>
              </TabsList>

              <TabsContent value="version">
                <VersionHistory 
                  currentContent={parsedData ? { data: { rows: parsedData.rows } } : undefined}
                />
              </TabsContent>

              <TabsContent value="template">
                <TemplateManager />
              </TabsContent>

              <TabsContent value="export">
                <ChartExporter chartName={parsedData?.fileName || '图表'} />
              </TabsContent>

              <TabsContent value="designer">
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
                <p className="text-sm text-gray-500">开启深色主题</p>
              </div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
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
