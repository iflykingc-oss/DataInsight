'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { safeSetItem } from '@/lib/safe-storage';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';

import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Trash2,
  Plus,
  ArrowRight,
  Filter,
  RefreshCw,
  CheckCircle,
  Copy,
  Merge,
  Calculator,
  Type,
  Hash,
  Calendar,
  Sparkles,
  Wand2,
  Undo2,
  Eye,
  Loader2,
  GripVertical,
  Settings,
  Zap,
  MessageSquare,
  X,
  Check,
  Save,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

// AI 清洗意图识别
interface AICleanIntent {
  action: 'filter' | 'deduplicate' | 'fillnull' | 'convert' | 'calculate' | 'rename' | 'normalize' | 'merge';
  confidence: number;
  explanation: string;
  config: Record<string, string | number>;
}

interface CleaningStep {
  id: string;
  type: 'filter' | 'deduplicate' | 'fillnull' | 'convert' | 'calculate' | 'rename' | 'normalize' | 'merge';
  config: Record<string, string | number>;
  enabled: boolean;
  description: string;
}

interface DataCleanerProps {
  data: ParsedData;
  fieldStats: FieldStat[];
  onDataChange?: (data: ParsedData) => void;
}

// 常用清洗指令模板
const QUICK_ACTIONS = [
  { icon: Filter, label: '删除空白行', prompt: '删除所有空行' },
  { icon: Merge, label: '去除重复', prompt: '去除完全重复的数据' },
  { icon: Type, label: '清除空格', prompt: '清除所有单元格的前后空格' },
  { icon: Hash, label: '填补空值', prompt: '用0填补所有空值' },
  { icon: Calendar, label: '统一日期格式', prompt: '统一日期格式为YYYY-MM-DD' },
  { icon: Calculator, label: '去除异常值', prompt: '去除数值字段中的异常值' },
];

// 口语化操作名称
const OPERATION_LABELS: Record<string, { name: string; icon: React.ElementType }> = {
  filter: { name: '筛选过滤', icon: Filter },
  deduplicate: { name: '去除重复', icon: Copy },
  fillnull: { name: '填补空值', icon: Hash },
  convert: { name: '类型转换', icon: Type },
  calculate: { name: '计算字段', icon: Calculator },
  rename: { name: '重命名', icon: Settings },
  normalize: { name: '数据标准化', icon: Zap },
  merge: { name: '合并类目', icon: Merge },
};

