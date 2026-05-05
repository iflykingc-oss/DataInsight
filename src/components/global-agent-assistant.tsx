'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Brain,
  MapPin,
  Maximize2,
  Minimize2,
  X,
  AlertTriangle,
  Compass,
  Copy,
  Lightbulb,
  ArrowRight,
  Loader2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn, generateId } from '@/lib/utils';
import { callLLMStream, LLMModelConfig } from '@/lib/llm';
import { classifyAndRoute } from '@/lib/agent/core/intent-router';
import { FieldStat, ParsedData } from '@/lib/data-processor';
import { createOrchestrator, ExecutionPlan } from '@/lib/orchestrator-agent';

// ========================================
// 类型定义
// ========================================

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  metadata?: {
    type?: 'intent' | 'plan' | 'skill-result' | 'workflow-result' | 'error' | 'route';
    intent?: { scene: string; confidence: number; matchedKeywords: string[] };
    plan?: { steps: { stepId: string; description: string; skillId?: string; status: string }[]; estimatedComplexity: string };
    skills?: { id: string; name: string }[];
    workflow?: { id: string; name: string };
  };
};

interface GlobalAgentAssistantProps {
  mode?: 'floating' | 'embedded';
  hasData?: boolean;
  rowCount?: number;
  data?: ParsedData;
  fieldStats?: FieldStat[];
  modelConfig?: LLMModelConfig;
  currentView?: string;
  onAction?: (action: string, params?: Record<string, unknown>) => void;
  className?: string;
}

// ========================================
// 场景导航映射
// ========================================

const SCENE_ROUTE_MAP: Record<string, { view: string; label: string }> = {
  'table-generate': { view: 'ai-table-builder', label: 'AI建表' },
  'data-clean': { view: 'data-cleaner', label: '数据清洗' },
  'data-analyze': { view: 'data-insights', label: '智能洞察' },
  'visualize': { view: 'dashboard', label: '仪表盘' },
  'metrics': { view: 'metric-manager', label: '指标管理' },
  'formula': { view: 'ai-formula', label: 'AI公式' },
  'chart': { view: 'smart-chart', label: '图表中心' },
  'ai-chat': { view: 'chat', label: 'AI问数' },
  'sql': { view: 'sql-lab', label: 'SQL查询' },
  'report': { view: 'report', label: '报表导出' },
  'form': { view: 'form-builder', label: '表单收集' },
  'workflow': { view: 'workflow', label: '自动化' },
};

const SCENE_LABELS: Record<string, string> = {
  'table-generate': '表格生成',
  'data-clean': '数据清洗',
  'data-analyze': '数据分析',
  'visualize': '可视化',
  'metrics': '指标体系',
  'formula': '公式生成',
  'chart': '图表中心',
  'ai-chat': 'AI问数',
  'sql': 'SQL查询',
  'report': '报表导出',
  'form': '表单收集',
  'workflow': '自动化',
  'unknown': '通用对话',
};

// ========================================
// 欢迎消息
// ========================================

function getWelcomeMessage(hasData: boolean): { content: string; suggestions: string[] } {
  if (hasData) {
    return {
      content: '**你好！我是 DataInsight 智能助手。**\n\n我已经检测到您已上传数据，可以帮您：\n\n- 分析数据特征和洞察\n- 生成可视化图表和仪表盘\n- 清洗和转换数据\n- 创建数据报表\n- 执行SQL查询\n\n请告诉我您想做什么？',
      suggestions: ['分析数据洞察', '生成仪表盘', '数据清洗', '创建报表'],
    };
  }
  return {
    content: '**你好！我是 DataInsight 智能助手。**\n\n我可以帮您：\n\n- AI智能建表（场景模板+对话生成）\n- 上传并分析数据文件\n- 执行SQL查询\n- 生成数据报表\n- 创建表单收集数据\n\n请先上传数据或选择「AI建表」开始！',
    suggestions: ['AI建表', '上传数据文件', 'SQL查询', '表单收集'],
  };
}

// ========================================
// 主组件
// ========================================

