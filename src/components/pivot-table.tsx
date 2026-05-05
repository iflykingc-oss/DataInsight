'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GripVertical, Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import type { ParsedData, DataAnalysis, FieldStat } from '@/lib/data-processor';

type AggFunc = 'sum' | 'avg' | 'count' | 'max' | 'min';

interface PivotConfig {
  rowField: string;
  colField: string;
  valField: string;
  aggFunc: AggFunc;
}

interface PivotResult {
  rowLabels: string[];
  colLabels: string[];
  matrix: Record<string, Record<string, number[]>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

const AGG_LABELS: Record<AggFunc, string> = {
  sum: '求和',
  avg: '平均',
  count: '计数',
  max: '最大',
  min: '最小',
};

function computePivot(
  rows: Record<string, unknown>[],
  config: PivotConfig
): PivotResult | null {
  const { rowField, colField, valField, aggFunc } = config;
  if (!rowField || !colField || !valField) return null;

  const rowSet = new Set<string>();
  const colSet = new Set<string>();
  const matrix: Record<string, Record<string, number[]>> = {};

  rows.forEach(row => {
    const rv = String(row[rowField] ?? '（空）');
    const cv = String(row[colField] ?? '（空）');
    const rawVal = row[valField];
    const val = typeof rawVal === 'number' && !isNaN(rawVal) ? rawVal : 0;

    rowSet.add(rv);
    colSet.add(cv);
    if (!matrix[rv]) matrix[rv] = {};
    if (!matrix[rv][cv]) matrix[rv][cv] = [];
    matrix[rv][cv].push(val);
  });

  const rowLabels = Array.from(rowSet).sort();
  const colLabels = Array.from(colSet).sort();

  const agg = (vals: number[]): number => {
    if (vals.length === 0) return 0;
    switch (aggFunc) {
      case 'sum': return vals.reduce((a, b) => a + b, 0);
      case 'avg': return vals.reduce((a, b) => a + b, 0) / vals.length;
      case 'count': return vals.length;
      case 'max': return Math.max(...vals);
      case 'min': return Math.min(...vals);
      default: return vals.reduce((a, b) => a + b, 0);
    }
  };

  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  rowLabels.forEach(rv => {
    const vals = colLabels.flatMap(cv => matrix[rv]?.[cv] || []);
    rowTotals[rv] = agg(vals);
  });

  colLabels.forEach(cv => {
    const vals = rowLabels.flatMap(rv => matrix[rv]?.[cv] || []);
    colTotals[cv] = agg(vals);
    grandTotal += colTotals[cv];
  });

  return { rowLabels, colLabels, matrix, rowTotals, colTotals, grandTotal };
}

function formatNum(n: number, agg: AggFunc): string {
  if (agg === 'count') return String(Math.round(n));
  if (Number.isInteger(n)) return n.toLocaleString();
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function PivotTable({
  data,
  analysis,
}: {
  data: ParsedData;
  analysis: DataAnalysis | null;
}) {
  const headers = data.headers;
  const rows = data.rows as Record<string, unknown>[];

  // 字段分类
  const fieldStats = analysis?.fieldStats ?? [];
  const numericFields = fieldStats.filter(f => f.type === 'number' || f.type === 'id').map(f => f.field);
  const allFields = headers;

  const [config, setConfig] = useState<PivotConfig>({
    rowField: '',
    colField: '',
    valField: '',
    aggFunc: 'sum',
  });

  const [history, setHistory] = useState<PivotConfig[]>([]);

  const result = useMemo(() => computePivot(rows, config), [rows, config]);

  const handleSwap = () => {
    setConfig(prev => ({ ...prev, rowField: prev.colField, colField: prev.rowField }));
  };

  const handleSave = () => {
    setConfig(currentConfig => {
      if (!currentConfig.rowField || !currentConfig.colField || !currentConfig.valField) return currentConfig;
      setHistory(prev => {
        const next = prev.filter(h =>
          !(h.rowField === currentConfig.rowField && h.colField === currentConfig.colField && h.valField === currentConfig.valField)
        );
        return [currentConfig, ...next].slice(0, 10);
      });
      return currentConfig;
    });
  };

  const applyHistory = (h: PivotConfig) => setConfig(h);

  const removeHistory = (idx: number) => {
    setHistory(prev => prev.filter((_, i) => i !== idx));
  };

  const availableAgg: AggFunc[] = config.valField && fieldStats.find(f => f.field === config.valField)?.type === 'id'
    ? ['count']
    : ['sum', 'avg', 'count', 'max', 'min'];

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* 配置区域 */}
      <Card className="shrink-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-primary" />
              透视表配置
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSwap} disabled={!config.rowField || !config.colField}>
                <ArrowRightLeft className="w-3.5 h-3.5 mr-1" /> 交换行列
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!config.rowField || !config.colField || !config.valField}>
                <Plus className="w-3.5 h-3.5 mr-1" /> 保存配置
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">行字段</label>
              <Select value={config.rowField} onValueChange={v => setConfig(prev => ({ ...prev, rowField: v }))}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="选择行字段" />
                </SelectTrigger>
                <SelectContent>
                  {allFields.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">列字段</label>
              <Select value={config.colField} onValueChange={v => setConfig(prev => ({ ...prev, colField: v }))}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="选择列字段" />
                </SelectTrigger>
                <SelectContent>
                  {allFields.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">值字段</label>
              <Select value={config.valField} onValueChange={v => setConfig(prev => ({ ...prev, valField: v }))}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="选择值字段" />
                </SelectTrigger>
                <SelectContent>
                  {numericFields.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[120px]">
              <label className="text-xs font-medium text-muted-foreground">聚合方式</label>
              <Select
                value={config.aggFunc}
                onValueChange={v => setConfig(prev => ({ ...prev, aggFunc: v as AggFunc }))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableAgg.map(af => (
                    <SelectItem key={af} value={af}>{AGG_LABELS[af]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {history.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">历史配置</p>
              <div className="flex flex-wrap gap-2">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center gap-1 bg-muted rounded-md px-2 py-1 text-xs">
                    <button
                      className="hover:text-primary cursor-pointer"
                      onClick={() => applyHistory(h)}
                    >
                      {h.rowField} × {h.colField} · {AGG_LABELS[h.aggFunc]}({h.valField})
                    </button>
                    <button onClick={() => removeHistory(i)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 透视表结果 */}
      {result ? (
        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader className="pb-2 shrink-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">
                {config.rowField} × {config.colField} · {AGG_LABELS[config.aggFunc]}({config.valField})
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {result.rowLabels.length} 行 × {result.colLabels.length} 列
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0">
            <ScrollArea className="h-full w-full">
              <div className="p-4">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold sticky left-0 bg-muted/50 z-10 min-w-[120px]">
                        {config.rowField} \ {config.colField}
                      </TableHead>
                      {result.colLabels.map(cl => (
                        <TableHead key={cl} className="text-right font-medium whitespace-nowrap min-w-[80px]">
                          {cl}
                        </TableHead>
                      ))}
                      <TableHead className="text-right font-semibold text-primary whitespace-nowrap min-w-[80px] border-l">
                        合计
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rowLabels.map(rl => (
                      <TableRow key={rl} className="hover:bg-muted/30">
                        <TableCell className="font-medium sticky left-0 bg-background z-10 min-w-[120px]">
                          {rl}
                        </TableCell>
                        {result.colLabels.map(cl => {
                          const vals = result.matrix[rl]?.[cl] || [];
                          const val = vals.length > 0
                            ? (config.aggFunc === 'sum' ? vals.reduce((a, b) => a + b, 0)
                              : config.aggFunc === 'avg' ? vals.reduce((a, b) => a + b, 0) / vals.length
                              : config.aggFunc === 'count' ? vals.length
                              : config.aggFunc === 'max' ? Math.max(...vals)
                              : Math.min(...vals))
                            : 0;
                          return (
                            <TableCell key={cl} className="text-right tabular-nums whitespace-nowrap">
                              {vals.length > 0 ? formatNum(val, config.aggFunc) : '-'}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right font-semibold text-primary tabular-nums whitespace-nowrap border-l">
                          {formatNum(result.rowTotals[rl], config.aggFunc)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell className="sticky left-0 bg-muted/50 z-10 text-primary">合计</TableCell>
                      {result.colLabels.map(cl => (
                        <TableCell key={cl} className="text-right text-primary tabular-nums whitespace-nowrap">
                          {formatNum(result.colTotals[cl], config.aggFunc)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right text-primary tabular-nums whitespace-nowrap border-l">
                        {formatNum(result.grandTotal, config.aggFunc)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center min-h-[300px]">
          <CardContent className="text-center text-muted-foreground">
            <GripVertical className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">请选择行字段、列字段和值字段来生成透视表</p>
            <p className="text-xs mt-1 opacity-60">支持求和、平均、计数、最大、最小五种聚合方式</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
