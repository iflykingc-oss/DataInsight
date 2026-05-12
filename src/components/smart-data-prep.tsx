'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles, Loader2, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Trash2, FileSpreadsheet, Shield, Zap, ArrowRight, Download,
} from 'lucide-react';
import { ParsedData } from '@/lib/data-processor/types';
import { request } from '@/lib/request';
import { safeSetItem, safeGetItem } from '@/lib/safe-storage';

interface SmartDataPrepProps {
  data: ParsedData;
  fieldStats: Array<{ field: string; type: string; stats?: Record<string, number>; quality?: Record<string, number> }>;
  modelConfig?: Record<string, string>;
  onDataReady: (cleanedData: ParsedData) => void;
}

interface QualityIssue {
  id: string;
  type: 'missing' | 'outlier' | 'duplicate' | 'format' | 'type_mismatch';
  severity: 'high' | 'medium' | 'low';
  field: string;
  description: string;
  affectedRows: number;
  fixable: boolean;
  autoFix: string;
}

interface CleanTemplate {
  id: string;
  name: string;
  description: string;
  steps: string[];
  isCustom?: boolean;
}

// 预置清洗模板（不涉及用户数据，仅记录操作步骤）
const BUILTIN_TEMPLATES: CleanTemplate[] = [
  {
    id: 'basic-clean',
    name: '基础清洗',
    description: '去重 + 填充空值 + 修正格式',
    steps: ['remove_duplicates', 'fill_missing', 'fix_format'],
  },
  {
    id: 'numeric-clean',
    name: '数值标准化',
    description: '异常值处理 + 单位统一 + 精度对齐',
    steps: ['remove_outliers_iqr', 'normalize_units', 'align_precision'],
  },
  {
    id: 'text-clean',
    name: '文本规范化',
    description: '去首尾空格 + 统一大小写 + 去特殊字符',
    steps: ['trim_whitespace', 'normalize_case', 'remove_special_chars'],
  },
  {
    id: 'date-clean',
    name: '日期标准化',
    description: '统一日期格式 + 时区校正 + 补全缺失',
    steps: ['normalize_date_format', 'fix_timezone', 'fill_date_missing'],
  },
];

// 数据质量检测（纯前端，不上传数据）
function detectQualityIssues(data: ParsedData): QualityIssue[] {
  const issues: QualityIssue[] = [];
  if (!data?.headers || !data?.rows) return issues;

  const totalRows = data.rows.length;

  for (const header of data.headers) {
    // 缺失值检测
    const missingCount = data.rows.filter(row => row[header] === null || row[header] === undefined || row[header] === '' || row[header] === 'NA' || row[header] === 'N/A').length;
    if (missingCount > 0) {
      const pct = (missingCount / totalRows) * 100;
      issues.push({
        id: `missing-${header}`,
        type: 'missing',
        severity: pct > 20 ? 'high' : pct > 5 ? 'medium' : 'low',
        field: header,
        description: `${header} 有 ${missingCount} 行缺失值 (${pct.toFixed(1)}%)`,
        affectedRows: missingCount,
        fixable: true,
        autoFix: '使用中位数/众数填充',
      });
    }

    // 重复行检测
    const values = data.rows.map(r => String(r[header] || '')).filter(v => v);
    const uniqueValues = new Set(values);
    const duplicateCount = values.length - uniqueValues.size;
    if (duplicateCount > totalRows * 0.3 && uniqueValues.size < 20) {
      issues.push({
        id: `duplicate-${header}`,
        type: 'duplicate',
        severity: 'medium',
        field: header,
        description: `${header} 存在大量重复值 (${duplicateCount}行)`,
        affectedRows: duplicateCount,
        fixable: true,
        autoFix: '标记或移除重复行',
      });
    }

    // 类型不一致检测
    const sampleValues = data.rows.slice(0, 50).map(r => r[header]).filter(v => v != null && v !== '');
    const numericCount = sampleValues.filter(v => !isNaN(Number(v))).length;
    const textCount = sampleValues.length - numericCount;
    if (numericCount > 0 && textCount > 0 && numericCount / sampleValues.length > 0.3 && textCount / sampleValues.length > 0.3) {
      issues.push({
        id: `type-mismatch-${header}`,
        type: 'type_mismatch',
        severity: 'high',
        field: header,
        description: `${header} 类型不一致（${numericCount}个数值, ${textCount}个文本）`,
        affectedRows: textCount,
        fixable: true,
        autoFix: '统一转换为文本类型',
      });
    }
  }

  // 整表重复行
  const rowSignatures = data.rows.map(r => data.headers.map(h => String(r[h] || '')).join('|'));
  const seen = new Set<string>();
  let dupRowCount = 0;
  for (const sig of rowSignatures) {
    if (seen.has(sig)) dupRowCount++;
    else seen.add(sig);
  }
  if (dupRowCount > 0) {
    issues.push({
      id: 'duplicate-rows',
      type: 'duplicate',
      severity: dupRowCount > totalRows * 0.1 ? 'high' : 'medium',
      field: '(整行)',
      description: `发现 ${dupRowCount} 行完全重复`,
      affectedRows: dupRowCount,
      fixable: true,
      autoFix: '移除重复行，保留首次出现',
    });
  }

  return issues.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return sev[a.severity] - sev[b.severity];
  });
}