export function GlobalAgentAssistant({
  mode = 'floating',
  hasData = false,
  rowCount,
  data,
  fieldStats,
  modelConfig,
  currentView,
  onAction,
  className,
}: GlobalAgentAssistantProps) {
  // -- 会话状态 --
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const welcome = getWelcomeMessage(hasData);
    return [{
      id: generateId('msg'),
      role: 'assistant',
      content: welcome.content,
      timestamp: new Date(),
      suggestions: welcome.suggestions,
    }];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(mode === 'embedded');
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // -- 自动滚动 --
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingId]);

  // -- 全局快捷键 --
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mode === 'floating') setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  // -- 流式响应处理 --
  const processStreamResponse = useCallback(async (
    stream: ReadableStream<Uint8Array>,
    assistantId: string
  ) => {
    let fullContent = '';
    try {
      const reader = stream.getReader();
      const decoder = new TextDecoder();
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
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantId
                      ? { ...m, content: fullContent }
                      : m
                  )
                );
              }
            } catch { /* ignore parse error */ }
          }
        }
      }
      reader.releaseLock();
    } catch {
      fullContent += '\n\n[流式输出中断]';
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId ? { ...m, content: fullContent } : m
        )
      );
    } finally {
      setStreamingId(null);
    }
  }, []);

  // -- 发送消息 --
  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: generateId('msg'),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const assistantId = generateId('msg');
    setStreamingId(assistantId);
    setMessages(prev => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      },
    ]);

    try {
      // === 全局调度智能体（确定性规则优先）===
      const orchestrator = createOrchestrator({
        currentView: currentView || 'home',
        hasData: hasData,
        dataInfo: data ? { fileName: data.fileName || '', rowCount: data.rowCount || 0, columnCount: data.columnCount || 0 } : undefined,
        isLoggedIn: true,
      });

      const plan = orchestrator.parseRequest(text);

      // 如果有建议操作，直接展示调度结果
      if (plan.suggestedActions.length > 0) {
        const actionMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: plan.response,
          timestamp: new Date(),
          suggestions: plan.suggestedActions.map(a => a.label),
          metadata: {
            type: plan.isComposite ? 'plan' : 'route',
            plan: plan.isComposite ? {
              steps: plan.subTasks.map(t => ({
                stepId: t.id,
                description: t.description,
                status: 'pending',
              })),
              estimatedComplexity: plan.subTasks.length > 2 ? 'high' : 'low',
            } : undefined,
          },
        };
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== assistantId);
          return [...filtered, actionMsg];
        });

        // 自动执行导航类操作
        const navigateAction = plan.suggestedActions.find(a => a.action === 'navigate');
        if (navigateAction && navigateAction.params?.view && onAction) {
          setTimeout(() => {
            onAction('navigate', { view: navigateAction.params!.view });
          }, 500);
        }

        setLoading(false);
        setStreamingId(null);
        return;
      }

      // === 兜底：原有LLM流程 ===
      // 1. 意图识别（规则+轻量LLM）
      const intent = await classifyAndRoute(
        text,
        {
          id: generateId('sess'),
          scene: currentView || '',
          messages: [],
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
          modelConfig: modelConfig ?? undefined,
        } as import('@/lib/agent/core/types').AgentContext
      );

      // 2. 如果意图置信度高且对应场景有导航映射，给出路由建议
      if (intent.confidence >= 0.6 && SCENE_ROUTE_MAP[intent.sceneId]) {
        const route = SCENE_ROUTE_MAP[intent.sceneId];
        const routeMsg: ChatMessage = {
          id: generateId('msg'),
          role: 'assistant',
          content: `我识别到您的需求属于 **${SCENE_LABELS[intent.sceneId] || intent.sceneId}** 场景。\n\n建议您切换到「${route.label}」页面以获得更好的体验。是否立即跳转？`,
          timestamp: new Date(),
          metadata: {
            type: 'route',
            intent: {
              scene: intent.sceneId,
              confidence: intent.confidence,
              matchedKeywords: intent.matchedKeywords || [],
            },
          },
          suggestions: [`跳转到${route.label}`, '继续在这里对话'],
        };
        setMessages(prev => {
          const filtered = prev.filter(m => m.id !== assistantId);
          return [...filtered, routeMsg];
        });
        setLoading(false);
        setStreamingId(null);
        return;
      }

      // 3. 产品答疑/功能引导：直接走规则+LLM兜底
      if (intent.sceneId === 'unknown' || intent.confidence < 0.4) {
        const stream = await callLLMStream(
          modelConfig || { apiKey: '', baseUrl: '', model: '' },
          [
            {
              role: 'system',
              content: `你是 DataInsight 平台的智能助手。用户数据仅存在于当前页面内存，不做任何持久化存储。

平台功能：
- 数据表格：上传Excel/CSV，AI字段、AI公式、关联表、自动化、评论
- 智能洞察：7大分析模块、深度数据报告
- 可视化：交互式仪表盘、AI生成、设计器
- 指标体系：18个预置指标、AI指标生成
- 图表中心：10种ECharts高级图表
- AI问数：自然语言数据查询
- AI多模态：生图、图转文、文转图、图转表
- 表单收集：15种字段、二维码、主题、规则
- SQL查询：浏览器端SQLite
- 报表导出：多模板、导出、分享

请简洁回答用户问题，不要编造功能。`,
            },
            ...messages.slice(-6).map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            { role: 'user', content: text },
          ]
        );
        await processStreamResponse(stream, assistantId);
        setLoading(false);
        return;
      }

      // 4. 场景内智能体调度（模型主导回答）
      const sceneLabel = SCENE_LABELS[intent.sceneId] || intent.sceneId;
      const contextData = data
        ? { headers: data.headers, rows: data.rows.slice(0, 5) }
        : undefined;

      const stream = await callLLMStream(
        modelConfig || { apiKey: '', baseUrl: '', model: '' },
        [
          {
            role: 'system',
            content: `你是 DataInsight 平台的 **${sceneLabel}** 场景智能助手。

当前场景能力：
- 可调用本场景绑定的原子技能
- 可推荐预制工作流
- 可引导用户到对应Tab执行操作

规则：
1. 不跨场景回答，超出当前场景范围时礼貌引导用户到对应功能Tab
2. 数据仅存在于页面内存，不做持久化
3. 回答简洁、结构化、可操作`,
          },
          {
            role: 'system',
            content: `当前数据概览：${contextData ? `\n- 字段：${contextData.headers.join(', ')}\n- 样本行数：${contextData.rows.length}` : '无数据'}`,
          },
          ...messages.slice(-6).map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
          { role: 'user', content: text },
        ]
      );
      await processStreamResponse(stream, assistantId);
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  '抱歉，智能助手暂时无法处理您的请求。您可以：\n\n1. 检查AI模型配置（设置 → AI模型）\n2. 尝试简化问题描述\n3. 直接切换到对应功能Tab操作',
                metadata: { type: 'error' },
              }
            : m
        )
      );
    } finally {
      setLoading(false);
      setStreamingId(null);
    }
  }, [input, loading, messages, modelConfig, data, currentView, hasData, onAction, processStreamResponse]);

  // -- 快捷操作 --
  const handleQuickAction = useCallback((action: string) => {
    if (action.startsWith('跳转到')) {
      const scene = Object.entries(SCENE_ROUTE_MAP).find(
        ([, v]) => action.includes(v.label)
      )?.[0];
      if (scene && onAction) {
        onAction('navigate', { view: SCENE_ROUTE_MAP[scene].view });
      }
      return;
    }

    const lower = action.toLowerCase();
    const navMap: Record<string, string> = {
      'ai建表': 'ai-table-builder',
      '上传数据': 'upload',
      '上传数据文件': 'upload',
      'sql查询': 'sql-lab',
      '表单收集': 'form-builder',
      '分析数据洞察': 'data-insights',
      '生成仪表盘': 'dashboard',
      '数据清洗': 'data-cleaner',
      '创建报表': 'report',
      '去上传': 'home',
      '去上传数据': 'home',
      '浏览模板': 'ai-table-builder',
      '打开设置': 'settings',
      '开始清洗': 'data-prep',
      '开始分析': 'insights',
      '生成图表': 'visualization',
      '生成报告': 'report-export',
    };
    if (navMap[lower] && onAction) {
      onAction('navigate', { view: navMap[lower] });
      return;
    }

    setInput(action);
  }, [onAction]);

  // -- 复制消息 --
  const copyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(() => {});
  }, []);

  // -- 渲染：悬浮模式 --
  if (mode === 'floating') {
    const positionClasses =
      position === 'bottom-right'
        ? 'right-4 bottom-4'
        : 'left-4 bottom-4';

    return (
      <>
        {/* 悬浮按钮 */}
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className={cn(
              'fixed z-50 flex items-center gap-2 rounded-full px-4 py-3 text-white shadow-lg',
              'bg-gradient-to-r from-primary to-primary/80 hover:shadow-xl',
              'transition-all duration-200',
              positionClasses
            )}
          >
            <Brain className="h-5 w-5" />
            <span className="text-sm font-medium">智能助手</span>
          </button>
        )}

        {/* 对话面板 */}
        {isOpen && (
          <div
            ref={containerRef}
            className={cn(
              'fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200',
              isMinimized ? 'h-14 w-80' : 'h-[600px] w-[420px]',
              positionClasses
            )}
          >
              {/* 标题栏 */}
              <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <span className="text-sm font-semibold">DataInsight 智能助手</span>
                  {hasData && (
                    <Badge variant="secondary" className="text-xs">
                      {rowCount}行
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPosition(p => p === 'bottom-right' ? 'bottom-left' : 'bottom-right')}
                    className="rounded p-1 hover:bg-muted"
                    title="切换位置"
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setIsMinimized(m => !m)}
                    className="rounded p-1 hover:bg-muted"
                    title={isMinimized ? '展开' : '最小化'}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="rounded p-1 hover:bg-muted"
                    title="关闭"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 消息列表 */}
              {!isMinimized && (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isStreaming={streamingId === msg.id}
                        onCopy={() => copyMessage(msg.content)}
                        onQuickAction={handleQuickAction}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* 输入框 */}
                  <div className="border-t border-border p-3">
                    <div className="flex items-end gap-2">
                      <Input
                        value={input}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
                        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                        placeholder="输入问题或指令..."
                        className="flex-1"
                        disabled={loading}
                      />
                      <Button
                        onClick={handleSend}
                        disabled={loading || !input.trim()}
                        size="icon"
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              )}
          </div>
        )}
      </>
    );
  }

  // -- 渲染：内嵌模式 --
  return (
    <div className={cn('flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card', className)}>
      <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">AI 问数</span>
          {hasData && (
            <Badge variant="secondary" className="text-xs">
              {rowCount}行
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isStreaming={streamingId === msg.id}
            onCopy={() => copyMessage(msg.content)}
            onQuickAction={handleQuickAction}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <Input
            value={input}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="输入问题或指令..."
            className="flex-1"
            disabled={loading}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            size="icon"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// 消息气泡子组件
// ========================================

function MessageBubble({
  msg,
  isStreaming,
  onCopy,
  onQuickAction,
}: {
  msg: ChatMessage;
  isStreaming: boolean;
  onCopy: () => void;
  onQuickAction: (action: string) => void;
}) {
  const isUser = msg.role === 'user';

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {/* 元数据展示 */}
        {msg.metadata?.type === 'route' && msg.metadata.intent && (
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Compass className="h-3 w-3" />
            <span>识别到场景：{SCENE_LABELS[msg.metadata.intent.scene] || msg.metadata.intent.scene}</span>
            <Badge variant="outline" className="text-[10px]">
              置信度 {Math.round(msg.metadata.intent.confidence * 100)}%
            </Badge>
          </div>
        )}

        {msg.metadata?.type === 'error' && (
          <div className="mb-2 flex items-center gap-2 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            <span>请求失败</span>
          </div>
        )}

        {/* 内容 */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {msg.content || (isStreaming ? '思考中...' : '')}
          </ReactMarkdown>
        </div>

        {/* 流式指示器 */}
        {isStreaming && (
          <div className="mt-2 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:200ms]" />
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-primary [animation-delay:400ms]" />
          </div>
        )}

        {/* 建议操作 */}
        {msg.suggestions && msg.suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {msg.suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => onQuickAction(suggestion)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted transition-colors"
              >
                <Lightbulb className="h-3 w-3 text-primary" />
                {suggestion}
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* 操作栏 */}
        {!isUser && msg.content && (
          <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onCopy}
              className="rounded p-1 hover:bg-muted text-xs text-muted-foreground flex items-center gap-1"
              title="复制"
            >
              <Copy className="h-3 w-3" />
              复制
            </button>
          </div>
        )}

        {/* 时间戳 */}
        <div className="mt-1 text-right text-[10px] text-muted-foreground/60">
          {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
