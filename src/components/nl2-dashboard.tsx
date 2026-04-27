'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wand2,
  Sparkles,
  Send,
  Loader2,
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Eye,

  RefreshCw,

  ArrowRight,
  Lightbulb,
  LayoutDashboard,
  History,

  MessageSquare,
  Store,
  ShoppingBag,
  Users,
  CreditCard,
  Package,
  BarChart2,
  PieChart,
  Edit3,


  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Info,
  Zap,
  Clock,
  ArrowUpRight,
  Table2,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, FieldStat } from '@/lib/data-processor';
import {
  BarChart,
  Bar,
  LineChart as RechartsLine,
  Line,
  AreaChart,
  Area,
  PieChart as RechartsPie,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

// ============================================
// 类型定义
// ============================================
interface ChartSpec {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'radar' | 'donut' | 'pivot' | 'detail' | 'filter';
  title: string;
  xAxis: string;
  yAxis: string;
  insight: string;
  recommendation: string;
  dataDescription: string;
  color?: string;
  order?: number;
}

interface KPISpec {
  label: string;
  value: string;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon?: string;
}

interface GeneratedDashboardSpec {
  id: string;
  name: string;
  scenario: string;
  scenarioDescription: string;
  detectedMetrics: string[];
  kpis: KPISpec[];
  charts: ChartSpec[];
  layout: string;
  mockData: Record<string, Array<Record<string, string | number>>>;
  aiSummary: string;
}

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  dashboard?: GeneratedDashboardSpec;
  timestamp: number;
  step?: 'scenario' | 'metrics' | 'dimension' | 'done';
}

interface DashboardVersion {
  id: string;
  name: string;
  scenario: string;
  dashboard: GeneratedDashboardSpec;
  createdAt: number;
  conversationHistory: ConversationMessage[];
}

// 模板定义
interface Template {
  id: string;
  name: string;
  scenario: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  prompt: string;
  chartsCount: number;
}

// ============================================
// 常量
// ============================================
const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

const THEME_COLORS = {
  blue: { primary: '#3B82F6', light: '#EFF6FF', name: '商务蓝' },
  orange: { primary: '#F59E0B', light: '#FFFBEB', name: '电商橙' },
  green: { primary: '#10B981', light: '#ECFDF5', name: '清新绿' },
  purple: { primary: '#8B5CF6', light: '#F5F3FF', name: '典雅紫' },
};

// 仪表盘模板
const TEMPLATES: Template[] = [
  {
    id: 'tpl-ecommerce',
    name: '电商店铺复盘',
    scenario: '零售/电商/销售',
    description: '销售额趋势、品类销量、渠道占比、转化率漏斗',
    icon: <ShoppingBag className="w-5 h-5" />,
    color: '#F59E0B',
    prompt: '生成电商店铺月度销售仪表盘，包含销售额趋势、品类销量Top5、渠道占比、转化率',
    chartsCount: 6,
  },
  {
    id: 'tpl-store',
    name: '线下门店分析',
    scenario: '线下门店分析',
    description: '各门店销售额对比、客流量趋势、坪效分析',
    icon: <Store className="w-5 h-5" />,
    color: '#3B82F6',
    prompt: '做一个线下门店分析仪表盘，重点看各门店销售额对比、客流量趋势和坪效分析',
    chartsCount: 5,
  },
  {
    id: 'tpl-customer',
    name: '客户分析（RFM）',
    scenario: '客户分析',
    description: '客户分层、复购周期、LTV预估、客户价值分布',
    icon: <Users className="w-5 h-5" />,
    color: '#8B5CF6',
    prompt: '生成客户分析仪表盘，包含RFM客户分层、复购率趋势、客户价值分布',
    chartsCount: 5,
  },
  {
    id: 'tpl-channel',
    name: '分销渠道表现',
    scenario: '分销渠道分析',
    description: '渠道销量占比、回款周期、渠道利润率',
    icon: <BarChart2 className="w-5 h-5" />,
    color: '#10B981',
    prompt: '生成渠道分析仪表盘，展示各渠道销量占比、月度趋势对比、渠道利润率',
    chartsCount: 5,
  },
  {
    id: 'tpl-inventory',
    name: '库存管理',
    scenario: '库存管理',
    description: '库存周转天数、滞销占比、安全库存预警',
    icon: <Package className="w-5 h-5" />,
    color: '#06B6D4',
    prompt: '生成库存管理仪表盘，包含周转天数趋势、滞销商品TopN、库存预警',
    chartsCount: 4,
  },
  {
    id: 'tpl-financial',
    name: '财务分析',
    scenario: '财务分析',
    description: '收入成本对比、毛利率趋势、费用占比',
    icon: <CreditCard className="w-5 h-5" />,
    color: '#EF4444',
    prompt: '生成财务分析仪表盘，包含收入成本对比、毛利率趋势、各类费用占比',
    chartsCount: 5,
  },
];

