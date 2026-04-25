'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Wand2,
  Sparkles,
  Send,
  Loader2,
  BarChart3,
  LineChart,
  PieChart as PieChartIcon,
  TrendingUp,
  Eye,
  Copy,
  RefreshCw,
  CheckCircle2,
  ArrowRight,
  Lightbulb,
  LayoutDashboard,
  Table,
  History,
  Plus,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, FieldStat } from '@/lib/data-processor';
import {
  BarChart,
  Bar,
  LineChart as RechartsLine,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// ============================================
// 类型定义
// ============================================

// 图表配置
interface ChartConfig {
  id: string;
  type: 'bar' | 'line' | 'pie';
  title: string;
  xAxis?: string;
  yAxis?: string;
  color?: string;
}

// 生成的仪表盘
interface GeneratedDashboard {
  id: string;
  name: string;
  charts: ChartConfig[];
  layout: 'grid' | 'list';
  createdAt: number;
  description?: string;
}

// 聊天消息
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  dashboard?: GeneratedDashboard;
  timestamp: number;
}

// 预设图表配置
const PRESET_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
];

// 示例提示
const EXAMPLE_PROMPTS = [
  '生成一个销售数据分析仪表盘',
  '创建用户增长趋势图表',
  '展示各区域业绩对比',
  '制作订单数据分析面板',
  '生成财务指标汇总仪表盘'
];

interface NL2DashboardProps {
  data: ParsedData;
  fieldStats: FieldStat[];
  onDashboardGenerate?: (dashboard: GeneratedDashboard) => void;
  className?: string;
}

