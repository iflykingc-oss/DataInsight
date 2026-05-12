'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  PieChart,
  Database,
  Target,
  Shield,
  RotateCcw,
  Settings,
  Plus,
  Clock,
  X,
  Table,
  LayoutDashboard,
  GitBranch,
  BookOpen,
  Search,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';
import { toUserFriendlyError, type UserFriendlyError } from '@/lib/error-handler';
import { storeBusinessData, readBusinessData } from '@/lib/data-lifecycle';

// ============= 类型定义 =============

// AI模式类型
type AIMode = 'analysis' | 'table' | 'dashboard' | 'workflow' | 'tutorial';

interface AIModeConfig {
  id: AIMode;
  label: string;
  icon: React.ElementType;
  description: string;
  placeholder: string;
  quickActions: { label: string; query: string }[];
}

const AI_MODES: AIModeConfig[] = [
  {
    id: 'analysis',
    label: '数据分析',
    icon: TrendingUp,
    description: '查询或分析数据中的信息',
    placeholder: '例如：查询金额大于1万的订单，或分析哪些产品销售额最高',
    quickActions: [
      { label: '核心指标分析', query: '分析这份数据的核心业务指标，包括数值型字段的汇总、平均、最大、最小值，以及文本型字段的分布情况' },
      { label: '趋势分析', query: '分析数据的时间趋势，找出增长或下降的规律' },
      { label: '异常检测', query: '识别数据中的异常值和异常模式' },
      { label: '归因分析', query: '分析影响核心指标的关键因素' },
    ],
  },
  {
    id: 'table',
    label: '数据表搭建',
    icon: Table,
    description: '创建或修改数据表结构',
    placeholder: '例如：帮我创建一个项目进度跟踪表，包含任务名称、负责人、截止日期、完成状态',
    quickActions: [
      { label: '创建客户表', query: '创建一个客户信息表，包含姓名、电话、邮箱、公司、备注等字段' },
      { label: '创建销售表', query: '创建一个销售记录表，包含日期、客户、产品、数量、金额、状态等字段' },
      { label: '创建库存表', query: '创建一个库存管理表，包含商品名称、分类、库存量、预警值、供应商等字段' },
    ],
  },
  {
    id: 'dashboard',
    label: '仪表盘搭建',
    icon: LayoutDashboard,
    description: '创建数据可视化图表',
    placeholder: '例如：帮我创建一个展示销售数据的仪表盘，包含月度销售额趋势图和区域占比饼图',
    quickActions: [
      { label: '销售仪表盘', query: '创建一个销售仪表盘，包含月度趋势图、区域占比饼图、TOP产品柱状图' },
      { label: '运营仪表盘', query: '创建一个运营仪表盘，包含关键指标卡片、趋势图、排行榜' },
      { label: '财务仪表盘', query: '创建一个财务仪表盘，包含收支趋势、分类占比、TOP支出项' },
    ],
  },
  {
    id: 'workflow',
    label: '工作流搭建',
    icon: GitBranch,
    description: '配置自动化流程',
    placeholder: '例如：当有新记录时，给负责人发送通知消息',
    quickActions: [
      { label: '新增通知', query: '当数据表中有新记录时，自动发送通知给指定人员' },
      { label: '状态更新', query: '当某个字段满足条件时，自动更新另一字段的值' },
      { label: '数据同步', query: '当数据变更时，自动同步到另一张关联表' },
    ],
  },
  {
    id: 'tutorial',
    label: '使用教程',
    icon: BookOpen,
    description: '解答产品使用问题',
    placeholder: '例如：查找引用字段怎么使用，或如何设置数据预警',
    quickActions: [
      { label: '如何创建图表', query: '如何使用图表功能创建可视化图表' },
      { label: '如何设置权限', query: '如何设置行级权限控制数据访问' },
      { label: '如何使用公式', query: '如何在表格中使用公式和函数' },
    ],
  },
];

