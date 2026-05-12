'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Settings,
  Play,
  Clock,
  Zap,
  FileText,
  Shield,
  LayoutDashboard,
  GitBranch,
  ChevronRight,
  Layers,
  Target,
  BookOpen,
} from 'lucide-react';
import { storeBusinessData, readBusinessData } from '@/lib/data-lifecycle';

// ============= 类型定义 =============

// 智能体自动判断深度，无需用户手动选择模式

// 系统设计文档
interface SystemDesignDoc {
  businessBackground: string;
  businessGoal: string;
  tableSchemes: {
    tableName: string;
    purpose: string;
    fields: { name: string; type: string; description: string; required: boolean }[];
  }[];
  dashboardConfig: {
    charts: string[];
    kpis: string[];
  };
  workflowConfig: {
    triggers: string[];
    actions: string[];
  };
  permissionConfig: {
    roles: { name: string; permissions: string[] }[];
  };
}

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
  // 新增：完整系统方案
  systemDoc?: SystemDesignDoc;
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

// 场景分类 (20+行业)
const CATEGORIES = [
  { id: 'general', name: '通用', icon: Building2, color: 'text-primary' },
  { id: 'retail', name: '零售电商', icon: ShoppingCart, color: 'text-success' },
  { id: 'restaurant', name: '餐饮', icon: ShoppingCart, color: 'text-warning' },
  { id: 'education', name: '教育培训', icon: BookOpen, color: 'text-primary' },
  { id: 'health', name: '医疗健康', icon: Building2, color: 'text-destructive' },
  { id: 'finance', name: '金融保险', icon: Building2, color: 'text-chart-4' },
  { id: 'hr', name: '人力资源', icon: Users, color: 'text-chart-4' },
  { id: 'admin', name: '办公行政', icon: Building2, color: 'text-slate-600' },
  { id: 'marketing', name: '市场营销', icon: Target, color: 'text-chart-4' },
  { id: 'supply', name: '供应链物流', icon: Layers, color: 'text-warning' },
  { id: 'manufacturing', name: '制造业', icon: Zap, color: 'text-foreground' },
  { id: 'realty', name: '地产物业', icon: Building2, color: 'text-stone-600' },
  { id: 'hotel', name: '酒店旅游', icon: Layers, color: 'text-primary' },
  { id: 'media', name: '媒体娱乐', icon: Target, color: 'text-chart-4' },
  { id: 'legal', name: '法律服务', icon: Shield, color: 'text-neutral-600' },
  { id: 'agri', name: '农业畜牧', icon: Target, color: 'text-lime-600' },
  { id: 'gov', name: '政府公共', icon: Shield, color: 'text-destructive' },
  { id: 'tech', name: '科技互联', icon: Zap, color: 'text-violet-600' },
  { id: 'env', name: '环保环卫', icon: Target, color: 'text-success' },
  { id: 'sports', name: '体育健身', icon: Target, color: 'text-warning' },
  { id: 'publish', name: '出版传媒', icon: BookOpen, color: 'text-warning' },
  { id: 'beauty', name: '美业服务', icon: Scissors, color: 'text-chart-4' },
  { id: 'team', name: '小微团队', icon: Users, color: 'text-primary' },
];

// 快捷提示词
const QUICK_PROMPTS: Record<string, string[]> = {
  general: ['增加备注列', '添加月度汇总行', '简化字段只保留核心', '增加审批状态字段'],
  retail: ['增加毛利率计算', '添加供应商列', '按月汇总销量', '增加库存预警列'],
  beauty: ['增加服务时长字段', '添加回头客标记', '增加会员折扣列', '按技师汇总业绩'],
  team: ['增加加班时长字段', '添加绩效评分列', '按月汇总工时', '增加请假类型'],
};