export function NL2Dashboard({
  data,
  fieldStats,
  onDashboardGenerate,
  className
}: NL2DashboardProps) {
  // 状态
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState<GeneratedDashboard | null>(null);
  const [history, setHistory] = useState<GeneratedDashboard[]>([]);
  const [activeTab, setActiveTab] = useState('create');
  const [generationStep, setGenerationStep] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 加载历史
  useEffect(() => {
    const saved = localStorage.getItem('nl2dashboard_history');
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
      localStorage.setItem('nl2dashboard_history', JSON.stringify(history.slice(0, 20)));
    }
  }, [history]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // AI 生成仪表盘
  const generateDashboard = async (prompt: string) => {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: prompt,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsGenerating(true);
    setGenerationStep('正在分析数据结构和字段...');

    try {
      // 模拟分析延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      setGenerationStep('正在理解业务需求...');
      await new Promise(resolve => setTimeout(resolve, 800));

      // 分析数据
      const numericFields = fieldStats.filter(f => f.type === 'number');
      const textFields = fieldStats.filter(f => f.type === 'string');
      const dateFields = fieldStats.filter(f => f.type === 'date');

      // 根据提示词生成图表配置
      const charts: ChartConfig[] = [];
      const promptLower = prompt.toLowerCase();

      setGenerationStep('正在设计图表布局...');

      // 1. 总览指标卡（KPI）
      if (numericFields.length > 0) {
        charts.push({
          id: `chart-${Date.now()}-kpi-1`,
          type: 'bar',
          title: `${numericFields[0].field} 总览`,
          yAxis: numericFields[0].field,
          color: PRESET_COLORS[0]
        });
      }

      // 2. 根据提示词选择图表
      if (promptLower.includes('趋势') || promptLower.includes('增长') || promptLower.includes('时间')) {
        if (dateFields.length > 0 && numericFields.length > 0) {
          charts.push({
            id: `chart-${Date.now()}-trend`,
            type: 'line',
            title: '趋势分析',
            xAxis: dateFields[0].field,
            yAxis: numericFields[0].field,
            color: PRESET_COLORS[1]
          });
        }
      }

      if (promptLower.includes('对比') || promptLower.includes('比较')) {
        if (textFields.length > 0 && numericFields.length > 0) {
          charts.push({
            id: `chart-${Date.now()}-compare`,
            type: 'bar',
            title: '分类对比',
            xAxis: textFields[0].field,
            yAxis: numericFields[0].field,
            color: PRESET_COLORS[2]
          });
        }
      }

      if (promptLower.includes('占比') || promptLower.includes('分布') || promptLower.includes('组成')) {
        if (textFields.length > 0 && numericFields.length > 0) {
          charts.push({
            id: `chart-${Date.now()}-pie`,
            type: 'pie',
            title: '占比分析',
            xAxis: textFields[0].field,
            yAxis: numericFields[0].field,
            color: PRESET_COLORS[3]
          });
        }
      }

      // 默认添加对比图
      if (charts.length < 3 && textFields.length > 0 && numericFields.length > 0) {
        charts.push({
          id: `chart-${Date.now()}-default`,
          type: 'bar',
          title: '数据分布',
          xAxis: textFields[Math.min(1, textFields.length - 1)].field,
          yAxis: numericFields[0].field,
          color: PRESET_COLORS[4]
        });
      }

      setGenerationStep('正在生成最终配置...');
      await new Promise(resolve => setTimeout(resolve, 600));

      // 创建仪表盘
      const dashboard: GeneratedDashboard = {
        id: `dashboard-${Date.now()}`,
        name: extractDashboardName(prompt),
        description: prompt,
        charts: charts.slice(0, 6), // 最多6个图表
        layout: charts.length > 4 ? 'grid' : 'list',
        createdAt: Date.now()
      };

      // AI 回复
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}-assistant`,
        role: 'assistant',
        content: `已根据您的需求「${prompt}」生成仪表盘，包含 ${charts.length} 个可视化组件。`,
        dashboard,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setCurrentDashboard(dashboard);
      setHistory(prev => [dashboard, ...prev]);
      onDashboardGenerate?.(dashboard);

    } catch (error) {
      console.error('Generation failed:', error);
      
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content: '抱歉，生成过程中遇到了问题。请尝试重新描述您的需求。',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // 从提示词提取仪表盘名称
  const extractDashboardName = (prompt: string): string => {
    const keywords = ['销售', '用户', '财务', '订单', '运营', '市场', '数据'];
    for (const kw of keywords) {
      if (prompt.includes(kw)) {
        return `${kw}分析仪表盘`;
      }
    }
    return '数据分析仪表盘';
  };

  // 渲染图表
  const renderChart = (chart: ChartConfig) => {
    if (!chart.yAxis) return null;

    // 准备数据
    const chartData = data.rows.slice(0, 20).map((row, idx) => ({
      name: chart.xAxis ? String(row[chart.xAxis] || '') : `${chart.title} ${idx + 1}`,
      value: Number(chart.yAxis ? row[chart.yAxis] : 0) || 0
    }));

    const ChartIcon = chart.type === 'line' ? LineChart : chart.type === 'pie' ? PieChartIcon : BarChart3;

    switch (chart.type) {
      case 'line':
        return (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLine data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={chart.color || PRESET_COLORS[0]}
                  strokeWidth={2}
                  dot={{ fill: chart.color || PRESET_COLORS[0] }}
                />
              </RechartsLine>
            </ResponsiveContainer>
          </div>
        );

      case 'pie':
        return (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PRESET_COLORS[index % PRESET_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );

      default: // bar
        return (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="value" fill={chart.color || PRESET_COLORS[0]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-purple-500" />
          <h3 className="font-medium">NL2Dashboard</h3>
          <Badge variant="secondary" className="text-xs">AI 生成</Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="create" className="flex items-center gap-1">
            <Wand2 className="w-4 h-4" />
            创建仪表盘
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1">
            <History className="w-4 h-4" />
            历史记录
          </TabsTrigger>
        </TabsList>

        {/* 创建模式 */}
        <TabsContent value="create" className="mt-4 space-y-4">
          {/* 对话区域 */}
          <Card className="min-h-[400px] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <CardTitle className="text-sm">对话式生成</CardTitle>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* 消息列表 */}
              <ScrollArea className="flex-1 max-h-[300px] mb-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Sparkles className="w-12 h-12 mx-auto mb-3 text-purple-300" />
                      <p className="mb-4">用自然语言描述你想要的仪表盘</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {EXAMPLE_PROMPTS.map((example, i) => (
                          <button
                            key={i}
                            onClick={() => setInput(example)}
                            className="text-xs px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-full hover:bg-purple-100 transition-colors"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {messages.map(msg => (
                    <div 
                      key={msg.id}
                      className={cn(
                        'flex gap-3',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-4 h-4 text-purple-600" />
                        </div>
                      )}
                      
                      <div className={cn(
                        'max-w-[80%] rounded-lg p-3',
                        msg.role === 'user' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-gray-100'
                      )}>
                        <p className="text-sm">{msg.content}</p>
                        
                        {/* 生成的仪表盘预览 */}
                        {msg.dashboard && (
                          <div className="mt-3 space-y-2">
                            <Badge variant="outline" className="text-xs">
                              包含 {msg.dashboard.charts.length} 个图表
                            </Badge>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {msg.dashboard.charts.slice(0, 4).map(chart => (
                                <div 
                                  key={chart.id}
                                  className="p-2 bg-white/50 rounded text-xs"
                                >
                                  {chart.title}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm">U</span>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* 生成中状态 */}
                  {isGenerating && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="bg-gray-100 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {generationStep}
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
                  placeholder="描述你想要的仪表盘..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                      e.preventDefault();
                      generateDashboard(input);
                    }
                  }}
                  disabled={isGenerating}
                />
                <Button 
                  onClick={() => generateDashboard(input)}
                  disabled={!input.trim() || isGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 当前仪表盘预览 */}
          {currentDashboard && (
            <Card className="border-purple-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-purple-500" />
                    {currentDashboard.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>复制配置</TooltipContent>
                    </Tooltip>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('history')}>
                      <History className="w-4 h-4 mr-1" />
                      历史
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  'grid gap-4',
                  currentDashboard.layout === 'grid' ? 'grid-cols-2' : 'grid-cols-1'
                )}>
                  {currentDashboard.charts.map(chart => (
                    <Card key={chart.id} className="border">
                      <CardHeader className="py-2 px-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {chart.type === 'line' && <LineChart className="w-4 h-4 text-purple-500" />}
                            {chart.type === 'bar' && <BarChart3 className="w-4 h-4 text-blue-500" />}
                            {chart.type === 'pie' && <PieChartIcon className="w-4 h-4 text-pink-500" />}
                            <span className="font-medium text-sm">{chart.title}</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {chart.type === 'line' ? '折线图' : chart.type === 'pie' ? '饼图' : '柱状图'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {renderChart(chart)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 历史记录 */}
        <TabsContent value="history" className="mt-4">
          {history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <History className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500">暂无历史记录</p>
                <p className="text-sm text-gray-400 mt-1">创建仪表盘后会显示在这里</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {history.map(dashboard => (
                <Card 
                  key={dashboard.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => {
                    setCurrentDashboard(dashboard);
                    setActiveTab('create');
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <LayoutDashboard className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{dashboard.name}</h4>
                          <p className="text-sm text-gray-500">
                            {dashboard.charts.length} 个图表 · {new Date(dashboard.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4 mr-1" />
                        查看
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 使用提示 */}
      <Card className="bg-purple-50 border-purple-200">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-purple-500 mt-0.5" />
            <div className="space-y-2 text-sm text-purple-700">
              <p className="font-medium">使用技巧</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>描述具体的数据需求，如「展示各地区销售额对比」</li>
                <li>包含时间维度的描述会自动生成趋势图</li>
                <li>提到「占比」或「分布」会自动生成饼图</li>
                <li>可以一次性生成包含多个图表的完整仪表盘</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default NL2Dashboard;
