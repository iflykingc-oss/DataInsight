'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BarChart3,
  Table2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Database,
  Filter,
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
  Trash2,
  Home,
  FileSpreadsheet,
  FileText,
  Brain,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  PieChart,
  AlertTriangle,
  Share2,
  Palette,
  LayoutDashboard,
  TrendingUp,
  Link,
  Zap,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

// ============================================
// 导航项定义
// ============================================
type ViewMode =
  | 'home'
  | 'table' | 'source' | 'clean' | 'quality'
  | 'insights' | 'dashboard' | 'nl2dash' | 'metric' | 'aiChart'
  | 'chat' | 'report'
  | 'advanced' | 'designer'
  | 'alert' | 'version' | 'template' | 'export' | 'share'
  | 'ai-settings';

interface NavItem {
  id: ViewMode;
  label: string;
  icon: React.ElementType;
  color?: string;        // 侧边栏高亮色
  needsData?: boolean;   // 是否需要数据才可用
  badge?: string;        // 角标
}

const NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    id: ViewMode;
    label: string;
    icon: React.ElementType;
    color?: string;
    needsData?: boolean;
    badge?: string;
  }>;
}> = [
  {
    label: '总览',
    items: [
      { id: 'home' as ViewMode, label: '首页', icon: Home },
    ],
  },
  {
    label: '数据',
    items: [
      { id: 'table' as ViewMode, label: '数据表格', icon: Table2 },
      { id: 'source' as ViewMode, label: '数据源管理', icon: Database },
      { id: 'clean' as ViewMode, label: '数据清洗', icon: Filter, needsData: true },
      { id: 'quality' as ViewMode, label: '数据质量', icon: Shield, needsData: true },
    ],
  },
  {
    label: '分析',
    items: [
      { id: 'insights' as ViewMode, label: '智能分析', icon: Brain, needsData: true, color: 'text-orange-600' },
      { id: 'dashboard' as ViewMode, label: '仪表盘', icon: LayoutGrid, needsData: true, color: 'text-purple-600' },
      { id: 'nl2dash' as ViewMode, label: 'NL2Dashboard', icon: Wand2, needsData: true, color: 'text-purple-600', badge: 'AI' },
      { id: 'metric' as ViewMode, label: '指标语义层', icon: Target, needsData: true, color: 'text-orange-600', badge: 'AI' },
      { id: 'aiChart' as ViewMode, label: '智能图表', icon: PieChart, needsData: true },
    ],
  },
  {
    label: 'AI 助手',
    items: [
      { id: 'chat' as ViewMode, label: 'AI 对话', icon: MessageSquare, needsData: true, color: 'text-blue-600' },
      { id: 'ai-settings' as ViewMode, label: 'AI 模型配置', icon: Bot },
    ],
  },
  {
    label: '工具',
    items: [
      { id: 'report' as ViewMode, label: '报表生成', icon: FileText, needsData: true },
      { id: 'designer' as ViewMode, label: '仪表盘设计', icon: Palette, needsData: true },
      { id: 'advanced' as ViewMode, label: '高级图表', icon: TrendingUp, needsData: true },
      { id: 'alert' as ViewMode, label: '数据预警', icon: AlertTriangle, needsData: true },
      { id: 'export' as ViewMode, label: '图表导出', icon: Download, needsData: true },
      { id: 'share' as ViewMode, label: '分享管理', icon: Share2, needsData: true },
      { id: 'version' as ViewMode, label: '版本快照', icon: History },
      { id: 'template' as ViewMode, label: '模板管理', icon: Bookmark },
    ],
  },
];

