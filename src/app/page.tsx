'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileUploader as AsyncFileUploader, UploadFile } from '@/components/async-file-uploader';
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
import AITableBuilder from '@/components/ai-table-builder';
import { MetricSemanticLayer } from '@/components/metric-semantic-layer';
import { ErrorBoundary } from '@/components/error-boundary';
import { DataQualityChecker } from '@/components/data-quality-checker';
import { NL2Dashboard } from '@/components/nl2-dashboard';
import { ChartExporter } from '@/components/chart-exporter';
import { AIFieldPanel } from '@/components/ai-field-panel';
import { MetricManager } from '@/components/metric-manager';
import { ExtendedChartGallery } from '@/components/extended-chart-gallery';
import { SqlLab } from '@/components/sql-lab';
import { AIFormulaGenerator } from '@/components/ai-formula-generator';
import { InsightReportGenerator } from '@/components/insight-report-generator';
import Sidebar from '@/components/sidebar';
import HomeCards from '@/components/home-cards';
import SettingsDialog from '@/components/settings-dialog';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Database,
  Upload,
  FileSpreadsheet,
  FileText,
  Trash2,
  AlertCircle,
  CheckCircle,
  Search,
  Zap,
  TrendingUp,
  BarChart3,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';
import { tripleCache } from '@/lib/cache-manager';
import { initSessionStore, sessionStore, createChatSession } from '@/lib/session-store';

// ============================================
// 视图模式类型（整合后：10个入口，功能零删除）
// ============================================
type ViewMode =
  | 'home'
  | 'ai-table-builder'
  | 'data-table' | 'data-prep'
  | 'insights' | 'visualization' | 'metrics' | 'chart-center'
  | 'chat'
  | 'sql-lab' | 'report-export'
  | 'alerting' | 'version-history' | 'template-manager';


