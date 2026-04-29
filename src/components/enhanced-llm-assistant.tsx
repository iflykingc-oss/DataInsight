'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  RotateCcw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  suggestions?: string[];
  chartType?: string;
  sql?: string;
}

interface EnhancedLLMAssistantProps {
  data: ParsedData;
  analysis: DataAnalysis;
  modelConfig?: { apiKey: string; baseUrl: string; model: string } | null;
  onDataFilter?: (filter: { field: string; operator: string; value: string }[]) => void;
  onChartSuggest?: (suggestion: { type: string; xField: string; yField: string }) => void;
}

const PRESET_QUERIES = [
  {
    icon: TrendingUp,
    label: '趋势与机会',
    query: '分析核心业务指标的变化趋势，重点关注：1）哪些指标在增长/下降，具体变化幅度是多少；2）增长/下降的驱动因素是什么；3）基于趋势，未来1-2周最可能的发展方向；4）趋势中隐藏的业务机会点。请用具体数字说明，不要只说"有所增长"。'
  },
  {
    icon: Lightbulb,
    label: '业务洞察',
    query: '从业务视角深度分析这份数据，要求：1）先判断这是什么业务场景（销售/用户/库存/财务等）；2）找出2-3个最有价值的业务发现（不是数据质量问题，而是业务规律）；3）每个发现给出具体的业务含义和可量化的影响；4）基于这些发现，本周可以做什么具体动作。'
  },
  {
    icon: Target,
    label: '优化方案',
    query: '基于数据分析给出可落地的优化方案，要求：1）方案必须分优先级：本周可做（零成本/低成本）、本月可做（需要少量资源）、本季度规划；2）每个方案都要说明预期效果（能用数字就用数字）；3）优先给出不依赖额外数据的方案；4）最后说明当前数据的局限对结论的影响。'
  },
  {
    icon: AlertTriangle,
    label: '风险与预警',
    query: '识别数据中的业务风险和异常信号，重点关注：1）哪些指标表现异常，偏离正常范围多少；2）这些异常可能的业务原因（不要只说"数据异常"）；3）如果不干预，预计会产生什么后果；4）给出最低成本的干预方案（本周内可执行）。'
  },
  {
    icon: Database,
    label: '数据诊断',
    query: '诊断这份数据的质量和可用性：1）当前数据能支撑什么程度的分析（描述性/诊断性/预测性）；2）数据的主要短板是什么，对分析结论的影响有多大；3）在现有数据质量下，最可靠的分析结论是什么（给出置信度）；4）建议优先补充哪些数据来提升分析价值。'
  },
  {
    icon: Sparkles,
    label: '全面诊断',
    query: '对这份数据做全面的业务诊断，涵盖：1）业务场景判断和核心指标识别；2）数据质量分层评估（原始层+清洗层）；3）2-3个核心业务发现（带具体数字）；4）1-2个风险点；5）按优先级排序的行动建议（本周/本月/本季度）。要求输出结构化、有数据支撑、可直接用于业务汇报。'
  },
];

