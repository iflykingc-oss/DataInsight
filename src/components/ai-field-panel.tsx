'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Loader2,
  Plus,
  Trash2,
  Play,
  Eye,
  Sparkles,
  Lightbulb,
  Phone,
  MapPin,
  Tags,
  MessageSquare,
  FileText,
  CheckSquare,
  Languages,
  Globe,
  PenTool,
  Star,
  AlignLeft,
  Database,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CellValue } from '@/types';
import type { ParsedData } from '@/lib/data-processor';
import {
  type AIField,
  type AIFieldTemplate,
  AI_FIELD_TEMPLATES,
  createAIField,
  getAIFieldTypeIcon,
  getAIFieldTypeLabel,
  getAIFieldTypeColor,
  recommendAIFields,
  saveAIFields,
  loadAIFields,
} from '@/lib/ai-field-engine';

// 图标映射
const ICON_MAP: Record<string, React.ElementType> = {
  Phone, MapPin, Tags, MessageSquare, FileText, CheckSquare,
  Languages, Globe, PenTool, Star, AlignLeft, Database,
};

interface AIFieldPanelProps {
  data: ParsedData;
  dataId: string;
  modelConfig: { apiKey: string; baseUrl: string; model: string } | null;
  onFieldsChange?: (fields: AIField[]) => void;
  onApplyField?: (field: AIField) => void;
}