// 示例提示词
const EXAMPLE_PROMPTS = [
  { label: '电商店铺月度销售', prompt: '生成电商店铺月度销售仪表盘，包含销售额趋势、品类销量Top5、渠道占比' },
  { label: '门店业绩对比', prompt: '做一个线下门店周度复盘仪表盘，重点看各门店销售额对比和客流量变化' },
  { label: '客户分层分析', prompt: '生成客户RFM分层分析仪表盘，展示高价值客户、潜力客户和流失客户' },
  { label: '渠道表现分析', prompt: '分析各分销渠道的表现，包含月度销量对比和渠道占比' },
];

// 引导问题
const _GUIDANCE_QUESTIONS = [
  {
    step: 'scenario',
    question: '您的业务场景是？',
    options: [
      { label: '电商店铺', value: '电商', icon: <ShoppingBag className="w-4 h-4" /> },
      { label: '线下门店', value: '线下', icon: <Store className="w-4 h-4" /> },
      { label: '分销渠道', value: '分销', icon: <BarChart2 className="w-4 h-4" /> },
      { label: '客户运营', value: '客户', icon: <Users className="w-4 h-4" /> },
    ],
  },
  {
    step: 'metrics',
    question: '最关注哪些核心指标？',
    options: [
      { label: '销售额/订单量', value: '销售额', icon: <TrendingUp className="w-4 h-4" /> },
      { label: '客单价', value: '客单价', icon: <CreditCard className="w-4 h-4" /> },
      { label: '转化率', value: '转化率', icon: <Zap className="w-4 h-4" /> },
      { label: '复购率', value: '复购率', icon: <RotateCcw className="w-4 h-4" /> },
    ],
  },
  {
    step: 'dimension',
    question: '分析的时间维度？',
    options: [
      { label: '日度分析', value: '日', icon: <Clock className="w-4 h-4" /> },
      { label: '月度分析', value: '月', icon: <BarChart3 className="w-4 h-4" /> },
      { label: '季度分析', value: '季度', icon: <PieChart className="w-4 h-4" /> },
      { label: '年度分析', value: '年', icon: <LineChart className="w-4 h-4" /> },
    ],
  },
];

// ============================================
// 组件 Props
// ============================================
interface NL2DashboardProps {
  data: ParsedData;
  fieldStats: FieldStat[];
  onDashboardGenerate?: (dashboard: GeneratedDashboardSpec) => void;
  className?: string;
  modelConfig?: { apiKey: string; baseUrl: string; model: string } | null;
}

