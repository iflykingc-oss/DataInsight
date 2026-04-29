'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import AITableBuilder from '@/components/ai-table-builder';
import { MetricSemanticLayer } from '@/components/metric-semantic-layer';
import { ErrorBoundary } from '@/components/error-boundary';
import { DataQualityChecker } from '@/components/data-quality-checker';
import { DataAlerting } from '@/components/data-alerting';
import { NL2Dashboard } from '@/components/nl2-dashboard';
import { VersionHistory } from '@/components/version-history';
import { TemplateManager } from '@/components/template-manager';
import { ChartExporter } from '@/components/chart-exporter';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  TrendingUp,
  Zap,
  Search,
  Mail,
  Webhook,
  TestTube,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

// ============================================
// 导航项定义
// ============================================
type ViewMode =
  | 'home'
  | 'ai-table-builder'
  | 'table' | 'source' | 'clean' | 'quality'
  | 'insights' | 'dashboard' | 'nl2dash' | 'metric' | 'aiChart'
  | 'chat' | 'report'
  | 'advanced' | 'designer'
  | 'alert' | 'version' | 'template' | 'export' | 'share'
  | 'ai-settings';

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
      { id: 'home', label: '工作台', icon: Home },
    ],
  },
  {
    label: '数据',
    items: [
      { id: 'ai-table-builder' as ViewMode, label: 'AI 智能建表', icon: Sparkles, color: 'text-primary', badge: 'NEW' },
      { id: 'table' as ViewMode, label: '数据表格', icon: Table2, needsData: true },
      { id: 'source' as ViewMode, label: '数据源管理', icon: Database },
      { id: 'clean' as ViewMode, label: '数据清洗', icon: Filter, needsData: true },
      { id: 'quality' as ViewMode, label: '数据质量', icon: Shield, needsData: true },
    ],
  },
  {
    label: '分析',
    items: [
      { id: 'insights', label: '智能分析', icon: Brain, needsData: true, color: 'text-orange-500' },
      { id: 'dashboard', label: '仪表盘', icon: LayoutGrid, needsData: true },
      { id: 'nl2dash', label: 'NL2Dashboard', icon: Wand2, needsData: true, color: 'text-violet-500', badge: 'AI' },
      { id: 'metric', label: '指标语义层', icon: Target, needsData: true, color: 'text-orange-500', badge: 'AI' },
      { id: 'aiChart', label: '智能图表', icon: PieChart, needsData: true },
    ],
  },
  {
    label: 'AI 助手',
    items: [
      { id: 'chat', label: 'AI 对话', icon: MessageSquare, needsData: true, color: 'text-blue-500' },
      { id: 'ai-settings', label: 'AI 模型配置', icon: Bot },
    ],
  },
  {
    label: '工具',
    items: [
      { id: 'report', label: '报表生成', icon: FileText, needsData: true },
      { id: 'designer', label: '仪表盘设计', icon: Palette, needsData: true },
      { id: 'advanced', label: '高级图表', icon: TrendingUp, needsData: true },
      { id: 'alert', label: '数据预警', icon: AlertTriangle, needsData: true },
      { id: 'export', label: '图表导出', icon: Download, needsData: true },
      { id: 'share', label: '分享管理', icon: Share2, needsData: true },
      { id: 'version', label: '版本快照', icon: History },
      { id: 'template', label: '模板管理', icon: Bookmark },
    ],
  },
];

// ============================================
// 首页功能卡片定义（始终展示，无数据灰化）
// ============================================
interface HomeCard {
  id: ViewMode;
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
  bgColor: string;
  needsData: boolean;
  badge?: string;
  highlight?: boolean;
}

