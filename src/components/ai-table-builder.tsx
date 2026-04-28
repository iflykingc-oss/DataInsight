'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  ShoppingCart,
  Scissors,
  Users,
  Search,
  Star,
  MessageSquare,
  Download,
  Eye,
  Sparkles,
  RotateCcw,
  Check,
  ArrowRight,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  X,
} from 'lucide-react';

// ============= 类型定义 =============
interface SceneTemplate {
  id: string;
  name: string;
  industry: string;
  usage: string;
  category: string;
}

interface ColumnDef {
  name: string;
  type: 'text' | 'number' | 'date' | 'select';
  description: string;
  required: boolean;
  selectOptions?: string[];
  formula?: string | null;
}

interface TableScheme {
  tableName: string;
  purpose: string;
  columns: ColumnDef[];
  sampleRows: Record<string, unknown>[];
  formulas: Array<{ cell: string; formula: string; description: string }>;
  designNotes: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  scheme?: TableScheme | null;
}

interface AITableBuilderProps {
  modelConfig: { apiKey: string; baseUrl: string; model: string } | null;
  className?: string;
}

// 场景分类
const CATEGORIES = [
  { id: 'general', name: '通用', icon: Building2, color: 'text-primary' },
  { id: 'retail', name: '零售电商', icon: ShoppingCart, color: 'text-emerald-600' },
  { id: 'beauty', name: '美业服务', icon: Scissors, color: 'text-pink-600' },
  { id: 'team', name: '小微团队', icon: Users, color: 'text-blue-600' },
];

// 快捷提示词
const QUICK_PROMPTS: Record<string, string[]> = {
  general: ['增加备注列', '添加月度汇总行', '简化字段只保留核心', '增加审批状态字段'],
  retail: ['增加毛利率计算', '添加供应商列', '按月汇总销量', '增加库存预警列'],
  beauty: ['增加服务时长字段', '添加回头客标记', '增加会员折扣列', '按技师汇总业绩'],
  team: ['增加加班时长字段', '添加绩效评分列', '按月汇总工时', '增加请假类型'],
};

// 智能需求引导：场景绑定的快速需求建议
const SCENE_REQUIREMENTS: Record<string, string[]> = {
  'general-ledger': ['按月度汇总收支', '区分收入和支出类别', '增加经手人字段'],
  'retail-daily-sales': ['按商品类别分组统计', '增加毛利率计算', '添加同比/环比对比'],
  'beauty-appointment': ['按技师统计服务量', '增加服务项目时长', '添加会员折扣列'],
  'team-attendance': ['按月汇总工时', '区分正常/加班/请假', '增加迟到早退标记'],
};

// 历史记录类型
interface HistoryRecord {
  id: string;
  sceneName: string;
  requirement: string;
  scheme: TableScheme;
  createdAt: string;
}

