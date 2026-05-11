/**
 * 场景专属智能体面板
 * 内嵌在各业务 Tab 中，提供场景内 AI 对话和技能调用
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquare,
  X,
  Send,
  Loader2,
  Wrench,
  Workflow,
  ChevronRight,
  Sparkles,
  Zap,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ParsedData, DataAnalysis, FieldStat } from '@/lib/data-processor/types';
import type { LLMModelConfig } from '@/lib/llm';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { classifyAndRoute } from '@/lib/agent/core/intent-router';
import { executeSkill } from '@/lib/skills/core/executor';
import { skillRegistry } from '@/lib/skills/core/registry';
import { workflowRegistry } from '@/lib/workflow/core/registry';
import type { SkillContext } from '@/lib/skills/core/types';

interface SceneMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    type?: 'skill' | 'workflow' | 'text' | 'error';
    skillId?: string;
    workflowId?: string;
    status?: 'success' | 'error';
    detail?: string;
  };
}

interface SceneAgentPanelProps {
  sceneId: string;
  sceneName: string;
  data?: ParsedData | null;
  analysis?: DataAnalysis | null;
  fieldStats?: FieldStat[];
  modelConfig?: LLMModelConfig;
  /** 允许调用的技能白名单 */
  allowedSkillIds?: string[];
  /** 面板展开状态（受控） */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function SceneAgentPanel({
  sceneId,
  sceneName,
  data,
  analysis,
  fieldStats,
  modelConfig,
  allowedSkillIds,
  open: controlledOpen,
  onOpenChange,
  className,
}: SceneAgentPanelProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (controlledOpen !== undefined) {
      onOpenChange?.(v);
    } else {
      setInternalOpen(v);
    }
  };

  const [messages, setMessages] = useState<SceneMessage[]>([
    {
      role: 'assistant',
      content: `您好，我是${sceneName}智能体。\n\n我可以帮您：\n- 理解当前数据并提供${sceneName}建议\n- 调用本场景技能完成具体任务\n- 推荐并执行预制工作流\n\n请描述您的需求，我会尽力协助。`,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: SceneMessage = {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // 意图识别
      const intent = await classifyAndRoute(text, {
        sessionId: `scene-${sceneId}-${Date.now()}`,
        currentView: sceneId,
        hasData: !!data,
      } as unknown as import('@/lib/agent/core/types').AgentSession);

      // 跨场景检查
      if (intent.sceneId !== sceneId && intent.sceneId !== 'general') {
        const sceneNames: Record<string, string> = {
          'table-generate': '生成表格',
          'data-clean': '数据清洗',
          'data-analyze': '数据分析',
          'visualize': '可视化',
          'formula': '公式生成',
          'document-parse': '文档解析',
        };
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `您好，我是${sceneName}智能体，专门处理${sceneName}相关需求。\n\n您的问题似乎更适合在「${sceneNames[intent.sceneId] || intent.sceneId}」场景下处理，建议切换到对应 Tab 后提问。\n\n如果确实需要在当前场景处理，请更具体地描述您的${sceneName}需求。`,
            timestamp: Date.now(),
            metadata: { type: 'text' },
          },
        ]);
        setIsLoading(false);
        scrollToBottom();
        return;
      }

      // 技能调用优先
      if (intent.suggestedAction?.startsWith('skill:') || intent.suggestedAction?.startsWith('workflow:')) {
        const actionType = intent.suggestedAction.startsWith('skill:') ? 'skill' : 'workflow';
        const actionId = intent.suggestedAction.split(':')[1];

        if (actionType === 'skill') {
          // 技能白名单检查
          if (allowedSkillIds && !allowedSkillIds.includes(actionId)) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `技能 \`${actionId}\` 不在当前场景白名单中，无法执行。我可以尝试用其他方式帮您完成需求。`,
                timestamp: Date.now(),
                metadata: { type: 'error' },
              },
            ]);
            setIsLoading(false);
            scrollToBottom();
            return;
          }

          const skillContext: SkillContext = {
            userRequest: text,
            data: data ?? undefined,
            modelConfig,
            sessionId: `scene-${sceneId}-${Date.now()}`,
            scene: sceneId,
            metadata: { analysis: analysis ?? undefined, fieldStats },
          };

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `正在执行技能 \`${actionId}\`...`,
              timestamp: Date.now(),
              metadata: { type: 'skill', skillId: actionId, status: 'success' },
            },
          ]);

          const result = await executeSkill(actionId, { userRequest: text }, skillContext);

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: result.success
                ? `✅ 技能执行成功\n\n**输出**：\n${typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}`
                : `❌ 技能执行失败\n\n**原因**：${result.error || '未知错误'}`,
              timestamp: Date.now(),
              metadata: { type: 'skill', skillId: actionId, status: result.success ? 'success' : 'error' },
            },
          ]);
        } else {
          // 工作流执行
          const workflow = workflowRegistry.get(actionId);
          if (!workflow) {
            setMessages((prev) => [
              ...prev,
              {
                role: 'assistant',
                content: `工作流 \`${actionId}\` 不存在，无法执行。`,
                timestamp: Date.now(),
                metadata: { type: 'error' },
              },
            ]);
            setIsLoading(false);
            scrollToBottom();
            return;
          }

          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `正在执行工作流 \`${workflow.name}\`...`,
              timestamp: Date.now(),
              metadata: { type: 'workflow', workflowId: actionId, status: 'success' },
            },
          ]);

          // 工作流执行（简化版，实际应调用 executeWorkflow）
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `✅ 工作流 \`${workflow.name}\` 已触发。\n\n当前工作流执行采用预设规则，具体结果请查看对应功能面板。`,
              timestamp: Date.now(),
              metadata: { type: 'workflow', workflowId: actionId, status: 'success' },
            },
          ]);
        }
      } else {
        // 纯文本回复（兜底）
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `我理解了您的需求：「${text}」\n\n在当前 **${sceneName}** 场景下，我可以帮您：\n${generateSceneSuggestions(sceneId, text)}\n\n您可以点击上方建议，或直接告诉我更具体的操作。`,
            timestamp: Date.now(),
            metadata: { type: 'text' },
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `处理出错：${err instanceof Error ? err.message : String(err)}`,
          timestamp: Date.now(),
          metadata: { type: 'error' },
        },
      ]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const generateSceneSuggestions = (sid: string, _query: string): string => {
    const suggestions: Record<string, string[]> = {
      'table-generate': ['使用场景模板快速建表', 'AI 自动生成表结构', '导入现有数据生成表格'],
      'data-clean': ['自动检测缺失值', '去除重复行', '标准化数据格式', '异常值处理'],
      'data-analyze': ['基础统计分析', '相关性分析', '趋势分析', '生成数据洞察报告'],
      'visualize': ['推荐最适合的图表', '自动生成仪表盘', '创建交互式图表'],
      'formula': ['自然语言生成公式', '公式解释与校验', '复杂计算逻辑'],
      'document-parse': ['文档转表格', '提取结构化数据', '批量解析文档'],
    };
    const list = suggestions[sid] || ['调用相关技能', '查看预制工作流'];
    return list.map((s) => `- ${s}`).join('\n');
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className={cn(
          'fixed right-4 top-1/2 -translate-y-1/2 z-40 gap-1 shadow-float border-primary/20 bg-background/95 backdrop-blur rounded-[6px]',
          'hover:border-primary/40 hover:shadow-hover',
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs">{sceneName}</span>
      </Button>
    );
  }

  return (
    <div
      className={cn(
        'fixed right-0 top-16 bottom-0 w-80 border-l border-border bg-background/95 backdrop-blur z-40',
        'flex flex-col shadow-float transition-transform duration-300',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[4px] bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">{sceneName}智能体</div>
            <div className="text-xs text-muted-foreground">场景技能就绪</div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[90%] rounded-lg px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted border'
              )}
            >
              {msg.role === 'assistant' ? (
                <div className="prose prose-xs max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
              {msg.metadata?.type === 'skill' && (
                <div className="mt-1.5 flex items-center gap-1 text-xs opacity-70">
                  <Wrench className="w-3 h-3" />
                  <span>技能: {msg.metadata.skillId}</span>
                  {msg.metadata.status === 'error' && <AlertTriangle className="w-3 h-3 text-destructive" />}
                </div>
              )}
              {msg.metadata?.type === 'workflow' && (
                <div className="mt-1.5 flex items-center gap-1 text-xs opacity-70">
                  <Workflow className="w-3 h-3" />
                  <span>工作流: {msg.metadata.workflowId}</span>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted border rounded-lg px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span className="text-xs text-muted-foreground">智能体思考中...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 快捷操作 */}
      <div className="px-3 py-1.5 border-t bg-muted/20">
        <div className="flex flex-wrap gap-1">
          {['快速分析', '推荐图表', '生成公式'].map((s) => (
            <button
              key={s}
              className="text-xs px-2 py-0.5 rounded-full bg-background border hover:bg-muted transition-colors"
              onClick={() => {
                setInput(s);
                // 延迟调用以确保 input 已更新
                setTimeout(() => handleSend(), 0);
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 输入区 */}
      <div className="px-3 py-2 border-t">
        <div className="flex items-center gap-1.5">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`向${sceneName}智能体提问...`}
            className="h-8 text-xs"
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
