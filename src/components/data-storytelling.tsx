'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen, Play, Pause, ChevronLeft, ChevronRight, Download,
  Sparkles, Loader2, Maximize2, X, RotateCcw, Settings2,
  FileText, TrendingUp, AlertTriangle, Lightbulb, Target,
} from 'lucide-react';
import { ParsedData } from '@/lib/data-processor/types';
import { streamRequest } from '@/lib/request';
import { safeSetItem, safeGetItem } from '@/lib/safe-storage';

/** Inline markdown: bold, italic, inline code */
function inlineMd(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let k = 0;
  while (remaining) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    const codeMatch = remaining.match(/`([^`]+)`/);
    const matches = [
      boldMatch ? { type: 'bold' as const, match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: 'italic' as const, match: italicMatch, index: italicMatch.index! } : null,
      codeMatch ? { type: 'code' as const, match: codeMatch, index: codeMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);
    if (matches.length === 0) { parts.push(remaining); break; }
    const first = matches[0]!;
    if (first.index > 0) parts.push(remaining.slice(0, first.index));
    if (first.type === 'bold') parts.push(<strong key={k++} className="font-semibold text-foreground">{first.match![1]}</strong>);
    else if (first.type === 'italic') parts.push(<em key={k++}>{first.match![1]}</em>);
    else if (first.type === 'code') parts.push(<code key={k++} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{first.match![1]}</code>);
    remaining = remaining.slice(first.index + first.match![0].length);
  }
  return <>{parts}</>;
}

/** 简易 Markdown 渲染：支持加粗、斜体、列表、标题、代码块 */
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let key = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(<pre key={key++} className="bg-muted rounded-md p-3 my-2 text-xs overflow-x-auto"><code>{codeLines.join('\n')}</code></pre>);
        codeLines = []; inCodeBlock = false;
      } else { inCodeBlock = true; }
      continue;
    }
    if (inCodeBlock) { codeLines.push(line); continue; }
    if (/^---+$/.test(line.trim())) { elements.push(<hr key={key++} className="my-3 border-border" />); continue; }
    if (line.startsWith('### ')) { elements.push(<h4 key={key++} className="font-semibold mt-3 mb-1">{inlineMd(line.slice(4))}</h4>); continue; }
    if (line.startsWith('## ')) { elements.push(<h3 key={key++} className="font-semibold mt-4 mb-1">{inlineMd(line.slice(3))}</h3>); continue; }
    if (line.startsWith('# ')) { elements.push(<h2 key={key++} className="font-bold mt-4 mb-1">{inlineMd(line.slice(2))}</h2>); continue; }
    if (/^[-*]\s/.test(line.trim())) { elements.push(<li key={key++} className="ml-4 list-disc">{inlineMd(line.trim().replace(/^[-*]\s+/, ''))}</li>); continue; }
    if (/^\d+\.\s/.test(line.trim())) { elements.push(<li key={key++} className="ml-4 list-decimal">{inlineMd(line.trim().replace(/^\d+\.\s+/, ''))}</li>); continue; }
    if (!line.trim()) { elements.push(<div key={key++} className="h-2" />); continue; }
    elements.push(<p key={key++} className="my-0.5">{inlineMd(line)}</p>);
  }
  return <>{elements}</>;
}

interface DataStorytellingProps {
  data: ParsedData;
  fieldStats: Array<{ field: string; type: string; stats?: Record<string, number> }>;
  modelConfig?: Record<string, string>;
  /** 分析洞察文本（可从外部传入作为补充上下文） */
  insights?: string[];
}

interface StorySlide {
  title: string;
  content: string;
  icon: React.ReactNode;
  type: 'title' | 'summary' | 'trend' | 'anomaly' | 'correlation' | 'attribution' | 'action' | 'section';
}

const AUDIENCE_OPTIONS = [
  { value: 'general', label: '一般业务人员' },
  { value: 'executive', label: '高管（简洁结论导向）' },
  { value: 'analyst', label: '分析师（详细方法论）' },
];

const EMPHASIS_OPTIONS = [
  { value: 'auto', label: '自动识别' },
  { value: 'trend', label: '趋势变化' },
  { value: 'anomaly', label: '异常发现' },
  { value: 'comparison', label: '对比分析' },
  { value: 'correlation', label: '关联关系' },
];

function parseStorySlides(rawContent: string): StorySlide[] {
  const sections = rawContent.split(/===SPLIT===|---/).filter(s => s.trim());
  const slides: StorySlide[] = [];

  for (const section of sections) {
    const lines = section.trim().split('\n').filter(l => l.trim());
    if (lines.length === 0) continue;

    // 提取标题
    let title = '';
    let contentLines: string[] = [];
    let type: StorySlide['type'] = 'section';

    for (const line of lines) {
      if (line.startsWith('## ') && !title) {
        title = line.replace(/^##\s+/, '').trim();
      } else {
        contentLines.push(line);
      }
    }

    if (!title) {
      title = lines[0].replace(/^#+\s*/, '').trim();
      contentLines = lines.slice(1);
    }

    const content = contentLines.join('\n').trim();

    // 根据关键词判断幻灯片类型
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();
    if (lowerTitle.includes('标题') || lowerTitle.includes('title') || slides.length === 0) {
      type = 'title';
    } else if (lowerTitle.includes('摘要') || lowerTitle.includes('summary') || lowerTitle.includes('概要')) {
      type = 'summary';
    } else if (lowerTitle.includes('趋势') || lowerTitle.includes('trend')) {
      type = 'trend';
    } else if (lowerTitle.includes('异常') || lowerTitle.includes('anomal') || lowerTitle.includes('偏离')) {
      type = 'anomaly';
    } else if (lowerTitle.includes('关联') || lowerTitle.includes('correlat') || lowerTitle.includes('相关')) {
      type = 'correlation';
    } else if (lowerTitle.includes('归因') || lowerTitle.includes('attribut') || lowerTitle.includes('原因')) {
      type = 'attribution';
    } else if (lowerTitle.includes('行动') || lowerTitle.includes('建议') || lowerTitle.includes('action') || lowerTitle.includes('recommend')) {
      type = 'action';
    } else if (lowerContent.includes('趋势')) {
      type = 'trend';
    } else if (lowerContent.includes('异常')) {
      type = 'anomaly';
    }

    const iconMap: Record<StorySlide['type'], React.ReactNode> = {
      title: <FileText className="w-5 h-5" />,
      summary: <Target className="w-5 h-5" />,
      trend: <TrendingUp className="w-5 h-5" />,
      anomaly: <AlertTriangle className="w-5 h-5" />,
      correlation: <Sparkles className="w-5 h-5" />,
      attribution: <Lightbulb className="w-5 h-5" />,
      action: <Target className="w-5 h-5" />,
      section: <FileText className="w-5 h-5" />,
    };

    slides.push({ title, content, icon: iconMap[type], type });
  }

  return slides;
}

function SlideIcon({ type }: { type: StorySlide['type'] }) {
  const colorMap: Record<StorySlide['type'], string> = {
    title: 'text-primary',
    summary: 'text-primary',
    trend: 'text-emerald-500',
    anomaly: 'text-amber-500',
    correlation: 'text-blue-500',
    attribution: 'text-purple-500',
    action: 'text-rose-500',
    section: 'text-muted-foreground',
  };
  const iconMap: Record<StorySlide['type'], React.ReactNode> = {
    title: <FileText className="w-5 h-5" />,
    summary: <Target className="w-5 h-5" />,
    trend: <TrendingUp className="w-5 h-5" />,
    anomaly: <AlertTriangle className="w-5 h-5" />,
    correlation: <Sparkles className="w-5 h-5" />,
    attribution: <Lightbulb className="w-5 h-5" />,
    action: <Target className="w-5 h-5" />,
    section: <FileText className="w-5 h-5" />,
  };
  return <span className={colorMap[type]}>{iconMap[type]}</span>;
}

export function DataStorytelling({ data, fieldStats, modelConfig, insights }: DataStorytellingProps) {
  const [rawContent, setRawContent] = useState('');
  const [slides, setSlides] = useState<StorySlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [audience, setAudience] = useState('general');
  const [emphasis, setEmphasis] = useState('auto');
  const [maxSlides, setMaxSlides] = useState(8);
  const [error, setError] = useState('');
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const hasData = data?.headers?.length > 0 && data?.rows?.length > 0;

  // 生成数据故事
  const handleGenerate = useCallback(async () => {
    if (!hasData) return;

    setIsGenerating(true);
    setError('');
    setRawContent('');
    setSlides([]);
    setCurrentSlide(0);
    setIsPlaying(false);

    abortRef.current = new AbortController();

    let fullContent = '';

    await streamRequest({
      url: '/api/data-story',
      body: {
        data: {
          headers: data.headers,
          rows: data.rows.slice(0, 100),
          rowCount: data.rowCount,
          columnCount: data.columnCount,
        },
        fieldStats: fieldStats.slice(0, 20),
        modelConfig,
        storyOptions: { audience, emphasis, maxSlides },
      },
      signal: abortRef.current.signal,
      onChunk: (content) => {
        fullContent += content;
        setRawContent(fullContent);
        // 实时解析幻灯片
        const parsed = parseStorySlides(fullContent);
        if (parsed.length > 0) {
          setSlides(parsed);
        }
      },
      onDone: () => {
        setIsGenerating(false);
        const parsed = parseStorySlides(fullContent);
        setSlides(parsed);
        // 保存到历史
        try {
          const history = JSON.parse(safeGetItem('datainsight-story-history') || '[]');
          history.unshift({
            id: `story-${Date.now()}`,
            title: parsed[0]?.title || '数据故事',
            slideCount: parsed.length,
            createdAt: new Date().toLocaleString(),
          });
          safeSetItem('datainsight-story-history', JSON.stringify(history.slice(0, 10)));
        } catch { /* ignore */ }
      },
      onError: (err) => {
        setError(err.message || '生成失败');
        setIsGenerating(false);
      },
    });
  }, [hasData, data, fieldStats, modelConfig, audience, emphasis, maxSlides]);

  // 播放/暂停自动轮播
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playTimerRef.current = setInterval(() => {
        setCurrentSlide(prev => {
          if (prev >= slides.length - 1) {
            if (playTimerRef.current) clearInterval(playTimerRef.current);
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 5000);
    }
  }, [isPlaying, slides.length]);

  // 导出为Markdown
  const handleExportMarkdown = useCallback(() => {
    if (slides.length === 0) return;
    const md = slides.map((s, i) => `## ${s.title}\n\n${s.content}\n\n---\n`).join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `数据故事_${new Date().toLocaleDateString()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }, [slides]);

  // 导出为HTML幻灯片
  const handleExportHTML = useCallback(() => {
    if (slides.length === 0) return;
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>数据故事</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; }
.slide { min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 4rem 6rem; page-break-after: always; }
.slide h2 { font-size: 2.5rem; margin-bottom: 2rem; color: #f8fafc; }
.slide .content { font-size: 1.25rem; line-height: 2; max-width: 800px; white-space: pre-wrap; }
.slide .content strong { color: #60a5fa; }
.slide .content em { color: #fbbf24; }
.slide-number { position: fixed; bottom: 2rem; right: 2rem; color: #64748b; font-size: 0.875rem; }
.type-badge { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; margin-bottom: 1rem; }
.type-title { background: #1e40af33; color: #60a5fa; }
.type-summary { background: #1e40af33; color: #60a5fa; }
.type-trend { background: #065f4633; color: #34d399; }
.type-anomaly { background: #78350f33; color: #fbbf24; }
.type-action { background: #9f123933; color: #fb7185; }
</style>
</head>
<body>
${slides.map((s, i) => `<div class="slide"><span class="type-badge type-${s.type}">${s.type}</span><h2>${s.title}</h2><div class="content">${s.content}</div><div class="slide-number">${i + 1} / ${slides.length}</div></div>`).join('\n')}
</body></html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `数据故事_${new Date().toLocaleDateString()}.html`;
    link.click();
    URL.revokeObjectURL(url);
  }, [slides]);

  const currentSlideData = slides[currentSlide];

  if (!hasData) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <BookOpen className="w-12 h-12 mb-3 opacity-50" />
          <p>请先上传数据文件</p>
          <p className="text-xs mt-1">上传数据后即可生成数据故事</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : 'h-full'}`}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">数据故事</span>
          {slides.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {slides.length} 页
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />生成中...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5 mr-1" />{slides.length > 0 ? '重新生成' : '生成故事'}</>
            )}
          </Button>
          {slides.length > 0 && (
            <>
              <Button variant="ghost" size="sm" onClick={togglePlay}>
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportMarkdown}>
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportHTML}>
                <FileText className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">受众:</span>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">侧重:</span>
            <Select value={emphasis} onValueChange={setEmphasis}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {EMPHASIS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">页数:</span>
            <Select value={String(maxSlides)} onValueChange={v => setMaxSlides(Number(v))}>
              <SelectTrigger className="h-7 w-20 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[5, 8, 10, 12].map(n => <SelectItem key={n} value={String(n)}>{n}页</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex">
        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={handleGenerate}>
                <RotateCcw className="w-3.5 h-3.5 mr-1" />重试
              </Button>
            </div>
          </div>
        )}

        {isGenerating && slides.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">正在分析数据，生成故事...</p>
              <p className="text-xs text-muted-foreground mt-1">这可能需要 10-30 秒</p>
            </div>
          </div>
        )}

        {!isGenerating && !error && slides.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <BookOpen className="w-12 h-12 mx-auto mb-3 text-primary/40" />
              <h3 className="font-medium mb-2">数据故事 (Data Storytelling)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                将数据分析结果转化为引人入胜的叙事故事，包含执行摘要、趋势分析、异常发现和行动建议。
              </p>
              <Button onClick={handleGenerate}>
                <Sparkles className="w-4 h-4 mr-1" />生成数据故事
              </Button>
            </div>
          </div>
        )}

        {slides.length > 0 && (
          <>
            {/* 幻灯片侧边导航 */}
            <div className="w-48 border-r bg-muted/20 overflow-y-auto p-2 space-y-1 hidden md:block">
              {slides.map((slide, i) => (
                <button
                  key={i}
                  onClick={() => { setCurrentSlide(i); if (isPlaying) togglePlay(); }}
                  className={`w-full text-left px-2 py-2 rounded-md text-xs transition-colors ${
                    i === currentSlide ? 'bg-primary/10 text-primary border border-primary/20' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <SlideIcon type={slide.type} />
                    <span className="font-medium truncate">{slide.title}</span>
                  </div>
                  <span className="text-muted-foreground text-[10px] ml-5">{slide.type}</span>
                </button>
              ))}
            </div>

            {/* 幻灯片展示区 */}
            <div className="flex-1 flex flex-col">
              <div className="flex-1 flex items-center justify-center p-6 md:p-12">
                <div className="max-w-3xl w-full">
                  {currentSlideData && (
                    <div className="space-y-4 animate-in fade-in-0 duration-300">
                      <div className="flex items-center gap-2">
                        <SlideIcon type={currentSlideData.type} />
                        <Badge variant="outline" className="text-[10px]">{currentSlideData.type}</Badge>
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold leading-tight">{currentSlideData.title}</h2>
                      <div className="text-sm md:text-base leading-relaxed text-muted-foreground">
                        {renderMarkdown(currentSlideData.content)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 导航条 */}
              <div className="flex items-center justify-between px-6 py-3 border-t bg-card">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentSlide === 0}
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />上一页
                </Button>
                <div className="flex items-center gap-2">
                  {slides.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlide(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentSlide ? 'bg-primary' : 'bg-muted-foreground/30'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-2">
                    {currentSlide + 1} / {slides.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={currentSlide >= slides.length - 1}
                  onClick={() => setCurrentSlide(Math.min(slides.length - 1, currentSlide + 1))}
                >
                  下一页<ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