const HOME_CARDS: HomeCard[] = [
  { id: 'ai-table-builder' as ViewMode, icon: Sparkles, label: 'AI 智能建表', desc: 'AI 一键生成标准化经营台账', color: 'text-primary', bgColor: 'bg-primary/5', needsData: false, badge: 'NEW', highlight: true },
  { id: 'insights', icon: Brain, label: '智能分析', desc: 'AI 自动洞察数据规律与健康评分', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, highlight: true },
  { id: 'nl2dash', icon: Wand2, label: 'NL2Dashboard', desc: '对话生成业务仪表盘', color: 'text-violet-600', bgColor: 'bg-violet-50', needsData: true, badge: 'AI', highlight: true },
  { id: 'chat', icon: MessageSquare, label: 'AI 问数', desc: '自然语言检索、统计、归因、预测', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: true, badge: 'AI', highlight: true },
  { id: 'metric', icon: Target, label: '指标语义层', desc: 'AI 生成业务指标体系与解读', color: 'text-orange-600', bgColor: 'bg-orange-50', needsData: true, badge: 'AI' },
  { id: 'dashboard', icon: LayoutGrid, label: '自动仪表盘', desc: '一键生成可视化仪表盘', color: 'text-purple-600', bgColor: 'bg-purple-50', needsData: true },
  { id: 'aiChart', icon: PieChart, label: '智能图表', desc: 'AI 推荐最佳图表类型', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true },
  { id: 'report', icon: FileText, label: '报表生成', desc: '一键生成分析报表并导出', color: 'text-green-600', bgColor: 'bg-green-50', needsData: true },
  { id: 'table', icon: Table2, label: '数据表格', desc: '查看、排序、筛选原始数据', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: true },
  { id: 'clean', icon: Filter, label: '数据清洗', desc: '去重、空值处理、异常值修复', color: 'text-cyan-600', bgColor: 'bg-cyan-50', needsData: true },
  { id: 'quality', icon: Shield, label: '数据质量', desc: '完整性/一致性/质量/可用性评估', color: 'text-emerald-600', bgColor: 'bg-emerald-50', needsData: true },
  { id: 'source', icon: Database, label: '数据源管理', desc: '连接数据库、API、平台集成', color: 'text-blue-600', bgColor: 'bg-blue-50', needsData: false },
  { id: 'advanced', icon: TrendingUp, label: '高级图表', desc: '6种高级图表类型与数据映射', color: 'text-indigo-600', bgColor: 'bg-indigo-50', needsData: true },
  { id: 'designer', icon: Palette, label: '仪表盘设计', desc: '拖拽式自定义仪表盘布局', color: 'text-pink-600', bgColor: 'bg-pink-50', needsData: true },
  { id: 'alert', icon: AlertTriangle, label: '数据预警', desc: '阈值/趋势/异常预警与通知', color: 'text-amber-600', bgColor: 'bg-amber-50', needsData: true },
  { id: 'export', icon: Download, label: '图表导出', desc: 'PNG/PDF/Excel/复制导出', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: true },
  { id: 'share', icon: Share2, label: '分享管理', desc: '生成分享链接与权限控制', color: 'text-sky-600', bgColor: 'bg-sky-50', needsData: true },
  { id: 'version', icon: History, label: '版本快照', desc: '创建/恢复/导出数据快照', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: false },
  { id: 'template', icon: Bookmark, label: '模板管理', desc: '创建/收藏/应用分析模板', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: false },
  { id: 'ai-settings', icon: Bot, label: 'AI 模型配置', desc: '配置模型参数与测试连接', color: 'text-gray-600', bgColor: 'bg-gray-50', needsData: false },
];

// ============================================
// 通知渠道配置类型
// ============================================
interface NotificationChannelConfig {
  email: { smtp: string; port: string; user: string; password: string; from: string; to: string; enabled: boolean };
  feishu: { webhookUrl: string; secret: string; enabled: boolean };
  webhook: { url: string; method: string; headers: string; enabled: boolean };
}