// ============================================
// 主组件
// ============================================
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
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 页面加载时应用保存的深色模式
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 上传数据后自动跳转到智能分析（核心入口）
  useEffect(() => {
    if (parsedData && viewMode === 'home') {
      setViewMode('insights');
    }
  }, [parsedData]);

  // ============================================
  // 事件处理
  // ============================================
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
        body: formData,
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
          body: JSON.stringify({ data: firstData }),
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
      columnCount: data.headers.length,
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
          columnCount: data.headers.length,
        },
      }),
    })
      .then(res => res.json())
      .then(result => setAnalysis(result.analysis))
      .catch(console.error);
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
      .then(res => res.json())
      .then(result => setAnalysis(result.analysis))
      .catch(console.error);
  };

  const handleGoHome = () => {
    setParsedData(null);
    setAnalysis(null);
    setFiles([]);
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
          <Loader2 className="w-12 h-12 text-[#1890ff] animate-spin mb-4" />
          <p className="text-gray-600">正在解析文件...</p>
        </div>
      );
    }

    // Error
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-red-600">{error}</p>
          <Button variant="outline" className="mt-4" onClick={() => { setError(null); setFiles([]); setParsedData(null); setAnalysis(null); }}>
            重新上传
          </Button>
        </div>
      );
    }

    // 首页
    if (viewMode === 'home') {
      // 已有数据时显示数据概览
      if (parsedData) {
        return (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="text-center py-4">
              <h1 className="text-2xl font-bold text-gray-800 mb-2">数据已就绪</h1>
              <p className="text-gray-500">选择一个功能开始分析</p>
            </div>

            {/* 数据信息卡片 */}
            <Card className="border-l-4 border-l-[#1890ff]">
              <CardContent className="pt-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-8 h-8 text-green-500" />
                  <div>
                    <h3 className="font-medium">{parsedData.fileName}</h3>
                    <p className="text-sm text-gray-500">{parsedData.rowCount.toLocaleString()} 行 × {parsedData.columnCount} 列</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleGoHome}>切换数据</Button>
              </CardContent>
            </Card>

            {/* 快捷功能入口 */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'insights' as ViewMode, icon: Brain, label: '智能分析', desc: 'AI 自动洞察数据规律', color: 'bg-orange-100 text-orange-600' },
                { id: 'dashboard' as ViewMode, icon: LayoutGrid, label: '仪表盘', desc: '自动生成可视化仪表盘', color: 'bg-purple-100 text-purple-600' },
                { id: 'nl2dash' as ViewMode, icon: Wand2, label: 'NL2Dashboard', desc: '对话生成业务仪表盘', color: 'bg-purple-100 text-purple-600', badge: 'AI' },
                { id: 'chat' as ViewMode, icon: MessageSquare, label: 'AI 对话', desc: '自然语言查询数据', color: 'bg-blue-100 text-blue-600' },
                { id: 'metric' as ViewMode, icon: Target, label: '指标语义层', desc: 'AI 生成业务指标体系', color: 'bg-orange-100 text-orange-600', badge: 'AI' },
                { id: 'report' as ViewMode, icon: FileText, label: '报表生成', desc: '一键生成分析报表', color: 'bg-green-100 text-green-600' },
                { id: 'table' as ViewMode, icon: Table2, label: '数据表格', desc: '查看原始数据', color: 'bg-gray-100 text-gray-600' },
                { id: 'clean' as ViewMode, icon: Filter, label: '数据清洗', desc: '智能数据预处理', color: 'bg-cyan-100 text-cyan-600' },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setViewMode(item.id)}
                    className="group p-4 bg-white border rounded-xl hover:shadow-md hover:border-blue-200 transition-all text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={cn('p-2 rounded-lg', item.color)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {item.badge && (
                        <Badge className="h-4 px-1 text-[9px] bg-purple-500 hover:bg-purple-500 text-white border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-medium text-sm">{item.label}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        );
      }

      // 无数据时显示上传页面
      return (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 欢迎区 */}
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <BarChart3 className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">欢迎使用 DataInsight Pro</h1>
            <p className="text-gray-500">上传您的数据文件，开始智能数据分析之旅</p>
          </div>

          {/* 上传区域 */}
          <Card className="border-2 border-dashed border-blue-200 hover:border-blue-400 transition-colors">
            <CardContent className="pt-6">
              <FileUploader onFileUpload={handleFileUpload} />
            </CardContent>
          </Card>

          {/* 快速开始提示 */}
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800 text-sm">第一步：上传数据</span>
              </div>
              <p className="text-xs text-blue-600">支持 Excel (.xlsx/.xls) 和 CSV 文件</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800 text-sm">第二步：自动分析</span>
              </div>
              <p className="text-xs text-green-600">AI 自动识别数据特征，生成洞察报告</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-800 text-sm">第三步：可视化</span>
              </div>
              <p className="text-xs text-purple-600">一键生成仪表盘、报表，AI 辅助解读</p>
            </div>
          </div>
        </div>
      );
    }

    // 需要数据但无数据的视图
    const needsDataViews: ViewMode[] = ['clean', 'quality', 'insights', 'dashboard', 'nl2dash', 'metric', 'aiChart', 'chat', 'report', 'advanced', 'designer', 'alert', 'export', 'share'];
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

    // 数据表格
    if (viewMode === 'table' && parsedData) {
      return (
        <Card>
          <CardContent className="pt-6">
            <DataTable data={parsedData} fieldStats={analysis?.fieldStats} />
          </CardContent>
        </Card>
      );
    }

    // 数据源管理
    if (viewMode === 'source') {
      return <DataSourceManager onDataSourceChange={setParsedData} currentData={parsedData ?? undefined} />;
    }

    // 数据清洗
    if (viewMode === 'clean' && analysis) {
      return <DataCleaner data={parsedData!} fieldStats={analysis.fieldStats} onDataChange={handleDataCleaned} />;
    }

    // 数据质量
    if (viewMode === 'quality' && parsedData && analysis) {
      return <DataQualityChecker data={parsedData} fieldStats={analysis.fieldStats} />;
    }

    // 智能分析
    if (viewMode === 'insights') {
      return analysis ? (
        <DataInsights data={parsedData!} analysis={analysis} onAnalyze={handleAnalyze} />
      ) : (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      );
    }

    // 仪表盘
    if (viewMode === 'dashboard' && analysis) {
      return <Dashboard data={parsedData!} analysis={analysis} />;
    }

    // NL2Dashboard
    if (viewMode === 'nl2dash' && parsedData && analysis) {
      return <NL2Dashboard data={parsedData} fieldStats={analysis.fieldStats} />;
    }

    // 指标语义层
    if (viewMode === 'metric' && parsedData && analysis) {
      return <MetricSemanticLayer data={parsedData} fieldStats={analysis.fieldStats} />;
    }

    // 智能图表
    if (viewMode === 'aiChart' && analysis) {
      return <SmartChartRecommender data={parsedData!} analysis={analysis} />;
    }

    // AI 对话
    if (viewMode === 'chat' && analysis) {
      return (
        <div className="grid lg:grid-cols-2 gap-6">
          <EnhancedLLMAssistant data={parsedData!} analysis={analysis} />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">支持的分析意图</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>趋势分析 - &ldquo;分析销售趋势&rdquo;</li>
                  <li>占比分析 - &ldquo;各品类占比&rdquo;</li>
                  <li>异常检测 - &ldquo;找出异常值&rdquo;</li>
                  <li>排序对比 - &ldquo;按销售额排序&rdquo;</li>
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
      );
    }

    // AI 模型配置
    if (viewMode === 'ai-settings') {
      return <AIModelSettings />;
    }

    // 报表生成
    if (viewMode === 'report' && analysis) {
      return <ReportGenerator data={parsedData!} analysis={analysis} />;
    }

    // 仪表盘设计
    if (viewMode === 'designer' && parsedData && analysis) {
      return <DashboardDesigner data={parsedData} fieldStats={analysis.fieldStats} />;
    }

    // 高级图表
    if (viewMode === 'advanced' && parsedData && analysis) {
      return <AdvancedCharts data={parsedData} fieldStats={analysis.fieldStats} />;
    }

    // 数据预警
    if (viewMode === 'alert' && parsedData) {
      return <DataAlerting data={parsedData} fieldStats={analysis?.fieldStats || []} />;
    }

    // 图表导出
    if (viewMode === 'export' && parsedData) {
      return <ChartExporter chartName={parsedData.fileName || '图表'} />;
    }

    // 分享管理
    if (viewMode === 'share' && parsedData) {
      return <ShareManager dashboardName={parsedData.fileName} />;
    }

    // 版本快照
    if (viewMode === 'version') {
      return <VersionHistory currentContent={parsedData ? { data: { rows: parsedData.rows } } : undefined} />;
    }

    // 模板管理
    if (viewMode === 'template') {
      return <TemplateManager />;
    }

    return null;
  };

  // ============================================
  // 获取当前视图标题
  // ============================================
  const getCurrentViewTitle = () => {
    for (const group of NAV_GROUPS) {
      const item = group.items.find(i => i.id === viewMode);
      if (item) return item.label;
    }
    return '';
  };

  // ============================================
  // 渲染
  // ============================================
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* ===== 左侧侧边栏 ===== */}
      <aside className={cn(
        'bg-[#001529] text-white flex-shrink-0 flex flex-col transition-all duration-300',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}>
        {/* Logo */}
        <div className={cn(
          'h-16 flex items-center border-b border-white/10 flex-shrink-0',
          sidebarCollapsed ? 'justify-center px-2' : 'px-4'
        )}>
          <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          {!sidebarCollapsed && (
            <div className="ml-3 overflow-hidden">
              <h1 className="font-bold text-base leading-tight">DataInsight</h1>
              <p className="text-[10px] text-blue-300">智能数据分析平台</p>
            </div>
          )}
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV_GROUPS.map(group => {
            // 过滤掉不需要的分组（根据数据状态）
            const visibleItems = group.items.filter(item => {
              // 没有数据时，隐藏需要数据的项
              if (item.needsData && !parsedData) return false;
              return true;
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.label} className="mb-1">
                {!sidebarCollapsed && (
                  <div className="px-5 py-2 text-[10px] text-blue-400/70 uppercase tracking-wider font-medium">
                    {group.label}
                  </div>
                )}
                {sidebarCollapsed && <div className="my-2 mx-3 border-t border-white/10" />}
                {visibleItems.map(item => {
                  const isActive = viewMode === item.id;
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.id} delayDuration={sidebarCollapsed ? 100 : 500}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setViewMode(item.id)}
                          className={cn(
                            'w-full flex items-center transition-colors text-left relative',
                            sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-5 py-2.5',
                            isActive
                              ? 'bg-[#1890ff] text-white'
                              : 'text-blue-100/80 hover:bg-white/5 hover:text-white'
                          )}
                        >
                          {isActive && !sidebarCollapsed && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white rounded-r" />
                          )}
                          <Icon className={cn('flex-shrink-0', sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3', item.color)} />
                          {!sidebarCollapsed && (
                            <>
                              <span className="text-sm flex-1">{item.label}</span>
                              {item.badge && (
                                <Badge className="h-4 px-1 text-[9px] bg-purple-500 hover:bg-purple-500 text-white border-0">
                                  {item.badge}
                                </Badge>
                              )}
                            </>
                          )}
                        </button>
                      </TooltipTrigger>
                      {sidebarCollapsed && (
                        <TooltipContent side="right" className="text-xs">
                          {item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* 侧边栏底部：折叠/展开 */}
        <div className="border-t border-white/10 p-2 flex-shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 text-blue-300/60 hover:text-white transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!sidebarCollapsed && <span className="text-xs ml-1">收起</span>}
          </button>
        </div>
      </aside>

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
              首页
            </button>
            {viewMode !== 'home' && (
              <>
                <span className="text-gray-300">/</span>
                <span className="text-sm font-medium text-gray-700">{getCurrentViewTitle()}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* 数据状态指示 */}
            {parsedData ? (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3" />
                  {parsedData.fileName}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {parsedData.rowCount.toLocaleString()} 行 × {parsedData.columnCount} 列
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
              <Badge variant="outline" className="text-xs text-gray-400">未加载数据</Badge>
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
              <p className="font-medium text-sm">数据管理</p>
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => {
                // 导出所有 localStorage 配置为 JSON 文件
                const configKeys = ['datainsight_alert_config', 'datainsight_alerts', 'datainsight_alert_history', 'nl2dashboard_history_v2', 'datainsight_metrics_library'];
                const exportData: Record<string, unknown> = {};
                configKeys.forEach(key => {
                  const val = localStorage.getItem(key);
                  if (val) exportData[key] = JSON.parse(val);
                });
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `datainsight-config-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setShowSettings(false);
              }}>
                <Download className="w-4 h-4 mr-2" />
                导出配置
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => {
                if (confirm('确定清除所有缓存数据？此操作不可恢复。')) {
                  localStorage.clear();
                  setShowSettings(false);
                  window.location.reload();
                }
              }}>
                <Trash2 className="w-4 h-4 mr-2" />
                清除缓存并刷新
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 全局 AI 助手 */}
      <GlobalAIAssistant hasData={!!parsedData} rowCount={parsedData?.rowCount} />
    </div>
  );
}