export function EnhancedLLMAssistant({
  data,
  analysis,
  modelConfig,
  onDataFilter,
  onChartSuggest
}: EnhancedLLMAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  // 调用真实的 LLM API，流式响应
  const callLLMInsight = useCallback(async (question: string) => {
    // 前端拦截：无模型配置时直接提示
    if (!modelConfig) {
      const assistantMsgId = `msg-${Date.now()}-noconfig`;
      const assistantMessage: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '⚠️ 尚未配置AI模型。请在「AI模型配置」中设置您的OpenAI兼容API（API Key + Base URL + 模型名称），即可启用智能分析功能。',
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

    // 添加用户消息
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: question,
      timestamp: new Date()
    };

    // 添加空的助手消息占位
    const assistantMessage: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setIsLoading(true);

    // 取消之前的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const response = await fetch('/api/llm-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          data: { headers: data.headers, rows: data.rows.slice(0, 200), rowCount: data.rowCount, columnCount: data.columnCount },
          fieldStats: analysis.fieldStats.slice(0, 20),
          analysisMode: 'comprehensive',
          modelConfig,
          chatHistory: messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content })),
        }),
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
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, isStreaming: false, content: fullContent, suggestions: extractSuggestions(fullContent) }
                    : m
                ));
              } else if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: fullContent }
                    : m
                ));
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      // 最终更新
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? { ...m, isStreaming: false, content: fullContent, suggestions: extractSuggestions(fullContent) }
          : m
      ));

    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      console.error('LLM调用错误:', err);
      setMessages(prev => prev.map(m =>
        m.id === assistantMsgId
          ? {
            ...m,
            isStreaming: false,
            content: '抱歉，AI分析服务暂时不可用。请稍后重试，或尝试使用本地NL2SQL分析功能。\n\n错误信息: ' + (err instanceof Error ? err.message : '未知错误')
          }
          : m
      ));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [data, analysis, messages, modelConfig]);

  // 从响应中提取推荐追问
  const extractSuggestions = (content: string): string[] => {
    const suggestions: string[] = [];
    
    // 查找 "## 推荐追问" 或 "##推荐追问" 章节
    const sectionMatch = content.match(/##\s*推荐追问\s*\n([\s\S]*?)$/);
    if (sectionMatch) {
      const section = sectionMatch[1];
      // 提取编号的追问行：1. 2. 3. 或 1）2）3）
      const lines = section.split('\n');
      for (const line of lines) {
        const match = line.match(/^\s*\d+[.、）)]\s*(.+)/);
        if (match && suggestions.length < 3) {
          const q = match[1].trim().replace(/\*\*/g, '');
          if (q.length > 5) suggestions.push(q);
        }
      }
    }
    
    // 如果LLM没有输出推荐追问章节，基于数据上下文生成追问
    if (suggestions.length === 0) {
      const numericFields = analysis.fieldStats.filter(f => f.type === 'number').map(f => f.field);
      const textFields = analysis.fieldStats.filter(f => f.type === 'string').map(f => f.field);
      
      if (numericFields.length > 0 && textFields.length > 0) {
        suggestions.push(`按${textFields[0]}拆分，各组的${numericFields[0]}差异有多大，哪个组贡献最大`);
      }
      if (numericFields.length >= 2) {
        suggestions.push(`${numericFields[0]}和${numericFields[1]}之间是否存在相关性，相关系数是多少`);
      }
      if (data.rows.length > 30) {
        suggestions.push('前20%的关键项贡献了整体多大比例，是否符合二八法则');
      }
      if (numericFields.length > 0) {
        suggestions.push(`剔除异常值（3σ外）后，${numericFields[0]}的均值和中位数变化多少`);
      }
    }
    
    return suggestions.slice(0, 3);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const query = input.trim();
    setInput('');
    await callLLMInsight(query);
  };

  const handlePresetQuery = async (query: string) => {
    if (isLoading) return;
    setInput(query);
    await callLLMInsight(query);
  };

  const handleRetry = (msgIndex: number) => {
    // 找到当前assistant消息对应的user消息（前一条）
    const userMsg = messages[msgIndex - 1];
    if (userMsg && userMsg.role === 'user') {
      // 移除当前的assistant消息和对应的user消息
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
            AI 数据分析助手
            <Badge variant="secondary" className="text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              流式输出
            </Badge>
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearMessages} className="text-xs">
              <RotateCcw className="w-3 h-3 mr-1" />
              清空对话
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* 快捷操作 */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">快捷分析</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_QUERIES.map((action, i) => {
              const Icon = action.icon;
              return (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetQuery(action.query)}
                  disabled={isLoading}
                  className="text-xs h-7 hover:bg-primary/10 hover:text-primary hover:border-primary/20"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* 消息列表 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto mb-3 pr-2 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Brain className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="font-medium text-gray-600 mb-2">AI 深度数据分析</h3>
              <p className="text-sm text-gray-400 mb-4">
                基于大语言模型的智能分析，支持流式实时响应
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {PRESET_QUERIES.map((action, i) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handlePresetQuery(action.query)}
                      className="text-xs h-auto py-2 justify-start"
                    >
                      <Icon className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground border border-border'
              }`}>
                {/* 消息内容 */}
                <div className="text-sm leading-relaxed">
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm prose-gray max-w-none
                      [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:text-gray-900
                      [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-3 [&_h2]:mb-1.5 [&_h2]:text-gray-800
                      [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-gray-700
                      [&_p]:my-1.5 [&_p]:text-gray-700
                      [&_ul]:my-1.5 [&_ul]:pl-4 [&_ul]:list-disc
                      [&_ol]:my-1.5 [&_ol]:pl-4 [&_ol]:list-decimal
                      [&_li]:my-0.5 [&_li]:text-gray-700
                      [&_strong]:text-gray-900 [&_strong]:font-semibold
                      [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-blue-700
                      [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-2 [&_pre]:text-xs [&_pre]:overflow-x-auto
                      [&_blockquote]:border-l-3 [&_blockquote]:border-blue-400 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-gray-600
                      [&_hr]:my-3 [&_hr]:border-gray-200
                      [&_table]:my-2 [&_table]:text-xs [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_td]:border-gray-100
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

                {/* 助手消息的操作栏 */}
                {msg.role === 'assistant' && !msg.isStreaming && msg.content && (
                  <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
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
                      重新生成
                    </Button>
                  </div>
                )}

                {/* 推荐追问 */}
                {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium mb-2 text-blue-500 flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" />
                      深度追问：
                    </p>
                    <div className="flex flex-col gap-1">
                      {msg.suggestions.slice(0, 3).map((s, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePresetQuery(s)}
                          className="text-xs h-auto py-1.5 px-2 text-left justify-start whitespace-normal hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700"
                        >
                          <span className="text-blue-400 mr-1 shrink-0">{i + 1}.</span>
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <p className={`text-xs mt-2 ${
                  msg.role === 'user' ? 'text-white/60' : 'text-gray-400'
                }`}>
                  {msg.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex justify-start">
              <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
                <div className="flex items-center gap-2 text-gray-500">
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
            placeholder="输入您的分析需求，如：分析销售趋势、找出异常值..."
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
            className="bg-primary hover:bg-primary/90"
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
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
            <p className="font-medium">数据概况：</p>
            <p>文件: {data.fileName}</p>
            <p>行数: {data.rowCount.toLocaleString()} | 列数: {data.columnCount}</p>
            <p>字段: {data.headers.join(', ')}</p>
            {analysis.deepAnalysis && (
              <>
                <p className="font-medium mt-2">深度分析：</p>
                <p>健康评分: {analysis.deepAnalysis.healthScore.overall}/100</p>
                <p>关键发现: {analysis.deepAnalysis.keyFindings.length} 项</p>
                <p>数据画像: {analysis.deepAnalysis.dataProfile.dataType} / {analysis.deepAnalysis.dataProfile.suggestedIndustry}</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
