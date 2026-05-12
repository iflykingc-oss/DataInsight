'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  Save,
  Copy,
  Download,
  Upload,
  Star,
  StarOff,
  LayoutDashboard,
  FileText,
  BarChart3,
  Search,
  MoreVertical,
  Eye,
  Clock,
  Tag,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

// ============================================
// 类型定义
// ============================================

// 模板类型
type TemplateType = 'dashboard' | 'report' | 'chart' | 'layout';

// 模板分类
interface TemplateCategory {
  id: string;
  name: string;
  icon: React.ElementType;
  count: number;
}

// 模板定义
export interface Template {
  id: string;
  name: string;
  description: string;
  type: TemplateType;
  category: string;
  thumbnail?: string;
  content: Record<string, unknown>;
  isFavorite: boolean;
  isBuiltIn: boolean;
  tags: string[];
  usageCount: number;
  createdAt: number;
  updatedAt: number;
  author?: string;
}

// 预设模板
const BUILT_IN_TEMPLATES: Omit<Template, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: '销售分析仪表盘',
    description: '包含销售趋势、区域对比、产品分布等核心图表',
    type: 'dashboard',
    category: 'sales',
    isFavorite: false,
    isBuiltIn: true,
    tags: ['销售', '分析', '图表'],
    usageCount: 156,
    content: {
      charts: [
        { type: 'line', title: '销售趋势', xAxis: '月份', yAxis: '销售额' },
        { type: 'bar', title: '区域对比', xAxis: '地区', yAxis: '销量' },
        { type: 'pie', title: '产品分布', xAxis: '产品', yAxis: '占比' }
      ]
    }
  },
  {
    name: '用户增长分析',
    description: '追踪用户数量、留存率、转化漏斗等关键指标',
    type: 'dashboard',
    category: 'growth',
    isFavorite: false,
    isBuiltIn: true,
    tags: ['用户', '增长', '留存'],
    usageCount: 98,
    content: {
      charts: [
        { type: 'line', title: '用户趋势', xAxis: '日期', yAxis: '用户数' },
        { type: 'bar', title: '新增用户', xAxis: '周', yAxis: '新增' }
      ]
    }
  },
  {
    name: '财务汇总报表',
    description: '收入、成本、利润等财务指标汇总展示',
    type: 'report',
    category: 'finance',
    isFavorite: false,
    isBuiltIn: true,
    tags: ['财务', '报表', '汇总'],
    usageCount: 234,
    content: {
      sections: [
        { type: 'kpi', metrics: ['收入', '成本', '利润'] },
        { type: 'chart', title: '收支趋势' }
      ]
    }
  },
  {
    name: '运营数据概览',
    description: 'DAU、MAU、转化率等运营核心指标',
    type: 'dashboard',
    category: 'operation',
    isFavorite: false,
    isBuiltIn: true,
    tags: ['运营', 'DAU', '指标'],
    usageCount: 167,
    content: {
      charts: [
        { type: 'line', title: 'DAU趋势' },
        { type: 'gauge', title: '转化率' }
      ]
    }
  },
  {
    name: '市场数据分析',
    description: '市场份额、竞品对比、市场趋势分析',
    type: 'dashboard',
    category: 'market',
    isFavorite: false,
    isBuiltIn: true,
    tags: ['市场', '竞品', '份额'],
    usageCount: 89,
    content: {
      charts: [
        { type: 'pie', title: '市场份额' },
        { type: 'bar', title: '竞品对比' }
      ]
    }
  }
];

// 分类配置
const CATEGORIES: Array<{ id: string; name: string; icon: React.ElementType }> = [
  { id: 'all', name: '全部', icon: Grid },
  { id: 'dashboard', name: '仪表盘', icon: LayoutDashboard },
  { id: 'report', name: '报表', icon: FileText },
  { id: 'chart', name: '图表', icon: BarChart3 },
  { id: 'layout', name: '布局', icon: Grid }
];

// 本地存储键名
const TEMPLATES_STORAGE_KEY = 'datainsight_templates';
const FAVORITES_STORAGE_KEY = 'datainsight_template_favorites';

interface TemplateManagerProps {
  onTemplateSelect?: (template: Template) => void;
  className?: string;
}

