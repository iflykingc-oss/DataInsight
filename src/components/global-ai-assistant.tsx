'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
// Card components removed - using ReactMarkdown directly
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sparkles,
  Send,
  
  X,
  Maximize2,
  Minimize2,
  MessageSquare,
  BarChart3,
  PieChart,
  TrendingUp,
  Filter,
  Calculator,
  FileText,
  Zap,
  RefreshCw,
  ChevronDown,
  Settings,
  Copy,
  ThumbsUp,
  ThumbsDown,
  HelpCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// 对话消息
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  actions?: QuickAction[];
  isStreaming?: boolean;
}

// 快捷操作
interface QuickAction {
  label: string;
  icon: React.ElementType;
  prompt: string;
  category: 'analysis' | 'chart' | 'clean' | 'report';
}

// 全局快捷操作
const GLOBAL_QUICK_ACTIONS: QuickAction[] = [
  // 分析类
  { label: '数据概览', icon: BarChart3, prompt: '给我数据的整体概览', category: 'analysis' },
  { label: '趋势分析', icon: TrendingUp, prompt: '分析数据趋势变化', category: 'analysis' },
  { label: '异常检测', icon: Zap, prompt: '找出数据中的异常值', category: 'analysis' },
  { label: '数据解读', icon: HelpCircle, prompt: '详细解读这份数据', category: 'analysis' },
  
  // 图表类
  { label: '生成柱状图', icon: BarChart3, prompt: '生成一个柱状图展示', category: 'chart' },
  { label: '生成饼图', icon: PieChart, prompt: '生成一个饼图展示占比', category: 'chart' },
  { label: '生成折线图', icon: TrendingUp, prompt: '生成一个折线图展示趋势', category: 'chart' },
  
  // 清洗类
  { label: '清洗空值', icon: Filter, prompt: '帮我处理数据中的空值', category: 'clean' },
  { label: '去除重复', icon: RefreshCw, prompt: '去除重复的数据', category: 'clean' },
  
  // 报表类
  { label: '生成报告', icon: FileText, prompt: '生成一份数据报告', category: 'report' },
  { label: '计算统计', icon: Calculator, prompt: '计算一些统计指标', category: 'report' },
];

// AI 响应生成器
const generateAIResponse = (userMessage: string, context?: { hasData: boolean; rowCount?: number }): { content: string; actions?: QuickAction[] } => {
  const lowerMsg = userMessage.toLowerCase();
  
  // 数据概览
  if (lowerMsg.includes('概览') || lowerMsg.includes('整体') || lowerMsg.includes('overview')) {
    if (context?.hasData) {
      return {
        content: `根据您的数据（共 ${context.rowCount} 条记录），我给出以下分析：

📊 **数据规模**
- 记录数：${context.rowCount} 条
- 字段数：需要进一步扫描
- 数据完整性：良好

💡 **初步洞察**
- 数据量适中，适合进行多维度分析
- 建议先查看字段类型分布
- 可以尝试生成可视化图表

🎯 **推荐操作**
您可以：
1. 让我生成详细的数据解读
2. 创建可视化图表
3. 进行数据清洗
4. 生成分析报告`,
        actions: [
          { label: '详细解读', icon: HelpCircle, prompt: '详细解读这份数据', category: 'analysis' },
          { label: '生成图表', icon: BarChart3, prompt: '生成可视化图表', category: 'chart' },
        ]
      };
    }
    return {
      content: `您好！我是您的 AI 数据助手。

📋 **我能帮您做什么：**

**数据分析**
- 数据概览与统计
- 趋势分析与预测
- 异常值检测

**可视化**
- 智能图表推荐
- 自定义图表生成

**数据处理**
- 智能数据清洗
- 空值处理建议

**报表生成**
- 自动生成分析报告
- 关键指标汇总

请先上传您的数据文件（Excel/CSV），然后我就能为您提供更精准的分析！`,
      actions: GLOBAL_QUICK_ACTIONS.slice(0, 4)
    };
  }
  
  // 图表请求
  if (lowerMsg.includes('图') && (lowerMsg.includes('生成') || lowerMsg.includes('展示') || lowerMsg.includes('画'))) {
    if (!context?.hasData) {
      return {
        content: `我需要先了解您的数据才能生成合适的图表。

请上传 Excel 或 CSV 文件，然后告诉我您想生成什么类型的图表：

📈 **支持的图表类型：**
- 柱状图：比较分类数据
- 折线图：展示趋势变化
- 饼图：展示占比分布
- 散点图：分析相关性
- 组合图：多维度展示`,
        actions: GLOBAL_QUICK_ACTIONS.filter(a => a.category === 'chart')
      };
    }
    
    let chartType = '柱状图';
    if (lowerMsg.includes('饼')) chartType = '饼图';
    else if (lowerMsg.includes('折线') || lowerMsg.includes('趋势')) chartType = '折线图';
    else if (lowerMsg.includes('散点')) chartType = '散点图';
    
    return {
      content: `好的，我来帮您生成 ${chartType}！

🎨 **${chartType}配置建议：**
- X轴：选择分类字段（如时间、地区）
- Y轴：选择数值字段（如销售额、数量）

请告诉我：
1. 您想用什么字段作为 X 轴？
2. 您想用什么字段作为 Y 轴？

或者我可以根据您的数据自动推荐最合适的图表！`,
      actions: [
        { label: '自动推荐', icon: Zap, prompt: '根据数据自动推荐图表', category: 'chart' },
      ]
    };
  }
  
  // 清洗请求
  if (lowerMsg.includes('清洗') || lowerMsg.includes('处理') || lowerMsg.includes('清理')) {
    if (!context?.hasData) {
      return {
        content: `数据清洗需要先有数据哦！

🧹 **我可以帮您处理：**
- 删除空白行
- 去除重复数据
- 填补空值（均值/中位数/众数）
- 统一日期格式
- 清除多余空格
- 类型转换

请上传数据后告诉我您想要进行的清洗操作！`,
        actions: GLOBAL_QUICK_ACTIONS.filter(a => a.category === 'clean')
      };
    }
    
    return {
      content: `好的，让我分析一下数据质量问题：

🔍 **初步检测：**
- 空值数量：需要扫描
- 重复行：需要检测
- 格式问题：需要检查

🧹 **推荐清洗操作：**
1. 首先去除完全重复的行
2. 然后处理空值
3. 最后统一格式

您想让我：
- 自动执行完整清洗？
- 逐项进行处理？
- 还是指定特定的清洗规则？`,
      actions: [
        { label: '自动清洗', icon: Zap, prompt: '自动清洗数据', category: 'clean' },
        { label: '去重', icon: RefreshCw, prompt: '去除重复数据', category: 'clean' },
      ]
    };
  }
  
  // 报告请求
  if (lowerMsg.includes('报告') || lowerMsg.includes('报表') || lowerMsg.includes('汇总')) {
    if (!context?.hasData) {
      return {
        content: `生成报告需要先有数据！

📄 **我可以帮您生成：**
- 数据概览报告
- 统计分析报告
- 趋势分析报告
- 业务汇总报告

支持导出为：
- PDF 格式
- Excel 格式
- 图片格式

请上传数据后告诉我您需要什么类型的报告！`,
        actions: [
          { label: '生成报告', icon: FileText, prompt: '生成数据报告', category: 'report' },
        ]
      };
    }
    
    return {
      content: `好的，我来帮您生成数据报告！

📊 **报告结构预览：**
1. **数据概览**
   - 数据规模、字段说明
   
2. **统计分析**
   - 关键指标汇总
   - 数值分布情况
   
3. **趋势分析**
   - 时间维度变化
   - 同比环比分析
   
4. **数据洞察**
   - AI 智能发现
   - 业务建议

📥 **输出格式：**
- 支持 PDF/Excel/图片
- 可以添加水印
- 自定义报告模板

您想要什么格式的报告？`,
      actions: [
        { label: '生成PDF', icon: FileText, prompt: '生成PDF报告', category: 'report' },
        { label: '生成Excel', icon: FileText, prompt: '生成Excel报告', category: 'report' },
      ]
    };
  }
  
  // 默认响应
  return {
    content: `我理解了您的需求！

🤖 **您可以这样问我：**

**数据分析**
- "分析这份数据的趋势"
- "找出异常值"
- "统计各字段的分布"

**图表生成**
- "生成柱状图"
- "画一个饼图展示占比"
- "做趋势折线图"

**数据处理**
- "清洗数据"
- "去除重复"
- "填补空值"

**报告生成**
- "生成分析报告"
- "导出数据汇总"

或者直接告诉我您想做什么，我会帮您分析！`,
    actions: GLOBAL_QUICK_ACTIONS.slice(0, 4)
  };
};