// 历史会话
interface ChatSession {
  id: string;
  title: string;
  mode: AIMode;
  lastMessage: string;
  timestamp: Date;
  messages: ChatMessage[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  suggestions?: string[];
  chartType?: string;
  sql?: string;
  error?: UserFriendlyError;
}

interface EnhancedLLMAssistantProps {
  data: ParsedData;
  analysis: DataAnalysis;
  modelConfig?: { apiKey: string; baseUrl: string; model: string } | null;
  onDataFilter?: (filter: { field: string; operator: string; value: string }[]) => void;
  onChartSuggest?: (suggestion: { type: string; xField: string; yField: string }) => void;
  onNavigate?: (target: 'table-builder' | 'dashboard' | 'workflow' | 'settings') => void;
}

export function EnhancedLLMAssistant({
  data,
  analysis,
  modelConfig,
  onDataFilter,
  onChartSuggest,
  onNavigate,
}: EnhancedLLMAssistantProps) {
  // 状态
  const { t } = useI18n();
  const [currentMode, setCurrentMode] = useState<AIMode>('analysis');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showModeSelector, setShowModeSelector] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 获取当前模式配置
  const currentModeConfig = AI_MODES.find(m => m.id === currentMode) || AI_MODES[0];

  // 基于数据列名自动推断业务场景，生成场景化推荐问题
  const contextRecommendations = useMemo(() => {
    if (!data?.headers?.length) return [];
    const headers = data.headers.map(h => h.toLowerCase());
    const numFields = analysis?.fieldStats?.filter(f => f.type === 'number').map(f => f.field) || [];
    const dateFields = analysis?.fieldStats?.filter(f => f.type === 'date').map(f => f.field) || [];
    const textFields = analysis?.fieldStats?.filter(f => f.type === 'string' || f.type === 'id' || f.type === 'mixed').map(f => f.field) || [];
    const recs: { label: string; query: string; icon: React.ElementType; category: string }[] = [];

    // 销售场景
    if (headers.some(h => /销售|金额|收入|营收|订单|单价|数量/.test(h))) {
      recs.push(
        { label: '销售额总览', query: `统计总销售额、平均客单价、订单数量，告诉我整体销售情况`, icon: TrendingUp, category: '销售分析' },
        { label: '找出TOP客户', query: `找出销售额最高的前10个客户/产品，分析它们的共同特征`, icon: Target, category: '销售分析' },
        { label: '销售趋势', query: `按时间维度分析销售趋势，有没有增长或下降的拐点？`, icon: TrendingUp, category: '销售分析' },
        { label: '为什么下滑', query: `如果近期销售额下降，帮我分析可能的原因，从客户、产品、时间等维度拆解`, icon: AlertTriangle, category: '销售分析' },
      );
    }
    // HR场景
    if (headers.some(h => /员工|部门|入职|薪资|绩效|考勤/.test(h))) {
      recs.push(
        { label: '人员结构', query: `分析员工部门分布、职级分布、年龄结构，告诉我团队构成特点`, icon: PieChart, category: 'HR分析' },
        { label: '离职预警', query: `分析哪些部门或职级的离职率偏高，可能的原因是什么`, icon: AlertTriangle, category: 'HR分析' },
        { label: '薪资分析', query: `分析薪资分布是否合理，同部门同职级的薪资差异大吗`, icon: Target, category: 'HR分析' },
      );
    }
    // 项目管理
    if (headers.some(h => /项目|任务|进度|完成|截止|负责人/.test(h))) {
      recs.push(
        { label: '进度总览', query: `统计各项目的完成率，哪些项目进度落后于计划`, icon: Target, category: '项目分析' },
        { label: '瓶颈分析', query: `分析哪些负责人/阶段的任务积压最多，找出瓶颈`, icon: AlertTriangle, category: '项目分析' },
        { label: '逾期预警', query: `列出所有逾期未完成的任务，分析逾期原因和影响范围`, icon: AlertTriangle, category: '项目分析' },
      );
    }
    // 财务场景
    if (headers.some(h => /成本|费用|支出|利润|预算|报销/.test(h))) {
      recs.push(
        { label: '收支分析', query: `分析收入和支出的整体情况，利润率是多少`, icon: TrendingUp, category: '财务分析' },
        { label: '费用TOP', query: `找出费用最高的类别/项目，看看有没有可以优化的空间`, icon: Target, category: '财务分析' },
        { label: '预算执行', query: `对比预算和实际支出，哪些项目超支了`, icon: AlertTriangle, category: '财务分析' },
      );
    }
    // 通用推荐（当数据没有明确场景时）
    if (recs.length === 0) {
      if (numFields.length > 0) {
        recs.push(
          { label: '核心指标', query: `帮我总结这份数据的核心指标，包括各数值字段的汇总、均值、最大/最小值`, icon: TrendingUp, category: '通用分析' },
          { label: '数据分布', query: `分析各字段的分布情况，有没有异常值或者偏斜`, icon: PieChart, category: '通用分析' },
        );
      }
      if (dateFields.length > 0) {
        recs.push(
          { label: '趋势分析', query: `按时间维度分析数据变化趋势，找出关键转折点`, icon: TrendingUp, category: '通用分析' },
        );
      }
      if (textFields.length > 0 && numFields.length > 0) {
        recs.push(
          { label: '分类对比', query: `按不同类别分组对比各数值指标，找出表现最好和最差的分组`, icon: Target, category: '通用分析' },
        );
      }
    }
    return recs.slice(0, 6); // 最多6个推荐
  }, [data?.headers, analysis?.fieldStats]);