export function DataCleaner({ data, fieldStats, onDataChange }: DataCleanerProps) {
  // 状态
  const { t } = useI18n();
  const [cleaningSteps, setCleaningSteps] = useState<CleaningStep[]>([]);
  const [previewData, setPreviewData] = useState<{ before: ParsedData; after: ParsedData }>({ before: data, after: data });
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiIntent, setAiIntent] = useState<AICleanIntent | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [history, setHistory] = useState<ParsedData[]>([data]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(true);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  
  // 快速操作状态
  const [quickFilterField, setQuickFilterField] = useState('');
  const [quickFilterOp, setQuickFilterOp] = useState('equals');
  const [quickFilterValue, setQuickFilterValue] = useState('');

  // 清洗模板保存/加载
  const [savedTemplates, setSavedTemplates] = useState<Array<{ id: string; name: string; steps: CleaningStep[]; savedAt: string }>>([]);
  const [templateName, setTemplateName] = useState('');
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [showTemplateLoad, setShowTemplateLoad] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('datainsight-clean-templates');
      if (saved) setSavedTemplates(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  const handleSaveTemplate = () => {
    const name = templateName.trim() || `清洗模板 ${savedTemplates.length + 1}`;
    const newTemplate = {
      id: `tpl-${Date.now()}`,
      name,
      steps: cleaningSteps,
      savedAt: new Date().toLocaleString(),
    };
    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    safeSetItem('datainsight-clean-templates', JSON.stringify(updated));
    setShowTemplateSave(false);
    setTemplateName('');
  };

  const handleLoadTemplate = (templateId: string) => {
    const tpl = savedTemplates.find(t => t.id === templateId);
    if (tpl) {
      setCleaningSteps(tpl.steps);
      setShowTemplateLoad(false);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updated = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updated);
    safeSetItem('datainsight-clean-templates', JSON.stringify(updated));
  };
  const [nullFillField, setNullFillField] = useState('');
  const [nullFillMethod, setNullFillMethod] = useState<'value' | 'mean' | 'median' | 'mode' | 'forward'>('value');
  const [nullFillValue, setNullFillValue] = useState('');

  // 生成唯一ID
  const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // 获取字段统计
  const getFieldStat = (field: string) => fieldStats.find(f => f.field === field);

  // 应用清洗 - 改为普通函数避免顺序问题
  const applyCleaningFn = useCallback((steps: CleaningStep[]) => {
    const result = { ...data, rows: [...data.rows] };
    
    steps.filter(s => s.enabled).forEach(step => {
      switch (step.type) {
        case 'filter':
          if (step.config.operator === 'not_empty') {
            result.rows = result.rows.filter(row => {
              return Object.values(row).some(v => v !== null && v !== undefined && v !== '');
            });
          } else if (step.config.operator === 'no_duplicate') {
            const seen = new Set<string>();
            result.rows = result.rows.filter(row => {
              const key = JSON.stringify(row);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          } else if (step.config.operator === 'not_outlier') {
            const numField = data.headers.find(h => 
              fieldStats.find(f => f.field === h && f.type === 'number')
            );
            if (numField) {
              const values = result.rows.map(r => Number(r[numField])).filter(v => !isNaN(v));
              const mean = values.reduce((a, b) => a + b, 0) / values.length;
              const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
              const threshold = Number(step.config.threshold) || 3;
              result.rows = result.rows.filter(row => {
                const val = Number(row[numField]);
                return Math.abs(val - mean) <= threshold * std;
              });
            }
          }
          break;
          
        case 'deduplicate':
          const seenDedup = new Set<string>();
          result.rows = result.rows.filter(row => {
            const key = JSON.stringify(row);
            if (seenDedup.has(key)) return false;
            seenDedup.add(key);
            return true;
          });
          break;
          
        case 'fillnull':
          result.rows = result.rows.map(row => {
            const newRow = { ...row };
            const fields = step.config.fields === 'all' 
              ? data.headers 
              : [String(step.config.field)];
            
            fields.forEach(field => {
              if (newRow[field] === null || newRow[field] === undefined || newRow[field] === '') {
                const method = step.config.method as string;
                if (method === 'value') {
                  newRow[field] = String(step.config.value ?? '');
                } else if (method === 'mean') {
                  const values = data.rows.map(r => Number(r[field])).filter(v => !isNaN(v));
                  newRow[field] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                } else if (method === 'median') {
                  const nums = data.rows.map(r => Number(r[field])).filter(v => !isNaN(v)).sort((a, b) => a - b);
                  newRow[field] = nums.length % 2 === 0 
                    ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2 
                    : nums[Math.floor(nums.length / 2)];
                } else if (method === 'mode') {
                  const countMap = new Map<string, number>();
                  data.rows.forEach(r => {
                    const v = String(r[field]);
                    countMap.set(v, (countMap.get(v) || 0) + 1);
                  });
                  let maxCount = 0, modeValue = '';
                  countMap.forEach((count, v) => {
                    if (count > maxCount) { maxCount = count; modeValue = v; }
                  });
                  newRow[field] = modeValue;
                } else if (method === 'forward') {
                  // 前向填充
                  const rowIdx = result.rows.indexOf(row);
                  for (let i = rowIdx - 1; i >= 0; i--) {
                    const prev = result.rows[i]?.[field];
                    if (prev !== null && prev !== undefined && prev !== '') {
                      newRow[field] = prev;
                      break;
                    }
                  }
                }
              }
            });
            return newRow;
          });
          break;
          
        case 'normalize':
          result.rows = result.rows.map(row => {
            const newRow = { ...row };
            data.headers.forEach(h => {
              if (typeof newRow[h] === 'string') {
                newRow[h] = String(newRow[h]).trim();
              }
            });
            return newRow;
          });
          break;
          
        case 'convert':
          // 日期格式转换
          {
            const targetFormat = String(step.config.targetFormat || 'YYYY-MM-DD');
            // 找出所有日期类型的列
            const dateFields = data.headers.filter(h => {
              const stat = fieldStats.find(f => f.field === h);
              return stat?.type === 'date' || stat?.type === 'string';
            });
            
            // 常见日期格式的正则表达式
            const datePatterns = [
              { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s|T|$)/, parse: (m: RegExpMatchArray) => ({ y: m[1], m: m[2], d: m[3] }) }, // YYYY-MM-DD
              { regex: /^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s|T|$)/, parse: (m: RegExpMatchArray) => ({ y: m[1], m: m[2], d: m[3] }) }, // YYYY/MM/DD
              { regex: /^(\d{4})\.(\d{1,2})\.(\d{1,2})(?:\s|T|$)/, parse: (m: RegExpMatchArray) => ({ y: m[1], m: m[2], d: m[3] }) }, // YYYY.MM.DD
              { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s|T|$)/, parse: (m: RegExpMatchArray) => ({ y: m[3], m: m[1], d: m[2] }) }, // MM/DD/YYYY
              { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s|T|$)/, parse: (m: RegExpMatchArray) => ({ y: m[3], m: m[1], d: m[2] }) }, // MM-DD-YYYY
              { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:\s|T|$)/, parse: (m: RegExpMatchArray) => ({ y: m[3], m: m[1], d: m[2] }) }, // DD.MM.YYYY
            ];
            
            // 格式化日期组件
            const pad = (n: string | number) => String(n).padStart(2, '0');
            
            // 转换日期字符串
            const convertDate = (dateStr: string): string => {
              const trimmed = String(dateStr).trim();
              
              for (const pattern of datePatterns) {
                const match = trimmed.match(pattern.regex);
                if (match) {
                  try {
                    const { y, m, d } = pattern.parse(match);
                    const year = y.length === 2 ? (parseInt(y) > 50 ? '19' + y : '20' + y) : y;
                    const month = pad(parseInt(m));
                    const day = pad(parseInt(d));
                    
                    // 根据目标格式进行格式化
                    switch (targetFormat) {
                      case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
                      case 'YYYY/MM/DD': return `${year}/${month}/${day}`;
                      case 'YYYY.MM.DD': return `${year}.${month}.${day}`;
                      case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
                      case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
                      case 'MM-DD-YYYY': return `${month}-${day}-${year}`;
                      case 'DD.MM.YYYY': return `${day}.${month}.${year}`;
                      default: return `${year}-${month}-${day}`;
                    }
                  } catch (e) {
                    // 解析失败，尝试下一个格式
                  }
                }
              }
              
              // 如果无法解析，尝试用 Date 对象
              try {
                const date = new Date(trimmed);
                if (!isNaN(date.getTime())) {
                  const year = date.getFullYear();
                  const month = pad(date.getMonth() + 1);
                  const day = pad(date.getDate());
                  switch (targetFormat) {
                    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
                    case 'YYYY/MM/DD': return `${year}/${month}/${day}`;
                    case 'YYYY.MM.DD': return `${year}.${month}.${day}`;
                    case 'DD-MM-YYYY': return `${day}-${month}-${year}`;
                    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
                    case 'MM-DD-YYYY': return `${month}-${day}-${year}`;
                    case 'DD.MM.YYYY': return `${day}.${month}.${year}`;
                    default: return `${year}-${month}-${day}`;
                  }
                }
              } catch (e) {
                // 无法解析
              }
              
              // 无法转换，返回原值
              return trimmed;
            };
            
            // 应用到所有日期字段
            result.rows = result.rows.map(row => {
              const newRow = { ...row };
              dateFields.forEach(field => {
                const value = row[field];
                if (value !== null && value !== undefined && value !== '') {
                  const strValue = String(value);
                  // 只处理看起来像日期的值
                  if (/\d/.test(strValue) && /[./-]/.test(strValue)) {
                    newRow[field] = convertDate(strValue);
                  }
                }
              });
              return newRow;
            });
          }
          break;
      }
    });
    
    result.rowCount = result.rows.length;
    setPreviewData({ before: data, after: result });
  }, [data, fieldStats]);

  // AI 意图识别
  const recognizeIntent = useCallback((prompt: string): AICleanIntent => {
    const lowerPrompt = prompt.toLowerCase();
    
    // 意图匹配规则
    const intentRules: Array<{
      keywords: string[];
      action: AICleanIntent['action'];
      explanation: string;
      getConfig: () => Record<string, string | number>;
    }> = [
      {
        keywords: ['删除', '清除', '移除', '过滤', '去除'],
        action: 'filter',
        explanation: '根据条件筛选数据',
        getConfig: () => {
          if (lowerPrompt.includes('空') || lowerPrompt.includes('空白')) {
            return { field: 'auto', operator: 'not_empty' };
          }
          if (lowerPrompt.includes('重复')) {
            return { field: 'auto', operator: 'no_duplicate' };
          }
          return { field: 'auto', operator: 'not_empty' };
        }
      },
      {
        keywords: ['重复', '去重', '唯一'],
        action: 'deduplicate',
        explanation: '去除重复的数据行',
        getConfig: () => ({ fields: 'all' })
      },
      {
        keywords: ['空', '缺失', 'null', 'none', '填补', '填充'],
        action: 'fillnull',
        explanation: '处理空值数据',
        getConfig: () => {
          if (lowerPrompt.includes('0') || lowerPrompt.includes('零')) {
            return { method: 'value', value: 0 };
          }
          if (lowerPrompt.includes('平均') || lowerPrompt.includes('均值')) {
            return { method: 'mean', value: 0 };
          }
          if (lowerPrompt.includes('中位')) {
            return { method: 'median', value: 0 };
          }
          return { method: 'mode', value: '' };
        }
      },
      {
        keywords: ['空格', '空格', 'trim', '去空格'],
        action: 'normalize',
        explanation: '清除文本中的多余空格',
        getConfig: () => ({ type: 'trim', fields: 'all' })
      },
      {
        keywords: ['日期', '格式', 'yyyy', 'mm', 'dd'],
        action: 'convert',
        explanation: '统一日期格式',
        getConfig: () => ({ targetFormat: 'YYYY-MM-DD' })
      },
      {
        keywords: ['异常', 'outlier', '离群'],
        action: 'filter',
        explanation: '识别并处理异常值',
        getConfig: () => ({ field: 'auto', operator: 'not_outlier', threshold: 3 })
      }
    ];

    // 简单匹配
    for (const rule of intentRules) {
      if (rule.keywords.some(k => lowerPrompt.includes(k))) {
        return {
          action: rule.action,
          confidence: 0.85,
          explanation: rule.explanation,
          config: rule.getConfig()
        };
      }
    }

    // 默认返回通用筛选
    return {
      action: 'filter',
      confidence: 0.5,
      explanation: '根据您的描述进行数据筛选',
      config: { field: 'auto' }
    };
  }, []);

  // AI 清洗处理
  const handleAIClean = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    
    setIsAIProcessing(true);
    
    // 模拟 AI 处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 识别意图
    const intent = recognizeIntent(aiPrompt);
    setAiIntent(intent);
    
    // 创建清洗步骤
    const step: CleaningStep = {
      id: generateId('ai-step'),
      type: intent.action,
      config: { ...intent.config, prompt: aiPrompt },
      enabled: true,
      description: intent.explanation
    };
    
    const newSteps = [...cleaningSteps, step];
    setCleaningSteps(newSteps);
    
    // 应用清洗
    applyCleaningFn(newSteps);
    
    setIsAIProcessing(false);
    setAiPrompt('');
  }, [aiPrompt, recognizeIntent, cleaningSteps, applyCleaningFn]);

  // 快速清洗操作
  const handleQuickClean = useCallback((prompt: string) => {
    setAiPrompt(prompt);
    const intent = recognizeIntent(prompt);
    setAiIntent(intent);
    
    const step: CleaningStep = {
      id: generateId('quick-step'),
      type: intent.action,
      config: intent.config,
      enabled: true,
      description: intent.explanation
    };
    
    const newSteps = [...cleaningSteps, step];
    setCleaningSteps(newSteps);
    applyCleaningFn(newSteps);
  }, [cleaningSteps, recognizeIntent, applyCleaningFn]);


  // 添加清洗步骤
  const addStep = useCallback((step: Omit<CleaningStep, 'id'>) => {
    const newStep: CleaningStep = {
      ...step,
      id: generateId('step')
    };
    const newSteps = [...cleaningSteps, newStep];
    setCleaningSteps(newSteps);
    applyCleaningFn(newSteps);
  }, [cleaningSteps, applyCleaningFn]);

  // 删除清洗步骤
  const removeStep = useCallback((id: string) => {
    const newSteps = cleaningSteps.filter(s => s.id !== id);
    setCleaningSteps(newSteps);
    applyCleaningFn(newSteps);
  }, [cleaningSteps, applyCleaningFn]);
  
  // 切换步骤启用状态
  const toggleStep = useCallback((id: string) => {
    const newSteps = cleaningSteps.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setCleaningSteps(newSteps);
    applyCleaningFn(newSteps);
  }, [cleaningSteps, applyCleaningFn]);
  
  // 单步撤销
  const undoStep = useCallback((id: string) => {
    const stepIndex = cleaningSteps.findIndex(s => s.id === id);
    if (stepIndex === -1) return;
    
    const newSteps = cleaningSteps.slice(0, stepIndex);
    setCleaningSteps(newSteps);
    applyCleaningFn(newSteps);
  }, [cleaningSteps, applyCleaningFn]);

  // 确认应用清洗
  const confirmCleaning = useCallback(() => {
    // 保存到历史
    const newHistory = [...history.slice(0, historyIndex + 1), previewData.after];
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    onDataChange?.(previewData.after);
  }, [previewData.after, onDataChange, history, historyIndex]);

  // 重置清洗
  const resetCleaning = useCallback(() => {
    setCleaningSteps([]);
    setPreviewData({ before: data, after: data });
    setAiPrompt('');
    setAiIntent(null);
  }, [data]);

  // 预览数据前5行
  const previewRows = useMemo(() => {
    const rows = previewData.after.rows.slice(0, 5);
    return rows.length > 0 ? rows : [];
  }, [previewData.after.rows]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-500" />
            数据清洗
            <Badge variant="secondary" className="ml-auto">
              {cleaningSteps.length} 个清洗步骤
            </Badge>
            <div className="ml-2 flex gap-1">
              {cleaningSteps.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowTemplateSave(true)}>
                  <Save className="w-3 h-3" />
                  保存模板
                </Button>
              )}
              {savedTemplates.length > 0 && (
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setShowTemplateLoad(true)}>
                  <FolderOpen className="w-3 h-3" />
                  加载模板 ({savedTemplates.length})
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="ai" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai" className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                AI 智能清洗
              </TabsTrigger>
              <TabsTrigger value="quick" className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                快捷操作
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-1">
                <Settings className="w-4 h-4" />
                高级配置
              </TabsTrigger>
            </TabsList>
            
            {/* AI 智能清洗 */}
            <TabsContent value="ai" className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 rounded-md">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-purple-700">{t('txt.用自然语言描述清洗需求')}</p>
                    <p className="text-xs text-purple-600 mt-1">
                      例如：{'"'}删除所有空行{'"'}、{'"'}去除重复数据{'"'}、{'"'}用0填补空值{'"'}
                    </p>
                  </div>
                </div>
                
                {/* 输入框 */}
                <div className="mt-4 relative">
                  <Textarea
                    placeholder={t("ph.用口语描述你的清洗需求比如删除空白行去掉重复的数据")}
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    rows={2}
                    className="resize-none pr-20"
                  />
                  <Button 
                    size="sm" 
                    className="absolute right-2 bottom-2"
                    onClick={handleAIClean}
                    disabled={!aiPrompt.trim() || isAIProcessing}
                  >
                    {isAIProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-1" />
                        AI 执行
                      </>
                    )}
                  </Button>
                </div>
                
                {/* AI 识别结果 */}
                {aiIntent && (
                  <div className="mt-4 p-3 bg-white rounded-md border">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">AI 识别结果</span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        置信度 {Math.round(aiIntent.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{aiIntent.explanation}</p>
                  </div>
                )}
              </div>
              
              {/* 快捷指令 */}
              <div>
                <Label className="text-sm text-muted-foreground mb-2 block">{t('txt.常用指令')}</Label>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map((action) => (
                    <Tooltip key={action.label}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleQuickClean(action.prompt)}
                          className="text-xs"
                        >
                          <action.icon className="w-3 h-3 mr-1" />
                          {action.label}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{action.prompt}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            </TabsContent>
            
            {/* 快捷操作 */}
            <TabsContent value="quick" className="space-y-4">
              {/* 快速筛选 */}
              <div className="p-4 border rounded-md space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Filter className="w-4 h-4 text-blue-500" />
                  快速筛选
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  <Select value={quickFilterField} onValueChange={setQuickFilterField}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("ph.选择字段")} />
                    </SelectTrigger>
                    <SelectContent>
                      {data.headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={quickFilterOp} onValueChange={setQuickFilterOp}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">{t('txt.等于')}</SelectItem>
                      <SelectItem value="not_equals">{t('txt.不等于')}</SelectItem>
                      <SelectItem value="contains">{t('txt.包含')}</SelectItem>
                      <SelectItem value="greater">{t('txt.大于')}</SelectItem>
                      <SelectItem value="less">{t('txt.小于')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder={t("ph.筛选值")}
                    value={quickFilterValue}
                    onChange={e => setQuickFilterValue(e.target.value)}
                  />
                  <Button onClick={() => {
                    addStep({
                      type: 'filter',
                      config: { field: quickFilterField, operator: quickFilterOp, value: quickFilterValue },
                      enabled: true,
                      description: `筛选 ${quickFilterField} ${quickFilterOp} ${quickFilterValue}`
                    });
                  }}>
                    <Plus className="w-4 h-4 mr-1" />
                    应用
                  </Button>
                </div>
              </div>
              
              {/* 快速填充空值 */}
              <div className="p-4 border rounded-md space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Hash className="w-4 h-4 text-green-500" />
                  填补空值
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  <Select value={nullFillField} onValueChange={setNullFillField}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("ph.选择字段")} />
                    </SelectTrigger>
                    <SelectContent>
                      {data.headers.map(h => (
                        <SelectItem key={h} value={h}>{h} ({getFieldStat(h)?.nullCount || 0}空)</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={nullFillMethod} onValueChange={v => setNullFillMethod(v as typeof nullFillMethod)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value">{t('txt.固定值')}</SelectItem>
                      <SelectItem value="mean">{t('txt.均值')}</SelectItem>
                      <SelectItem value="median">{t('txt.中位数')}</SelectItem>
                      <SelectItem value="mode">{t('txt.众数')}</SelectItem>
                      <SelectItem value="forward">{t('txt.前向填充')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    placeholder={nullFillMethod === 'value' ? '填入的值' : '（自动计算）'}
                    value={nullFillValue}
                    onChange={e => setNullFillValue(e.target.value)}
                    disabled={nullFillMethod !== 'value'}
                  />
                  <Button onClick={() => {
                    addStep({
                      type: 'fillnull',
                      config: { 
                        field: nullFillField, 
                        method: nullFillMethod, 
                        value: nullFillValue || (nullFillMethod === 'value' ? 0 : nullFillMethod)
                      },
                      enabled: true,
                      description: `用${nullFillMethod === 'value' ? nullFillValue : nullFillMethod}填补 ${nullFillField} 的空值`
                    });
                  }}>
                    <Plus className="w-4 h-4 mr-1" />
                    填补
                  </Button>
                </div>
              </div>
              
              {/* 快速去重 */}
              <div className="p-4 border rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Copy className="w-4 h-4 text-orange-500" />
                    <div>
                      <p className="text-sm font-medium">{t('txt.去除完全重复的行')}</p>
                      <p className="text-xs text-muted-foreground">
                        当前数据 {data.rowCount} 行，预计去除 {data.rowCount - new Set(data.rows.map(r => JSON.stringify(r))).size} 行重复
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleQuickClean('去除重复数据')}>
                    <Check className="w-4 h-4 mr-1" />
                    去重
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* 高级配置 */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p>{t('txt.高级配置面板')}</p>
                <p className="text-sm">{t('txt.支持自定义清洗规则和批量处理')}</p>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* 清洗步骤列表 */}
          {cleaningSteps.length > 0 && (
            <div className="border rounded-md">
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <span className="text-sm font-medium">清洗步骤 ({cleaningSteps.length})</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={resetCleaning}>
                    <RefreshCw className="w-3 h-3 mr-1" />
                    重置
                  </Button>
                </div>
              </div>
              <div className="p-2 max-h-48 overflow-auto">
                {cleaningSteps.map((step, index) => {
                  const OpInfo = OPERATION_LABELS[step.type];
                  // 生成详细描述
                  const getStepDetail = () => {
                    const config = step.config;
                    switch (step.type) {
                      case 'filter':
                        if (config.operator === 'not_empty') return '筛选非空行';
                        if (config.operator === 'no_duplicate') return '筛选无重复行';
                        if (config.operator === 'not_outlier') return '筛选去除异常值';
                        return `筛选字段: ${config.field || 'auto'}`;
                      case 'deduplicate':
                        return `去重字段: ${config.fields || '全部'}`;
                      case 'fillnull':
                        if (config.method === 'value') return `空值填为: ${config.value}`;
                        if (config.method === 'mean') return '空值填为均值';
                        if (config.method === 'median') return '空值填为中位数';
                        if (config.method === 'forward') return '空值前向填充';
                        return '空值填为众数';
                      case 'normalize':
                        return '清除多余空格';
                      case 'convert':
                        return `转换为: ${config.targetFormat || 'YYYY-MM-DD'}`;
                      default:
                        return step.description || OpInfo.name;
                    }
                  };
                  return (
                    <div 
                      key={step.id}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-md mb-1',
                        step.enabled ? 'bg-white border border-border' : 'bg-muted/30 opacity-60'
                      )}
                    >
                      <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                      <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                        {index + 1}
                      </span>
                      <OpInfo.icon className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{OpInfo.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{getStepDetail()}</p>
                      </div>
                      <Checkbox 
                        checked={step.enabled}
                        onCheckedChange={() => toggleStep(step.id)}
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => undoStep(step.id)}
                            className="h-6 w-6 p-0"
                          >
                            <Undo2 className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>{t('txt.撤销此步骤')}</TooltipContent>
                      </Tooltip>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => removeStep(step.id)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* 数据预览 */}
          {showPreview && (
            <div className="border rounded-md overflow-hidden">
              <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t('txt.数据预览')}</span>
                  <Badge variant="outline" className="text-xs">
                    {previewData.before.rowCount} → {previewData.after.rowCount} 行
                  </Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <ScrollArea className="max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {previewData.after.headers.map(h => (
                        <TableHead key={h} className="text-xs">{h}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, idx) => (
                      <TableRow key={idx}>
                        {previewData.after.headers.map(h => (
                          <TableCell key={h} className="text-xs py-1">
                            {String(row[h] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
          
          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-1" />
              {showPreview ? '隐藏' : '显示'}预览
            </Button>
            <Button 
              variant="outline" 
              onClick={resetCleaning}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              重置
            </Button>
            <Button 
              className="flex-1"
              onClick={confirmCleaning}
              disabled={cleaningSteps.length === 0}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              应用清洗 ({cleaningSteps.length} 步)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 模板保存对话框 */}
      {showTemplateSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowTemplateSave(false)}>
          <Card className="w-80" onClick={e => e.stopPropagation()}>
            <CardHeader><CardTitle className="text-base">{t('txt.保存清洗模板')}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder={t("ph.模板名称如电商数据标准清洗")}
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); }}
              />
              <p className="text-xs text-muted-foreground">将保存当前 {cleaningSteps.length} 个清洗步骤，可复用于同类数据</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowTemplateSave(false)}>{t('txt.取消')}</Button>
                <Button size="sm" onClick={handleSaveTemplate}>{t('txt.保存')}</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 模板加载对话框 */}
      {showTemplateLoad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowTemplateLoad(false)}>
          <Card className="w-96 max-h-80 overflow-auto" onClick={e => e.stopPropagation()}>
            <CardHeader><CardTitle className="text-base">{t('txt.加载清洗模板')}</CardTitle></CardHeader>
            <CardContent>
              {savedTemplates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">{t('txt.暂无已保存的模板')}</p>
              ) : (
                <div className="space-y-2">
                  {savedTemplates.map(tpl => (
                    <div
                      key={tpl.id}
                      className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50"
                      onClick={() => handleLoadTemplate(tpl.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground">{tpl.steps.length} 步 · {tpl.savedAt}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