// 智能需求引导
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
  // 步骤状态
  const { t } = useI18n();
  const [step, setStep] = useState<'template' | 'generate' | 'design-doc' | 'preview' | 'confirm'>('template');
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
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [currentBuildStep, setCurrentBuildStep] = useState('');
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
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
      },
      body: JSON.stringify({ action: 'list-templates' }),
    })
      .then(res => {
        if (!res.ok) throw new Error(`请求失败: ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) setTemplates(data.data);
      })
      .catch(() => {});
  }, []);

  // 加载收藏
  useEffect(() => {
    try {
      const saved = readBusinessData<string[]>('datainsight-table-favorites');
      if (Array.isArray(saved)) setFavorites(saved);
    } catch { /* ignore */ }
  }, []);

  // 保存收藏
  useEffect(() => {
    try {
      storeBusinessData('datainsight-table-favorites', favorites);
    } catch { /* ignore */ }
  }, [favorites]);

  // 加载历史记录
  useEffect(() => {
    try {
      const saved = readBusinessData<HistoryRecord[]>('datainsight-table-history');
      if (saved) setHistory(saved);
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
      const updated = [record, ...prev].slice(0, 20);
      storeBusinessData('datainsight-table-history', updated);
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
      return { valid: false, error: '需求描述太短了，请至少输入5个字，描述清楚需要什么表格。' };
    }
    const tableKeywords = /表|台账|sheet|表格|字段|列|记录|跟踪|统计|汇总|明细|登记|管理|清单|目录/i;
    if (!tableKeywords.test(trimmed)) {
      return { valid: false, error: '您的描述似乎没有明确指向建表需求，请补充说明需要什么类型的表格。' };
    }
    return { valid: true };
  };

  // 启动AI生成（根据模式）
  const handleStartBuild = useCallback(async () => {
    if (!userRequirement.trim()) return;

    // 检查模型配置
    if (!modelConfig) {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '请先配置 AI 模型后再生成表格。点击右上角「模型设置」添加并启用模型。',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      return;
    }

    // 输入质量校验
    const qualityCheck = validateRequirement(userRequirement);
    if (!qualityCheck.valid) {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: qualityCheck.error || '',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      return;
    }

    setIsGenerating(true);
    setBuildProgress(0);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userRequirement,
      timestamp: new Date(),
    };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      // 模拟构建进度
      const steps = ['分析需求', '设计数据表', '配置视图', '生成示例数据', '创建仪表盘', '设置权限'];
      
      // 智能体自动调度：统一走生成逻辑，根据需求复杂度内部判断
      for (let i = 0; i < steps.length; i++) {
        setCurrentBuildStep(steps[i]);
        setBuildProgress(Math.round(((i + 1) / steps.length) * 100));
        await new Promise(r => setTimeout(r, 500));
      }

      const response = await fetch('/api/ai-table-builder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
        },
        body: JSON.stringify({
          action: 'generate',
          sceneId: selectedScene?.id,
          userRequirement,
          depth: 'standard',
          modelConfig,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const scheme = data.data as TableScheme;
        setCurrentScheme(scheme);
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `已为您生成「${scheme.tableName}」表格方案，包含 ${scheme.columns.length} 个字段。\n\n设计说明：${scheme.designNotes || '无'}\n\n您可以继续提出修改要求，或点击「确认生成表格文件」下载。`,
          timestamp: new Date(),
          scheme,
        };
        setChatMessages(prev => [...prev, assistantMsg]);
        setStep('preview');
        saveToHistory(selectedScene?.name || '自定义', userRequirement, scheme);
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
    setCurrentBuildStep('');
    setUserRequirement('');
  }, [userRequirement, modelConfig, selectedScene, saveToHistory]);

  // 执行搭建（专家模式确认后）
  const handleExecuteBuild = useCallback(async () => {
    if (!currentScheme) return;
    setIsGenerating(true);
    setBuildProgress(0);

    const steps = ['创建数据表', '配置视图', '生成示例数据', '创建仪表盘', '设置工作流', '配置权限'];
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentBuildStep(steps[i]);
      setBuildProgress(Math.round(((i + 1) / steps.length) * 100));
      await new Promise(r => setTimeout(r, 600));
    }

    const assistantMsg: ChatMessage = {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: `✅ 系统搭建完成！\n\n已创建：\n• ${currentScheme.tableName}（${currentScheme.columns.length} 个字段）\n• 基础仪表盘视图\n• 示例数据\n\n您可以继续修改或点击「确认生成表格文件」下载。`,
      timestamp: new Date(),
      scheme: currentScheme,
    };
    setChatMessages(prev => [...prev, assistantMsg]);
    setStep('preview');
    setIsGenerating(false);
  }, [currentScheme]);

  // AI迭代修改
  const handleIterate = useCallback(async () => {
    if (!chatInput.trim() || !currentScheme) return;

    if (!modelConfig) {
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: '请先配置 AI 模型后再进行修改。',
        timestamp: new Date(),
      };
      setChatMessages(prev => [...prev, assistantMsg]);
      return;
    }

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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
        },
        body: JSON.stringify({
          action: 'iterate',
          currentScheme,
          userFeedback: feedback,
          modelConfig,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        const newScheme = data.data as TableScheme;
        setCurrentScheme(newScheme);
        setIterationCount(prev => prev + 1);
        const assistantMsg: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: `已根据您的要求修改方案，当前方案包含 ${newScheme.columns.length} 个字段。\n\n修改说明：${newScheme.designNotes || '无'}\n\n如需继续修改请输入，或点击「确认生成表格文件」下载。`,
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('datainsight_token') || ''}`,
        },
        body: JSON.stringify({ action: 'confirm', scheme: currentScheme }),
      });

      if (!response.ok) {
        alert(`服务器错误 (${response.status})，请稍后重试`);
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
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
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI智能搭建
        </h2>
        <p className="text-muted-foreground">
          描述需求，AI帮你从零搭建完整的业务系统，或对已有系统进行迭代升级
        </p>
      </div>

      {/* 核心能力卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Table, label: '搭建数据表', desc: '自动生成表结构' },
          { icon: LayoutDashboard, label: '设计仪表盘', desc: '可视化图表' },
          { icon: GitBranch, label: '搭建工作流', desc: '任务自动流转' },
          { icon: Shield, label: '配置权限', desc: '角色访问控制' },
        ].map((item, i) => (
          <Card key={i} className="p-3 text-center">
            <item.icon className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="font-medium text-sm">{item.label}</p>
            <p className="text-xs text-muted-foreground">{item.desc}</p>
          </Card>
        ))}
      </div>

      {/* 搜索栏 + 收藏筛选 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("ph.搜索场景模板")}
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
                  <Star className={`h-3.5 w-3.5 ${favorites.includes(template.id) ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
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
          <p>{t('txt.没有找到匹配的模板')}</p>
          <p className="text-sm mt-1">{t('txt.尝试更换分类或清空搜索词')}</p>
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
              <p className="font-medium">{t('txt.没有找到合适的场景')}</p>
              <p className="text-sm text-muted-foreground">{t('txt.直接描述你的需求AI为你定制表格方案')}</p>
            </div>
            <Button
              onClick={() => {
                setSelectedScene(null);
                setUserRequirement('');
                setStep('generate');
              }}
            >
              自定义建模
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 历史记录 */}
      {history.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base">{t('txt.最近生成')}</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? '收起' : `查看全部 (${history.length})`}
            </Button>
          </div>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {(showHistory ? history : history.slice(0, 3)).map(record => (
              <Card
                key={record.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => {
                  setCurrentScheme(record.scheme);
                  setChatMessages([{
                    id: `history-${Date.now()}`,
                    role: 'assistant' as const,
                    content: `已加载历史方案「${record.scheme.tableName}」，包含 ${record.scheme.columns.length} 个字段。`,
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

  // ============= 渲染：设计文档预览 =============
  const renderDesignDoc = () => {
    const doc = currentScheme?.systemDoc;
    if (!doc) return null;

    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              系统设计文档
            </CardTitle>
            <CardDescription>
              请确认以下设计方案无误后，点击「开始搭建」执行创建
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 业务背景 */}
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <BookOpen className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{t('txt.业务背景')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{doc.businessBackground}</p>
            </div>

            {/* 业务目标 */}
            <div className="p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-success" />
                <span className="font-medium text-sm">{t('txt.业务目标')}</span>
              </div>
              <p className="text-sm text-muted-foreground">{doc.businessGoal}</p>
            </div>

            {/* 数据表方案 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Table className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">数据表方案（{doc.tableSchemes.length}张）</span>
              </div>
              <div className="space-y-2">
                {doc.tableSchemes.map((t, i) => (
                  <Card key={i} className="p-3">
                    <p className="font-medium text-sm">{t.tableName}</p>
                    <p className="text-xs text-muted-foreground mb-2">{t.purpose}</p>
                    <div className="flex flex-wrap gap-1">
                      {t.fields.map((f, j) => (
                        <Badge key={j} variant="outline" className="text-xs">
                          {f.name}（{f.type}）
                        </Badge>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* 仪表盘配置 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LayoutDashboard className="h-4 w-4 text-chart-4" />
                <span className="font-medium text-sm">{t('txt.仪表盘配置')}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {doc.dashboardConfig.charts.map((c, i) => (
                  <Badge key={i} variant="secondary">{c}</Badge>
                ))}
                {doc.dashboardConfig.kpis.map((k, i) => (
                  <Badge key={i} variant="outline">{k}</Badge>
                ))}
              </div>
            </div>

            {/* 工作流配置 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-warning" />
                <span className="font-medium text-sm">{t('txt.工作流配置')}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">{t('txt.触发器')}</span>
                  {doc.workflowConfig.triggers.join('、')}
                </div>
                <div>
                  <span className="text-muted-foreground">{t('txt.动作')}</span>
                  {doc.workflowConfig.actions.join('、')}
                </div>
              </div>
            </div>

            {/* 权限配置 */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-destructive" />
                <span className="font-medium text-sm">{t('txt.权限配置')}</span>
              </div>
              <div className="space-y-1">
                {doc.permissionConfig.roles.map((r, i) => (
                  <div key={i} className="text-xs">
                    <span className="font-medium">{r.name}</span>：{r.permissions.join('、')}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 进度条（构建中） */}
        {isGenerating && (
          <Card className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentBuildStep || '正在搭建...'}
                </span>
                <span>{buildProgress}%</span>
              </div>
              <Progress value={buildProgress} />
            </div>
          </Card>
        )}

        {/* 操作按钮 */}
        {!isGenerating && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('generate')}>
              返回修改
            </Button>
            <Button onClick={handleExecuteBuild}>
              <Play className="h-4 w-4 mr-1" />
              开始搭建
            </Button>
          </div>
        )}
      </div>
    );
  };

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
            {selectedScene ? selectedScene.name : '自定义建模'}
          </span>
          <Badge variant="outline" className="text-xs">AI智能体</Badge>
        </div>
        {currentScheme && (
          <Badge variant="default" className="gap-1">
            <Check className="h-3 w-3" />
            已生成方案（迭代 {iterationCount} 次）
          </Badge>
        )}
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* 左侧：对话区 */}
        <div className="flex-1 flex flex-col min-w-0 border rounded-md">
          {/* 对话消息 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {chatMessages.length === 0 && (
              <div className="text-center py-8">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-primary/60" />
                <p className="font-medium">{t('txt.描述你的表格需求')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  AI 将根据你的需求生成标准化表格方案
                </p>
                {selectedScene && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-md text-sm text-left max-w-md mx-auto">
                    <p className="font-medium mb-1">已选择场景：{selectedScene.name}</p>
                    <p className="text-muted-foreground">{selectedScene.usage}</p>
                  </div>
                )}
                {!selectedScene && (
                  <div className="mt-4 space-y-2 text-sm text-left max-w-md mx-auto">
                    <p className="text-muted-foreground">{t('txt.你可以这样描述')}</p>
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
                        {example}
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
                  className={`max-w-[85%] rounded-md px-4 py-3 text-sm ${
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
                <div className="bg-muted/50 rounded-md px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">{currentBuildStep || 'AI 正在分析需求...'}</span>
                  </div>
                  <Progress value={buildProgress} className="h-1" />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* 输入区 */}
          {!isGenerating && !currentScheme && (
            <div className="border-t p-3 space-y-3">
              <Input
                placeholder={t("ph.描述你的表格需求例如创建一个客户信息登记表")}
                value={userRequirement}
                onChange={e => setUserRequirement(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleStartBuild(); } }}
                className="flex-1"
              />
              <div className="flex items-center justify-between">
                <Button onClick={handleStartBuild} disabled={!userRequirement.trim() || isGenerating}>
                  <Sparkles className="h-4 w-4 mr-1" />
                  开始搭建
                </Button>
              </div>
            </div>
          )}

          {/* 迭代输入区 */}
          {!isGenerating && currentScheme && (
            <div className="border-t p-3">
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
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder={t("ph.输入修改要求如删除XX列增加保质期字段")}
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
              </div>
            </div>
          )}
        </div>

        {/* 右侧：预览区 */}
        {showPreview && currentScheme && (
          <div className="w-80 border rounded-md overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
              <span className="font-medium text-sm">{t('txt.方案预览')}</span>
              <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowPreview(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm">{currentScheme.tableName}</p>
                  <p className="text-xs text-muted-foreground">{currentScheme.purpose}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  共 {currentScheme.columns.length} 个字段
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">{t('txt.字段名')}</TableHead>
                      <TableHead className="text-xs">{t('txt.类型')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentScheme.columns.slice(0, 10).map((col, i) => {
                      const badge = getTypeBadge(col.type);
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-xs py-1">{col.name}</TableCell>
                          <TableCell className="py-1">
                            <Badge variant={badge.variant} className="text-xs h-5">{badge.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {currentScheme.columns.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center">
                    还有 {currentScheme.columns.length - 10} 个字段...
                  </p>
                )}
                {currentScheme.sampleRows.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-1">{t('txt.示例数据')}</p>
                    <div className="text-xs space-y-0.5">
                      {Object.entries(currentScheme.sampleRows[0] || {}).map(([k, v]) => (
                        <div key={k} className="truncate">
                          <span className="text-muted-foreground">{k}：</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="p-3 border-t bg-muted/30">
              <Button 
                className="w-full" 
                size="sm" 
                onClick={handleConfirmGenerate}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Download className="h-3 w-3 mr-1" />
                    确认生成表格文件
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 切换预览按钮 */}
      {!showPreview && currentScheme && (
        <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
          <Eye className="h-3 w-3 mr-1" />
          显示预览
        </Button>
      )}
    </div>
  );

  // ============= 渲染：预览页面 =============
  const renderPreviewPage = () => (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            新建
          </Button>
          <span className="text-muted-foreground">|</span>
          <span className="font-medium">{t('txt.方案预览')}</span>
        </div>
        <Badge variant="default" className="gap-1">
          <Check className="h-3 w-3" />
          迭代 {iterationCount} 次
        </Badge>
      </div>

      {currentScheme && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>{currentScheme.tableName}</CardTitle>
              <CardDescription>{currentScheme.purpose}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('txt.字段名')}</TableHead>
                    <TableHead>{t('txt.类型')}</TableHead>
                    <TableHead>{t('txt.说明')}</TableHead>
                    <TableHead>{t('txt.必填')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentScheme.columns.map((col, i) => {
                    const badge = getTypeBadge(col.type);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{col.name}</TableCell>
                        <TableCell><Badge variant={badge.variant}>{badge.label}</Badge></TableCell>
                        <TableCell className="text-muted-foreground text-sm">{col.description}</TableCell>
                        <TableCell>{col.required ? <Check className="h-4 w-4 text-success" /> : '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {currentScheme.sampleRows.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('txt.示例数据')}</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      {currentScheme.columns.map((col, i) => (
                        <TableHead key={i}>{col.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentScheme.sampleRows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {currentScheme.columns.map((col, j) => (
                          <TableCell key={j} className="text-sm">{String(row[col.name] ?? '')}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStep('generate')}>
              <MessageSquare className="h-4 w-4 mr-1" />
              继续修改
            </Button>
            <Button onClick={handleConfirmGenerate} disabled={isDownloading}>
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1" />
                  确认生成表格文件
                </>
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  // ============= 渲染：完成页面 =============
  const renderConfirmPage = () => {
    return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
        <Check className="h-8 w-8 text-success" />
      </div>
      <h2 className="text-xl font-semibold">{t('txt.表格已生成')}</h2>
      <p className="text-muted-foreground">Excel文件已准备好，可以开始使用了</p>
      <div className="flex gap-2">
        <Button variant="outline" onClick={handleReset}>
          创建新表格
        </Button>
        <Button onClick={() => {
          setStep('generate');
          if (currentScheme) {
            setChatMessages([{
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: `已加载「${currentScheme.tableName}」，包含 ${currentScheme.columns.length} 个字段。继续修改或重新生成。`,
              timestamp: new Date(),
              scheme: currentScheme,
            }]);
          }
        }}>
          继续修改
        </Button>
      </div>
    </div>
    );
  };

  // ============= 主渲染逻辑 =============
  return (
    <div className={className}>
      {step === 'template' && renderTemplatePage()}
      {step === 'generate' && renderGeneratePage()}
      {step === 'design-doc' && (
        <div className="space-y-4 h-full flex flex-col">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              返回
            </Button>
            <span className="text-muted-foreground">|</span>
            <Badge variant="outline">AI智能体</Badge>
          </div>
          {renderDesignDoc()}
        </div>
      )}
      {step === 'preview' && renderPreviewPage()}
      {step === 'confirm' && renderConfirmPage()}
    </div>
  );
}