// 前端执行清洗（数据不离开浏览器）
function applyFixes(data: ParsedData, selectedIssues: Set<string>, issues: QualityIssue[]): ParsedData {
  const cleanedRows = [...data.rows.map(r => ({ ...r }))];
  const selectedIssueObjects = issues.filter(i => selectedIssues.has(i.id));

  for (const issue of selectedIssueObjects) {
    if (issue.type === 'duplicate' && issue.id === 'duplicate-rows') {
      // 移除整行重复
      const seen = new Set<string>();
      const uniqueRows = cleanedRows.filter(row => {
        const sig = data.headers.map(h => String(row[h] || '')).join('|');
        if (seen.has(sig)) return false;
        seen.add(sig);
        return true;
      });
      cleanedRows.length = 0;
      cleanedRows.push(...uniqueRows);
    } else if (issue.type === 'missing') {
      // 用中位数/众数填充
      const colValues = cleanedRows.map(r => r[issue.field]).filter(v => v != null && v !== '');
      const numericVals = colValues.map(Number).filter(v => !isNaN(v));
      if (numericVals.length > 0) {
        const sorted = numericVals.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        for (const row of cleanedRows) {
          if (row[issue.field] == null || row[issue.field] === '' || row[issue.field] === 'NA' || row[issue.field] === 'N/A') {
            row[issue.field] = median;
          }
        }
      } else {
        // 文本：用众数
        const freq: Record<string, number> = {};
        colValues.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
        const mode = Object.entries(freq).sort(([, a], [, b]) => b - a)[0]?.[0] || '';
        for (const row of cleanedRows) {
          if (row[issue.field] == null || row[issue.field] === '' || row[issue.field] === 'NA' || row[issue.field] === 'N/A') {
            row[issue.field] = mode;
          }
        }
      }
    } else if (issue.type === 'type_mismatch') {
      // 统一为文本
      for (const row of cleanedRows) {
        if (row[issue.field] != null) {
          row[issue.field] = String(row[issue.field]);
        }
      }
    }
  }

  return {
    ...data,
    rows: cleanedRows,
    rowCount: cleanedRows.length,
  };
}