// ============================================
// 主组件
// ============================================
export default function HomePage() {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  // 深色模式 - 初始为false避免SSR不一致
  const [darkMode, setDarkMode] = useState(false);
  // 客户端挂载后从localStorage加载深色模式设置
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('datainsight-darkmode');
      if (saved === 'true') setDarkMode(true);
    }
  }, []);

  // 初始化 SessionStore
  useEffect(() => {
    initSessionStore().catch(console.error);
  }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);


  // 模型配置状态 - 初始为null避免SSR不一致
  const [activeModelConfig, setActiveModelConfig] = useState<{
    apiKey: string;
    baseUrl: string;
    model: string;
  } | null>(null);

  // 客户端挂载后从localStorage加载模型配置 - 避免Hydration错误
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const modelsJson = localStorage.getItem('datainsight_ai_models');
      if (modelsJson) {
        try {
          const models = JSON.parse(modelsJson);
          const active = models.find((c: { isDefault: boolean; enabled: boolean }) => c.isDefault && c.enabled) || models.find((c: { enabled: boolean }) => c.enabled);
          if (active?.apiKey && active?.baseUrl && active?.model) {
            setActiveModelConfig({ apiKey: active.apiKey, baseUrl: active.baseUrl, model: active.model });
            return;
          }
        } catch { /* ignore */ }
      }
      // 回退到简化配置
      const saved = localStorage.getItem('datainsight-model-config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.apiKey && parsed.baseUrl && parsed.model) {
            setActiveModelConfig(parsed);
          }
        } catch { /* ignore */ }
      }
    }
  }, []);

  const handleModelChange = useCallback((model: { apiKey: string; baseUrl: string; model: string; isDefault?: boolean; enabled?: boolean } | null) => {
    if (model && model.apiKey && model.baseUrl && model.model) {
      const newConfig = { apiKey: model.apiKey, baseUrl: model.baseUrl, model: model.model };
      setActiveModelConfig(newConfig);
      localStorage.setItem('datainsight-model-config', JSON.stringify(newConfig));
    } else {
      setActiveModelConfig(null);
      localStorage.removeItem('datainsight-model-config');
    }
  }, []);

  // 页面加载时应用保存的深色模式（仅在首次渲染时执行）
  useEffect(() => {
    const saved = localStorage.getItem('datainsight-darkmode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 同步深色模式切换
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ============================================
  // 事件处理
  // ============================================
  const handleFileUpload = async (uploadedFiles: UploadFile[]) => {
    setParsedData(null);
    setAnalysis(null);
    setIsLoading(true);

    try {
      const completedFiles = uploadedFiles.filter(f => f.status === 'completed' || f.status === 'cached');

      if (completedFiles.length === 0) {
        throw new Error('没有成功解析的文件');
      }

      const firstFile = completedFiles[0];
      const parsedData = firstFile.parsedData;

      if (!parsedData) {
        throw new Error('文件解析失败');
      }

      setParsedData(parsedData);

      const dataHash = tripleCache.hashData(parsedData);
      const cachedAnalysis = tripleCache.getAnalysis(dataHash);

      if (cachedAnalysis) {
        setAnalysis(cachedAnalysis);
      } else {
        const analyzeResponse = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: parsedData }),
        });

        if (analyzeResponse.ok) {
          const analyzeResult = await analyzeResponse.json();
          if (analyzeResult.success && analyzeResult.analysis) {
            setAnalysis(analyzeResult.analysis);

            if (parsedData) {
              tripleCache.cacheAnalysis(dataHash, analyzeResult.analysis, parsedData.columnCount);
            }
          } else {
            console.error('分析结果无效:', analyzeResult.error || 'unknown');
          }
        } else {
          console.error('分析请求失败:', analyzeResponse.status);
          // 即使分析失败，数据已加载成功，不阻断用户
        }
      }

      const chatSession = createChatSession(
        `分析-${parsedData.fileName}`,
        dataHash,
        {
          fileName: parsedData.fileName,
          rowCount: parsedData.rowCount,
          columnCount: parsedData.columnCount
        }
      );
      await sessionStore.saveChatSession(chatSession);

    } catch (err) {
      console.error('文件处理错误:', err);
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataCleaned = (cleanedData: ParsedData) => {
    setParsedData(cleanedData);
    handleAnalyzeWith(cleanedData);
  };

  const handleAnalyze = () => {
    if (parsedData) handleAnalyzeWith(parsedData);
  };

  const handleAnalyzeWith = (data: ParsedData) => {
    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data }),
    })
      .then(res => {
        if (!res.ok) throw new Error('分析请求失败');
        return res.json();
      })
      .then(result => {
        if (result.success && result.analysis) {
          setAnalysis(result.analysis);
        } else {
          throw new Error(result.error || '分析结果无效');
        }
      })
      .catch(err => {
        console.error('分析失败:', err);
        setError(err.message);
      });
  };

  const handleGoHome = () => {
    setParsedData(null);
    setAnalysis(null);
    setViewMode('home');
  };

  // ============================================
  // 渲染主内容区
  // ============================================
  const renderMainContent = () => {
    // Loading
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">正在解析文件...</p>
        </div>
      );
    }

    // Error
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Database className="w-12 h-12 text-destructive mb-4" />
          <p className="text-destructive">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => { setError(null); setParsedData(null); setAnalysis(null); setViewMode('home'); }}>
            重新上传
          </Button>
        </div>
      );
    }

    // 首页（工作台）- 始终展示所有功能卡片
    if (viewMode === 'home') {
      const hasData = !!parsedData;
      return (
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 数据状态栏 */}
          <Card className={cn(
            'border transition-colors',
            hasData ? 'border-l-4 border-l-green-500 bg-green-50/30' : 'border-dashed border-gray-300'
          )}>
            <CardContent className="py-4">
              {hasData ? (
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <FileSpreadsheet className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{parsedData.fileName}</h3>
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">已加载</Badge>
                      </div>
                      <p className="text-sm text-gray-500">{parsedData?.rowCount?.toLocaleString() ?? '0'} 行 &times; {parsedData?.columnCount ?? 0} 列</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewMode('data-prep')}>
                      <Database className="w-3.5 h-3.5 mr-1" />
                      数据源
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGoHome} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      清除数据
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-2">
                  <div className="text-center">
                    <h3 className="font-medium text-gray-700 mb-1">上传数据开始分析</h3>
                    <p className="text-sm text-gray-400">支持 Excel (.xlsx/.xls) 和 CSV 文件，最大 50MB</p>
                  </div>
                  <div className="w-full max-w-lg">
                    <AsyncFileUploader onFileUpload={handleFileUpload} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <OnboardingGuide />
          <HomeCards
            hasData={!!parsedData}
            onViewChange={(v) => setViewMode(v as ViewMode)}
            fileName={parsedData?.fileName}
            rowCount={parsedData?.rowCount}
          />
        </div>
      );
    }

    // 需要数据但无数据的视图
    const needsDataViews: ViewMode[] = ['data-table', 'data-prep', 'insights', 'visualization', 'metrics', 'chart-center', 'chat', 'sql-lab', 'report-export'];
    if (needsDataViews.includes(viewMode) && !parsedData) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">请先上传数据</h3>
          <p className="text-sm text-gray-400 mb-6">此功能需要加载数据后才能使用</p>
          <Button onClick={() => setViewMode('home')}>去上传数据</Button>
        </div>
      );
    }

    // AI 智能建表（不需要数据）
    if (viewMode === 'ai-table-builder') {
      return (
        <ErrorBoundary moduleName="AI智能建表">
          <AITableBuilder modelConfig={activeModelConfig} />
        </ErrorBoundary>
      );
    }

    // ========================================
    // 数据预览（整合：表格 + 智能处理 + 智能公式）
    // ========================================
    if (viewMode === 'data-table' && parsedData) {
      return (
        <Tabs defaultValue="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table">数据视图</TabsTrigger>
            <TabsTrigger value="ai-field">智能处理</TabsTrigger>
            <TabsTrigger value="ai-formula">智能公式</TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <Card>
              <CardContent className="pt-6">
                <DataTable data={parsedData} fieldStats={analysis?.fieldStats} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ai-field">
            <AIFieldPanel data={parsedData} dataId={parsedData.fileName || 'default'} modelConfig={activeModelConfig} />
          </TabsContent>
          <TabsContent value="ai-formula">
            <AIFormulaGenerator data={parsedData} modelConfig={activeModelConfig} />
          </TabsContent>
        </Tabs>
      );
    }

    // ========================================
    // 数据工作台（整合：数据源 + 清洗 + 质量）
    // ========================================
    if (viewMode === 'data-prep') {
      return (
        <Tabs defaultValue="source" className="space-y-4">
          <TabsList>
            <TabsTrigger value="source">数据源</TabsTrigger>
            <TabsTrigger value="clean" disabled={!parsedData}>数据清洗</TabsTrigger>
            <TabsTrigger value="quality" disabled={!parsedData || !analysis}>数据质量</TabsTrigger>
          </TabsList>
          <TabsContent value="source">
            <DataSourceManager onDataSourceChange={setParsedData} currentData={parsedData ?? undefined} />
          </TabsContent>
          <TabsContent value="clean">
            {parsedData && analysis ? (
              <DataCleaner data={parsedData} fieldStats={analysis.fieldStats} onDataChange={handleDataCleaned} />
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-400">请先上传数据</div>
            )}
          </TabsContent>
          <TabsContent value="quality">
            {parsedData && analysis ? (
              <DataQualityChecker data={parsedData} fieldStats={analysis.fieldStats} />
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-400">请先上传数据</div>
            )}
          </TabsContent>
        </Tabs>
      );
    }

    // ========================================
    // 自动分析（整合：深度分析 + 分析报告）
    // ========================================
    if (viewMode === 'insights') {
      return analysis ? (
        <Tabs defaultValue="insights" className="space-y-4">
          <TabsList>
            <TabsTrigger value="insights">深度分析</TabsTrigger>
            <TabsTrigger value="report">
              <FileText className="w-3.5 h-3.5 mr-1" />
              分析报告
            </TabsTrigger>
          </TabsList>
          <TabsContent value="insights">
            <DataInsights data={parsedData!} analysis={analysis} onAnalyze={handleAnalyze} modelConfig={activeModelConfig} />
          </TabsContent>
          <TabsContent value="report">
            <InsightReportGenerator analysis={analysis} fileName={parsedData?.fileName} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    // ========================================
    // 仪表盘（整合：快速看板 + AI建看板 + 看板设计）
    // ========================================
    if (viewMode === 'visualization' && parsedData && analysis) {
      return (
        <ErrorBoundary moduleName="仪表盘">
          <Tabs defaultValue="dashboard" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dashboard">快速看板</TabsTrigger>
              <TabsTrigger value="nl2dash">AI 建看板</TabsTrigger>
              <TabsTrigger value="designer">看板设计</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard">
              <Dashboard data={parsedData} analysis={analysis} />
            </TabsContent>
            <TabsContent value="nl2dash">
              <NL2Dashboard data={parsedData} fieldStats={analysis.fieldStats} modelConfig={activeModelConfig} />
            </TabsContent>
            <TabsContent value="designer">
              <DashboardDesigner data={parsedData} fieldStats={analysis.fieldStats} />
            </TabsContent>
          </Tabs>
        </ErrorBoundary>
      );
    }

    // ========================================
    // 指标中心（整合：AI建指标 + 指标列表）
    // ========================================
    if (viewMode === 'metrics' && parsedData && analysis) {
      return (
        <ErrorBoundary moduleName="指标中心">
          <Tabs defaultValue="ai-metric" className="space-y-4">
            <TabsList>
              <TabsTrigger value="ai-metric">AI 建指标</TabsTrigger>
              <TabsTrigger value="metric-lib">指标列表</TabsTrigger>
            </TabsList>
            <TabsContent value="ai-metric">
              <MetricSemanticLayer data={parsedData} fieldStats={analysis.fieldStats} modelConfig={activeModelConfig} />
            </TabsContent>
            <TabsContent value="metric-lib">
              <MetricManager data={parsedData} />
            </TabsContent>
          </Tabs>
        </ErrorBoundary>
      );
    }

    // ========================================
    // 图表库（整合：AI选图 + 高级图表 + 专业图表）
    // ========================================
    if (viewMode === 'chart-center' && parsedData && analysis) {
      return (
        <Tabs defaultValue="ai-chart" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ai-chart">AI 选图</TabsTrigger>
            <TabsTrigger value="advanced">高级图表</TabsTrigger>
            <TabsTrigger value="echarts">专业图表</TabsTrigger>
          </TabsList>
          <TabsContent value="ai-chart">
            <SmartChartRecommender data={parsedData} analysis={analysis} />
          </TabsContent>
          <TabsContent value="advanced">
            <AdvancedCharts data={parsedData} fieldStats={analysis.fieldStats} />
          </TabsContent>
          <TabsContent value="echarts">
            <ExtendedChartGallery data={parsedData} />
          </TabsContent>
        </Tabs>
      );
    }

    // ========================================
    // 问答数据
    // ========================================
    if (viewMode === 'chat' && analysis) {
      return (
        <div className="grid lg:grid-cols-2 gap-6">
          <EnhancedLLMAssistant data={parsedData!} analysis={analysis} modelConfig={activeModelConfig} />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">你能问什么？</h4>
                <ul className="text-sm text-blue-600 space-y-1.5">
                  <li className="flex items-start gap-2"><Search className="w-4 h-4 mt-0.5 shrink-0" />查找数据 - &ldquo;销售额超过10万的订单有哪些？&rdquo;</li>
                  <li className="flex items-start gap-2"><Zap className="w-4 h-4 mt-0.5 shrink-0" />统计计算 - &ldquo;各区域平均绩效得分是多少？&rdquo;</li>
                  <li className="flex items-start gap-2"><TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />原因分析 - &ldquo;为什么本月销售额下降了15%？&rdquo;</li>
                  <li className="flex items-start gap-2"><BarChart3 className="w-4 h-4 mt-0.5 shrink-0" />趋势预测 - &ldquo;下月新增用户数预计多少？&rdquo;</li>
                  <li className="flex items-start gap-2"><FileText className="w-4 h-4 mt-0.5 shrink-0" />分析报告 - &ldquo;帮我生成本周项目进展周报&rdquo;</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">试试这些问题</h4>
                <div className="space-y-2 text-sm text-green-600">
                  <p>&ldquo;哪些产品销量最高？&rdquo;</p>
                  <p>&ldquo;月度收入变化趋势如何？&rdquo;</p>
                  <p>&ldquo;用户年龄分布是什么样的？&rdquo;</p>
                  <p>&ldquo;帮我找出异常数据并分析原因&rdquo;</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // ========================================
    // SQL 查询
    // ========================================
    if (viewMode === 'sql-lab' && parsedData) {
      return <SqlLab data={parsedData} />;
    }

    // ========================================
    // 导出分享（整合：生成报告 + 导出图表 + 分享管理）
    // ========================================
    if (viewMode === 'report-export' && parsedData) {
      return (
        <Tabs defaultValue="report" className="space-y-4">
          <TabsList>
            <TabsTrigger value="report" disabled={!analysis}>生成报告</TabsTrigger>
            <TabsTrigger value="export">导出图表</TabsTrigger>
            <TabsTrigger value="share">分享管理</TabsTrigger>
          </TabsList>
          <TabsContent value="report">
            {analysis ? (
              <ReportGenerator data={parsedData} analysis={analysis} />
            ) : (
              <div className="flex items-center justify-center py-12 text-gray-400">数据正在分析中...</div>
            )}
          </TabsContent>
          <TabsContent value="export">
            <ChartExporter chartName={parsedData.fileName || '图表'} />
          </TabsContent>
          <TabsContent value="share">
            <ShareManager dashboardName={parsedData.fileName} />
          </TabsContent>
        </Tabs>
      );
    }

    return null;
  };

  // ============================================
  // 获取当前视图标题
  // ============================================
  const getCurrentViewTitle = () => {
    const titles: Record<string, string> = {
      'home': '工作台', 'ai-table-builder': '数据建模',
      'data-table': '数据预览', 'data-prep': '数据工作台',
      'insights': '自动分析', 'visualization': '仪表盘',
      'metrics': '指标中心', 'chart-center': '图表库',
      'chat': '问答数据', 'sql-lab': 'SQL 查询',
      'report-export': '导出分享',
      'alerting': '数据预警', 'version-history': '版本快照', 'template-manager': '模板管理',
    };
    return titles[viewMode] || '';
  };

  // ============================================
  // 渲染
  // ============================================
  return (
    <div className="min-h-screen flex bg-background">
      {/* ===== 左侧侧边栏 ===== */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeView={viewMode}
        onViewChange={(v) => setViewMode(v as ViewMode)}
        hasData={!!parsedData}
        onSettingsOpen={() => setShowSettings(true)}
        alertCount={0}
        modelConfigured={!!activeModelConfig}
      />

      {/* ===== 右侧主区域 ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-14 bg-white border-b flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* 面包屑 */}
            <button
              onClick={() => setViewMode('home')}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              工作台
            </button>
            {viewMode !== 'home' && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-gray-700">{getCurrentViewTitle()}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 模型未配置警告 */}
            {!activeModelConfig && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3 h-3" />
                未配置AI模型
              </button>
            )}
            {/* 数据状态指示 */}
            {parsedData ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3" />
                  {parsedData.fileName}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {parsedData.rowCount?.toLocaleString() ?? '0'} 行 &times; {parsedData.columnCount ?? 0} 列
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-gray-500 hover:text-red-600"
                  onClick={handleGoHome}
                >
                  切换数据
                </Button>
              </div>
            ) : (
              <span className="text-xs text-gray-400">请上传数据</span>
            )}

            <Separator orientation="vertical" className="h-5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4 text-gray-500" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>设置</TooltipContent>
            </Tooltip>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="flex-1 overflow-y-auto p-6">
          {renderMainContent()}
        </main>
      </div>

      {/* ===== 设置弹窗 ===== */}
      <SettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        parsedData={parsedData}
        fieldStats={analysis?.fieldStats || []}
        darkMode={darkMode}
        onDarkModeChange={setDarkMode}
        onModelChange={handleModelChange}
      />

      {/* 全局 AI 助手 */}
      <GlobalAIAssistant hasData={!!parsedData} rowCount={parsedData?.rowCount} data={parsedData || undefined} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig} />
    </div>
  );
}
