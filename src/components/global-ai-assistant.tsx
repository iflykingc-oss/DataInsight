'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  Minimize2,
  Lightbulb,
  Copy,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

// 对话消息
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  suggestions?: string[];
}

// 从AI回复中提取推荐追问
const extractSuggestions = (content: string): string[] => {
  const suggestions: string[] = [];
  const sectionMatch = content.match(/##\s*推荐追问\s*\n([\s\S]*?)$/);
  if (sectionMatch) {
    const lines = sectionMatch[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*\d+[.、）)]\s*(.+)/);
      if (match && suggestions.length < 3) {
        const q = match[1].trim().replace(/\*\*/g, '');
        if (q.length > 5) suggestions.push(q);
      }
    }
  }
  return suggestions;
};

interface GlobalAIAssistantProps {
  hasData?: boolean;
  rowCount?: number;
  data?: ParsedData;
  fieldStats?: FieldStat[];
}

export function GlobalAIAssistant({ hasData = false, rowCount, data, fieldStats }: GlobalAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: hasData
        ? `您好！我是 AI 数据助手，已加载 ${rowCount || ''}条数据。您可以问我任何关于数据的问题，比如趋势分析、异常检测、指标计算等。`
        : '您好！我是 AI 数据助手。上传数据后，我可以帮您进行深度分析、趋势预测和智能问答。有什么我可以帮您的吗？',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedContent, scrollToBottom]);

  // 真实LLM流式调用
  const callLLMStream = useCallback(async (userMessage: string) => {
    if (!data || !fieldStats) return null;

    const assistantId = `assistant-${Date.now()}`;
    const emptyMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, emptyMsg]);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/llm-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          data: { headers: data.headers, rows: data.rows.slice(0, 200), rowCount: data.rowCount, columnCount: data.columnCount },
          fieldStats: fieldStats.slice(0, 20),
          analysisMode: 'trend',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                fullContent += parsed.content;
                setStreamedContent(fullContent);
              }
            } catch {
              // 非JSON行，可能是原始文本
              fullContent += dataStr;
              setStreamedContent(fullContent);
            }
          } else if (line.trim() && !line.startsWith('event:') && !line.startsWith('id:') && !line.startsWith('retry:')) {
            // 非SSE格式，直接拼接
            fullContent += line;
            setStreamedContent(fullContent);
          }
        }
      }

      // 流式结束，更新消息
      const suggestions = extractSuggestions(fullContent);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: fullContent.replace(/##\s*推荐追问[\s\S]*$/, ''), isStreaming: false, suggestions }
          : m
      ));
      setStreamedContent('');

      return fullContent;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return null;
      console.error('LLM stream failed:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: '抱歉，AI 分析服务暂时不可用，请稍后再试。', isStreaming: false }
          : m
      ));
      setStreamedContent('');
      return null;
    }
  }, [data, fieldStats]);

  // 无数据时的模板回复
  const generateTemplateResponse = useCallback((userMessage: string): { content: string; suggestions: string[] } => {
    const lowerMsg = userMessage.toLowerCase();

    if (lowerMsg.includes('概览') || lowerMsg.includes('整体') || lowerMsg.includes('overview')) {
      return {
        content: `请先上传您的数据文件（Excel/CSV），我就能为您提供精准的数据概览分析。\n\n支持的分析能力：\n- 数据规模与完整性评估\n- 字段类型自动识别\n- 基础统计指标计算\n- 分布特征与异常检测`,
        suggestions: ['上传数据后查看概览', '支持哪些数据格式', '如何进行趋势分析']
      };
    }

    if (lowerMsg.includes('图') && (lowerMsg.includes('生成') || lowerMsg.includes('展示'))) {
      return {
        content: `上传数据后，我可以根据数据特征自动推荐最合适的图表类型。\n\n支持的图表类型：\n- 柱状图：对比分类数据\n- 折线图：展示趋势变化\n- 饼图：展示占比分布\n- 面积图：展示累积趋势\n- 雷达图：多维度对比`,
        suggestions: ['上传数据后推荐图表', '如何自定义图表配置']
      };
    }

    return {
      content: `您好！我是 AI 数据分析助手，上传数据后我可以帮您：\n\n1. **智能问答** - 自然语言查询数据\n2. **趋势分析** - 识别数据变化趋势\n3. **异常检测** - 发现异常值和离群点\n4. **图表推荐** - 自动推荐最佳可视化\n5. **数据清洗** - 空值/重复/异常值处理\n6. **报告生成** - 一键生成分析报告\n\n请上传 Excel 或 CSV 文件开始分析！`,
      suggestions: ['支持哪些数据格式', '如何进行深度分析', 'AI分析准确度如何']
    };
  }, []);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    if (hasData && data && fieldStats) {
      // 有数据时：调用真实LLM
      await callLLMStream(content);
    } else {
      // 无数据时：模板回复 + 模拟打字机
      const response = generateTemplateResponse(content);
      const fullContent = response.content;
      let currentIndex = 0;

      const typeInterval = setInterval(() => {
        if (currentIndex < fullContent.length) {
          setStreamedContent(fullContent.slice(0, currentIndex + 8));
          currentIndex += 8;
        } else {
          clearInterval(typeInterval);
          setStreamedContent('');

          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: fullContent,
            timestamp: new Date(),
            suggestions: response.suggestions,
          };
          setMessages(prev => [...prev, assistantMessage]);
        }
      }, 30);
    }

    setIsTyping(false);
  }, [hasData, data, fieldStats, callLLMStream, generateTemplateResponse]);

  // 复制消息
  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  return (
    <>
      {/* 悬浮按钮 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'w-14 h-14 rounded-full',
            'bg-gradient-to-r from-purple-500 to-pink-500',
            'shadow-lg shadow-purple-500/30',
            'flex items-center justify-center',
            'transition-all hover:scale-110 hover:shadow-xl',
            'group'
          )}
        >
          <Sparkles className="w-6 h-6 text-white" />
          <span className="absolute right-full mr-3 bg-gray-900 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            AI 助手
          </span>
        </button>
      )}

      {/* 聊天窗口 */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50',
            'bg-white rounded-2xl shadow-2xl',
            'transition-all duration-300',
            isMinimized
              ? 'w-80 h-14'
              : 'w-96 h-[600px] max-h-[80vh]'
          )}
          style={{ maxWidth: 'calc(100vw - 48px)' }}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-500 to-pink-500 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-medium text-white">AI 数据助手</h3>
                <p className="text-xs text-white/70">
                  {hasData ? `已加载 ${rowCount || 0} 条数据` : '上传数据后开启智能分析'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-white" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-white" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* 聊天内容 */}
          {!isMinimized && (
            <>
              <div ref={scrollRef} className="h-[calc(100%-140px)] overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[85%] rounded-2xl px-4 py-3',
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      )}
                    >
                      {/* 消息内容 */}
                      <div className="text-sm leading-relaxed">
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-sm prose-gray max-w-none
                            [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-3 [&_h1]:mb-1.5 [&_h1]:text-gray-900
                            [&_h2]:text-sm [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-gray-800
                            [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:text-gray-700
                            [&_p]:my-1 [&_p]:text-gray-700
                            [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc
                            [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal
                            [&_li]:my-0.5 [&_li]:text-gray-700
                            [&_strong]:text-gray-900 [&_strong]:font-semibold
                            [&_code]:bg-gray-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-blue-700
                            [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-2 [&_pre]:text-xs
                            [&_blockquote]:border-l-3 [&_blockquote]:border-blue-400 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-gray-600
                          ">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap text-white/90">{msg.content}</div>
                        )}
                      </div>

                      {/* 时间戳 */}
                      <div className={cn(
                        'flex items-center justify-between mt-2 pt-2 border-t',
                        msg.role === 'user' ? 'border-white/20' : 'border-gray-200'
                      )}>
                        <span className={cn(
                          'text-xs',
                          msg.role === 'user' ? 'text-white/60' : 'text-gray-400'
                        )}>
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => copyMessage(msg.content)}
                            className={cn(
                              'p-1 rounded hover:bg-black/10 transition-colors',
                              msg.role === 'user' ? 'text-white/60' : 'text-gray-400'
                            )}
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* 推荐追问 */}
                      {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && !msg.isStreaming && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <p className="text-xs font-medium mb-1.5 text-purple-500 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3" />
                            深度追问：
                          </p>
                          <div className="flex flex-col gap-1">
                            {msg.suggestions.slice(0, 3).map((s, i) => (
                              <button
                                key={i}
                                onClick={() => sendMessage(s)}
                                className="text-xs text-left py-1 px-2 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                              >
                                <span className="text-purple-400 mr-1">{i + 1}.</span>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* 流式内容 */}
                {streamedContent && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] bg-gray-100 text-gray-800 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="text-sm leading-relaxed prose prose-sm prose-gray max-w-none
                        [&_p]:my-1 [&_p]:text-gray-700
                        [&_strong]:text-gray-900 [&_strong]:font-semibold
                        [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc
                        [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal
                        [&_li]:my-0.5 [&_li]:text-gray-700
                      ">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamedContent.replace(/##\s*推荐追问[\s\S]*$/, '')}</ReactMarkdown>
                      </div>
                      <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5" />
                    </div>
                  </div>
                )}

                {/* 正在输入 */}
                {isTyping && !streamedContent && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 输入框 */}
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white rounded-b-2xl">
                <div className="flex gap-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={hasData ? "输入数据问题，如：各区域销售额对比..." : "输入您的问题..."}
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(inputValue);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={() => sendMessage(inputValue)}
                    disabled={!inputValue.trim() || isTyping}
                    className="shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>

                {/* 快捷问题 */}
                <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                  {(hasData
                    ? ['数据概览', '趋势分析', '异常检测', '深度解读']
                    : ['数据概览', '生成图表', '数据清洗', '生成报告']
                  ).map((q) => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-xs text-gray-500 hover:text-purple-600 whitespace-nowrap px-2 py-1 rounded-full bg-gray-100 hover:bg-purple-50 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