interface GlobalAIAssistantProps {
  hasData?: boolean;
  rowCount?: number;
  onQuickAction?: (action: QuickAction) => void;
}

export function GlobalAIAssistant({ hasData = false, rowCount, onQuickAction }: GlobalAIAssistantProps) {
  // 状态
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '您好！我是 AI 数据助手，可以帮您完成数据分析、图表生成、数据清洗等操作。有什么我可以帮您的吗？',
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamedContent, scrollToBottom]);

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setStreamedContent('');
    
    // 模拟流式响应
    const response = generateAIResponse(content, { hasData, rowCount });
    
    // 模拟打字机效果
    const fullContent = response.content;
    let currentIndex = 0;
    
    const typeInterval = setInterval(() => {
      if (currentIndex < fullContent.length) {
        setStreamedContent(fullContent.slice(0, currentIndex + 10));
        currentIndex += 10;
      } else {
        clearInterval(typeInterval);
        setStreamedContent('');
        setIsTyping(false);
        
        // 添加完整助手消息
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: fullContent,
          timestamp: new Date(),
          actions: response.actions,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    }, 30);
    
  }, [hasData, rowCount]);

  // 执行快捷操作
  const executeQuickAction = useCallback((action: QuickAction) => {
    sendMessage(action.prompt);
  }, [sendMessage]);

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
          {/* 消息提示 */}
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center animate-pulse">
            1
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
                <p className="text-xs text-white/70">随时为您提供帮助</p>
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
                            [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:text-blue-700
                            [&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:my-2 [&_pre]:text-xs
                            [&_blockquote]:border-l-3 [&_blockquote]:border-blue-400 [&_blockquote]:pl-3 [&_blockquote]:my-2 [&_blockquote]:text-gray-600
                          ">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap text-white/80">{msg.content}</div>
                        )}
                      </div>
                      
                      {/* 时间戳和操作 */}
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
                      
                      {/* 快捷操作 */}
                      {msg.actions && msg.actions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {msg.actions.slice(0, 4).map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => executeQuickAction(action)}
                              className={cn(
                                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs',
                                'transition-colors',
                                msg.role === 'user' 
                                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                                  : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
                              )}
                            >
                              <action.icon className="w-3 h-3" />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {/* 正在输入 */}
                {isTyping && (
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
                    placeholder="输入您的问题..."
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
                  {['数据概览', '生成图表', '数据清洗', '生成报告'].map((q) => (
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