export function TemplateManager({
  onTemplateSelect,
  className
}: TemplateManagerProps) {
  // 状态
  const { t } = useI18n();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<Partial<Template> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // 加载模板
  useEffect(() => {
    const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    const favorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    const favoriteIds = favorites ? JSON.parse(favorites) : [];

    // 合并内置模板和用户模板
    const builtIn = BUILT_IN_TEMPLATES.map((t, i) => ({
      ...t,
      id: `builtin-${i}`,
      createdAt: Date.now() - (i + 1) * 86400000,
      updatedAt: Date.now() - i * 86400000,
      isFavorite: favoriteIds.includes(`builtin-${i}`)
    }));

    const userTemplates = saved ? JSON.parse(saved) : [];
    userTemplates.forEach((t: Template) => {
      t.isFavorite = favoriteIds.includes(t.id);
    });

    setTemplates([...builtIn, ...userTemplates]);
  }, []);

  // 保存用户模板
  const saveUserTemplates = (userTemplates: Template[]) => {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(userTemplates));
  };

  // 保存收藏
  const saveFavorites = (favoriteIds: string[]) => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  };

  // 过滤模板
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      // 分类过滤
      if (selectedCategory !== 'all' && t.type !== selectedCategory) return false;
      
      // 收藏过滤
      if (showFavoritesOnly && !t.isFavorite) return false;
      
      // 搜索过滤
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some(tag => tag.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [templates, selectedCategory, showFavoritesOnly, searchQuery]);

  // 获取分类统计
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = { all: templates.length };
    CATEGORIES.slice(1).forEach(c => {
      stats[c.id] = templates.filter(t => t.type === c.id).length;
    });
    return stats;
  }, [templates]);

  // 创建模板
  const handleCreateTemplate = () => {
    setEditingTemplate({
      name: '',
      description: '',
      type: 'dashboard',
      category: 'custom',
      tags: [],
      content: {}
    });
    setIsCreating(true);
    setIsDialogOpen(true);
  };

  // 编辑模板
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate({ ...template });
    setIsCreating(false);
    setIsDialogOpen(true);
  };

  // 保存模板
  const handleSaveTemplate = () => {
    if (!editingTemplate?.name) return;

    if (isCreating) {
      const newTemplate: Template = {
        id: `user-${Date.now()}`,
        name: editingTemplate.name,
        description: editingTemplate.description || '',
        type: editingTemplate.type || 'dashboard',
        category: editingTemplate.category || 'custom',
        content: editingTemplate.content || {},
        isFavorite: false,
        isBuiltIn: false,
        tags: editingTemplate.tags || [],
        usageCount: 0,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      setTemplates(prev => [...prev, newTemplate]);
      saveUserTemplates([...templates.filter(t => !t.isBuiltIn), newTemplate]);
    } else if (editingTemplate.id) {
      const updated = templates.map(t => 
        t.id === editingTemplate.id 
          ? { ...t, ...editingTemplate, updatedAt: Date.now() }
          : t
      );
      setTemplates(updated);
      saveUserTemplates(updated.filter(t => !t.isBuiltIn));
    }

    setIsDialogOpen(false);
    setEditingTemplate(null);
  };

  // 删除模板
  const handleDelete = (id: string) => {
    const template = templates.find(t => t.id === id);
    if (template?.isBuiltIn) return; // 内置模板不能删除

    setTemplates(prev => prev.filter(t => t.id !== id));
    saveUserTemplates(templates.filter(t => !t.isBuiltIn && t.id !== id));
  };

  // 切换收藏
  const handleToggleFavorite = (id: string) => {
    const favoriteIds = templates.filter(t => t.isFavorite).map(t => t.id);
    
    if (favoriteIds.includes(id)) {
      saveFavorites(favoriteIds.filter(i => i !== id));
    } else {
      saveFavorites([...favoriteIds, id]);
    }

    setTemplates(prev => prev.map(t => 
      t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
    ));
  };

  // 复制模板
  const _handleDuplicate = (template: Template) => {
    const duplicated: Template = {
      ...template,
      id: `user-${Date.now()}`,
      name: `${template.name} (副本)`,
      isFavorite: false,
      isBuiltIn: false,
      usageCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setTemplates(prev => [...prev, duplicated]);
    saveUserTemplates([...templates.filter(t => !t.isBuiltIn), duplicated]);
  };

  // 使用模板
  const handleUseTemplate = (template: Template) => {
    // 更新使用次数
    setTemplates(prev => prev.map(t => 
      t.id === template.id ? { ...t, usageCount: t.usageCount + 1 } : t
    ));

    onTemplateSelect?.(template);
  };

  // 导出模板
  const handleExport = (template: Template) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name.replace(/\s+/g, '_')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  };

  // 获取类型图标
  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'dashboard': return LayoutDashboard;
      case 'report': return FileText;
      case 'chart': return BarChart3;
      case 'layout': return Grid;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-yellow-500" />
          <h3 className="font-medium">{t('txt.模板管理')}</h3>
          <Badge variant="secondary">{templates.length}</Badge>
        </div>
        
        <Button size="sm" onClick={handleCreateTemplate}>
          <Plus className="w-4 h-4 mr-1" />
          保存当前为模板
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="browse" className="flex items-center gap-1">
            <Grid className="w-4 h-4" />
            浏览模板
          </TabsTrigger>
          <TabsTrigger value="my" className="flex items-center gap-1">
            <Bookmark className="w-4 h-4" />
            我的模板
          </TabsTrigger>
        </TabsList>

        {/* 浏览模板 */}
        <TabsContent value="browse" className="mt-4 space-y-4">
          {/* 搜索和筛选 */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t("ph.搜索模板")}
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
              <Star className={cn('w-4 h-4 mr-1', showFavoritesOnly && 'fill-current')} />
              收藏
            </Button>

            <div className="flex items-center border rounded">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8 rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* 分类筛选 */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const count = categoryStats[cat.id] || 0;
              
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors flex items-center gap-1',
                    selectedCategory === cat.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {cat.name}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* 模板列表 */}
          {filteredTemplates.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Bookmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t('txt.没有找到匹配的模板')}</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredTemplates.map(template => {
                const Icon = getTypeIcon(template.type);
                
                return (
                  <Card 
                    key={template.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md hover:-translate-y-1',
                      template.isBuiltIn && 'border-dashed'
                    )}
                    onClick={() => handleUseTemplate(template)}
                  >
                    <CardContent className="p-4">
                      {/* 缩略图占位 */}
                      <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-md mb-3 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-muted-foreground" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm truncate">{template.name}</h4>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(template.id);
                            }}
                            className="p-1 hover:bg-muted rounded"
                          >
                            {template.isFavorite ? (
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            ) : (
                              <StarOff className="w-4 h-4 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {template.type}
                            </Badge>
                          </div>
                          <span>{template.usageCount} 次使用</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTemplates.map(template => {
                const Icon = getTypeIcon(template.type);
                
                return (
                  <Card 
                    key={template.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      template.isBuiltIn && 'border-dashed'
                    )}
                    onClick={() => handleUseTemplate(template)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'p-3 rounded-md',
                          template.isBuiltIn ? 'bg-blue-100' : 'bg-muted'
                        )}>
                          <Icon className={cn(
                            'w-6 h-6',
                            template.isBuiltIn ? 'text-blue-600' : 'text-foreground'
                          )} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium truncate">{template.name}</h4>
                            {template.isBuiltIn && (
                              <Badge variant="secondary" className="text-xs">{t('txt.内置')}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {template.description}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {template.type}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(template.createdAt).toLocaleDateString()}
                            </span>
                            <span>{template.usageCount} 次使用</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(template.id);
                                }}
                              >
                                {template.isFavorite ? (
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                ) : (
                                  <StarOff className="w-4 h-4 text-muted-foreground" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{template.isFavorite ? '取消收藏' : '收藏'}</TooltipContent>
                          </Tooltip>

                          {!template.isBuiltIn && (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditTemplate(template);
                                    }}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('txt.编辑')}</TooltipContent>
                              </Tooltip>
                              
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(template.id);
                                    }}
                                    className="text-red-500 hover:text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{t('txt.删除')}</TooltipContent>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* 我的模板 */}
        <TabsContent value="my" className="mt-4">
          {templates.filter(t => !t.isBuiltIn).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Bookmark className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground">{t('txt.暂无自定义模板')}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  将常用的仪表盘或报表保存为模板，方便复用
                </p>
                <Button className="mt-4" onClick={handleCreateTemplate}>
                  <Plus className="w-4 h-4 mr-2" />
                  创建模板
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {templates.filter(t => !t.isBuiltIn).map(template => {
                const Icon = getTypeIcon(template.type);
                
                return (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-muted rounded-md">
                          <Icon className="w-6 h-6 text-foreground" />
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="font-medium">{template.name}</h4>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            使用
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditTemplate(template)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleExport(template)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template.id)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 创建/编辑对话框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isCreating ? '创建新模板' : '编辑模板'}
            </DialogTitle>
            <DialogDescription>
              {isCreating ? '将当前工作保存为模板' : '修改模板信息'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">模板名称 *</Label>
              <Input
                id="template-name"
                placeholder={t("ph.如月度销售报表")}
                value={editingTemplate?.name || ''}
                onChange={e => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-desc">{t('txt.描述')}</Label>
              <Textarea
                id="template-desc"
                placeholder={t("ph.描述这个模板的用途")}
                rows={3}
                value={editingTemplate?.description || ''}
                onChange={e => setEditingTemplate(prev => prev ? { ...prev, description: e.target.value } : null)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('txt.类型')}</Label>
                <select
                  className="w-full p-2 border rounded"
                  value={editingTemplate?.type || 'dashboard'}
                  onChange={e => setEditingTemplate(prev => prev ? { ...prev, type: e.target.value as TemplateType } : null)}
                >
                  <option value="dashboard">{t('txt.仪表盘')}</option>
                  <option value="report">{t('txt.报表')}</option>
                  <option value="chart">{t('txt.图表')}</option>
                  <option value="layout">{t('txt.布局')}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>{t('txt.分类标签')}</Label>
                <Input
                  placeholder={t("ph.如销售月度")}
                  value={editingTemplate?.tags?.join(', ') || ''}
                  onChange={e => setEditingTemplate(prev => prev ? { 
                    ...prev, 
                    tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                  } : null)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveTemplate} disabled={!editingTemplate?.name}>
              <Save className="w-4 h-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default TemplateManager;
