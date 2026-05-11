'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { FileUploader as AsyncFileUploader, UploadFile } from '@/components/async-file-uploader';
import Sidebar from '@/components/sidebar';
import HomeCards from '@/components/home-cards';
const AnnouncementPopup = dynamic(() => import('@/components/announcement-popup').then(m => ({ default: m.AnnouncementPopup })), { ssr: false });
import SettingsDialog from '@/components/settings-dialog';
import { OnboardingGuide } from '@/components/onboarding-guide';
import { ErrorBoundary } from '@/components/error-boundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Sparkles,
  Table2 as TableIcon,
  LayoutTemplate as LayoutIcon,
  Calendar as CalendarIcon,
  GanttChart as GanttIcon,
  Brain,
  Code2,
  MessageSquare,
  Download,
  Image as ImageIcon,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, type PermissionKey } from '@/lib/use-auth';
import { LoginDialog } from '@/components/login-dialog';
import { UserMenu } from '@/components/user-menu';
const AdminContent = dynamic(() => import('@/components/admin-content').then(m => ({ default: m.default })), { ssr: false });
const AdminSidebar = dynamic(() => import('@/components/admin-sidebar').then(m => ({ default: m.default })), { ssr: false });
import type { AdminTab } from '@/components/admin-sidebar';
import type { ParsedData, DataAnalysis, CellValue } from '@/lib/data-processor';
import type { AIField } from '@/lib/ai-field-engine';
import { checkTTLWarning } from '@/lib/data-lifecycle';

// 动态导入：首屏不需要的组件按需加载，大幅减小初始JS体积
const DataTable = dynamic(() => import('@/components/data-table').then(m => ({ default: m.DataTable })), { ssr: false });
const DataInsights = dynamic(() => import('@/components/data-insights').then(m => ({ default: m.DataInsights })), { ssr: false });
const Dashboard = dynamic(() => import('@/components/dashboard').then(m => ({ default: m.Dashboard })), { ssr: false });
const ReportGenerator = dynamic(() => import('@/components/report-generator').then(m => ({ default: m.ReportGenerator })), { ssr: false });
const FormBuilder = dynamic(() => import('@/components/form-builder').then(m => ({ default: m.FormBuilder })), { ssr: false });
const DataSourceManager = dynamic(() => import('@/components/data-source-manager').then(m => ({ default: m.DataSourceManager })), { ssr: false });
const DataCleaner = dynamic(() => import('@/components/data-cleaner').then(m => ({ default: m.DataCleaner })), { ssr: false });
const AdvancedCharts = dynamic(() => import('@/components/advanced-charts').then(m => ({ default: m.AdvancedCharts })), { ssr: false });
const DashboardDesigner = dynamic(() => import('@/components/dashboard-designer').then(m => ({ default: m.DashboardDesigner })), { ssr: false });
const GlobalAgentAssistant = dynamic(() => import('@/components/global-agent-assistant').then(m => ({ default: m.GlobalAgentAssistant })), { ssr: false });
const SceneAgentPanel = dynamic(() => import('@/components/scene-agent-panel').then(m => ({ default: m.SceneAgentPanel })), { ssr: false });
const ShareManager = dynamic(() => import('@/components/share-manager').then(m => ({ default: m.ShareManager })), { ssr: false });
const SmartChartRecommender = dynamic(() => import('@/components/smart-chart-recommender').then(m => ({ default: m.SmartChartRecommender })), { ssr: false });
const AITableBuilder = dynamic(() => import('@/components/ai-table-builder'), { ssr: false });
const MetricSemanticLayer = dynamic(() => import('@/components/metric-semantic-layer').then(m => ({ default: m.MetricSemanticLayer })), { ssr: false });
const DataQualityChecker = dynamic(() => import('@/components/data-quality-checker').then(m => ({ default: m.DataQualityChecker })), { ssr: false });
const SmartDataPrep = dynamic(() => import('@/components/smart-data-prep').then(m => ({ default: m.SmartDataPrep })), { ssr: false });
const DataStorytelling = dynamic(() => import('@/components/data-storytelling').then(m => ({ default: m.DataStorytelling })), { ssr: false });
const IndustryScenario = dynamic(() => import('@/components/industry-scenario').then(m => ({ default: m.IndustryScenario })), { ssr: false });
const NL2Dashboard = dynamic(() => import('@/components/nl2-dashboard').then(m => ({ default: m.NL2Dashboard })), { ssr: false });
const ChartExporter = dynamic(() => import('@/components/chart-exporter').then(m => ({ default: m.ChartExporter })), { ssr: false });
const AIFieldPanel = dynamic(() => import('@/components/ai-field-panel').then(m => ({ default: m.AIFieldPanel })), { ssr: false });
const MetricManager = dynamic(() => import('@/components/metric-manager').then(m => ({ default: m.MetricManager })), { ssr: false });
const ExtendedChartGallery = dynamic(() => import('@/components/extended-chart-gallery').then(m => ({ default: m.ExtendedChartGallery })), { ssr: false });
const SqlLab = dynamic(() => import('@/components/sql-lab').then(m => ({ default: m.SqlLab })), { ssr: false });
const AIFormulaGenerator = dynamic(() => import('@/components/ai-formula-generator').then(m => ({ default: m.AIFormulaGenerator })), { ssr: false });
const InsightReportGenerator = dynamic(() => import('@/components/insight-report-generator').then(m => ({ default: m.InsightReportGenerator })), { ssr: false });
const PivotTable = dynamic(() => import('@/components/pivot-table').then(m => ({ default: m.PivotTable })), { ssr: false });
const KanbanView = dynamic(() => import('@/components/view-kanban').then(m => ({ default: m.KanbanView })), { ssr: false });
const DataAlerting = dynamic(() => import('@/components/data-alerting').then(m => ({ default: m.DataAlerting })), { ssr: false });
const VersionHistory = dynamic(() => import('@/components/version-history').then(m => ({ default: m.VersionHistory })), { ssr: false });
const TemplateManager = dynamic(() => import('@/components/template-manager').then(m => ({ default: m.TemplateManager })), { ssr: false });
const CalendarView = dynamic(() => import('@/components/view-calendar').then(m => ({ default: m.CalendarView })), { ssr: false });
const GanttView = dynamic(() => import('@/components/view-gantt').then(m => ({ default: m.GanttView })), { ssr: false });
const LinkedTablesManager = dynamic(() => import('@/components/linked-tables').then(m => ({ default: m.LinkedTablesManager })), { ssr: false });
const MultimodalFields = dynamic(() => import('@/components/multimodal-fields').then(m => ({ default: m.MultimodalFields })), { ssr: false });
const WorkflowAutomation = dynamic(() => import('@/components/workflow-automation').then(m => ({ default: m.WorkflowAutomation })), { ssr: false });
const AppBuilder = dynamic(() => import('@/components/app-builder').then(m => ({ default: m.AppBuilder })), { ssr: false });
const RowComments = dynamic(() => import('@/components/row-comments').then(m => ({ default: m.RowComments })), { ssr: false });
const SpreadsheetAgentPage = dynamic(() => import('@/components/SpreadsheetAgentPage').then(m => ({ default: m.SpreadsheetAgentPage })), { ssr: false });