  // 加载历史会话
  useEffect(() => {
    try {
      const parsed = readBusinessData<ChatSession[]>('datainsight-ai-sessions');
      if (parsed) {
        parsed.forEach(s => {
          s.timestamp = new Date(s.timestamp);
        });
        setSessions(parsed);
      }
    } catch { /* ignore */ }
  }, []);

  // 保存历史会话
  const saveSessions = useCallback((newSessions: ChatSession[]) => {
    try {
      storeBusinessData('datainsight-ai-sessions', newSessions.slice(0, 50));
    } catch { /* ignore */ }
  }, []);

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // 切换模式时清空对话
  const handleModeChange = (mode: AIMode) => {
    if (mode !== currentMode && messages.length > 0) {
      // 保存当前会话
      if (messages.length >= 2) {
        const newSession: ChatSession = {
          id: `session-${Date.now()}`,
          title: messages[0]?.content.slice(0, 30) || '新会话',
          mode: currentMode,
          lastMessage: messages[messages.length - 1]?.content.slice(0, 50) || '',
          timestamp: new Date(),
          messages: [...messages],
        };
        setSessions(prev => {
          const updated = [newSession, ...prev].slice(0, 50);
          saveSessions(updated);
          return updated;
        });
      }
      setMessages([]);
    }
    setCurrentMode(mode);
    setShowModeSelector(false);
  };