export function AIFieldPanel({
  data,
  dataId,
  modelConfig,
  onFieldsChange,
  onApplyField,
}: AIFieldPanelProps) {
  const [fields, setFields] = useState<AIField[]>(() => loadAIFields(dataId));
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createStep, setCreateStep] = useState<'template' | 'config' | 'preview'>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<AIFieldTemplate | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [fieldName, setFieldName] = useState('');
  const [fieldConfig, setFieldConfig] = useState<Record<string, string>>({});
  const [previewResults, setPreviewResults] = useState<Record<number, CellValue>>({});
  const [previewLoading, setPreviewLoading] = useState(false);
  const [runningFieldId, setRunningFieldId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('templates');

  // 智能推荐
  const recommendations = useMemo(() => {
    const columnFeatures = data.headers.map(h => {
      const values = data.rows.map(r => r[h]).filter(v => v != null);
      const texts = values.map(v => String(v));
      const avgLen = texts.length > 0
        ? texts.reduce((sum, t) => sum + t.length, 0) / texts.length
        : 0;
      const nullRate = (data.rows.length - values.length) / data.rows.length;
      const isNumber = values.length > 0 && values.every(v => !isNaN(Number(v)));
      const isDate = values.length > 0 && values.every(v => !isNaN(Date.parse(String(v))));
      return {
        name: h,
        type: isNumber ? 'number' as const : isDate ? 'date' as const : 'text' as const,
        sampleValues: values.slice(0, 3),
        avgLength: avgLen,
        nullRate,
      };
    });
    return recommendAIFields(columnFeatures);
  }, [data]);

  const updateFields = useCallback((newFields: AIField[]) => {
    setFields(newFields);
    saveAIFields(dataId, newFields);
    onFieldsChange?.(newFields);
  }, [dataId, onFieldsChange]);

  // 删除字段
  const handleDelete = useCallback((fieldId: string) => {
    const newFields = fields.filter(f => f.id !== fieldId);
    updateFields(newFields);
  }, [fields, updateFields]);

  // 切换自动更新
  const handleToggleAutoUpdate = useCallback((fieldId: string) => {
    const newFields = fields.map(f =>
      f.id === fieldId ? { ...f, autoUpdate: !f.autoUpdate } : f
    );
    updateFields(newFields);
  }, [fields, updateFields]);

  // 执行AI字段（批量处理）
  const handleRunField = useCallback(async (field: AIField) => {
    if (!modelConfig) {
      alert('请先配置AI模型');
      return;
    }

    setRunningFieldId(field.id);
    const rowIndices = field.previewMode
      ? Array.from({ length: Math.min(5, data.rows.length) }, (_, i) => i)
      : Array.from({ length: data.rows.length }, (_, i) => i);

    try {
      const response = await fetch('/api/ai-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          field: {
            ...field,
            sourceColumns: field.sourceColumns.length > 0 ? field.sourceColumns : [data.headers[0]],
          },
          context: {
            rows: data.rows,
            headers: data.headers,
            rowIndices,
          },
          modelConfig,
        }),
      });

      if (!response.ok) throw new Error('执行失败');

      const result = await response.json();
      if (result.success) {
        const newResults: Record<number, CellValue> = {};
        result.data.forEach((r: { rowIndex: number; value: CellValue }) => {
          newResults[r.rowIndex] = r.value;
        });

        const newFields = fields.map(f =>
          f.id === field.id
            ? { ...f, status: 'completed' as const, results: newResults, updatedAt: Date.now() }
            : f
        );
        updateFields(newFields);
        onApplyField?.({ ...field, results: newResults });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '执行失败';
      const newFields = fields.map(f =>
        f.id === field.id
          ? { ...f, status: 'error' as const, errorMessage: msg }
          : f
      );
      updateFields(newFields);
    } finally {
      setRunningFieldId(null);
    }
  }, [fields, data, modelConfig, updateFields, onApplyField]);

  // 创建字段 - 选择模板
  const handleSelectTemplate = (template: AIFieldTemplate) => {
    setSelectedTemplate(template);
    setFieldName(template.name);
    setFieldConfig(template.defaultConfig as Record<string, string>);
    setSelectedColumns([]);
    setCreateStep('config');
  };

  // 创建字段 - 确认
  const handleCreateField = () => {
    if (!selectedTemplate || selectedColumns.length === 0 || !fieldName.trim()) return;

    const newField = createAIField(
      fieldName.trim(),
      selectedTemplate.type,
      selectedColumns,
      fieldConfig,
      { autoUpdate: true, previewMode: true }
    );

    const newFields = [...fields, newField];
    updateFields(newFields);
    setShowCreateDialog(false);
    setCreateStep('template');
    setSelectedTemplate(null);
    setSelectedColumns([]);
    setFieldName('');
    setFieldConfig({});
  };

  // 预览前5行
  const handlePreview = async () => {
    if (!modelConfig || !selectedTemplate || selectedColumns.length === 0) return;

    setPreviewLoading(true);
    const tempField = createAIField(
      fieldName || selectedTemplate.name,
      selectedTemplate.type,
      selectedColumns,
      fieldConfig,
      { previewMode: true, autoUpdate: true }
    );

    try {
      const response = await fetch('/api/ai-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'execute',
          field: tempField,
          context: {
            rows: data.rows,
            headers: data.headers,
            rowIndices: Array.from({ length: Math.min(5, data.rows.length) }, (_, i) => i),
          },
          modelConfig,
        }),
      });

      if (!response.ok) throw new Error('预览失败');

      const result = await response.json();
      if (result.success) {
        const results: Record<number, CellValue> = {};
        result.data.forEach((r: { rowIndex: number; value: CellValue }) => {
          results[r.rowIndex] = r.value;
        });
        setPreviewResults(results);
        setCreateStep('preview');
      }
    } catch {
      alert('预览失败，请检查模型配置');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI 字段
          </h3>
          <p className="text-sm text-muted-foreground">
            新建AI字段，自动处理整列数据
          </p>
        </div>
        <Button onClick={() => {
          setShowCreateDialog(true);
          setCreateStep('template');
          setSelectedTemplate(null);
        }}>
          <Plus className="w-4 h-4 mr-1" />
          新建AI字段
        </Button>
      </div>

      {/* 字段列表 */}
      {fields.length > 0 ? (
        <div className="space-y-2">
          {fields.map(field => (
            <Card key={field.id} className={cn(
              'border-l-4',
              field.status === 'error' ? 'border-l-red-500' :
              field.status === 'completed' ? 'border-l-green-500' :
              field.status === 'running' ? 'border-l-blue-500' :
              'border-l-gray-300'
            )}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-lg">{getAIFieldTypeIcon(field.type)}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{field.name}</span>
                        <Badge variant="outline" className={cn('text-xs', getAIFieldTypeColor(field.type))}>
                          {getAIFieldTypeLabel(field.type)}
                        </Badge>
                        {field.previewMode && (
                          <Badge variant="secondary" className="text-xs">
                            <Eye className="w-3 h-3 mr-0.5" />
                            预览
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        源列: {field.sourceColumns.join(', ')} · {Object.keys(field.results).length} 行已处理
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleRunField(field)}
                          disabled={runningFieldId === field.id || !modelConfig}
                        >
                          {runningFieldId === field.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>执行</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 px-2">
                          <Switch
                            checked={field.autoUpdate}
                            onCheckedChange={() => handleToggleAutoUpdate(field.id)}
                            className="scale-75"
                          />
                          <span className="text-xs text-muted-foreground">自动</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>数据变化时自动更新</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(field.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>删除</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Wand2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">暂无AI字段</p>
            <p className="text-sm text-muted-foreground">点击&quot;新建AI字段&quot;开始智能数据处理</p>
          </CardContent>
        </Card>
      )}

      {/* 创建对话框 */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              新建AI字段
            </DialogTitle>
            <DialogDescription>
              {createStep === 'template' && '选择AI处理类型'}
              {createStep === 'config' && '配置数据源和参数'}
              {createStep === 'preview' && '预览前5行效果'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {createStep === 'template' && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full">
                  <TabsTrigger value="templates" className="flex-1">全部模板</TabsTrigger>
                  <TabsTrigger value="recommend" className="flex-1">
                    <Lightbulb className="w-3.5 h-3.5 mr-1" />
                    智能推荐
                    {recommendations.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">{recommendations.length}</Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
                <ScrollArea className="h-[400px] mt-4">
                  <TabsContent value="templates" className="m-0">
                    <div className="grid grid-cols-2 gap-3">
                      {AI_FIELD_TEMPLATES.map(template => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className="text-left p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {ICON_MAP[template.icon] ? React.createElement(ICON_MAP[template.icon], { className: 'w-4 h-4 text-primary' }) : <Sparkles className="w-4 h-4 text-primary" />}
                            <span className="font-medium text-sm">{template.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{template.description}</p>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="recommend" className="m-0">
                    {recommendations.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {recommendations.map(template => (
                          <button
                            key={template.id}
                            onClick={() => handleSelectTemplate(template)}
                            className="text-left p-3 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-1">
                              {ICON_MAP[template.icon] ? React.createElement(ICON_MAP[template.icon], { className: 'w-4 h-4 text-primary' }) : <Sparkles className="w-4 h-4 text-primary" />}
                              <span className="font-medium text-sm">{template.name}</span>
                              <Badge variant="secondary" className="text-xs">推荐</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">{template.description}</p>
                            <p className="text-xs text-primary mt-1">{template.example}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lightbulb className="w-8 h-8 mx-auto mb-2" />
                        暂无推荐，请先上传数据
                      </div>
                    )}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            )}

            {createStep === 'config' && selectedTemplate && (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4 pr-2">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    {ICON_MAP[selectedTemplate.icon] ? React.createElement(ICON_MAP[selectedTemplate.icon], { className: 'w-5 h-5 text-primary' }) : <Sparkles className="w-5 h-5 text-primary" />}
                    <div>
                      <p className="font-medium">{selectedTemplate.name}</p>
                      <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
                    </div>
                  </div>

                  {/* 字段名称 */}
                  <div>
                    <label className="text-sm font-medium">字段名称</label>
                    <Input
                      value={fieldName}
                      onChange={e => setFieldName(e.target.value)}
                      placeholder="输入新字段名称"
                      className="mt-1"
                    />
                  </div>

                  {/* 选择源列 */}
                  <div>
                    <label className="text-sm font-medium">选择源数据列</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {data.headers.map(header => (
                        <button
                          key={header}
                          onClick={() => {
                            setSelectedColumns(prev =>
                              prev.includes(header)
                                ? prev.filter(c => c !== header)
                                : [...prev, header]
                            );
                          }}
                          className={cn(
                            'px-3 py-1.5 rounded-md text-sm border transition-colors',
                            selectedColumns.includes(header)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-muted'
                          )}
                        >
                          {header}
                        </button>
                      ))}
                    </div>
                    {selectedColumns.length === 0 && (
                      <p className="text-xs text-destructive mt-1">请至少选择一列</p>
                    )}
                  </div>

                  {/* 配置参数 */}
                  <div>
                    <label className="text-sm font-medium">配置参数</label>
                    <div className="space-y-2 mt-2">
                      {Object.entries(selectedTemplate.defaultConfig).map(([key, value]) => (
                        <div key={key}>
                          <label className="text-xs text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </label>
                          <Input
                            value={fieldConfig[key] || String(value)}
                            onChange={e => setFieldConfig(prev => ({ ...prev, [key]: e.target.value }))}
                            className="mt-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 选项 */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">先预览前5行</p>
                      <p className="text-xs text-muted-foreground">确认效果后再全列生成</p>
                    </div>
                    <Switch checked defaultChecked />
                  </div>
                </div>
              </ScrollArea>
            )}

            {createStep === 'preview' && (
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2 bg-green-50 text-green-700 rounded-lg text-sm">
                    <CheckSquare className="w-4 h-4" />
                    预览完成，以下前5行处理结果：
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-3 py-2 text-left">行号</th>
                          <th className="px-3 py-2 text-left">源数据</th>
                          <th className="px-3 py-2 text-left">AI处理结果</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(previewResults).map(([idx, value]) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2 text-muted-foreground">{Number(idx) + 1}</td>
                            <td className="px-3 py-2 max-w-[200px] truncate">
                              {selectedColumns.map(col => `${col}: ${String(data.rows[Number(idx)]?.[col] ?? '')}`).join(', ')}
                            </td>
                            <td className="px-3 py-2 font-medium text-primary">{String(value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="gap-2">
            {createStep !== 'template' && (
              <Button variant="outline" onClick={() => setCreateStep(createStep === 'preview' ? 'config' : 'template')}>
                上一步
              </Button>
            )}
            {createStep === 'config' && (
              <Button
                onClick={handlePreview}
                disabled={previewLoading || selectedColumns.length === 0 || !fieldName.trim()}
                variant="outline"
              >
                {previewLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                预览前5行
              </Button>
            )}
            {createStep === 'config' && (
              <Button
                onClick={handleCreateField}
                disabled={selectedColumns.length === 0 || !fieldName.trim()}
              >
                <Plus className="w-4 h-4 mr-1" />
                直接创建
              </Button>
            )}
            {createStep === 'preview' && (
              <Button onClick={handleCreateField}>
                <Plus className="w-4 h-4 mr-1" />
                确认创建
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
