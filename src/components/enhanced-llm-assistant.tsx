'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  Wand2,
  BarChart3,
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
  onDataFilter?: (filter: { field: string; operator: string; value: string }[]) => void;
  onChartSuggest?: (suggestion: { type: string; xField: string; yField: string }) => void;
}

const PRESET_QUERIES = [
  { icon: TrendingUp, label: '趋势分析', query: '请分析数据中的趋势变化，指出关键转折点和周期性规律' },
  { icon: Lightbulb, label: '深度洞察', query: '请从多个维度深度分析这份数据，找出隐藏的问题和机会' },
  { icon: Shield, label: '数据质量', query: '请评估数据质量，指出存在的问题和改进建议' },
  { icon: Target, label: '业务建议', query: '基于数据分析，给出具体的业务优化建议和行动方案' },
  { icon: AlertTriangle, label: '风险预警', query: '请识别数据中的风险因素和异常信号，给出预警建议' },
  { icon: Database, label: '数据画像', query: '请为这份数据生成完整的数据画像，包括行业特征和数据成熟度评估' },
];

export function EnhancedLLMAssistant({
  data,
  analysis,
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
        body: JSON.stringify({ data, analysis, question }),
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
  }, [data, analysis]);

  // 从响应中提取建议
  const extractSuggestions = (content: string): string[] => {
    const suggestions: string[] = [];
    const lines = content.split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*[-•*]\s*(.+)/);
      if (match && suggestions.length < 4) {
        suggestions.push(match[1].trim());
      }
    }
    return suggestions;
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

  const handleRetry = (content: string) => {
    callLLMInsight(content);
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
            <Brain className="w-5 h-5 text-purple-500" />
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
                  className="text-xs h-7 hover:bg-purple-50 hover:text-purple-700 hover:border-purple-200"
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

          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#1890ff] text-white'
                  : 'bg-gray-50 text-gray-800 border border-gray-100'
              }`}>
                {/* 消息内容 */}
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.content}
                  {msg.isStreaming && (
                    <span className="inline-block w-1.5 h-4 bg-[#1890ff] animate-pulse ml-0.5 align-middle" />
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
                      onClick={() => handleRetry(msg.content)}
                      className="text-xs h-6 px-2"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      重新生成
                    </Button>
                  </div>
                )}

                {/* 建议操作 */}
                {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs font-medium mb-2 text-gray-500">推荐追问：</p>
                    <div className="flex flex-wrap gap-1">
                      {msg.suggestions.slice(0, 3).map((s, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => handlePresetQuery(s)}
                          className="text-xs h-7"
                        >
                          {s.slice(0, 30)}{s.length > 30 ? '...' : ''}
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
            className="bg-[#1890ff] hover:bg-[#006bb3]"
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
