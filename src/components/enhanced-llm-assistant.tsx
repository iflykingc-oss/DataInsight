'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Brain,
  Send,
  Loader2,
  Sparkles,
  MessageSquare,
  Wand2,
  BarChart3,
  Table2,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Zap,
  PieChart
} from 'lucide-react';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface NL2SQLResult {
  sql: string;
  explanation: string;
  results?: Record<string, string | number>[];
  chartType?: 'bar' | 'line' | 'pie';
  error?: string;
  suggestions?: string[];
}

interface EnhancedLLMAssistantProps {
  data: ParsedData;
  analysis: DataAnalysis;
  onDataFilter?: (filter: { field: string; operator: string; value: any }[]) => void;
  onChartSuggest?: (suggestion: { type: string; xField: string; yField: string }) => void;
}

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
  const [nl2sqlResult, setNl2sqlResult] = useState<NL2SQLResult | null>(null);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // NL2SQL核心逻辑
  const processNaturalLanguage = async (query: string): Promise<NL2SQLResult> => {
    // 模拟NL2SQL处理
    const lowerQuery = query.toLowerCase();
    
    // 意图识别
    let intent = 'general';
    let sql = '';
    let explanation = '';
    let chartType: 'bar' | 'line' | 'pie' | undefined;
    const suggestions: string[] = [];
    
    // 过滤意图
    if (lowerQuery.includes('等于') || lowerQuery.includes('是') || lowerQuery.includes('where')) {
      intent = 'filter';
      const field = data.headers[0];
      const value = query.match(/[是|等于](.+)/)?.[1]?.trim() || '';
      sql = `SELECT * FROM data WHERE ${field} = '${value}'`;
      explanation = `根据您的要求，筛选 ${field} 等于 "${value}" 的数据`;
      chartType = 'bar';
    }
    
    // 聚合意图
    else if (lowerQuery.includes('总计') || lowerQuery.includes('求和') || lowerQuery.includes('sum')) {
      intent = 'aggregate';
      const field = data.headers[1];
      sql = `SELECT SUM(${field}) as total FROM data`;
      explanation = `计算 ${field} 字段的总和`;
      chartType = 'bar';
      suggestions.push('查看详细数据', '按类别分组统计');
    }
    
    // 排序意图
    else if (lowerQuery.includes('排序') || lowerQuery.includes('最大') || lowerQuery.includes('最小') || lowerQuery.includes('top')) {
      intent = 'sort';
      const field = data.headers.find(h => analysis.fieldStats.find(f => f.field === h && f.type === 'number')) || data.headers[1];
      const isDesc = lowerQuery.includes('最大') || lowerQuery.includes('高');
      sql = `SELECT * FROM data ORDER BY ${field} ${isDesc ? 'DESC' : 'ASC'} LIMIT 10`;
      explanation = `按 ${field} ${isDesc ? '降序' : '升序'} 排列，取前10条`;
      chartType = 'bar';
    }
    
    // 统计意图
    else if (lowerQuery.includes('平均') || lowerQuery.includes('均值') || lowerQuery.includes('avg')) {
      intent = 'average';
      const field = data.headers.find(h => analysis.fieldStats.find(f => f.field === h && f.type === 'number')) || data.headers[1];
      sql = `SELECT AVG(${field}) as average FROM data`;
      explanation = `计算 ${field} 字段的平均值`;
      chartType = 'bar';
    }
    
    // 计数意图
    else if (lowerQuery.includes('多少') || lowerQuery.includes('计数') || lowerQuery.includes('count')) {
      intent = 'count';
      sql = `SELECT COUNT(*) as total FROM data`;
      explanation = `数据表共有 ${data.rowCount} 条记录`;
      chartType = 'bar';
    }
    
    // 趋势分析意图
    else if (lowerQuery.includes('趋势') || lowerQuery.includes('变化') || lowerQuery.includes('增长')) {
      intent = 'trend';
      const field = data.headers.find(h => analysis.fieldStats.find(f => f.field === h && f.type === 'number')) || data.headers[1];
      sql = `SELECT ${data.headers[0]} as x, ${field} as y FROM data ORDER BY ${data.headers[0]}`;
      explanation = `分析 ${field} 随时间的变化趋势`;
      chartType = 'line';
    }
    
    // 占比分析意图
    else if (lowerQuery.includes('占比') || lowerQuery.includes('比例') || lowerQuery.includes('百分比')) {
      intent = 'proportion';
      const field = data.headers[0];
      const valueField = data.headers.find(h => analysis.fieldStats.find(f => f.field === h && f.type === 'number')) || data.headers[1];
      sql = `SELECT ${field} as name, SUM(${valueField}) as value FROM data GROUP BY ${field}`;
      explanation = `展示各类别的占比情况`;
      chartType = 'pie';
    }
    
    // 异常检测意图
    else if (lowerQuery.includes('异常') || lowerQuery.includes('异常值') || lowerQuery.includes('离群')) {
      intent = 'anomaly';
      const field = data.headers.find(h => analysis.fieldStats.find(f => f.field === h && f.type === 'number')) || data.headers[1];
      const stat = analysis.fieldStats.find(f => f.field === field);
      const mean = stat?.numericStats?.mean || 0;
      const std = calculateStdDev(data.rows.map(r => Number(r[field])).filter(v => !isNaN(v)), mean);
      sql = `SELECT * FROM data WHERE ${field} < ${mean - 3 * std} OR ${field} > ${mean + 3 * std}`;
      explanation = `使用3σ原则检测 ${field} 字段的异常值`;
      chartType = 'line';
    }
    
    // 比较意图
    else if (lowerQuery.includes('比较') || lowerQuery.includes('对比')) {
      intent = 'compare';
      const field = data.headers.find(h => analysis.fieldStats.find(f => f.field === h && f.type === 'number')) || data.headers[1];
      sql = `SELECT ${data.headers[0]} as name, ${field} as value FROM data`;
      explanation = `对比各类别的 ${field} 数值`;
      chartType = 'bar';
    }
    
    // 默认通用分析
    else {
      intent = 'general';
      const field = data.headers.find(h => analysis.fieldStats.find(f => f.field === h && f.type === 'number')) || data.headers[1];
      sql = `SELECT ${data.headers[0]} as name, ${field} as value FROM data GROUP BY ${data.headers[0]}`;
      explanation = `根据您的分析需求生成的查询结果`;
      chartType = 'bar';
    }
    
    // 生成建议
    if (intent === 'general') {
      suggestions.push(
        '查看数据趋势',
        '分析占比分布',
        '检测异常值',
        '对比不同类别'
      );
    }
    
    return {
      sql,
      explanation,
      chartType,
      suggestions: suggestions.slice(0, 3)
    };
  };
  
  // 计算标准差
  const calculateStdDev = (values: number[], mean: number): number => {
    if (values.length === 0) return 0;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  };
  
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // 调用NL2SQL处理
      const result = await processNaturalLanguage(input.trim());
      setNl2sqlResult(result);
      
      // 模拟流式响应
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        suggestions: result.suggestions
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // 模拟打字机效果
      const fullResponse = `${result.explanation}\n\n${result.suggestions?.map(s => `💡 ${s}`).join('\n') || ''}`;
      for (let i = 0; i < fullResponse.length; i += 3) {
        await new Promise(resolve => setTimeout(resolve, 10));
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg?.role === 'assistant') {
            lastMsg.content = fullResponse.substring(0, i + 3);
          }
          return newMessages;
        });
      }
      
      // 如果有图表建议，传递给父组件
      if (result.chartType && onChartSuggest) {
        const numericField = data.headers.find(h => 
          analysis.fieldStats.find(f => f.field === h && f.type === 'number')
        ) || data.headers[1];
        onChartSuggest({
          type: result.chartType,
          xField: data.headers[0],
          yField: numericField
        });
      }
      
    } catch (error) {
      console.error('NL2SQL处理错误:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '抱歉，处理您的请求时出现错误，请稍后重试。',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const quickActions = [
    { icon: TrendingUp, label: '分析趋势', query: '分析数据趋势' },
    { icon: PieChart, label: '占比分析', query: '各类别占比' },
    { icon: AlertTriangle, label: '异常检测', query: '找出异常值' },
    { icon: BarChart3, label: '排序对比', query: '按数值排序' },
    { icon: Lightbulb, label: '数据洞察', query: '给出数据洞察' },
    { icon: Zap, label: '自动分析', query: '自动分析并给出建议' },
  ];
  
  const copySql = () => {
    if (nl2sqlResult?.sql) {
      navigator.clipboard.writeText(nl2sqlResult.sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-500" />
          AI 数据分析助手
          <Badge variant="secondary" className="ml-auto text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            NL2SQL
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* 快捷操作 */}
        <div className="mb-4">
          <p className="text-xs text-gray-500 mb-2">快捷操作</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, i) => {
              const Icon = action.icon;
              return (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setInput(action.query)}
                  className="text-xs h-8"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
        
        {/* 消息列表 */}
        <ScrollArea ref={scrollRef} className="flex-1 mb-4 pr-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Brain className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-2">
                  我可以帮您完成以下分析：
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {quickActions.map((action, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setInput(action.query);
                        handleSend();
                      }}
                      className="text-xs"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] rounded-lg px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.role === 'system'
                    ? 'bg-amber-50 text-amber-800 border border-amber-200'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.suggestions && msg.suggestions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-xs font-medium mb-2">推荐操作：</p>
                      <div className="flex flex-wrap gap-1">
                        {msg.suggestions.map((s, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setInput(s);
                              handleSend();
                            }}
                            className="text-xs h-7"
                          >
                            {s}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className={`text-xs mt-1 ${
                    msg.role === 'user' ? 'text-primary-foreground/70' : 'text-gray-500'
                  }`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">分析中...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {/* SQL结果 */}
        {nl2sqlResult && (
          <div className="mb-4 p-3 bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">Generated SQL</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={copySql}
                className="h-6 text-gray-400 hover:text-white"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
            </div>
            <pre className="text-xs text-green-400 overflow-x-auto">
              {nl2sqlResult.sql}
            </pre>
          </div>
        )}
        
        {/* 输入框 */}
        <div className="flex gap-2">
          <Input
            placeholder="用自然语言描述您的分析需求..."
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
        
        {/* 数据上下文提示 */}
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
            <p>• 文件：{data.fileName}</p>
            <p>• 行数：{data.rowCount.toLocaleString()}</p>
            <p>• 列数：{data.columnCount}</p>
            <p>• 字段：{data.headers.join(', ')}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