export default function AITableBuilder({ modelConfig, className }: AITableBuilderProps) {
  // 步骤状态：template → generate → preview → confirm
  const [step, setStep] = useState<'template' | 'generate' | 'preview' | 'confirm'>('template');
  const [templates, setTemplates] = useState<SceneTemplate[]>([]);
  const [selectedScene, setSelectedScene] = useState<SceneTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // 历史记录
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // 生成相关
  const [userRequirement, setUserRequirement] = useState('');
  const [generateMode, setGenerateMode] = useState<'simple' | 'expert'>('simple');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [iterationCount, setIterationCount] = useState(0);

  // 预览相关
  const [currentScheme, setCurrentScheme] = useState<TableScheme | null>(null);
  const [showPreview, setShowPreview] = useState(true);

  // 下载相关
  const [isDownloading, setIsDownloading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 加载模板列表
  useEffect(() => {
    fetch('/api/ai-table-builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list-templates' }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) setTemplates(data.data);
      })
      .catch(() => {});
  }, []);

  // 加载收藏
  useEffect(() => {
    try {
      const saved = localStorage.getItem('datainsight-table-favorites');
      if (saved) setFavorites(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // 保存收藏
  useEffect(() => {
    try {
      localStorage.setItem('datainsight-table-favorites', JSON.stringify(favorites));
    } catch { /* ignore */ }
  }, [favorites]);

  // 加载历史记录
  useEffect(() => {
    try {
      const saved = localStorage.getItem('datainsight-table-history');
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // 保存历史记录
  const saveToHistory = useCallback((sceneName: string, requirement: string, scheme: TableScheme) => {
    const record: HistoryRecord = {
      id: `history-${Date.now()}`,
      sceneName,
      requirement,
      scheme,
      createdAt: new Date().toLocaleString(),
    };
    setHistory(prev => {
      const updated = [record, ...prev].slice(0, 20); // 最多保存20条
      localStorage.setItem('datainsight-table-history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // 过滤模板
  const filteredTemplates = templates.filter(t => {
    const matchCategory = t.category === selectedCategory;
    const matchSearch = !searchQuery || t.name.includes(searchQuery) || t.industry.includes(searchQuery) || t.usage.includes(searchQuery);
    const matchFavorite = !showFavoritesOnly || favorites.includes(t.id);
    return matchCategory && matchSearch && matchFavorite;
  });

  // 切换收藏
  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  // 选择场景并进入生成步骤
  const handleSelectScene = (scene: SceneTemplate) => {
    setSelectedScene(scene);
    const suggestions = SCENE_REQUIREMENTS[scene.id];
    if (suggestions && suggestions.length > 0) {
      setUserRequirement(`请基于"${scene.name}"场景生成经营台账，${suggestions[0]}`);
    } else {
      setUserRequirement(`请基于"${scene.name}"场景生成经营台账`);
    }
    setStep('generate');
  };

  // 检查需求描述质量
  const validateRequirement = (text: string): { valid: boolean; error?: string } => {
    const trimmed = text.trim();
    if (trimmed.length < 5) {
      return { valid: false, error: '需求描述太短了，请至少输入5个字，描述清楚需要什么表格。例如："月度销售跟踪表，包含日期、产品、销售额、客户"' };
    }
    // 检查是否包含建表相关意图
    const tableKeywords = /表|台账|sheet|表格|excel|字段|列|记录|跟踪|统计|汇总|明细|登记|管理|清单|目录/i;
    if (!tableKeywords.test(trimmed)) {
      return { valid: false, error: '您的描述似乎没有明确指向建表需求。请补充说明需要什么类型的表格，比如："创建一个客户信息登记表，包含姓名、电话、地址"' };
    }
    return { valid: true };
  };

  // AI生成表格方案
  const handleGenerate = useCallback(async () => {
    if (!userRequirement.trim() || !modelConfig) return;

    // 输入质量校验
    const qualityCheck = validateRequirement(userRequirement);
    if (!qualityCheck.valid) {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${qualityCheck.error}`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      return;
    }

    setIsGenerating(true);
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userRequirement,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/ai-table-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          sceneId: selectedScene?.id,
          userRequirement,
          mode: generateMode,
          modelConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ 生成失败：${errorData.error || `服务器错误 (${response.status})`}，请检查模型配置或稍后重试。`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, assistantMsg]);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        const scheme = data.data as TableScheme;
        setCurrentScheme(scheme);
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `已为您生成「${scheme.tableName}」表格方案，包含 ${scheme.columns.length} 个字段。${scheme.designNotes ? `\n\n设计说明：${scheme.designNotes}` : ''}\n\n您可以继续提出修改要求，或点击下方「确认生成表格文件」下载。`,
          timestamp: new Date(),
          scheme,
        };
        setChatMessages(prev => [...prev, assistantMsg]);
        setStep('preview');
        saveToHistory(selectedScene?.name || '自定义', userRequirement, scheme);
      } else {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `生成方案时遇到问题：${data.error || '请重试'}。请调整需求描述后重新生成。`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      }
    } catch (error) {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `网络请求失败，请检查网络连接后重试。`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    }

    setIsGenerating(false);
    setUserRequirement('');
  }, [userRequirement, modelConfig, selectedScene, generateMode]);

  // AI迭代修改
  const handleIterate = useCallback(async () => {
    if (!chatInput.trim() || !currentScheme || !modelConfig) return;

    const feedback = chatInput;
    setChatInput('');
    setIsGenerating(true);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: feedback,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch('/api/ai-table-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'iterate',
          currentScheme,
          userFeedback: feedback,
          modelConfig,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ 修改失败：${errorData.error || `服务器错误 (${response.status})`}，请稍后重试。`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, assistantMsg]);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        const newScheme = data.data as TableScheme;
        setCurrentScheme(newScheme);
        setIterationCount(prev => prev + 1);
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `已根据您的要求修改方案，当前方案包含 ${newScheme.columns.length} 个字段。${newScheme.designNotes ? `\n\n修改说明：${newScheme.designNotes}` : ''}\n\n如需继续修改请输入，或点击「确认生成表格文件」下载。`,
          timestamp: new Date(),
          scheme: newScheme,
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      } else {
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `修改方案时遇到问题：${data.error || '请重试'}`,
          timestamp: new Date(),
        };
        setChatMessages(prev => [...prev, assistantMsg]);
      }
    } catch {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: `网络请求失败，请重试。`,
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    }

    setIsGenerating(false);
  }, [chatInput, currentScheme, modelConfig]);

  // 确认生成Excel
  const handleConfirmGenerate = useCallback(async () => {
    if (!currentScheme) return;
    setIsDownloading(true);

    try {
      const response = await fetch('/api/ai-table-builder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm', scheme: currentScheme }),
      });

      if (!response.ok) {
        alert(`服务器错误 (${response.status})，请稍后重试`);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        // base64 → Blob → 下载
        const binaryString = atob(data.data.fileContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: data.data.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = data.data.fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setStep('confirm');
      } else {
        alert(data.error || '文件生成失败');
      }
    } catch {
      alert('文件下载失败，请重试');
    }

    setIsDownloading(false);
  }, [currentScheme]);

  // 重新开始
  const handleReset = () => {
    setStep('template');
    setSelectedScene(null);
    setCurrentScheme(null);
    setChatMessages([]);
    setUserRequirement('');
    setChatInput('');
    setIterationCount(0);
  };

  // 获取字段类型badge颜色
  const getTypeBadge = (type: ColumnDef['type']) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      text: { label: '文本', variant: 'secondary' },
      number: { label: '数值', variant: 'default' },
      date: { label: '日期', variant: 'outline' },
      select: { label: '选项', variant: 'destructive' },
    };
    return map[type] || { label: type, variant: 'secondary' as const };
  };

  // ============= 渲染：场景模板首页 =============
  const renderTemplatePage = () => (
    <div className="space-y-6">
      {/* 标题区 */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">AI 智能建表</h2>
        <p className="text-muted-foreground">
          选择业务场景，AI 帮你设计标准化经营台账，一键生成 Excel 模板
        </p>
      </div>

      {/* 搜索栏 + 收藏筛选 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索场景模板..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showFavoritesOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Star className="h-4 w-4 mr-1" />
          {showFavoritesOnly ? '已收藏' : '收藏'}
        </Button>
      </div>

      {/* 分类标签 */}
      <div className="flex gap-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              className="gap-1.5"
            >
              <Icon className={`h-4 w-4 ${selectedCategory !== cat.id ? cat.color : ''}`} />
              {cat.name}
            </Button>
          );
        })}
      </div>

      {/* 模板网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTemplates.map(template => (
          <Card
            key={template.id}
            className="cursor-pointer hover:shadow-md transition-shadow group"
            onClick={() => handleSelectScene(template)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base group-hover:text-primary transition-colors">
                    {template.name}
                  </CardTitle>
                  <CardDescription className="mt-1 text-xs">
                    {template.industry} · {template.usage}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 -mr-2 -mt-1"
                  onClick={e => { e.stopPropagation(); toggleFavorite(template.id); }}
                >
                  <Star className={`h-3.5 w-3.5 ${favorites.includes(template.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">{template.industry}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>没有找到匹配的模板</p>
          <p className="text-sm mt-1">尝试更换分类或清空搜索词</p>
        </div>
      )}

      {/* 自定义场景入口 */}
      <Card className="border-dashed">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">没有找到合适的场景？</p>
              <p className="text-sm text-muted-foreground">直接描述你的需求，AI 为你定制表格方案</p>
            </div>
            <Button
              onClick={() => {
                setSelectedScene(null);
                setUserRequirement('');
                setStep('generate');
              }}
            >
              自定义建表
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">最近生成</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? '收起' : `查看全部 (${history.length})`}
            </Button>
          </div>
          <div className={`grid gap-3 ${showHistory ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {(showHistory ? history : history.slice(0, 3)).map(record => (
              <Card
                key={record.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setCurrentScheme(record.scheme);
                  setChatMessages([{
                    id: `history-${Date.now()}`,
                    role: 'assistant' as const,
                    content: `已加载历史方案「${record.scheme.tableName}」，包含 ${record.scheme.columns.length} 个字段。您可以继续修改或直接确认生成。`,
                    timestamp: new Date(),
                    scheme: record.scheme,
                  }]);
                  setStep('preview');
                }}
              >
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <p className="font-medium text-sm truncate">{record.scheme.tableName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{record.requirement}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{record.createdAt}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // ============= 渲染：生成/迭代 对话界面 =============
  const renderGeneratePage = () => (
    <div className="space-y-4 h-full flex flex-col">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            返回
          </Button>
          <span className="text-muted-foreground">|</span>
          <span className="font-medium">
            {selectedScene ? selectedScene.name : '自定义建表'}
          </span>
          {selectedScene && (
            <Badge variant="outline" className="text-xs">{selectedScene.industry}</Badge>
          )}
        </div>
        {currentScheme && (
          <Badge variant="default" className="gap-1">
            <Check className="h-3 w-3" />
            已生成方案（迭代 {iterationCount} 次）
          </Badge>
        )}
      </div>

      {/* 主内容区：对话 + 预览 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：对话区 */}
        <div className="flex-1 flex flex-col min-w-0 border rounded-lg">
          {/* 对话消息 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/60" />
                <p className="font-medium">描述你的表格需求</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI 将根据你的需求生成标准化表格方案
                </p>
                {selectedScene && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-left max-w-md mx-auto">
                    <p className="font-medium mb-1">已选择场景：{selectedScene.name}</p>
                    <p className="text-muted-foreground">{selectedScene.usage}</p>
                  </div>
                )}
                {!selectedScene && (
                  <div className="mt-4 space-y-2 text-sm text-left max-w-md mx-auto">
                    <p className="text-muted-foreground">你可以这样描述：</p>
                    {[
                      '我需要一个客户信息登记表，包含姓名、电话、地址和备注',
                      '创建一个月度销售跟踪表，记录每天的产品销售数量和金额',
                      '设计一个库存管理台账，包含商品名称、入库数量、出库数量和当前库存',
                      '做一个员工考勤表，包含日期、姓名、上下班时间和出勤状态',
                    ].map((example, i) => (
                      <button
                        key={i}
                        className="block w-full text-left p-2 rounded bg-muted/50 hover:bg-muted transition-colors text-muted-foreground"
                        onClick={() => setUserRequirement(example)}
                      >
                        💡 {example}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {chatMessages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.scheme && (
                    <div className="mt-2 pt-2 border-t border-border/30 text-xs opacity-80">
                      {msg.scheme.columns.length} 个字段 · {msg.scheme.sampleRows?.length || 0} 条示例
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isGenerating && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">AI 正在思考...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* 输入区 */}
          <div className="border-t p-3">
            {/* 快捷提示词 */}
            {currentScheme && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(QUICK_PROMPTS[selectedScene?.category || 'general'] || QUICK_PROMPTS.general).map(p => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setChatInput(p)}
                  >
                    {p}
                  </Button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              {currentScheme ? (
                <>
                  <Input
                    ref={inputRef}
                    placeholder="输入修改要求，如：删除XX列、增加保质期字段..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleIterate(); } }}
                    disabled={isGenerating}
                    className="flex-1"
                  />
                  <Button onClick={handleIterate} disabled={isGenerating || !chatInput.trim()}>
                    <MessageSquare className="h-4 w-4 mr-1" />
                    修改
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    ref={inputRef}
                    placeholder="描述你的表格需求，如：我需要一个月度销售跟踪表..."
                    value={userRequirement}
                    onChange={e => setUserRequirement(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
                    disabled={isGenerating}
                    className="flex-1"
                  />
                  <Button onClick={handleGenerate} disabled={isGenerating || !userRequirement.trim()}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    生成方案
                  </Button>
                </>
              )}
            </div>

            {/* 确认生成按钮 */}
            {currentScheme && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  <Lightbulb className="h-3 w-3 inline mr-1" />
                  满意当前方案？确认后将生成标准 Excel 文件
                </p>
                <Button
                  onClick={handleConfirmGenerate}
                  disabled={isDownloading}
                  className="gap-1"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  确认生成表格文件
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧：方案预览 */}
        {currentScheme && showPreview && (
          <div className="w-[420px] flex-shrink-0 border rounded-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">方案预览</span>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowPreview(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {renderSchemePreview(currentScheme)}
            </div>
          </div>
        )}

        {currentScheme && !showPreview && (
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4 mr-1" />
            显示预览
          </Button>
        )}
      </div>
    </div>
  );

  // ============= 渲染：方案预览 =============
  const renderSchemePreview = (scheme: TableScheme) => (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-base">{scheme.tableName}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">{scheme.purpose}</p>
      </div>

      {/* 字段清单 */}
      <div>
        <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
          <ChevronDown className="h-3.5 w-3.5" />
          字段清单（{scheme.columns.length} 个）
        </h4>
        <div className="space-y-1.5">
          {scheme.columns.map((col, idx) => {
            const typeInfo = getTypeBadge(col.type);
            return (
              <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded bg-background border">
                <span className="font-medium min-w-0 truncate">{col.name}</span>
                <Badge variant={typeInfo.variant} className="text-xs flex-shrink-0">{typeInfo.label}</Badge>
                {col.required && <Badge variant="outline" className="text-xs flex-shrink-0">必填</Badge>}
                {col.formula && <Badge variant="secondary" className="text-xs flex-shrink-0">公式</Badge>}
                <span className="text-muted-foreground text-xs ml-auto truncate">{col.description}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 示例数据表格 */}
      {scheme.sampleRows && scheme.sampleRows.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
            <ChevronUp className="h-3.5 w-3.5" />
            示例数据（{scheme.sampleRows.length} 条）
          </h4>
          <div className="border rounded overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {scheme.columns.map((col, idx) => (
                    <TableHead key={idx} className="text-xs whitespace-nowrap">
                      {col.name}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheme.sampleRows.map((row, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {scheme.columns.map((col, colIdx) => (
                      <TableCell key={colIdx} className="text-xs whitespace-nowrap">
                        {String(row[col.name] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* 统计公式 */}
      {scheme.formulas && scheme.formulas.length > 0 && (
        <div>
          <h4 className="font-medium text-sm mb-2">统计公式</h4>
          <div className="space-y-1">
            {scheme.formulas.map((f, idx) => (
              <div key={idx} className="flex items-center gap-2 text-sm p-1.5 rounded bg-muted/30">
                <code className="text-xs bg-background px-1.5 py-0.5 rounded border">{f.cell}</code>
                <span className="font-mono text-xs">{f.formula}</span>
                <span className="text-muted-foreground text-xs ml-auto">{f.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 设计说明 */}
      {scheme.designNotes && (
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
          <p className="text-sm font-medium text-primary/80 mb-1">设计说明</p>
          <p className="text-sm text-muted-foreground">{scheme.designNotes}</p>
        </div>
      )}
    </div>
  );

  // ============= 渲染：完成页 =============
  const renderConfirmPage = () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4 max-w-md">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold">表格已生成</h2>
        <p className="text-muted-foreground">
          「{currentScheme?.tableName}」已下载到本地。文件包含 {currentScheme?.columns.length} 个字段和 {currentScheme?.sampleRows?.length || 0} 条示例数据，可直接用 Excel/WPS 打开编辑。
        </p>
        <div className="p-3 bg-muted/50 rounded-lg text-sm text-left">
          <p className="font-medium mb-1">使用提示</p>
          <ul className="text-muted-foreground space-y-1 list-disc list-inside text-xs">
            <li>删除示例数据后填入真实业务数据</li>
            <li>公式会自动计算，无需手动修改</li>
            <li>填好数据后可上传到 DataInsight 进行智能分析</li>
          </ul>
        </div>
        <div className="flex gap-3 justify-center pt-2">
          <Button variant="outline" onClick={handleReset}>
            继续建表
          </Button>
          <Button onClick={handleConfirmGenerate} disabled={isDownloading}>
            <Download className="h-4 w-4 mr-1" />
            再次下载
          </Button>
        </div>
      </div>
    </div>
  );

  // ============= 主渲染 =============
  if (!modelConfig) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-semibold">请先配置 AI 模型</h3>
          <p className="text-sm text-muted-foreground">
            AI 智能建表需要配置大语言模型才能使用
          </p>
          <p className="text-xs text-muted-foreground">
            前往「AI 模型配置」页面添加模型
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full ${className || ''}`}>
      {step === 'template' && renderTemplatePage()}
      {step === 'generate' && renderGeneratePage()}
      {step === 'preview' && renderGeneratePage()}
      {step === 'confirm' && renderConfirmPage()}
    </div>
  );
}