const DEFAULT_NOTIFICATION_CONFIG: NotificationChannelConfig = {
  email: { smtp: '', port: '465', user: '', password: '', from: '', to: '', enabled: false },
  feishu: { webhookUrl: '', secret: '', enabled: false },
  webhook: { url: '', method: 'POST', headers: '', enabled: false },
};

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
  const [showSettings, setShowSettings] = useState(false);
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationConfig, setNotificationConfig] = useState<NotificationChannelConfig>(DEFAULT_NOTIFICATION_CONFIG);
  const [notifTestResult, setNotifTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingNotif, setIsTestingNotif] = useState(false);

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
      const config = { apiKey: model.apiKey, baseUrl: model.baseUrl, model: model.model };
      setActiveModelConfig(config);
      localStorage.setItem('datainsight-model-config', JSON.stringify(config));
    } else {
      // 模型被禁用时清除配置
      setActiveModelConfig(null);
      localStorage.removeItem('datainsight-model-config');
    }
  }, []);

  // 加载通知配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('datainsight_notification_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotificationConfig(prev => ({
          email: { ...prev.email, ...parsed.email },
          feishu: { ...prev.feishu, ...parsed.feishu },
          webhook: { ...prev.webhook, ...parsed.webhook },
        }));
      }
    } catch { /* ignore */ }
  }, []);

  // 保存通知配置
  useEffect(() => {
    localStorage.setItem('datainsight_notification_config', JSON.stringify(notificationConfig));
  }, [notificationConfig]);

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
    setViewMode('home');
  };

  const handleTestNotification = async (channel: 'email' | 'feishu' | 'webhook') => {
    setIsTestingNotif(true);
    setNotifTestResult(null);
    try {
      const response = await fetch('/api/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          config: notificationConfig[channel],
        }),
      });
      const result = await response.json();
      setNotifTestResult({ success: result.success, message: result.message || result.error });
    } catch (err) {
      setNotifTestResult({ success: false, message: `测试失败: ${err instanceof Error ? err.message : '网络错误'}` });
    } finally {
      setIsTestingNotif(false);
    }
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
                      <p className="text-sm text-gray-500">{parsedData.rowCount.toLocaleString()} 行 &times; {parsedData.columnCount} 列</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setViewMode('source')}>
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
                    <FileUploader onFileUpload={handleFileUpload} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 快速操作区 - 有数据时显示核心 AI 功能 */}
          {hasData && (
            <div className="grid md:grid-cols-3 gap-4">
              {HOME_CARDS.filter(c => c.highlight).map(card => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    onClick={() => setViewMode(card.id)}
                    className={cn(
                      'group relative p-5 bg-white border rounded-xl hover:shadow-lg transition-all text-left',
                      'hover:border-blue-200'
                    )}
                  >
                    {card.badge && (
                      <Badge className="absolute top-3 right-3 h-5 px-1.5 text-[10px] bg-violet-500 hover:bg-violet-500 text-white border-0">
                        {card.badge}
                      </Badge>
                    )}
                    <div className={cn('p-2.5 rounded-lg w-fit mb-3', card.bgColor)}>
                      <Icon className={cn('w-6 h-6', card.color)} />
                    </div>
                    <h4 className="font-semibold text-gray-800">{card.label}</h4>
                    <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* 全部功能网格 */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-700">全部功能</h2>
              <Badge variant="outline" className="text-[10px]">{HOME_CARDS.length} 项</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {HOME_CARDS.map(card => {
                const Icon = card.icon;
                const disabled = card.needsData && !hasData;
                return (
                  <Tooltip key={card.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !disabled && setViewMode(card.id)}
                        disabled={disabled}
                        className={cn(
                          'group p-3.5 bg-white border rounded-xl transition-all text-left',
                          disabled
                            ? 'opacity-40 cursor-not-allowed border-gray-100'
                            : 'hover:shadow-md hover:border-blue-200 cursor-pointer'
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={cn('p-1.5 rounded-md', card.bgColor)}>
                            <Icon className={cn('w-4 h-4', card.color)} />
                          </div>
                          {card.badge && (
                            <Badge className="h-3.5 px-1 text-[8px] bg-violet-500 hover:bg-violet-500 text-white border-0">
                              {card.badge}
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm text-gray-800">{card.label}</h4>
                        <p className={cn('text-[11px] mt-0.5', disabled ? 'text-gray-300' : 'text-gray-500')}>
                          {disabled ? '需先上传数据' : card.desc}
                        </p>
                      </button>
                    </TooltipTrigger>
                    {disabled && (
                      <TooltipContent>请先上传数据文件</TooltipContent>
                    )}
                  </Tooltip>
                );
              })}
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

    // AI 智能建表（不需要数据）
    if (viewMode === 'ai-table-builder') {
      return (
        <ErrorBoundary moduleName="AI智能建表">
          <AITableBuilder modelConfig={activeModelConfig} />
        </ErrorBoundary>
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
      return (
        <ErrorBoundary moduleName="数据仪表盘">
          <Dashboard data={parsedData!} analysis={analysis} />
        </ErrorBoundary>
      );
    }

    // NL2Dashboard
    if (viewMode === 'nl2dash' && parsedData && analysis) {
      return <NL2Dashboard data={parsedData} fieldStats={analysis.fieldStats} modelConfig={activeModelConfig} />;
    }

    // 指标语义层
    if (viewMode === 'metric' && parsedData && analysis) {
      return (
        <ErrorBoundary moduleName="指标语义层">
          <MetricSemanticLayer data={parsedData} fieldStats={analysis.fieldStats} modelConfig={activeModelConfig} />
        </ErrorBoundary>
      );
    }

    // 智能图表
    if (viewMode === 'aiChart' && analysis) {
      return <SmartChartRecommender data={parsedData!} analysis={analysis} />;
    }

    // AI 对话（增强版：AI 问数模式）
    if (viewMode === 'chat' && analysis) {
      return (
        <div className="grid lg:grid-cols-2 gap-6">
          <EnhancedLLMAssistant data={parsedData!} analysis={analysis} modelConfig={activeModelConfig} />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">AI 问数 - 五大能力</h4>
                <ul className="text-sm text-blue-600 space-y-1.5">
                  <li className="flex items-start gap-2"><Search className="w-4 h-4 mt-0.5 shrink-0" />数据检索 - &ldquo;查找销售额超过10万的订单&rdquo;</li>
                  <li className="flex items-start gap-2"><Zap className="w-4 h-4 mt-0.5 shrink-0" />统计计算 - &ldquo;按区域计算平均绩效得分&rdquo;</li>
                  <li className="flex items-start gap-2"><TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />归因分析 - &ldquo;分析本月销售额下降15%的原因&rdquo;</li>
                  <li className="flex items-start gap-2"><BarChart3 className="w-4 h-4 mt-0.5 shrink-0" />趋势预测 - &ldquo;预测下月新增用户数&rdquo;</li>
                  <li className="flex items-start gap-2"><FileText className="w-4 h-4 mt-0.5 shrink-0" />分析报告 - &ldquo;生成本周项目进展周报&rdquo;</li>
                </ul>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">使用示例</h4>
                <div className="space-y-2 text-sm text-green-600">
                  <p>&ldquo;哪些产品销量最高&rdquo;</p>
                  <p>&ldquo;月度收入变化趋势&rdquo;</p>
                  <p>&ldquo;分析用户年龄分布&rdquo;</p>
                  <p>&ldquo;找出异常数据并归因&rdquo;</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // AI 模型配置
    if (viewMode === 'ai-settings') {
      return <AIModelSettings onModelChange={handleModelChange} />;
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
            const visibleItems = group.items;
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
                  const isDisabled = item.needsData && !parsedData;
                  const Icon = item.icon;
                  return (
                    <Tooltip key={item.id} delayDuration={sidebarCollapsed ? 100 : 500}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => !isDisabled && setViewMode(item.id)}
                          disabled={isDisabled}
                          className={cn(
                            'w-full flex items-center transition-colors text-left relative',
                            sidebarCollapsed ? 'justify-center px-0 py-3' : 'px-5 py-2.5',
                            isActive
                              ? 'bg-[#1890ff] text-white'
                              : isDisabled
                                ? 'text-blue-100/30 cursor-not-allowed'
                                : 'text-blue-100/80 hover:bg-white/5 hover:text-white'
                          )}
                        >
                          {isActive && !sidebarCollapsed && (
                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-white rounded-r" />
                          )}
                          <Icon className={cn('flex-shrink-0', sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3', isDisabled ? 'opacity-40' : item.color)} />
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
                onClick={() => setViewMode('ai-settings')}
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
                  {parsedData.rowCount.toLocaleString()} 行 &times; {parsedData.columnCount} 列
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
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>系统设置</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="general" className="flex-1">通用</TabsTrigger>
              <TabsTrigger value="notifications" className="flex-1">通知渠道</TabsTrigger>
              <TabsTrigger value="data" className="flex-1">数据管理</TabsTrigger>
            </TabsList>

            {/* 通用设置 */}
            <TabsContent value="general" className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">深色模式</p>
                  <p className="text-xs text-gray-500">{darkMode ? '已开启深色主题' : '开启深色主题'}</p>
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
                  <p className="font-medium text-sm">数据缓存</p>
                  <p className="text-xs text-gray-500">本地存储分析数据</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">自动保存</p>
                  <p className="text-xs text-gray-500">每5分钟自动保存</p>
                </div>
                <Switch defaultChecked />
              </div>
            </TabsContent>

            {/* 通知渠道设置 */}
            <TabsContent value="notifications" className="space-y-4 py-4">
              <p className="text-xs text-gray-500">配置告警通知渠道，数据预警触发时将通过已启用的渠道发送通知。</p>

              {/* 邮件 */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-sm">邮件通知</span>
                    </div>
                    <Switch
                      checked={notificationConfig.email.enabled}
                      onCheckedChange={(v) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, enabled: v } }))}
                    />
                  </div>
                  {notificationConfig.email.enabled && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="SMTP 服务器" value={notificationConfig.email.smtp} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, smtp: e.target.value } }))} className="text-xs h-8" />
                        <Input placeholder="端口" value={notificationConfig.email.port} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, port: e.target.value } }))} className="text-xs h-8" />
                        <Input placeholder="用户名" value={notificationConfig.email.user} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, user: e.target.value } }))} className="text-xs h-8" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="密码/授权码" type="password" value={notificationConfig.email.password} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, password: e.target.value } }))} className="text-xs h-8" />
                        <Input placeholder="收件人邮箱" value={notificationConfig.email.to} onChange={(e) => setNotificationConfig(prev => ({ ...prev, email: { ...prev.email, to: e.target.value } }))} className="text-xs h-8" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 飞书 */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm">飞书通知</span>
                    </div>
                    <Switch
                      checked={notificationConfig.feishu.enabled}
                      onCheckedChange={(v) => setNotificationConfig(prev => ({ ...prev, feishu: { ...prev.feishu, enabled: v } }))}
                    />
                  </div>
                  {notificationConfig.feishu.enabled && (
                    <div className="space-y-2">
                      <Input placeholder="飞书机器人 Webhook 地址" value={notificationConfig.feishu.webhookUrl} onChange={(e) => setNotificationConfig(prev => ({ ...prev, feishu: { ...prev.feishu, webhookUrl: e.target.value } }))} className="text-xs h-8" />
                      <Input placeholder="签名密钥（可选）" value={notificationConfig.feishu.secret} onChange={(e) => setNotificationConfig(prev => ({ ...prev, feishu: { ...prev.feishu, secret: e.target.value } }))} className="text-xs h-8" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Webhook */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Webhook className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">Webhook</span>
                    </div>
                    <Switch
                      checked={notificationConfig.webhook.enabled}
                      onCheckedChange={(v) => setNotificationConfig(prev => ({ ...prev, webhook: { ...prev.webhook, enabled: v } }))}
                    />
                  </div>
                  {notificationConfig.webhook.enabled && (
                    <div className="space-y-2">
                      <Input placeholder="Webhook URL（支持飞书/钉钉/企微自动适配）" value={notificationConfig.webhook.url} onChange={(e) => setNotificationConfig(prev => ({ ...prev, webhook: { ...prev.webhook, url: e.target.value } }))} className="text-xs h-8" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 测试按钮 + 结果 */}
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isTestingNotif || (!notificationConfig.email.enabled && !notificationConfig.feishu.enabled && !notificationConfig.webhook.enabled)}
                  onClick={() => {
                    // 测试第一个已启用的渠道
                    if (notificationConfig.feishu.enabled) handleTestNotification('feishu');
                    else if (notificationConfig.webhook.enabled) handleTestNotification('webhook');
                    else if (notificationConfig.email.enabled) handleTestNotification('email');
                  }}
                >
                  {isTestingNotif ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <TestTube className="w-3.5 h-3.5 mr-1" />}
                  测试通知
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setNotifTestResult(null)}>
                  清除结果
                </Button>
              </div>
              {notifTestResult && (
                <div className={cn(
                  'p-3 rounded-lg text-xs flex items-center gap-2',
                  notifTestResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                )}>
                  {notifTestResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  {notifTestResult.message}
                </div>
              )}
            </TabsContent>

            {/* 数据管理 */}
            <TabsContent value="data" className="space-y-3 py-4">
              <Button variant="outline" size="sm" className="w-full justify-start" onClick={() => {
                const configKeys = ['datainsight_alert_config', 'datainsight_alerts', 'datainsight_alert_history', 'nl2dashboard_history_v2', 'datainsight_metrics_library', 'datainsight_notification_config'];
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
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* 全局 AI 助手 */}
      <GlobalAIAssistant hasData={!!parsedData} rowCount={parsedData?.rowCount} data={parsedData || undefined} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig} />
    </div>
  );
}