  // 新建会话
  const handleNewSession = () => {
    if (messages.length >= 2) {
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: messages[0]?.content.slice(0, 30) || '新会话',
        mode: currentMode,
        lastMessage: messages[messages.length - 1]?.content.slice(0, 50) || '',
        timestamp: new Date(),
        messages: [...messages],
      };
      setSessions(prev => {
        const updated = [newSession, ...prev].slice(0, 50);
        saveSessions(updated);
        return updated;
      });
    }
    setMessages([]);
    setInput('');
  };

  // 加载历史会话
  const handleLoadSession = (session: ChatSession) => {
    setMessages(session.messages);
    setCurrentMode(session.mode);
    setShowHistory(false);
  };

  // 删除历史会话
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => {
      const updated = prev.filter(s => s.id !== id);
      saveSessions(updated);
      return updated;
    });
  };

  // 调用 LLM API
  const callLLMInsight = useCallback(async (question: string) => {
    if (!modelConfig) {
      const assistantMsgId = `msg-${Date.now()}-noconfig`;
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '尚未配置AI模型。请在「AI模型配置」中设置您的API，即可启用智能分析功能。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, {
        id: `msg-${Date.now()}-user`,
        role: 'user',
        content: question,
        timestamp: new Date(),
      }, assistantMessage]);
      return;
    }

    const userMsgId = generateId();
    const assistantMsgId = generateId();

    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: question,
      timestamp: new Date()
    };

    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      // 根据模式选择API
      const apiPath = '/api/llm-insight';
      let requestBody: Record<string, unknown> = {
        message: question,
        mode: currentMode,
        modelConfig,
        chatHistory: messages
          .filter(m => m.role === 'user' || m.role === 'assistant')
          .slice(-10)
          .map(m => ({ role: m.role, content: m.content })),
      };

      // 数据分析模式才传数据
      if (currentMode === 'analysis') {
        requestBody = {
          ...requestBody,
          data: { headers: data.headers, rows: data.rows.slice(0, 200), rowCount: data.rowCount, columnCount: data.columnCount },
          fieldStats: analysis.fieldStats.slice(0, 20),
          analysisMode: 'comprehensive',
        };
      }

      const response = await fetch(apiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取流');

      const decoder = new TextDecoder();
      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.done) {
                // 流结束时应用过滤：移除思考内容和推荐追问部分
                const cleanContent = filterThinkingContent(removeSuggestionsSection(fullContent));
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, isStreaming: false, content: cleanContent, suggestions: extractSuggestions(fullContent) }
                    : m
                ));
              } else if (parsed.content) {
                fullContent += parsed.content;
                // 实时显示时同时过滤思考内容和追问部分，避免追问混入答案实时显示
                const cleanContent = filterThinkingContent(removeSuggestionsSection(fullContent));
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: cleanContent }
                    : m
                ));
              }
            } catch { /* ignore */ }
          }
        }
      }

      // 最终更新：完整过滤
      const cleanContent = filterThinkingContent(removeSuggestionsSection(fullContent));
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, isStreaming: false, content: cleanContent, suggestions: extractSuggestions(fullContent) }
          : m
      ));

    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const friendlyError = toUserFriendlyError(err as Error);
      
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? {
            ...m,
            isStreaming: false,
            error: {
              type: friendlyError.type,
              title: friendlyError.title,
              message: friendlyError.message,
              suggestions: friendlyError.suggestions,
              canRetry: friendlyError.canRetry,
            }
          }
          : m
      ));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [data, analysis, messages, modelConfig, currentMode]);

  // 过滤思考内容
  const filterThinkingContent = (content: string): string => {
    if (!content) return content;

    let filtered = content;

    // 1. 移除 <think>...</think> 标签
    filtered = filtered.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // 2. 处理不完整的think标签（流式输出可能导致标签被截断）
    if (filtered.includes('<think>') && !filtered.includes('</think>')) {
      filtered = filtered.replace(/<think>[\s\S]*$/i, '');
    }
    filtered = filtered.replace(/^<\/think>\s*/i, '');
    filtered = filtered.replace(/<think>\s*/gi, '');

    // 3. 移除 ## 思考 等标题
    filtered = filtered.replace(/^#{1,3}\s*思考\s*$/gmi, '');
    filtered = filtered.replace(/^#{1,3}\s*推理过程\s*$/gmi, '');
    filtered = filtered.replace(/^#{1,3}\s*思维链\s*$/gmi, '');

    // 4. 移除 reasoning_content 字段
    filtered = filtered.replace(/"reasoning_content"\s*:\s*"[^"]*"/gi, '');

    // 5. 清理连续空行
    filtered = filtered.replace(/\n{3,}/g, '\n\n');

    return filtered.trim();
  };

  // 提取推荐追问
  const extractSuggestions = (content: string): string[] => {
    const suggestions: string[] = [];
    // 先过滤掉思考内容再提取
    const cleanContent = filterThinkingContent(content);
    const sectionMatch = cleanContent.match(/##\s*推荐追问\s*\n([\s\S]*?)$/);
    if (sectionMatch) {
      const section = sectionMatch[1];
      const lines = section.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*\d+[.、）)]\s*(.+)/);
        if (match && suggestions.length < 3) {
          const q = match[1].trim().replace(/\*\*/g, '');
          if (q.length > 5) suggestions.push(q);
        }
      }
    }
    return suggestions.slice(0, 3);
  };

  // 移除正文中的推荐追问部分
  const removeSuggestionsSection = (content: string): string => {
    return content.replace(/##\s*推荐追问\s*\n[\s\S]*$/, '').trim();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const query = input.trim();
    setInput('');
    await callLLMInsight(query);
  };

  const handleQuickAction = async (query: string) => {
    if (isLoading) return;
    setInput(query);
    await callLLMInsight(query);
  };

  const handleRetry = (msgIndex: number) => {
    const userMsg = messages[msgIndex - 1];
    if (userMsg && userMsg.role === 'user') {
      setMessages(prev => prev.slice(0, msgIndex - 1));
      callLLMInsight(userMsg.content);
    }
  };

  const copyContent = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            AI 数据助手
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-8" onClick={() => setShowHistory(!showHistory)}>
              <Clock className="w-4 h-4 mr-1" />
              历史
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={handleNewSession}>
              <Plus className="w-4 h-4 mr-1" />
              新会话
            </Button>
          </div>
        </div>

        {/* 模式切换器 */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between mt-2"
            onClick={() => setShowModeSelector(!showModeSelector)}
          >
            <span className="flex items-center gap-2">
              {React.createElement(currentModeConfig.icon, { className: 'w-4 h-4' })}
              {currentModeConfig.label}
            </span>
            <ChevronDown className="w-4 h-4" />
          </Button>

          {showModeSelector && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-10 p-2 space-y-1">
              {AI_MODES.map(mode => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    className={`w-full flex items-center gap-2 p-2 rounded-md text-left transition-colors ${
                      currentMode === mode.id 
                        ? 'bg-primary/10 text-primary' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => handleModeChange(mode.id)}
                  >
                    <Icon className="w-4 h-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{mode.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{mode.description}</p>
                    </div>
                    {currentMode === mode.id && <Check className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* 历史会话面板 */}
        {showHistory && (
          <div className="mb-3 p-3 bg-muted/50 rounded-md max-h-64 overflow-auto">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">{t('txt.历史会话')}</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowHistory(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t('txt.暂无历史会话')}</p>
            ) : (
              <div className="space-y-1">
                {sessions.slice(0, 10).map(session => (
                  <div
                    key={session.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer group"
                    onClick={() => handleLoadSession(session)}
                  >
                    <MessageSquare className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{session.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{session.lastMessage}</p>
                    </div>
                    <Badge variant="outline" className="text-xs h-5 shrink-0">
                      {AI_MODES.find(m => m.id === session.mode)?.label}
                    </Badge>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                    >
                      <X className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 场景化推荐问题 - 基于数据列名自动推断业务场景 */}
        {messages.length === 0 && contextRecommendations.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-xs font-medium text-primary">{t('txt.基于你的数据推荐这些问题')}</p>
            </div>
            <div className="space-y-1.5">
              {(() => {
                const categories = [...new Set(contextRecommendations.map(r => r.category))];
                return categories.map(cat => (
                  <div key={cat}>
                    <p className="text-xs text-muted-foreground/70 mb-1 font-medium">{cat}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {contextRecommendations.filter(r => r.category === cat).map((rec, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(rec.query)}
                          disabled={isLoading}
                          className="text-xs h-auto py-2 justify-start text-left whitespace-normal hover:bg-primary/10 border-primary/20"
                        >
                          <rec.icon className="w-3 h-3 mr-1.5 shrink-0 text-primary/60" />
                          <span className="line-clamp-2">{rec.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* 快捷操作 - 模式切换后的默认推荐 */}
        {messages.length === 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-xs text-muted-foreground">{t('txt.更多操作')}</p>
              <Badge variant="outline" className="text-xs h-5">
                {currentModeConfig.label}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {currentModeConfig.quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.query)}
                  disabled={isLoading}
                  className="text-xs h-auto py-2 justify-start text-left whitespace-normal hover:bg-primary/10"
                >
                  <span className="line-clamp-2">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 消息列表 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto mb-3 pr-2 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <Brain className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <h3 className="font-medium text-sm mb-1">{currentModeConfig.label}</h3>
              <p className="text-xs text-muted-foreground mb-1">{currentModeConfig.description}</p>
              <p className="text-xs text-muted-foreground/70">
                选择上方推荐问题，或直接输入你的问题
              </p>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-md px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted border border-border'
              }`}>
                {/* 错误提示 */}
                {msg.role === 'assistant' && msg.error && (
                  <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      {msg.error.title}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{msg.error.message}</p>
                    {msg.error.canRetry && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRetry(idx)}
                        className="mt-2 text-xs h-7"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        重试
                      </Button>
                    )}
                  </div>
                )}

                {/* 消息内容 */}
                <div className="text-sm leading-relaxed">
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-gray max-w-none
                      [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2
                      [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5
                      [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1
                      [&_p]:my-1.5
                      [&_ul]:my-1.5 [&_ul]:pl-4 [&_ul]:list-disc
                      [&_ol]:my-1.5 [&_ol]:pl-4 [&_ol]:list-decimal
                      [&_li]:my-0.5
                      [&_strong]:font-semibold
                      [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs
                      [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded-md [&_pre]:my-2 [&_pre]:text-xs [&_pre]:overflow-x-auto
                      [&_table]:my-2 [&_table]:text-xs [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1
                    ">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content.replace(/##\s*推荐追问[\s\S]*$/, '')}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  )}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                  )}
                </div>

                {/* 助手消息操作栏 */}
                {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                  <div className="mt-2 pt-2 border-t border-border/50 flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyContent(msg.id, msg.content)}
                      className="text-xs h-6 px-2"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                      {copiedId === msg.id ? '已复制' : '复制'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRetry(idx)}
                      className="text-xs h-6 px-2"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      重试
                    </Button>
                  </div>
                )}

                {/* 推荐追问 */}
                {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                  <div className="mt-3 pt-3 border-t border-border/50">
                    <p className="text-xs font-medium mb-2 text-primary flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      深度追问
                    </p>
                    <div className="flex flex-col gap-1">
                      {msg.suggestions.slice(0, 3).map((s, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickAction(s)}
                          className="text-xs h-auto py-1.5 px-2 text-left justify-start whitespace-normal hover:bg-primary/10"
                        >
                          <span className="text-primary mr-1 shrink-0">{i + 1}.</span>
                          <span className="line-clamp-2">{s}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 时间戳 */}
                <p className={`text-xs mt-2 ${
                  msg.role === 'user' ? 'text-white/60' : 'text-muted-foreground/60'
                }`}>
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-md px-4 py-3 border border-border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">AI 正在分析...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 输入框 */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder={currentModeConfig.placeholder}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* 数据上下文 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowContext(!showContext)}
          className="mt-2 text-xs"
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          {showContext ? '隐藏' : '查看'}数据上下文
          {showContext ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
        </Button>

        {showContext && (
          <div className="mt-2 p-3 bg-muted/50 rounded-md text-xs space-y-1">
            <p className="font-medium">{t('txt.数据概况')}</p>
            <p>文件: {data.fileName}</p>
            <p>行数: {(data.rowCount ?? 0).toLocaleString()} | 列数: {data.columnCount ?? 0}</p>
            <p>字段: {data.headers.join(', ')}</p>
            {analysis.deepAnalysis && (
              <>
                <p className="font-medium mt-2">{t('txt.深度分析')}</p>
                <p>健康评分: {analysis.deepAnalysis.healthScore.overall}/100</p>
                <p>关键发现: {analysis.deepAnalysis.keyFindings.length} 项</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
