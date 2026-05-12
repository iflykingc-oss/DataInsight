'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Wand2, Languages, FileText, PenLine, Sparkles, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

interface AICellToolbarProps {
  selectedText: string;
  cellValue: string;
  modelConfig: { apiKey: string; baseUrl: string; model: string } | null | undefined;
  onApply: (newValue: string) => void;
  onClose: () => void;
}

type AITool = 'fill' | 'polish' | 'translate' | 'summarize' | 'expand' | 'correct';

interface ToolOption {
  id: AITool;
  label: string;
  icon: React.ElementType;
  description: string;
}

const TOOLS: ToolOption[] = [
  { id: 'fill', label: '智能填充', icon: Wand2, description: '根据上下文自动补全内容' },
  { id: 'polish', label: '润色', icon: PenLine, description: '优化文字表达，使其更专业' },
  { id: 'translate', label: '翻译', icon: Languages, description: '翻译成其他语言' },
  { id: 'summarize', label: '总结', icon: FileText, description: '精简提炼核心内容' },
  { id: 'expand', label: '扩写', icon: Sparkles, description: '基于关键词扩展内容' },
  { id: 'correct', label: '纠错', icon: Check, description: '检查并修正错误' },
];

export function AICellToolbar({ selectedText, cellValue, modelConfig, onApply, onClose }: AICellToolbarProps) {
  const { t } = useI18n();
  const [activeTool, setActiveTool] = useState<AITool | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [translateTarget, setTranslateTarget] = useState('中文');
  const toolbarRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleToolClick = async (tool: AITool) => {
    if (!modelConfig) {
      setError('请先配置AI模型');
      return;
    }

    setActiveTool(tool);
    setLoading(true);
    setError('');
    setResult('');

    const prompts: Record<AITool, string> = {
      fill: `请根据以下上下文，智能填充或补全内容。只返回填充后的结果，不要解释。
原始内容：${cellValue}
选中内容：${selectedText}`,
      polish: `请润色以下文字，使其表达更专业、流畅。只返回润色后的结果，不要解释。
内容：${selectedText}`,
      translate: `请将以下内容翻译成${translateTarget}。只返回翻译结果，不要解释。
内容：${selectedText}`,
      summarize: `请将以下内容总结为简洁的核心要点（50字以内）。只返回总结结果，不要解释。
内容：${selectedText}`,
      expand: `请基于以下内容进行扩展，丰富细节和表达。只返回扩展后的结果，不要解释。
内容：${selectedText}`,
      correct: `请检查以下内容中的错别字、语法错误，并返回修正后的版本。只返回修正结果，不要解释。
内容：${selectedText}`,
    };

    try {
      const response = await fetch('/api/ai-formula', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
        },
        body: JSON.stringify({
          requirement: prompts[tool],
          headers: ['content'],
          sampleRows: [{ content: selectedText }],
          modelConfig,
        }),
      });

      if (!response.ok) throw new Error('处理失败');

      const data = await response.json();
      if (data.success) {
        // 从返回的JSON中提取formula字段作为结果
        try {
          const parsed = JSON.parse(data.data.formula);
          setResult(parsed.formula || parsed.explanation || data.data.formula);
        } catch {
          setResult(data.data.formula || data.data.explanation || '处理完成');
        }
      } else {
        throw new Error(data.error || '处理失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      onClose();
    }
  };

  const handleReplace = () => {
    if (result && selectedText) {
      const newValue = cellValue.replace(selectedText, result);
      onApply(newValue);
      onClose();
    }
  };

  return (
    <div
      ref={toolbarRef}
      className={cn(
        'absolute z-50 bg-background border rounded-md shadow-lg p-2',
        'animate-in fade-in zoom-in-95 duration-150'
      )}
      style={{ minWidth: '320px' }}
    >
      {/* 工具栏头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-medium">AI 智能工具</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 选中文本预览 */}
      {selectedText && (
        <div className="mb-2 px-2 py-1.5 bg-muted rounded text-xs text-muted-foreground truncate">
          {selectedText.length > 40 ? selectedText.slice(0, 40) + '...' : selectedText}
        </div>
      )}

      {/* 翻译目标语言选择 */}
      {activeTool === 'translate' && (
        <div className="flex gap-1 mb-2">
          {['中文', '英文', '日文'].map(lang => (
            <button
              key={lang}
              onClick={() => setTranslateTarget(lang)}
              className={cn(
                'px-2 py-0.5 rounded text-xs transition-colors',
                translateTarget === lang
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              {lang}
            </button>
          ))}
        </div>
      )}

      {/* 工具按钮 */}
      {!result && !loading && (
        <div className="grid grid-cols-3 gap-1">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => handleToolClick(tool.id)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-md text-xs transition-colors',
                'hover:bg-primary/10 hover:text-primary',
                activeTool === tool.id && 'bg-primary/10 text-primary'
              )}
            >
              <tool.icon className="w-4 h-4" />
              <span>{tool.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">AI处理中...</span>
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="p-2 bg-red-50 text-red-700 rounded text-xs">
          {error}
        </div>
      )}

      {/* 结果展示 */}
      {result && !loading && (
        <div className="space-y-2">
          <div className="p-2 bg-primary/5 rounded text-sm border border-primary/20">
            {result}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={handleApply}>
              <Check className="w-3.5 h-3.5 mr-1" />
              替换选中
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={handleReplace}>
              全文替换
            </Button>
          </div>
          <Button size="sm" variant="ghost" className="w-full" onClick={() => { setResult(''); setActiveTool(null); }}>
            重新选择
          </Button>
        </div>
      )}
    </div>
  );
}
