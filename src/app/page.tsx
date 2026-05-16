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
import { trackAuth, trackAction, trackPageView } from '@/lib/activity-tracker';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useI18n } from '@/lib/i18n';
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
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
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
const PricingPage = dynamic(() => import('@/components/pricing-page'), { ssr: false });
const DataCompliancePage = dynamic(() => import('@/components/data-compliance-page'), { ssr: false });
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
const UpgradeDialog = dynamic(() => import('@/components/upgrade-dialog').then(m => ({ default: m.UpgradeDialog })), { ssr: false });
const LicenseRedeemDialog = dynamic(() => import('@/components/license-redeem-dialog').then(m => ({ default: m.default })), { ssr: false });

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
		| 'admin' | 'pricing' | 'data-compliance'
	


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

  // Upgrade dialog state
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [upgradePlanKey, setUpgradePlanKey] = useState('');
  const [upgradeBilling, setUpgradeBilling] = useState<'monthly' | 'yearly'>('yearly');

  // License redeem dialog state
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);

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
  const { t } = useI18n();

  // Listen for show-upgrade event from pricing page
  useEffect(() => {
    const handleShowUpgrade = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.planKey) {
        setUpgradePlanKey(detail.planKey);
        setUpgradeBilling(detail.billing || 'yearly');
        setUpgradeDialogOpen(true);
      }
    };
    window.addEventListener('show-upgrade', handleShowUpgrade);
    return () => window.removeEventListener('show-upgrade', handleShowUpgrade);
  }, []);

  // Listen for show-license-redeem event
  useEffect(() => {
    const handleShowLicense = () => setLicenseDialogOpen(true);
    window.addEventListener('show-license-redeem', handleShowLicense);
    return () => window.removeEventListener('show-license-redeem', handleShowLicense);
  }, []);

  // Handle payment success callback from Creem
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      toast.success(t('payment.success'), { description: t('payment.successDesc') });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('payment') === 'failed') {
      toast.error(t('payment.failed'), { description: t('payment.failedDesc') });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [t]);

  const adminTabTitles: Record<AdminTab, string> = {
    users: t('admin.users'),
    logs: t('admin.loginLogs'),
    'activity-logs': t('admin.activityLogs'),
    'ai-config': t('admin.aiConfig'),
    'ai-usage': t('admin.aiUsage'),
    stats: t('admin.usageStats'),
    plans: t('admin.plans'),
    announcements: t('admin.announcements'),
    feedback: t('admin.feedback'),
  };
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
      const items = ttlCheck.items.map(i => `${i.key} (${t('common.remaining')} ${i.remainingHours}h)`).join(', ');
      toast.warning(`${t('warn.dataExpiring')}: ${items}`, { duration: 8000 });
    }
  }, []);

  // Activity tracking: page views & auth events
  useEffect(() => {
    const viewToPageMap: Record<string, string> = {
      home: 'homepage', 'data-table': 'data_table', dashboard: 'dashboard',
      settings: 'settings', analysis: 'analysis', 'chart-center': 'chart_center',
      'metric-center': 'metric_center', 'ai-assistant': 'ai_assistant',
      'sql-lab': 'sql_lab', admin: 'admin_panel', 'ai-table-builder': 'ai_assistant',
      'data-source': 'data_table',
    };
    const page = viewToPageMap[viewMode] || 'homepage';
    if (isLoggedIn) {
      trackPageView(page as Parameters<typeof trackPageView>[0]);
    }
  }, [viewMode, isLoggedIn]);

  const handleFileUpload = async (uploadedFiles: UploadFile[]) => {
    console.log('[Upload] handleFileUpload called, count:', uploadedFiles?.length, 'isLoggedIn:', isLoggedIn);
    trackAction('upload', { file_count: uploadedFiles?.length });

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
        throw new Error(t('error.fileParseFailed'));
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
        toast.success(`${t('success.filesProcessed', { count: completedFiles.length })}`, {
          description: `${t('success.mainView')}: ${firstParsedData.fileName}`,
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
          setError(t('error.dataAnalysisFailed') + ': ' + (analyzeResult.error || t('error.unknownError')));
        }
      } else {
        console.error('[Upload] Analysis request failed:', analyzeResponse.status);
        setError(t('error.analysisRequestFailed') + ' ' + analyzeResponse.status);
      }

      pendingUploadRef.current = null;

    } catch (err) {
      console.error('[Upload] File processing error:', err);
      setError(err instanceof Error ? err.message : t('error.processFailed'));
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
      toast.error(t('error.noAIPermission'), { description: t('error.aiAnalysisDisabled') });
      return Promise.reject(new Error(t('error.noAIPermission')));
    }
    // 前端确定性分析优先，不依赖LLM
    try {
      import('@/lib/client-data-engine').then(({ analyzeDataClient }) => {
        const clientAnalysis = analyzeDataClient(data);
        setAnalysis(clientAnalysis);
        toast.success(t('success.dataAnalysisComplete'), { description: `${t('success.rowsAnalyzed', { count: data.rowCount })}` });
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
          if (!res.ok) throw new Error(t('error.analysisRequestFailed'));
          return res.json();
        })
        .then(result => {
          if (result.success && result.analysis) {
            setAnalysis(result.analysis);
          } else {
            throw new Error(result.error || t('error.invalidAnalysisResult'));
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
          <p className="text-muted-foreground">{t('page.parsingFile')}</p>
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
            {t('page.reupload')}
          </Button>
        </div>
      );
    }

    // Pricing page
    if (viewMode === 'pricing') {
      return <PricingPage onBack={() => setViewMode('home')} />;
    }

    // Data compliance page
    if (viewMode === 'data-compliance') {
      return <DataCompliancePage onBack={() => setViewMode('home')} />;
    }

    // 首页（工作台）- 规范: 页面外层左右24px上下20px, 模块间24px分割
    if (viewMode === 'home') {
      const hasData = !!parsedData;
      return (
        <div className="w-full px-6 py-5">
          {/* 页面标题区 - 规范: 20px加粗主标题 + 14px辅助说明 */}
          <div className="mb-6">
            <h1 className="text-xl font-bold text-foreground">{t('page.workbench')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('page.uploadDataStart')}</p>
          </div>

          {/* 已有数据 - 紧凑信息条 + 上传新数据入口 */}
          {hasData && (
            <div className="mb-6 p-4 rounded-sm border border-success/20 bg-success/4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-success/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{parsedData.fileName}</p>
                  <p className="text-xs text-muted-foreground">{parsedData?.rowCount?.toLocaleString() ?? '0'} {t('page.rows')} · {parsedData?.columnCount ?? 0} {t('page.columns')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setViewMode('data-table')} className="h-8 px-4 rounded-sm text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                  {t('page.viewTable')}
                </button>
                <button onClick={handleGoHome} className="h-8 px-3 rounded-sm text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-colors border border-border">
                  {t('page.clearData')}
                </button>
              </div>
            </div>
          )}

          {/* 数据获取区 - 上传文件为独立行，数据源+AI并排 */}
          <div className="mb-6">
            <h2 className="text-base font-semibold text-foreground mb-4">{t('page.getData')}</h2>
            {/* 上传文件 - 独占一行，左侧上传区右侧拖拽提示 */}
            <div className="mb-2 rounded-sm border border-border bg-card overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-sm bg-primary/8 flex items-center justify-center">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t('page.uploadFile')}</span>
                  <span className="text-xs text-muted-foreground">{t('page.supportExcel')}</span>
                </div>
                <AsyncFileUploader onFileUpload={handleFileUpload} />
              </div>
            </div>
            {/* 数据源 + AI生成 并排 */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-sm border border-border bg-card hover:border-primary/30 cursor-pointer transition-all hover:shadow-float p-4" onClick={() => setViewMode('data-source')}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-sm bg-primary/8 flex items-center justify-center">
                    <Database className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t('page.connectDataSource')}</span>
                </div>
                <p className="text-xs text-muted-foreground">{t('page.connectDataSourceDesc')}</p>
              </div>
              <div className="rounded-sm border border-border bg-card hover:border-primary/30 cursor-pointer transition-all hover:shadow-float p-4" onClick={() => {
                if (!isLoggedIn) { setLoginDialogOpen(true); return; }
                setViewMode('ai-table-builder');
              }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-sm bg-primary/8 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t('page.aiGenerateTable')}</span>
                  <span className="text-xs font-semibold px-1.5 rounded-sm bg-primary/8 text-primary leading-5">AI</span>
                </div>
                <p className="text-xs text-muted-foreground">{t('page.aiGenerateTableDesc')}</p>
              </div>
            </div>
          </div>

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

    // 需要数据但无数据的视图 - 规范: 居中对齐, 20px主标题, 14px正文
    const needsDataViews: ViewMode[] = ['data-table', 'data-prep', 'insights', 'visualization', 'alerting'];
    if (needsDataViews.includes(viewMode) && !parsedData) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="w-12 h-12 bg-muted/50 rounded-sm flex items-center justify-center mb-4">
            <Upload className="w-6 h-6 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">{t('page.pleaseUpload')}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t('page.thisFeatureNeedsData')}</p>
          <button onClick={() => setViewMode('home')} className="h-8 px-4 rounded-sm bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            {t('page.goUpload')}
          </button>
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
            <TabsTrigger value="table">{t('tab.dataView')}</TabsTrigger>
            <TabsTrigger value="linked">{t('tab.linkedTable')}</TabsTrigger>
            <TabsTrigger value="workflow">{t('tab.automation')}</TabsTrigger>
            <TabsTrigger value="comments">{t('tab.comments')}</TabsTrigger>
            <TabsTrigger value="ai-field">{t('tab.aiField')}</TabsTrigger>
            <TabsTrigger value="ai-formula">{t('tab.aiFormula')}</TabsTrigger>
          </TabsList>
          <TabsContent value="table">
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* 视图切换 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('tab.viewLabel')}</span>
                    <div className="flex bg-muted rounded-md p-0.5">
                      {([
                        { key: 'table', label: t('tab.table'), icon: TableIcon },
                        { key: 'kanban', label: t('tab.kanban'), icon: LayoutIcon },
                        { key: 'calendar', label: t('tab.calendar'), icon: CalendarIcon },
                        { key: 'gantt', label: t('tab.gantt'), icon: GanttIcon },
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
                      <option value="">{t('tab.selectGroupField')}</option>
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
                      <option value="">{t('tab.selectDateField')}</option>
                      {analysis?.fieldStats?.filter(f => f.type === 'date').map(f => (
                        <option key={f.field} value={f.field}>{f.field}</option>
                      ))}
                    </select>
                  )}
                  {tableView === 'gantt' && (
                    <div className="flex gap-2">
                      <select className="text-sm border rounded px-2 py-1 bg-background" value={ganttConfig.nameField} onChange={e => setGanttConfig(p => ({ ...p, nameField: e.target.value }))}>
                        <option value="">{t('tab.taskName')}</option>
                        {parsedData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                      </select>
                      <select className="text-sm border rounded px-2 py-1 bg-background" value={ganttConfig.startField} onChange={e => setGanttConfig(p => ({ ...p, startField: e.target.value }))}>
                        <option value="">{t('tab.startDate')}</option>
                        {analysis?.fieldStats?.filter(f => f.type === 'date').map(f => <option key={f.field} value={f.field}>{f.field}</option>)}
                      </select>
                      <select className="text-sm border rounded px-2 py-1 bg-background" value={ganttConfig.endField} onChange={e => setGanttConfig(p => ({ ...p, endField: e.target.value }))}>
                        <option value="">{t('tab.endDate')}</option>
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
              <TabsTrigger value="smart" disabled={!parsedData}>{t('tab.smartPrep')}</TabsTrigger>
              <TabsTrigger value="clean" disabled={!parsedData}>{t('tab.dataClean')}</TabsTrigger>
              <TabsTrigger value="quality" disabled={!parsedData || !analysis}>{t('tab.qualityCheck')}</TabsTrigger>
            </TabsList>
            <TabsContent value="smart">
              {parsedData && analysis ? (
                <SmartDataPrep data={parsedData} fieldStats={analysis.fieldStats} modelConfig={activeModelConfig || undefined} onDataReady={handleDataCleaned} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground/50">{t('page.pleaseUpload')}</div>
              )}
            </TabsContent>
            <TabsContent value="clean">
              {parsedData && analysis ? (
                <DataCleaner data={parsedData} fieldStats={analysis.fieldStats} onDataChange={handleDataCleaned} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground/50">{t('page.pleaseUpload')}</div>
              )}
            </TabsContent>
            <TabsContent value="quality">
              {parsedData && analysis ? (
                <DataQualityChecker data={parsedData} fieldStats={analysis.fieldStats} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground/50">{t('page.pleaseUpload')}</div>
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
              <p className="text-muted-foreground mb-4">{t('page.pleaseUpload')}，{t('page.uploadDataStart').toLowerCase()}</p>
              <Button onClick={() => setViewMode('home')}>{t('page.goUpload')}</Button>
            </CardContent>
          </Card>
        );
      }
      if (!analysis) {
        return (
          <Card className="text-center py-16">
            <CardContent className="space-y-4">
              <Brain className="w-12 h-12 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-lg font-medium">{t('page.analyzing')}</p>
              <p className="text-sm text-muted-foreground">{t('page.aiScanning')}</p>
              {isAnalyzing && <Progress value={45} className="w-64 mx-auto" />}
            </CardContent>
          </Card>
        );
      }
      return (
        <div className="relative">
          <Tabs defaultValue="insights" key="insights" className="space-y-4">
            <TabsList>
              <TabsTrigger value="insights">{t('tab.deepAnalysis')}</TabsTrigger>
              <TabsTrigger value="report">
                <FileText className="w-3.5 h-3.5 mr-1" />
                {t('tab.analysisReport')}
              </TabsTrigger>
              <TabsTrigger value="data-story">{t('tab.dataStory')}</TabsTrigger>
              <TabsTrigger value="industry">{t('tab.industryScene')}</TabsTrigger>
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
                <TabsTrigger value="dashboard">{t('tab.quickDashboard')}</TabsTrigger>
                <TabsTrigger value="nl2dash">{t('tab.aiBuildDash')}</TabsTrigger>
                <TabsTrigger value="designer">{t('tab.dashboardDesign')}</TabsTrigger>
                <TabsTrigger value="charts">
                  <BarChart3 className="w-3.5 h-3.5 mr-1" />
                  {t('tab.chartCenter')}
                </TabsTrigger>
                <TabsTrigger value="metrics">
                  <TrendingUp className="w-3.5 h-3.5 mr-1" />
                  {t('tab.metricSystem')}
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
                    <p>{t('page.noDashboardPermission')}</p>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="designer">
                {hasPermission('dashboard') ? (
                  <DashboardDesigner data={parsedData} fieldStats={analysis.fieldStats} />
                ) : (
                  <Card className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p>{t('page.noDesignerPermission')}</p>
                  </Card>
                )}
              </TabsContent>
              <TabsContent value="charts">
                <Tabs defaultValue="ai-chart" className="mt-4">
                  <TabsList>
                    <TabsTrigger value="ai-chart">{t('tab.aiSelectChart')}</TabsTrigger>
                    <TabsTrigger value="advanced">{t('tab.advancedChart')}</TabsTrigger>
                    <TabsTrigger value="echarts">{t('tab.proChart')}</TabsTrigger>
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
                    <TabsTrigger value="ai-metric">{t('tab.aiBuildMetric')}</TabsTrigger>
                    <TabsTrigger value="metric-lib">{t('tab.metricList')}</TabsTrigger>
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
              <p className="text-muted-foreground mb-2">{t('chat.title')}</p>
              <p className="text-sm text-muted-foreground/60 mb-4">{t('chat.uploadFirst')}</p>
              <Button onClick={() => setViewMode('home')}>{t('page.goUpload')}</Button>
            </CardContent>
          </Card>
        );
      }
      if (!analysis) {
        return (
          <Card className="text-center py-16">
            <CardContent className="space-y-4">
              <MessageSquare className="w-12 h-12 text-primary mx-auto mb-2 animate-pulse" />
              <p className="text-lg font-medium">{t('page.dataAnalyzing')}</p>
              <p className="text-sm text-muted-foreground">{t('page.analysisReady')}</p>
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
              <div className="p-4 bg-primary/5 rounded-md border border-primary/10">
                <h4 className="font-medium text-primary mb-2">{t('chat.whatToAsk')}</h4>
                <ul className="text-sm text-primary/70 space-y-1.5">
                  <li className="flex items-start gap-2"><Search className="w-4 h-4 mt-0.5 shrink-0" />{t('chat.searchData')}</li>
                  <li className="flex items-start gap-2"><Zap className="w-4 h-4 mt-0.5 shrink-0" />{t('chat.statCalc')}</li>
                  <li className="flex items-start gap-2"><TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />{t('chat.reasonAnalysis')}</li>
                  <li className="flex items-start gap-2"><BarChart3 className="w-4 h-4 mt-0.5 shrink-0" />{t('chat.trendPredict')}</li>
                  <li className="flex items-start gap-2"><FileText className="w-4 h-4 mt-0.5 shrink-0" />{t('chat.analysisReport')}</li>
                </ul>
              </div>
              <div className="p-4 bg-success/5 rounded-md border border-success/10">
                <h4 className="font-medium text-success mb-2">{t('chat.tryQuestions')}</h4>
                <div className="space-y-2 text-sm text-success/80">
                  <p>{t('chat.q1')}</p>
                  <p>{t('chat.q2')}</p>
                  <p>{t('chat.q3')}</p>
                  <p>{t('chat.q4')}</p>
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
              <p className="text-muted-foreground mb-2">{t('sql.title')}</p>
              <p className="text-sm text-muted-foreground/60 mb-2">{t('sql.descBrowser')}</p>
              <p className="text-xs text-muted-foreground/40 mb-4">{t('sql.dataSource')}</p>
              <Button onClick={() => setViewMode('home')}>{t('page.goUpload')}</Button>
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
              <p className="text-muted-foreground mb-2">{t('report.titleExport')}</p>
              <p className="text-sm text-muted-foreground/60 mb-4">{t('report.descExport')}</p>
              <Button onClick={() => setViewMode('home')}>{t('page.goUpload')}</Button>
            </CardContent>
          </Card>
        );
      }
      return (
        <div className="relative">
          <Tabs defaultValue="report" key="report" className="space-y-4">
            <TabsList>
              <TabsTrigger value="report" disabled={!analysis}>{t('report.generateReport')}</TabsTrigger>
              <TabsTrigger value="export">{t('report.exportChart')}</TabsTrigger>
              <TabsTrigger value="app">{t('report.appDesign')}</TabsTrigger>
              <TabsTrigger value="share">{t('report.shareManage')}</TabsTrigger>
            </TabsList>
            <TabsContent value="report">
              {analysis ? (
                <ReportGenerator data={parsedData} analysis={analysis} />
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground/50">{t('page.dataAnalyzing')}</div>
              )}
            </TabsContent>
            <TabsContent value="export">
              <ChartExporter chartName={parsedData.fileName || t('chart.chartName')} />
            </TabsContent>
            <TabsContent value="app">
              {hasPermission('dashboard') ? (
                <AppBuilder />
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                  <p>{t('page.appDisabled')}</p>
                </Card>
              )}
            </TabsContent>
            <TabsContent value="share">
              {hasPermission('share') ? (
                <ShareManager dashboardName={parsedData.fileName} />
              ) : (