// ============================================
// 主组件
// ============================================
export function NL2Dashboard({ data, fieldStats, className, modelConfig }: NL2DashboardProps) {
  // 对话状态
  const [conversations, setConversations] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  // 仪表盘状态
  const [currentDashboard, setCurrentDashboard] = useState<GeneratedDashboardSpec | null>(null);
  const [editingChart, setEditingChart] = useState<ChartSpec | null>(null);
  const [activeTheme, setActiveTheme] = useState<keyof typeof THEME_COLORS>('blue');

  // 历史管理
  const [history, setHistory] = useState<DashboardVersion[]>([]);
  const [viewingHistory, setViewingHistory] = useState<DashboardVersion | null>(null);

  // Tab状态
  const [activeTab, setActiveTab] = useState('create');
  const [viewMode, setViewMode] = useState<'chat' | 'preview' | 'templates'>('chat');

  // 引导式对话状态
  const [guidedStep, setGuidedStep] = useState(0);
  const [guidedAnswers, setGuidedAnswers] = useState<Record<string, string>>({});
  const [isGuidedMode, setIsGuidedMode] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 加载历史
  useEffect(() => {
    const saved = localStorage.getItem('nl2dashboard_history_v2');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        console.error('Failed to load history');
      }
    }
  }, []);

  // 保存历史
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('nl2dashboard_history_v2', JSON.stringify(history.slice(0, 20)));
    }
  }, [history]);

  // 滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, currentDashboard]);

  // ============================================
  // 核心：生成仪表盘
  // ============================================
  const generateDashboard = useCallback(async (prompt: string, isGuided = false) => {
    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: isGuided ? `场景：${guidedAnswers.scenario || '通用'}，指标：${guidedAnswers.metrics || '综合'}，维度：${guidedAnswers.dimension || '月度'}` : prompt,
      timestamp: Date.now(),
    };

    setConversations(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    setGenerationStep('正在分析数据字段和业务场景...');

    try {
      // 构建 context（如果是二次调整）
      const context = currentDashboard ? {
        scenario: currentDashboard.scenario,
        charts: currentDashboard.charts,
      } : undefined;

      const response = await fetch('/api/nl2-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: isGuided
            ? `业务场景：${guidedAnswers.scenario || ''}，核心指标：${guidedAnswers.metrics || ''}，时间维度：${guidedAnswers.dimension || ''}`
            : prompt,
          data,
          fieldStats,
          context,
          modelConfig,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || '生成失败');
      }

      const dashboard: GeneratedDashboardSpec = {
        ...result.data,
        id: `dashboard-${Date.now()}`,
      };

      setGenerationStep('正在生成业务化图表配置...');
      await new Promise(resolve => setTimeout(resolve, 300));

      setCurrentDashboard(dashboard);
      setViewMode('preview');

      const assistantMessage: ConversationMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: result.data.aiSummary || `已生成 ${dashboard.scenario} 仪表盘，包含 ${dashboard.charts.length} 个业务化图表。`,
        dashboard,
        timestamp: Date.now(),
      };

      setConversations(prev => [...prev, assistantMessage]);

      // 保存到历史
      const version: DashboardVersion = {
        id: dashboard.id,
        name: dashboard.name,
        scenario: dashboard.scenario,
        dashboard,
        createdAt: Date.now(),
        conversationHistory: [...conversations, userMessage, assistantMessage],
      };
      setHistory(prev => [version, ...prev]);

    } catch (error) {
      console.error('Generation failed:', error);
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      const errorMessage: ConversationMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: `生成失败：${errorMsg}。请检查数据是否已上传，或稍后重试。`,
        timestamp: Date.now(),
      };
      setConversations(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
      setIsGuidedMode(false);
      setGuidedStep(0);
      setGuidedAnswers({});
    }
  }, [data, fieldStats, currentDashboard, guidedAnswers, conversations]);

  // ============================================
  // 二次调整：修改单个图表
  // ============================================
  const adjustChart = useCallback(async (chartId: string, instruction: string) => {
    if (!currentDashboard) return;

    setIsGenerating(true);
    setGenerationStep(`正在调整图表：${instruction}`);

    try {
      const _chart = currentDashboard.charts.find(c => c.id === chartId);
      const response = await fetch('/api/nl2-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: instruction,
          data,
          fieldStats,
          context: {
            scenario: currentDashboard.scenario,
            charts: currentDashboard.charts,
          },
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      // 只更新指定图表，保持其他图表不变
      const newCharts = currentDashboard.charts.map(c =>
        c.id === chartId ? { ...result.data.charts[0], id: chartId, color: c.color } : c
      );

      const updatedDashboard: GeneratedDashboardSpec = {
        ...currentDashboard,
        charts: newCharts,
        mockData: {
          ...currentDashboard.mockData,
          ...result.data.mockData,
        },
      };

      setCurrentDashboard(updatedDashboard);

      // 更新历史
      setHistory(prev => prev.map(v =>
        v.id === currentDashboard.id ? { ...v, dashboard: updatedDashboard } : v
      ));

    } catch (error) {
      console.error('Adjust failed:', error);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  }, [currentDashboard, data, fieldStats]);

  // ============================================
  // 批量调整（整体主题、整体增加图表等）
  // ============================================
  const batchAdjust = useCallback(async (instruction: string) => {
    if (!currentDashboard) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/nl2-dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: instruction,
          data,
          fieldStats,
          context: {
            scenario: currentDashboard.scenario,
            charts: currentDashboard.charts,
          },
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);

      setCurrentDashboard({
        ...result.data,
        id: currentDashboard.id,
      });

    } catch (error) {
      console.error('Batch adjust failed:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [currentDashboard, data, fieldStats]);

  // ============================================
  // 渲染图表
  // ============================================
  const renderChart = useCallback((chart: ChartSpec, themeColor: string) => {
    const chartData = currentDashboard?.mockData?.[chart.id] || [];

    if (chartData.length === 0) return null;

    const COLORS = [
      themeColor,
      ...PRESET_COLORS.filter(c => c !== themeColor),
    ];

    switch (chart.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLine data={chartData as Record<string, string | number>[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={Object.keys(chartData[0] || {})[0]} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value: number) => [value?.toLocaleString() ?? value, chart.yAxis]}
              />
              <Line
                type="monotone"
                dataKey={Object.keys(chartData[0] || {}).filter(k => k !== Object.keys(chartData[0] || {})[0])[0]}
                stroke={themeColor}
                strokeWidth={2.5}
                dot={{ fill: themeColor, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </RechartsLine>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData as Record<string, string | number>[]} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis
                dataKey={Object.keys(chartData[0] || {})[0]}
                type="category"
                width={80}
                tick={{ fontSize: 12 }}
              />
              <RechartsTooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value: number) => [value?.toLocaleString() ?? value, chart.yAxis]}
              />
              <Bar
                dataKey={Object.keys(chartData[0] || {}).filter(k => k !== Object.keys(chartData[0] || {})[0])[0]}
                fill={themeColor}
                radius={[0, 4, 4, 0]}
              >
                <LabelList
                  dataKey={Object.keys(chartData[0] || {}).filter(k => k !== Object.keys(chartData[0] || {})[0])[0]}
                  position="right"
                  style={{ fontSize: 11, fill: '#6b7280' }}
                  formatter={(val: number) => val?.toLocaleString()}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData as Record<string, string | number>[]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey={Object.keys(chartData[0] || {})[0]} tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <RechartsTooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                formatter={(value: number) => [value?.toLocaleString() ?? value, chart.yAxis]}
              />
              <Area
                type="monotone"
                dataKey={Object.keys(chartData[0] || {}).filter(k => k !== Object.keys(chartData[0] || {})[0])[0]}
                stroke={themeColor}
                fill={`${themeColor}22`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
      case 'donut':
        const total = (chartData as Record<string, number>[]).reduce((sum, d) => {
          const val = Object.values(d).find(v => typeof v === 'number') as number || 0;
          return sum + val;
        }, 0);
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie>
              <Pie
                data={chartData as Record<string, string | number>[]}
                dataKey={Object.keys(chartData[0] || {}).filter(k => typeof (chartData[0] as Record<string, unknown>)[k] === 'number')[0]}
                nameKey={Object.keys(chartData[0] || {}).filter(k => typeof (chartData[0] as Record<string, unknown>)[k] !== 'number')[0]}
                cx="50%"
                cy="50%"
                innerRadius={chart.type === 'donut' ? 50 : 0}
                outerRadius={90}
                paddingAngle={2}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: '#9ca3af' }}
              >
                {(chartData as Record<string, string | number>[]).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip
                formatter={(value: number) => [`${value?.toLocaleString() ?? value} (${((value / total) * 100).toFixed(1)}%)`, chart.yAxis]}
              />
              {chart.type === 'donut' && (
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={600} fill={themeColor}>
                  {total > 1000 ? `${(total / 10000).toFixed(1)}万` : total.toLocaleString()}
                </text>
              )}
            </RechartsPie>
          </ResponsiveContainer>
        );

      case 'radar':
        const radarKeys = Object.keys(chartData[0] || {}).filter(k => k !== 'dimension');
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey={Object.keys(chartData[0] || {}).find(k => k !== radarKeys[0]) || ''} tick={{ fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name={chart.yAxis} dataKey={radarKeys[0]} stroke={themeColor} fill={themeColor} fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  }, [currentDashboard]);

  // ============================================
  // 辅助：获取图表类型中文名
  // ============================================
  const getChartTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      line: '折线图', bar: '条形图', pie: '饼图', area: '面积图', radar: '雷达图', donut: '环形图', pivot: '透视表', detail: '明细表', filter: '筛选器',
    };
    return map[type] || type;
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'line': return <LineChart className="w-4 h-4" />;
      case 'bar': return <BarChart3 className="w-4 h-4" />;
      case 'pie': return <PieChartIcon className="w-4 h-4" />;
      case 'area': return <TrendingUp className="w-4 h-4" />;
      case 'radar': return <BarChart2 className="w-4 h-4" />;
      case 'donut': return <PieChart className="w-4 h-4" />;
      case 'pivot': return <Table2 className="w-4 h-4" />;
      case 'detail': return <Table2 className="w-4 h-4" />;
      case 'filter': return <Filter className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  // ============================================
  // 渲染
  // ============================================
  const themeColor = THEME_COLORS[activeTheme].primary;

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-base">智能仪表盘生成</h3>
          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">AI 业务驱动</Badge>
        </div>
        <div className="flex items-center gap-2">
          {/* 主题切换 */}
          <div className="flex items-center gap-1 mr-2">
            {(Object.keys(THEME_COLORS) as Array<keyof typeof THEME_COLORS>).map(key => (
              <button
                key={key}
                onClick={() => setActiveTheme(key)}
                className={cn(
                  'w-5 h-5 rounded-full border-2 transition-all',
                  activeTheme === key ? 'border-gray-800 scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: THEME_COLORS[key].primary }}
                title={THEME_COLORS[key].name}
              />
            ))}
          </div>
          <Badge variant="outline" className="text-xs">
            {currentDashboard ? currentDashboard.scenario : '未生成'}
          </Badge>
        </div>
      </div>

      {/* 视图切换 Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" className="flex items-center gap-1 text-xs">
            <Wand2 className="w-3.5 h-3.5" />
            对话生成
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-1 text-xs">
            <LayoutDashboard className="w-3.5 h-3.5" />
            仪表盘
            {currentDashboard && <Badge className="ml-1 h-4 w-4 p-0 text-[10px] justify-center bg-purple-500">{currentDashboard.charts.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 text-xs">
            <History className="w-3.5 h-3.5" />
            历史
            {history.length > 0 && <Badge className="ml-1 h-4 w-4 p-0 text-[10px] justify-center">{history.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ===== 对话生成 Tab ===== */}
        <TabsContent value="create" className="mt-3 space-y-3">
          {/* 模板市场 */}
          {conversations.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">快速开始 · 场景模板</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => generateDashboard(tpl.prompt, false)}
                    className="group p-3 border rounded-xl hover:shadow-md hover:border-purple-300 transition-all text-left"
                    disabled={isGenerating}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${tpl.color}18` }}>
                        <span style={{ color: tpl.color }}>{tpl.icon}</span>
                      </div>
                      <span className="font-medium text-sm">{tpl.name}</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2">{tpl.description}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Badge variant="outline" className="text-[10px] h-4">{tpl.chartsCount}个图表</Badge>
                      <ArrowRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 对话卡片 */}
          <Card className="border-purple-100">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  <CardTitle className="text-sm">对话式生成</CardTitle>
                </div>
                {conversations.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setConversations([]); setCurrentDashboard(null); }}
                    className="text-xs h-7"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    新建
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-3">
              {/* 消息列表 */}
              <ScrollArea className="max-h-[260px] mb-3" ref={scrollAreaRef}>
                <div className="space-y-3">
                  {conversations.length === 0 && (
                    <div className="text-center py-6 space-y-3">
                      <Sparkles className="w-10 h-10 mx-auto text-purple-300" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">用自然语言描述你的需求</p>
                        <p className="text-xs text-gray-400 mt-1">或者从上方选择一个模板快速开始</p>
                      </div>
                      {/* 示例提示 */}
                      <div className="flex flex-wrap justify-center gap-1.5 mt-2">
                        {EXAMPLE_PROMPTS.map((ex, i) => (
                          <button
                            key={i}
                            onClick={() => setInput(ex.prompt)}
                            className="text-xs px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors text-purple-700"
                          >
                            {ex.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {conversations.map(msg => (
                    <div key={msg.id} className={cn('flex gap-2.5', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        </div>
                      )}
                      <div className={cn('max-w-[85%] rounded-xl p-3', msg.role === 'user' ? 'bg-purple-500 text-white' : 'bg-gray-50 border')}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.dashboard && (
                          <div className="mt-2 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="text-[10px] h-4 bg-purple-500">{msg.dashboard.scenario}</Badge>
                              <Badge variant="outline" className="text-[10px] h-4">{msg.dashboard.charts.length}个图表</Badge>
                              {msg.dashboard.kpis?.slice(0, 3).map((kpi, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] h-4">{kpi.icon} {kpi.label}</Badge>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              className="w-full mt-2 h-7 text-xs bg-purple-600 hover:bg-purple-700"
                              onClick={() => { setCurrentDashboard(msg.dashboard!); setActiveTab('preview'); }}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              查看完整仪表盘
                            </Button>
                          </div>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-medium">U</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 生成中 */}
                  {isGenerating && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <div className="bg-gray-50 border rounded-xl p-3">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {generationStep || 'AI 正在生成中...'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* 输入区域 */}
              <div className="flex gap-2">
                <Input
                  placeholder="描述你想要的仪表盘，例如：生成月度销售仪表盘..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                      e.preventDefault();
                      generateDashboard(input);
                    }
                  }}
                  disabled={isGenerating}
                  className="text-sm"
                />
                <Button
                  onClick={() => generateDashboard(input)}
                  disabled={!input.trim() || isGenerating}
                  className="bg-purple-600 hover:bg-purple-700 shrink-0"
                  size="sm"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 使用提示 */}
          <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="pt-3">
              <div className="flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div className="text-xs text-amber-800 space-y-0.5">
                  <p className="font-medium">生成技巧</p>
                  <ul className="space-y-0.5 list-disc list-inside text-amber-700">
                    <li>描述越具体，生成越精准：如&ldquo;8月各门店销售额对比&rdquo;</li>
                    <li>指定场景效果更好：如&ldquo;电商店铺复盘&rdquo;</li>
                    <li>指定关注指标：如&ldquo;重点看客单价和复购率&rdquo;</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== 仪表盘预览 Tab ===== */}
        <TabsContent value="preview" className="mt-3">
          {!currentDashboard ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <LayoutDashboard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">暂无仪表盘</p>
                <Button variant="outline" className="mt-3" onClick={() => setActiveTab('create')}>
                  <Wand2 className="w-4 h-4 mr-1" />
                  去生成
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* 仪表盘头部 */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">{currentDashboard.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{currentDashboard.scenarioDescription}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setActiveTab('history')}>
                    <History className="w-3.5 h-3.5 mr-1" />
                    历史
                  </Button>
                </div>
              </div>

              {/* AI 摘要 */}
              {currentDashboard.aiSummary && (
                <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-100">
                  <CardContent className="pt-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-purple-800">{currentDashboard.aiSummary}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* KPI 卡片 */}
              {currentDashboard.kpis && currentDashboard.kpis.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {currentDashboard.kpis.map((kpi, idx) => (
                    <Card key={idx} className="border-l-4" style={{ borderLeftColor: themeColor }}>
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{kpi.label}</span>
                          {kpi.icon && <span className="text-sm">{kpi.icon}</span>}
                        </div>
                        <div className="text-lg font-bold">{kpi.value}</div>
                        {kpi.change && (
                          <div className={cn('flex items-center gap-0.5 text-xs mt-0.5', kpi.changeType === 'up' ? 'text-green-600' : kpi.changeType === 'down' ? 'text-red-600' : 'text-gray-500')}>
                            {kpi.changeType === 'up' ? <TrendingUp className="w-3 h-3" /> : kpi.changeType === 'down' ? <TrendingDown className="w-3 h-3" /> : null}
                            {kpi.change}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* 图表网格 */}
              <div className={cn('grid gap-3', currentDashboard.charts.length <= 2 ? 'grid-cols-1' : currentDashboard.charts.length <= 4 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3')}>
                {currentDashboard.charts.sort((a, b) => (a.order || 0) - (b.order || 0)).map(chart => (
                  <Card key={chart.id} className="group">
                    <CardHeader className="pb-1 px-4 pt-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="p-1 rounded" style={{ backgroundColor: `${themeColor}18`, color: themeColor }}>
                            {getChartIcon(chart.type)}
                          </div>
                          <span className="font-medium text-sm truncate" title={chart.title}>{chart.title}</span>
                        </div>
                        {/* 图表操作菜单 */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditingChart(chart)}
                              >
                                <Edit3 className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>修改图表</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => adjustChart(chart.id, '把图表类型改成折线图')}
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>换类型</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] h-4 mt-0.5">{getChartTypeLabel(chart.type)} · {chart.recommendation}</Badge>
                    </CardHeader>
                    <CardContent className="pt-2 pb-3 px-4">
                      {/* 图表渲染 */}
                      <div className="h-[220px]">
                        {renderChart(chart, themeColor)}
                      </div>
                      {/* 业务解读 */}
                      {chart.insight && (
                        <div className="mt-2 p-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100">
                          <div className="flex items-start gap-1.5">
                            <Lightbulb className="w-3 h-3 text-blue-500 mt-0.5 shrink-0" />
                            <p className="text-[11px] text-blue-800 leading-relaxed line-clamp-3">{chart.insight}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 底部调整区 */}
              <Card className="border-dashed">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="继续调整仪表盘，如：增加复购率图表 / 改成蓝色主题 / 添加数据标签..."
                      className="text-xs h-8"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                          batchAdjust((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs shrink-0"
                      onClick={() => batchAdjust('把所有图表的颜色改成蓝色主题')}
                    >
                      换主题
                    </Button>
                  </div>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => batchAdjust('增加一个复购率折线图')}>+ 复购率</Button>
                    <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => batchAdjust('增加一个毛利率饼图')}>+ 毛利率</Button>
                    <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => batchAdjust('添加同比数据')}>+ 同比</Button>
                    <Button size="sm" variant="secondary" className="h-6 text-[10px]" onClick={() => batchAdjust('给所有图表添加数据标签')}>+ 数据标签</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ===== 历史记录 Tab ===== */}
        <TabsContent value="history" className="mt-3">
          {history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-sm">暂无历史记录</p>
                <p className="text-xs text-gray-400 mt-1">生成仪表盘后会保存在这里</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {history.map(version => (
                <Card
                  key={version.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => {
                    setCurrentDashboard(version.dashboard);
                    setConversations(version.conversationHistory || []);
                    setActiveTab('preview');
                  }}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-lg bg-purple-100 shrink-0">
                          <LayoutDashboard className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm truncate">{version.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge variant="secondary" className="text-[10px] h-4">{version.scenario}</Badge>
                            <span className="text-[10px] text-gray-400">{version.dashboard.charts.length}个图表</span>
                            <span className="text-[10px] text-gray-400">·</span>
                            <span className="text-[10px] text-gray-400">{new Date(version.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={e => { e.stopPropagation(); setViewingHistory(version); }}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>预览</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== 图表编辑 Dialog ===== */}
      <Dialog open={!!editingChart} onOpenChange={() => setEditingChart(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>修改图表</DialogTitle>
            <DialogDescription>{editingChart?.title}</DialogDescription>
          </DialogHeader>
          {editingChart && (
            <div className="space-y-3">
              {/* 图表类型切换 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">图表类型</label>
                <Select
                  value={editingChart.type}
                  onValueChange={type => {
                    if (!currentDashboard) return;
                    const updated = currentDashboard.charts.map(c =>
                      c.id === editingChart.id ? { ...c, type: type as ChartSpec['type'] } : c
                    );
                    setCurrentDashboard({ ...currentDashboard, charts: updated });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">折线图</SelectItem>
                    <SelectItem value="bar">条形图</SelectItem>
                    <SelectItem value="area">面积图</SelectItem>
                    <SelectItem value="pie">饼图</SelectItem>
                    <SelectItem value="donut">环形图</SelectItem>
                    <SelectItem value="radar">雷达图</SelectItem>
                    <SelectItem value="pivot">透视表</SelectItem>
                    <SelectItem value="detail">明细表</SelectItem>
                    <SelectItem value="filter">筛选器</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* 标题修改 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">图表标题</label>
                <Input
                  value={editingChart.title}
                  onChange={e => {
                    if (!currentDashboard) return;
                    const updated = currentDashboard.charts.map(c =>
                      c.id === editingChart.id ? { ...c, title: e.target.value } : c
                    );
                    setCurrentDashboard({ ...currentDashboard, charts: updated });
                  }}
                  className="h-9 text-sm"
                />
              </div>
              {/* 业务解读 */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1.5 block">业务解读</label>
                <textarea
                  value={editingChart.insight}
                  onChange={e => {
                    if (!currentDashboard) return;
                    const updated = currentDashboard.charts.map(c =>
                      c.id === editingChart.id ? { ...c, insight: e.target.value } : c
                    );
                    setCurrentDashboard({ ...currentDashboard, charts: updated });
                  }}
                  className="w-full h-20 px-3 py-2 text-xs border rounded-lg resize-none"
                  placeholder="输入这条数据的业务解读..."
                />
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                  size="sm"
                  onClick={() => {
                    if (currentDashboard) {
                      const updated = currentDashboard.charts.map(c =>
                        c.id === editingChart.id ? editingChart : c
                      );
                      setCurrentDashboard({ ...currentDashboard, charts: updated });
                    }
                    setEditingChart(null);
                  }}
                >
                  保存
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (editingChart) adjustChart(editingChart.id, '用AI优化这个图表');
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  AI 优化
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== 历史预览 Dialog ===== */}
      <Dialog open={!!viewingHistory} onOpenChange={() => setViewingHistory(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{viewingHistory?.name}</DialogTitle>
            <DialogDescription>{viewingHistory?.scenario} · {new Date(viewingHistory?.createdAt || 0).toLocaleString()}</DialogDescription>
          </DialogHeader>
          {viewingHistory && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{viewingHistory.dashboard.charts.length}个图表</Badge>
                <Badge variant="outline">{viewingHistory.dashboard.kpis?.length || 0}个KPI</Badge>
              </div>
              <ScrollArea className="max-h-[400px]">
                <div className="grid grid-cols-2 gap-2">
                  {viewingHistory.dashboard.charts.map(chart => (
                    <Card key={chart.id} className="p-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        {getChartIcon(chart.type)}
                        <span className="text-xs font-medium truncate">{chart.title}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 line-clamp-2">{chart.insight}</p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default NL2Dashboard;