export function SmartDataPrep({ data, fieldStats, modelConfig, onDataReady }: SmartDataPrepProps) {
  const [issues, setIssues] = useState<QualityIssue[]>(() => detectQualityIssues(data));
  const { t } = useI18n();
  const [selectedFixes, setSelectedFixes] = useState<Set<string>>(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [activeTab, setActiveTab] = useState('issues');
  const [savedTemplates, setSavedTemplates] = useState<CleanTemplate[]>([]);
  const [cleanedDataForExport, setCleanedDataForExport] = useState<ParsedData | null>(null);

  const hasData = data?.headers?.length > 0;

  // 加载自定义模板（仅存步骤，不存数据）
  useEffect(() => {
    try {
      const custom = JSON.parse(safeGetItem('datainsight-clean-templates') || '[]');
      setSavedTemplates(custom);
    } catch { /* ignore */ }
  }, []);

  const healthScore = useMemo(() => {
    if (issues.length === 0) return 100;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const medCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;
    return Math.max(0, 100 - highCount * 15 - medCount * 5 - lowCount * 2);
  }, [issues]);

  const toggleFix = useCallback((id: string) => {
    setSelectedFixes(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedFixes(new Set(issues.filter(i => i.fixable).map(i => i.id)));
  }, [issues]);

  const handleApply = useCallback(() => {
    setIsApplying(true);
    setTimeout(() => {
      const cleaned = applyFixes(data, selectedFixes, issues);
      onDataReady(cleaned);
      setCleanedDataForExport(cleaned);
      setApplied(true);
      setIsApplying(false);
      // 重新检测
      setIssues(detectQualityIssues(cleaned));
    }, 500);
  }, [data, selectedFixes, issues, onDataReady]);

  const handleExportCleaned = useCallback((format: 'csv' | 'json') => {
    if (!cleanedDataForExport) return;
    const { headers, rows } = cleanedDataForExport;
    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === 'csv') {
      const csvRows = [
        headers.join(','),
        ...rows.map(row =>
          headers.map(h => {
            const val = row[h] ?? '';
            const str = String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          }).join(',')
        ),
      ];
      content = csvRows.join('\n');
      mimeType = 'text/csv;charset=utf-8;';
      extension = 'csv';
    } else {
      content = JSON.stringify({ headers, rows, rowCount: rows.length }, null, 2);
      mimeType = 'application/json;charset=utf-8;';
      extension = 'json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `清洗数据_${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [cleanedDataForExport]);

  const handleSaveTemplate = useCallback(() => {
    const steps = issues.filter(i => selectedFixes.has(i.id)).map(i => i.autoFix);
    if (steps.length === 0) return;
    const template: CleanTemplate = {
      id: `custom-${Date.now()}`,
      name: `自定义模板 ${savedTemplates.length + 1}`,
      description: steps.join(' → '),
      steps,
      isCustom: true,
    };
    const updated = [template, ...savedTemplates].slice(0, 10);
    setSavedTemplates(updated);
    safeSetItem('datainsight-clean-templates', JSON.stringify(updated));
  }, [issues, selectedFixes, savedTemplates]);

  if (!hasData) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <FileSpreadsheet className="w-12 h-12 mb-3 opacity-50" />
          <p>请先上传数据文件</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 数据健康评分 */}
      <Card>
        <CardContent className="flex items-center gap-6 p-4">
          <div className="flex-shrink-0 text-center">
            <div className={`text-3xl font-bold ${healthScore >= 80 ? 'text-emerald-500' : healthScore >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>
              {healthScore}
            </div>
            <p className="text-xs text-muted-foreground">健康评分</p>
          </div>
          <div className="flex-1">
            <Progress value={healthScore} className="h-2 mb-2" />
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-rose-500" />{issues.filter(i => i.severity === 'high').length} 严重</span>
              <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3 text-amber-500" />{issues.filter(i => i.severity === 'medium').length} 中等</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-blue-500" />{issues.filter(i => i.severity === 'low').length} 轻微</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              全选修复
            </Button>
            <Button size="sm" onClick={handleApply} disabled={selectedFixes.size === 0 || isApplying}>
              {isApplying ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1" />}
              修复 {selectedFixes.size > 0 ? `(${selectedFixes.size})` : ''}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 清洗完成导出区 */}
      {applied && cleanedDataForExport && (
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">数据清洗完成</p>
                <p className="text-xs text-muted-foreground">
                  已生成 {cleanedDataForExport.rows.length} 行清洗后数据，支持导出继续使用
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportCleaned('csv')}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                导出 CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleExportCleaned('json')}
                className="gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                导出 JSON
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setApplied(false); setSelectedFixes(new Set()); setCleanedDataForExport(null); }}
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重新清洗
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="issues">问题检测 ({issues.length})</TabsTrigger>
          <TabsTrigger value="templates">清洗模板</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-2">
          {issues.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-8 text-muted-foreground">
                <CheckCircle className="w-8 h-8 mb-2 text-emerald-500" />
                <p>数据质量良好，未检测到问题</p>
              </CardContent>
            </Card>
          ) : (
            issues.map(issue => (
              <Card key={issue.id} className={`transition-colors ${selectedFixes.has(issue.id) ? 'border-primary/30 bg-primary/5' : ''}`}>
                <CardContent className="flex items-center gap-3 p-3">
                  <Checkbox
                    checked={selectedFixes.has(issue.id)}
                    onCheckedChange={() => toggleFix(issue.id)}
                    disabled={!issue.fixable}
                  />
                  <Badge variant={issue.severity === 'high' ? 'destructive' : issue.severity === 'medium' ? 'secondary' : 'outline'} className="text-xs">
                    {issue.severity === 'high' ? '严重' : issue.severity === 'medium' ? '中等' : '轻微'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{issue.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {issue.fixable ? `建议: ${issue.autoFix}` : '需手动处理'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">{issue.field}</Badge>
                </CardContent>
              </Card>
            ))
          )}

          {selectedFixes.size > 0 && (
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={handleSaveTemplate}>
                保存为模板
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {BUILTIN_TEMPLATES.map(tmpl => (
              <Card key={tmpl.id} className="hover:border-primary/30 transition-colors cursor-pointer"
                onClick={() => {
                  // 应用预置模板：自动选择对应的问题
                  const matchingIssues = issues.filter(i => i.fixable);
                  if (tmpl.id === 'basic-clean') {
                    setSelectedFixes(new Set(matchingIssues.filter(i => i.type === 'duplicate' || i.type === 'missing' || i.type === 'format').map(i => i.id)));
                  } else if (tmpl.id === 'numeric-clean') {
                    setSelectedFixes(new Set(matchingIssues.filter(i => i.type === 'outlier').map(i => i.id)));
                  } else if (tmpl.id === 'text-clean') {
                    setSelectedFixes(new Set(matchingIssues.filter(i => i.type === 'format').map(i => i.id)));
                  } else if (tmpl.id === 'date-clean') {
                    setSelectedFixes(new Set(matchingIssues.filter(i => i.type === 'format' && i.field.toLowerCase().includes('日期') || i.field.toLowerCase().includes('date')).map(i => i.id)));
                  }
                  setActiveTab('issues');
                }}>
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{tmpl.name}</p>
                  <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                  <div className="flex gap-1 mt-1.5">
                    {tmpl.steps.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            ))}
            {savedTemplates.map(tmpl => (
              <Card key={tmpl.id} className="hover:border-primary/30 transition-colors cursor-pointer border-dashed"
                onClick={() => {
                  // 应用自定义模板
                  setSelectedFixes(new Set(issues.filter(i => i.fixable).slice(0, tmpl.steps.length).map(i => i.id)));
                  setActiveTab('issues');
                }}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{tmpl.name}</p>
                    <Badge variant="secondary" className="text-xs">自定义</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            模板仅记录清洗步骤，不保存用户数据
          </p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