// ============================================
// 视图模式类型（整合后：10个入口，功能零删除）
// ============================================
	type ViewMode =
	  | 'home'
	  | 'ai-table-builder'
	  | 'data-table' | 'data-prep'
	  | 'insights' | 'visualization'
	  | 'chat' | 'ai-assistant'
	  | 'sql-lab' | 'report-export'
	  | 'spreadsheet-agent' | 'form-collection'
	  | 'alerting' | 'version-history' | 'template-manager'
	  | 'data-source'
	  | 'pivot-table'
	  | 'multimodal'
		| 'admin'
	


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
  const { isLoggedIn, setLoginDialogOpen, hasPermission, user } = useAuth();

  // D-04修复：统一API请求头，携带JWT token
  const getAuthHeaders = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('datainsight_token') : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('home');
  const [adminTab, setAdminTab] = useState<AdminTab>('users');
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const adminTabTitles: Record<AdminTab, string> = {
    users: '用户管理',
    logs: '登录记录',
    'ai-config': 'AI模型配置',
    stats: '使用统计',
    plans: '套餐管理',
    announcements: '公告管理',
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [tableView, setTableView] = useState<'table' | 'kanban' | 'calendar' | 'gantt'>('table');
  const [kanbanField, setKanbanField] = useState<string>('');
  const [dateField, setDateField] = useState<string>('');
  const [ganttConfig, setGanttConfig] = useState<{ nameField: string; startField: string; endField: string }>({ nameField: '', startField: '', endField: '' });
  // 多表数据存储（仅当前会话内存，不持久化）
  const [multiTableData, setMultiTableData] = useState<ParsedData[]>([]);

  // 子Tab状态（解决首次渲染Tabs内容不显示问题）
  const [dataPrepTab, setDataPrepTab] = useState('smart');
  const [insightsTab, setInsightsTab] = useState('analysis');
  const [vizTab, setVizTab] = useState('dashboard');
  const [dataSourceTab, setDataSourceTab] = useState('sources');

  // 视图切换时重置子Tab到默认值
  useEffect(() => {
    if (viewMode === 'data-prep') setDataPrepTab('smart');
    if (viewMode === 'insights') setInsightsTab('analysis');
    if (viewMode === 'visualization') setVizTab('dashboard');
    if (viewMode === 'data-source') setDataSourceTab('sources');
  }, [viewMode]);


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

  // 自动分析：当切换到分析视图且analysis为空时，自动触发分析
  useEffect(() => {
    if (viewMode === 'insights' && parsedData && !analysis && !isAnalyzing) {
      setIsAnalyzing(true);
      handleAnalyzeWith(parsedData).finally(() => setIsAnalyzing(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  // ============================================
  // 事件处理
  // ============================================

  // 挂起文件队列：登录成功后自动重试
  const pendingUploadRef = useRef<UploadFile[] | null>(null);

  // 登录成功后自动重试挂起的文件上传
  useEffect(() => {
    if (isLoggedIn && pendingUploadRef.current) {
      console.log('[Upload] Login succeeded, retrying pending upload');
      const pending = pendingUploadRef.current;
      pendingUploadRef.current = null;
      setTimeout(() => handleFileUpload(pending), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // D-15 修复：TTL过期预警
  useEffect(() => {
    const ttlCheck = checkTTLWarning();
    if (ttlCheck.hasWarning) {
      const items = ttlCheck.items.map(i => `${i.key} (剩余${i.remainingHours}h)`).join('、');
      toast.warning(`部分数据即将过期清理: ${items}`, { duration: 8000 });
    }
  }, []);

  const handleFileUpload = async (uploadedFiles: UploadFile[]) => {
    console.log('[Upload] handleFileUpload called, count:', uploadedFiles?.length, 'isLoggedIn:', isLoggedIn);

    if (!isLoggedIn) {
      console.log('[Upload] Not logged in, queueing files and showing login dialog');
      setLoginDialogOpen(true);
      pendingUploadRef.current = uploadedFiles;
      return;
    }
    if (!hasPermission('upload')) {
      console.log('[Upload] No upload permission');
      return;
    }

    setAnalysis(null);
    setIsLoading(true);
    setError(null);

    try {
      const completedFiles = uploadedFiles.filter(f => f.status === 'completed' || f.status === 'cached');
      console.log('[Upload] Completed files:', completedFiles.length, completedFiles.map(f => f.id));

      // D-02 修复：当文件仍在解析时，保持加载状态而非提前返回
      // Worker 回调会再次调用 onFileUpload，届时文件状态已变为 completed
      if (completedFiles.length === 0) {
        const pending = uploadedFiles.filter(f => f.status === 'pending' || f.status === 'parsing');
        if (pending.length > 0) {
          console.log('[Upload] Files still pending/parsing:', pending.length, '- keeping loading state, waiting for worker callback');
          // 保持 isLoading=true，不提前关闭 loading 状态
          // Worker 完成后会再次调用 handleFileUpload，届时 completedFiles 不为空
          return;
        }
        // 确实没有完成的文件（也不是 pending/parsing），关闭加载状态
        setIsLoading(false);
        return;
      }

      // D-01 修复：处理所有已完成的文件，而不仅仅是第一个
      // 将所有已解析的数据存入 multiTableData，第一个文件显示在主视图
      const allParsedData = completedFiles
        .map(f => f.parsedData)
        .filter((d): d is ParsedData => d != null);

      if (allParsedData.length === 0) {
        throw new Error('文件解析失败');
      }

      // 第一个文件显示在主视图
      const firstParsedData = allParsedData[0];
      console.log('[Upload] Processing file:', firstParsedData.fileName, 'rows:', firstParsedData.rowCount);

      // 仅在首次上传（parsedData 为 null）时 setParsedData，后续文件完成时不覆盖主视图
      if (!parsedData) {
        setParsedData(firstParsedData);
      }

      // 所有已完成的文件都存入 multiTableData
      setMultiTableData(prev => {
        let next = Array.isArray(prev) ? [...prev] : [];
        for (const data of allParsedData) {
          next = next.filter(t => t.fileName !== data.fileName);
          next.push(data);
        }
        return next;
      });

      // 多文件上传时显示通知
      if (completedFiles.length > 1) {
        toast.success(`已处理 ${completedFiles.length} 个文件`, {
          description: `主视图显示: ${firstParsedData.fileName}，其余可在关联表中查看`,
        });
      }

      setViewMode('data-table');

      // 对主视图数据执行分析
      const dataToAnalyze = parsedData || firstParsedData;
      const analyzeResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ data: dataToAnalyze }),
      });

      if (analyzeResponse.ok) {
        const analyzeResult = await analyzeResponse.json();
        if (analyzeResult.success && analyzeResult.analysis) {
          console.log('[Upload] Analysis complete, insights:', analyzeResult.analysis.insights?.length);
          setAnalysis(analyzeResult.analysis);
        } else {
          console.error('[Upload] Invalid analysis result:', analyzeResult.error);
          setError('数据分析失败: ' + (analyzeResult.error || '未知错误'));
        }
      } else {
        console.error('[Upload] Analysis request failed:', analyzeResponse.status);
        setError('分析请求失败，HTTP ' + analyzeResponse.status);
      }

      pendingUploadRef.current = null;

    } catch (err) {
      console.error('[Upload] File processing error:', err);
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDataCleaned = (cleanedData: ParsedData) => {
    setParsedData(cleanedData);
    handleAnalyzeWith(cleanedData);
  };

  // 应用AI字段结果到数据（添加新列）
  const handleApplyAIField = (field: AIField) => {
    if (!parsedData || !field.results) return;
    
    // 将AI处理结果作为新列添加到数据中
    const newHeader = field.name;
    const newRows = parsedData.rows.map((row, idx) => ({
      ...row,
      [newHeader]: field.results[idx] ?? null,
    }));
    
    const newData: ParsedData = {
      headers: [...parsedData.headers, newHeader],
      rows: newRows,
      fileName: parsedData.fileName,
      rowCount: newRows.length,
      columnCount: parsedData.columnCount + 1,
    };
    
    setParsedData(newData);
    handleAnalyzeWith(newData);
  };

  // 应用AI公式到数据（计算新列）
  const handleApplyFormula = (formula: string, targetColumn: string) => {
    if (!parsedData) return;
    
    try {
      // 使用简单公式引擎计算新列值
      const newRows = parsedData.rows.map(row => {
        try {
          // 简单的公式计算（支持基本运算）
          const evalFormula = formula
            .replace(/\[([^\]]+)\]/g, (_, col) => JSON.stringify(row[col] ?? 0));
          const value = Function(`"use strict"; return (${evalFormula})`)();
          return { ...row, [targetColumn]: value };
        } catch {
          return { ...row, [targetColumn]: null };
        }
      });
      
      const newData: ParsedData = {
        headers: [...parsedData.headers, targetColumn],
        rows: newRows,
        fileName: parsedData.fileName,
        rowCount: newRows.length,
        columnCount: parsedData.columnCount + 1,
      };
      
      setParsedData(newData);
      handleAnalyzeWith(newData);
    } catch (err) {
      console.error('公式应用失败:', err);
    }
  };

  const handleAnalyze = () => {
    if (parsedData) handleAnalyzeWith(parsedData);
  };

  const handleAnalyzeWith = (data: ParsedData) => {
    // AI分析权限检查
    if (!hasPermission('ai_analyze')) {
      toast.error('无权使用 AI 分析', { description: '管理员已禁用 AI 分析功能' });
      return Promise.reject(new Error('无 AI 分析权限'));
    }
    // 前端确定性分析优先，不依赖LLM
    try {
      import('@/lib/client-data-engine').then(({ analyzeDataClient }) => {
        const clientAnalysis = analyzeDataClient(data);
        setAnalysis(clientAnalysis);
        toast.success('数据分析完成', { description: `已分析 ${data.rowCount} 行数据` });
      });
      return Promise.resolve();
    } catch (err) {
      console.error('前端分析失败，回退到服务端:', err);
      return fetch('/api/analyze', {
        method: 'POST',
        headers: getAuthHeaders(),
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
    }
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
        <div className="w-full space-y-8">
          {/* 数据获取入口：3种平行的数据接入方式 */}
          <div className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">获取数据</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {/* 上传文件 */}
              <Card className={cn(
                'border transition-all hover:shadow-sm cursor-pointer',
                hasData ? 'bg-emerald-500/5 border-emerald-500/20' : 'border-dashed border-border hover:border-primary/40'
              )}>
                <CardContent className="py-5">
                  {hasData ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-lg"><FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
                        <div>
                          <p className="font-medium text-sm">{parsedData.fileName}</p>
                          <p className="text-xs text-muted-foreground">{parsedData?.rowCount?.toLocaleString() ?? '0'} 行 &middot; {parsedData?.columnCount ?? 0} 列</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleGoHome} className="text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Upload className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-medium text-sm">上传文件</span>
                      </div>
                      <div className="w-full"><AsyncFileUploader onFileUpload={handleFileUpload} /></div>
                      <p className="text-xs text-muted-foreground/70">支持 Excel (.xlsx/.xls) 和 CSV 文件，最大 50MB</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 连接数据源 */}
              <Card className="border border-dashed border-border hover:border-primary/40 cursor-pointer transition-all hover:shadow-sm" onClick={() => setViewMode('data-source')}>
                <CardContent className="py-5 flex flex-col justify-center h-full">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Database className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium text-sm">连接数据源</span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 ml-[42px]">连接数据库或API，实时同步数据</p>
                </CardContent>
              </Card>

              {/* AI生成表格 */}
              <Card className="border border-dashed border-border hover:border-primary/40 cursor-pointer transition-all hover:shadow-sm" onClick={() => {
                if (!isLoggedIn) { setLoginDialogOpen(true); return; }
                setViewMode('ai-table-builder');
              }}>
                <CardContent className="py-5 flex flex-col justify-center h-full">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 bg-violet-500/10 rounded-lg">
                      <Sparkles className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="font-medium text-sm">AI 生成表格</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-primary/10 text-primary">AI</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground/70 ml-[42px]">描述你的需求，AI 自动创建表格模板</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <OnboardingGuide />
          <HomeCards
            hasData={!!parsedData}
            onViewChange={(v) => setViewMode(v as ViewMode)}
            fileName={parsedData?.fileName}
            rowCount={parsedData?.rowCount}
            isLoggedIn={isLoggedIn}
            onLoginRequired={() => setLoginDialogOpen(true)}
            hasPermission={(perm: string) => hasPermission(perm as PermissionKey)}
          />
          {/* 公告弹窗 - 合规：已读状态仅存客户端localStorage */}
          <AnnouncementPopup isLoggedIn={isLoggedIn} />
        </div>
      );
    }

    // 需要数据但无数据的视图（这些视图没有自定义空状态，使用通用提示）
    const needsDataViews: ViewMode[] = ['data-table', 'data-prep', 'insights', 'visualization', 'alerting'];
    if (needsDataViews.includes(viewMode) && !parsedData) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4">
            <Upload className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-medium text-muted-foreground mb-2">请先上传数据</h3>
          <p className="text-sm text-muted-foreground/60 mb-6">此功能需要加载数据后才能使用</p>
          <Button onClick={() => setViewMode('home')}>去上传数据</Button>
        </div>
      );
    }

    // AI 智能建表（不需要数据）
    if (viewMode === 'ai-table-builder') {
      return (
        <div className="relative">
          <ErrorBoundary moduleName="AI生成表格">
            <AITableBuilder modelConfig={activeModelConfig} />
          </ErrorBoundary>
          <SceneAgentPanel sceneId="table-generate" sceneName="生成表格" modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // 数据源管理（不需要数据）
    if (viewMode === 'data-source') {
      return (
        <ErrorBoundary moduleName="连接数据源">
          <DataSourceManager />
        </ErrorBoundary>
      );
    }

    // ========================================
    // 数据预览（整合：表格 + 智能处理 + 智能公式）
    // ========================================
    if (viewMode === 'data-table' && parsedData) {
      return (
        <div className="relative">
          <Tabs defaultValue="table" key="table" className="space-y-4">
          <TabsList>
            <TabsTrigger value="table">数据视图</TabsTrigger>
            <TabsTrigger value="linked">关联表</TabsTrigger>
            <TabsTrigger value="workflow">自动化</TabsTrigger>
            <TabsTrigger value="comments">评论</TabsTrigger>
            <TabsTrigger value="ai-field">智能处理</TabsTrigger>
            <TabsTrigger value="ai-formula">智能公式</TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* 视图切换 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">视图:</span>
                    <div className="flex bg-muted rounded-lg p-0.5">
                      {([
                        { key: 'table', label: '表格', icon: TableIcon },
                        { key: 'kanban', label: '看板', icon: LayoutIcon },
                        { key: 'calendar', label: '日历', icon: CalendarIcon },
                        { key: 'gantt', label: '甘特图', icon: GanttIcon },
                      ] as const).map(v => {
                        const Icon = v.icon;
                        return (
                          <button
                            key={v.key}
                            onClick={() => setTableView(v.key)}
                            className={cn(
                              'flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors',
                              tableView === v.key ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  {tableView === 'kanban' && (
                    <select
                      className="text-sm border rounded px-2 py-1 bg-background"
                      value={kanbanField}
                      onChange={e => setKanbanField(e.target.value)}
                    >
                      <option value="">选择分组字段</option>
                      {parsedData.headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  )}
                  {tableView === 'calendar' && (
                    <select
                      className="text-sm border rounded px-2 py-1 bg-background"
                      value={dateField}
                      onChange={e => setDateField(e.target.value)}
                    >
                      <option value="">选择日期字段</option>
                      {analysis?.fieldStats?.filter(f => f.type === 'date').map(f => (
                        <option key={f.field} value={f.field}>{f.field}</option>
                      ))}
                    </select>
                  )}
                  {tableView === 'gantt' && (
                    <div className="flex gap-2">
                      <select className="text-sm border rounded px-2 py-1 bg-background" value={ganttConfig.nameField} onChange={e => setGanttConfig(p => ({ ...p, nameField: e.target.value }))}>
                        <option value="">任务名称</option>
                        {parsedData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select className="text-sm border rounded px-2 py-1 bg-background" value={ganttConfig.startField} onChange={e => setGanttConfig(p => ({ ...p, startField: e.target.value }))}>
                        <option value="">开始日期</option>
                        {analysis?.fieldStats?.filter(f => f.type === 'date').map(f => <option key={f.field} value={f.field}>{f.field}</option>)}
                      </select>
                      <select className="text-sm border rounded px-2 py-1 bg-background" value={ganttConfig.endField} onChange={e => setGanttConfig(p => ({ ...p, endField: e.target.value }))}>
                        <option value="">结束日期</option>
                        {analysis?.fieldStats?.filter(f => f.type === 'date').map(f => <option key={f.field} value={f.field}>{f.field}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {tableView === 'table' && <DataTable data={parsedData} fieldStats={analysis?.fieldStats} />}
                {tableView === 'kanban' && (
                  <KanbanView data={parsedData} />
                )}
                {tableView === 'calendar' && (
                  <CalendarView rows={parsedData.rows} headers={parsedData.headers} />
                )}
                {tableView === 'gantt' && (
                  <GanttView rows={parsedData.rows} headers={parsedData.headers} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="linked">
            <LinkedTablesManager
              tables={multiTableData}
              activeTable={parsedData}
              onTablesChange={setMultiTableData}
              onActiveTableChange={t => { setParsedData(t); setAnalysis(null); handleAnalyzeWith(t); }}
            />
          </TabsContent>
          <TabsContent value="workflow">
            <WorkflowAutomation headers={parsedData.headers} />
          </TabsContent>
          <TabsContent value="comments">
            <RowComments rows={parsedData.rows} rowKeyField={parsedData.headers[0]} />
          </TabsContent>
          <TabsContent value="ai-field">
            <AIFieldPanel data={parsedData} dataId={parsedData.fileName || 'default'} modelConfig={activeModelConfig} onApplyField={handleApplyAIField} />
          </TabsContent>
          <TabsContent value="ai-formula">
            <AIFormulaGenerator data={parsedData} modelConfig={activeModelConfig} onApplyFormula={handleApplyFormula} />
          </TabsContent>
        </Tabs>
        <SceneAgentPanel sceneId="data-clean" sceneName="数据清洗" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
      </div>
    );
  }

    // ========================================
    // 数据处理（清洗 + 质量）
    // ========================================
    if (viewMode === 'data-prep') {
      return (
        <div className="relative">
          <Tabs value={dataPrepTab} onValueChange={setDataPrepTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="smart" disabled={!parsedData}>智能准备</TabsTrigger>
              <TabsTrigger value="clean" disabled={!parsedData}>数据清洗</TabsTrigger>
              <TabsTrigger value="quality" disabled={!parsedData || !analysis}>质量检测</TabsTrigger>
            </TabsList>
            <TabsContent value="smart">
              {parsedData && analysis ? (
                <SmartDataPrep data={parsedData} fieldStats={analysis.fieldStats} modelConfig={activeModelConfig || undefined} onDataReady={handleDataCleaned} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground/50">请先上传数据</div>
              )}
            </TabsContent>
            <TabsContent value="clean">
              {parsedData && analysis ? (
                <DataCleaner data={parsedData} fieldStats={analysis.fieldStats} onDataChange={handleDataCleaned} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground/50">请先上传数据</div>
              )}
            </TabsContent>
            <TabsContent value="quality">
              {parsedData && analysis ? (
                <DataQualityChecker data={parsedData} fieldStats={analysis.fieldStats} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground/50">请先上传数据</div>
              )}
            </TabsContent>
          </Tabs>
          <SceneAgentPanel sceneId="data-clean" sceneName="数据清洗" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // ========================================
    // 自动分析（整合：深度分析 + 分析报告）
    // ========================================
    if (viewMode === 'insights') {
      if (!parsedData) {
        return (
          <Card className="text-center py-16">
            <CardContent>
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">请先上传数据，即可使用自动分析</p>
              <Button onClick={() => setViewMode('home')}>去上传数据</Button>
            </CardContent>
          </Card>
        );
      }
      if (!analysis) {
        return (
          <Card className="text-center py-16">
            <CardContent className="space-y-4">
              <Brain className="w-12 h-12 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-lg font-medium">正在自动分析数据...</p>
              <p className="text-sm text-muted-foreground">AI 正在扫描数据特征、识别模式、检测异常</p>
              {isAnalyzing && <Progress value={45} className="w-64 mx-auto" />}
            </CardContent>
          </Card>
        );
      }
      return (
        <div className="relative">
          <Tabs defaultValue="insights" key="insights" className="space-y-4">
            <TabsList>
              <TabsTrigger value="insights">深度分析</TabsTrigger>
              <TabsTrigger value="report">
                <FileText className="w-3.5 h-3.5 mr-1" />
                分析报告
              </TabsTrigger>
              <TabsTrigger value="data-story">数据故事</TabsTrigger>
              <TabsTrigger value="industry">行业场景</TabsTrigger>
            </TabsList>
            <TabsContent value="insights">
              <DataInsights data={parsedData} analysis={analysis} onAnalyze={handleAnalyze} modelConfig={activeModelConfig} />
            </TabsContent>
            <TabsContent value="report">
              <InsightReportGenerator analysis={analysis} fileName={parsedData?.fileName} />
            </TabsContent>
            <TabsContent value="data-story">
              <DataStorytelling
                data={parsedData}
                fieldStats={analysis?.fieldStats || []}
                modelConfig={activeModelConfig || undefined}
                insights={analysis?.insights}
              />
            </TabsContent>
            <TabsContent value="industry">
              <IndustryScenario
                data={parsedData}
                fieldStats={analysis?.fieldStats || []}
                modelConfig={activeModelConfig || undefined}
                onNavigate={(view: string) => setViewMode(view as ViewMode)}
              />
            </TabsContent>
          </Tabs>
          <SceneAgentPanel sceneId="data-analyze" sceneName="数据分析" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // ========================================
    // 仪表盘（整合：快速看板 + AI建看板 + 看板设计）
    // ========================================
    if (viewMode === 'visualization' && parsedData && analysis) {
      return (
        <div className="relative">
          <ErrorBoundary moduleName="仪表盘">
            <Tabs defaultValue="dashboard" key="dashboard" className="space-y-4">
              <TabsList>
                <TabsTrigger value="dashboard">快速看板</TabsTrigger>
                <TabsTrigger value="nl2dash">AI 建看板</TabsTrigger>
                <TabsTrigger value="designer">看板设计</TabsTrigger>
                <TabsTrigger value="charts">
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  图表中心
                </TabsTrigger>
                <TabsTrigger value="metrics">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  指标体系
                </TabsTrigger>
              </TabsList>
              <TabsContent value="dashboard">
                <Dashboard data={parsedData} analysis={analysis} />
              </TabsContent>
              <TabsContent value="nl2dash">
                {hasPermission('dashboard') ? (
                  <NL2Dashboard data={parsedData} fieldStats={analysis.fieldStats} modelConfig={activeModelConfig} />
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p>管理员已禁用看板创建功能</p>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="designer">
                {hasPermission('dashboard') ? (
                  <DashboardDesigner data={parsedData} fieldStats={analysis.fieldStats} />
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p>管理员已禁用看板设计功能</p>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="charts">
                <Tabs defaultValue="ai-chart" className="mt-4">
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
              </TabsContent>
              <TabsContent value="metrics">
                <Tabs defaultValue="ai-metric" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="ai-metric">AI 建指标</TabsTrigger>
                    <TabsTrigger value="metric-lib">指标列表</TabsTrigger>
                  </TabsList>
                  <TabsContent value="ai-metric">
                    <MetricSemanticLayer data={parsedData} fieldStats={analysis.fieldStats} modelConfig={activeModelConfig || undefined} />
                  </TabsContent>
                  <TabsContent value="metric-lib">
                    <MetricManager data={parsedData} />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </ErrorBoundary>
          <SceneAgentPanel sceneId="visualize" sceneName="可视化" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // ========================================
    // 问答数据 (AI问数)
    // ========================================
    if (viewMode === 'chat' || viewMode === 'ai-assistant') {
      if (!parsedData) {
        return (
          <Card className="text-center py-16">
            <CardContent>
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">AI问数 - 用自然语言查询和分析数据</p>
              <p className="text-sm text-muted-foreground/60 mb-4">上传数据后，即可通过对话方式查询、统计、分析数据</p>
              <Button onClick={() => setViewMode('home')}>去上传数据</Button>
            </CardContent>
          </Card>
        );
      }
      if (!analysis) {
        return (
          <Card className="text-center py-16">
            <CardContent className="space-y-4">
              <MessageSquare className="w-12 h-12 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-lg font-medium">数据正在分析中...</p>
              <p className="text-sm text-muted-foreground">分析完成后即可使用AI问数</p>
            </CardContent>
          </Card>
        );
      }
      return (
        <div className="grid lg:grid-cols-2 gap-6">
          <GlobalAgentAssistant
            mode="embedded"
            hasData={!!parsedData}
            rowCount={parsedData?.rowCount}
            data={parsedData || undefined}
            fieldStats={analysis?.fieldStats}
            modelConfig={activeModelConfig || undefined}
            currentView={viewMode}
            onAction={(action, params) => {
              if (action === 'navigate' && params?.view) {
                setViewMode(params.view as ViewMode);
              } else if (action === 'open-settings') {
                setShowSettings(true);
              }
            }}
          />
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                <h4 className="font-medium text-primary mb-2">你能问什么？</h4>
                <ul className="text-sm text-primary/70 space-y-1.5">
                  <li className="flex items-start gap-2"><Search className="w-4 h-4 mt-0.5 shrink-0" />查找数据 - &ldquo;销售额超过10万的订单有哪些？&rdquo;</li>
                  <li className="flex items-start gap-2"><Zap className="w-4 h-4 mt-0.5 shrink-0" />统计计算 - &ldquo;各区域平均绩效得分是多少？&rdquo;</li>
                  <li className="flex items-start gap-2"><TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />原因分析 - &ldquo;为什么本月销售额下降了15%？&rdquo;</li>
                  <li className="flex items-start gap-2"><BarChart3 className="w-4 h-4 mt-0.5 shrink-0" />趋势预测 - &ldquo;下月新增用户数预计多少？&rdquo;</li>
                  <li className="flex items-start gap-2"><FileText className="w-4 h-4 mt-0.5 shrink-0" />分析报告 - &ldquo;帮我生成本周项目进展周报&rdquo;</li>
                </ul>
              </div>
              <div className="p-4 bg-emerald-500/5 rounded-lg border border-emerald-500/10">
                <h4 className="font-medium text-emerald-700 dark:text-emerald-400 mb-2">试试这些问题</h4>
                <div className="space-y-2 text-sm text-emerald-600/80 dark:text-emerald-400/80">
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
    // 数据故事 & 行业场景已合并到智能洞察Tab内
    // ========================================

    // ========================================
    // SQL 查询
    // ========================================
    if (viewMode === 'sql-lab') {
      if (!parsedData) {
        return (
          <Card className="text-center py-16">
            <CardContent>
              <Code2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">SQL查询 - 使用SQL语句分析数据</p>
              <p className="text-sm text-muted-foreground/60 mb-2">支持对已上传的数据表执行SQL查询（浏览器端SQLite引擎）</p>
              <p className="text-xs text-muted-foreground/40 mb-4">数据源：上传的Excel/CSV文件会自动创建SQLite内存数据库</p>
              <Button onClick={() => setViewMode('home')}>去上传数据</Button>
            </CardContent>
          </Card>
        );
      }
      return (
        <div className="relative">
          <SqlLab data={parsedData} />
          <SceneAgentPanel sceneId="data-analyze" sceneName="数据分析" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // ========================================
    // 透视表
    // ========================================
    if (viewMode === 'pivot-table' && parsedData) {
      return (
        <div className="relative">
          <PivotTable data={parsedData} analysis={analysis} />
          <SceneAgentPanel sceneId="data-analyze" sceneName="数据分析" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // ========================================
    // 导出分享（整合：生成报告 + 导出图表 + 分享管理）
    // ========================================
    if (viewMode === 'report-export') {
      if (!parsedData) {
        return (
          <Card className="text-center py-16">
            <CardContent>
              <Download className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">报表导出 - 生成和导出分析报告</p>
              <p className="text-sm text-muted-foreground/60 mb-4">上传数据后，可生成报告、导出图表、分享数据</p>
              <Button onClick={() => setViewMode('home')}>去上传数据</Button>
            </CardContent>
          </Card>
        );
      }
      return (
        <div className="relative">
          <Tabs defaultValue="report" key="report" className="space-y-4">
            <TabsList>
              <TabsTrigger value="report" disabled={!analysis}>生成报告</TabsTrigger>
              <TabsTrigger value="export">导出图表</TabsTrigger>
              <TabsTrigger value="app">应用设计</TabsTrigger>
              <TabsTrigger value="share">分享管理</TabsTrigger>
            </TabsList>
            <TabsContent value="report">
              {analysis ? (
                <ReportGenerator data={parsedData} analysis={analysis} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground/50">数据正在分析中...</div>
              )}
            </TabsContent>
            <TabsContent value="export">
              <ChartExporter chartName={parsedData.fileName || '图表'} />
            </TabsContent>
            <TabsContent value="app">
              {hasPermission('dashboard') ? (
                <AppBuilder />
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>管理员已禁用应用创建功能</p>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="share">
              {hasPermission('share') ? (
                <ShareManager dashboardName={parsedData.fileName} />
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>管理员已禁用分享功能</p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
          <SceneAgentPanel sceneId="general" sceneName="通用" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // ========================================
    // AI 表格智能体（全新功能）
    // ========================================
    if (viewMode === 'spreadsheet-agent') {
      return (
        <div className="relative">
          <SpreadsheetAgentPage />
          <SceneAgentPanel sceneId="formula" sceneName="公式生成" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // ========================================
    // 表单收集（独立功能，可不依赖数据）
    // ========================================
    if (viewMode === 'form-collection') {
      return (
        <div className="relative">
          <FormBuilder data={parsedData} onDataChange={setParsedData} />
          <SceneAgentPanel sceneId="general" sceneName="通用" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    // ========================================
    // AI多模态（图片处理：图转表/图转文/AI生图/语音）
    // ========================================
    if (viewMode === 'multimodal') {
      return (
        <div className="relative">
          <MultimodalFields
            data={parsedData}
            modelConfig={activeModelConfig}
            onImageToTable={(result) => {
              const typedRows = result.rows.map(row => {
                const typed: Record<string, CellValue> = {};
                for (const key of Object.keys(row)) {
                  typed[key] = row[key] as CellValue;
                }
                return typed;
              });
              setParsedData({ headers: result.headers, rows: typedRows, fileName: 'from-image.xlsx', rowCount: result.rows.length, columnCount: result.headers.length });
              setViewMode('data-table');
            }}
          />
          <SceneAgentPanel sceneId="multimodal" sceneName="图片处理" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    if (viewMode === 'alerting') {
      return (
        <div className="relative">
          <DataAlerting data={parsedData!} fieldStats={analysis?.fieldStats || []} />
          <SceneAgentPanel sceneId="alerting" sceneName="数据预警" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    if (viewMode === 'version-history') {
      return (
        <div className="relative">
          <VersionHistory />
          <SceneAgentPanel sceneId="version-history" sceneName="版本快照" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    if (viewMode === 'template-manager') {
      return (
        <div className="relative">
          <TemplateManager />
          <SceneAgentPanel sceneId="template-manager" sceneName="模板管理" data={parsedData} analysis={analysis} fieldStats={analysis?.fieldStats} modelConfig={activeModelConfig || undefined} />
        </div>
      );
    }

    return null;
  };

  // ============================================
  // 获取当前视图标题
  // ============================================
  const getCurrentViewTitle = () => {
    const titles: Record<string, string> = {
      'home': '工作台', 'ai-table-builder': 'AI生成表格',
      'data-table': '数据预览', 'data-prep': '数据工作台',
      'insights': '智能洞察', 'visualization': '可视化',
      'chat': '问答数据', 'multimodal': '图片处理',
      'sql-lab': 'SQL 查询',
      'report-export': '导出分享',
      'alerting': '数据预警', 'version-history': '版本快照', 'template-manager': '模板管理',
      'pivot-table': '透视表',
      'form-collection': '表单收集',
    };
    return titles[viewMode] || '';
  };

  // ============================================
  // 渲染
  // ============================================

  // 管理后台：独立布局，替换整个页面
  if (viewMode === 'admin' && user?.role === 'admin') {
    return (
      <div className="min-h-screen flex bg-background">
        <AdminSidebar
          activeTab={adminTab}
          onTabChange={setAdminTab}
          onBackToUser={() => setViewMode('home')}
          collapsed={adminSidebarCollapsed}
          onToggleCollapse={() => setAdminSidebarCollapsed(!adminSidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 border-b border-border flex items-center px-6 shrink-0 bg-background">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>管理后台</span>
              <span className="text-muted-foreground/40">/</span>
              <span className="text-foreground font-medium">{adminTabTitles[adminTab] || adminTab}</span>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-6">
            <ErrorBoundary moduleName="管理后台">
              <AdminContent activeTab={adminTab} />
            </ErrorBoundary>
          </main>
        </div>

        {/* 设置弹窗 */}
        <SettingsDialog
          open={showSettings}
          onOpenChange={setShowSettings}
          parsedData={parsedData}
          fieldStats={analysis?.fieldStats || []}
          darkMode={darkMode}
          onDarkModeChange={setDarkMode}
          onModelChange={handleModelChange}
        />
        <LoginDialog />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* ===== 左侧侧边栏 ===== */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        activeView={viewMode}
        onViewChange={(v) => setViewMode(v as ViewMode)}
        isLoggedIn={isLoggedIn}
        userRole={user?.role}
        onOpenSettings={() => setShowSettings(true)}
        onLoginClick={() => setLoginDialogOpen(true)}
      />

      {/* ===== 右侧主区域 ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header className="h-12 bg-card/80 backdrop-blur-sm border-b border-border flex items-center justify-between px-5 flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* 面包屑 */}
            <button
              onClick={() => setViewMode('home')}
              className="text-sm text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              工作台
            </button>
            {viewMode !== 'home' && (
              <>
                <span className="text-muted-foreground/30">/</span>
                <span className="text-sm font-medium text-foreground">{getCurrentViewTitle()}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* 模型未配置警告 */}
            {!activeModelConfig && (
              <button
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-primary-tint text-primary border border-primary/15 hover:bg-primary/12 transition-colors cursor-pointer"
              >
                <AlertCircle className="w-3 h-3" />
                配置AI模型
              </button>
            )}
            {/* 数据状态指示 */}
            {parsedData && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs cursor-pointer hover:bg-muted" onClick={handleGoHome}>
                <CheckCircle className="w-3 h-3 text-primary" />
                {parsedData.fileName}
                <span className="text-muted-foreground/50 ml-0.5">{parsedData.rowCount?.toLocaleString() ?? '0'}行</span>
              </Badge>
            )}

            <Separator orientation="vertical" className="h-4 mx-0.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowSettings(true)}>
                  <Settings className="w-3.5 h-3.5 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>设置</TooltipContent>
            </Tooltip>

            {/* 用户登录入口 */}
            <UserMenu
              onOpenSettings={() => setShowSettings(true)}
            />
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

      {/* 登录弹窗 */}
      <LoginDialog />

      {/* 全局 AI 助手 */}
      <GlobalAgentAssistant
        mode="floating"
        hasData={!!parsedData}
        rowCount={parsedData?.rowCount}
        data={parsedData || undefined}
        fieldStats={analysis?.fieldStats}
        modelConfig={activeModelConfig || undefined}
        currentView={viewMode}
        onAction={(action, params) => {
          if (action === 'navigate' && params?.view) {
            setViewMode(params.view as ViewMode);
          } else if (action === 'open-settings') {
            setShowSettings(true);
          }
        }}
      />
    </div>
  );
}
