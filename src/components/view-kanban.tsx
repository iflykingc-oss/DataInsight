'use client';

import React, { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, Settings2 } from 'lucide-react';
import type { ParsedData } from '@/lib/data-processor';
import type { CellValue } from '@/lib/data-processor';

interface KanbanViewProps {
  data: ParsedData;
}

export function KanbanView({ data }: KanbanViewProps) {
  const { t } = useI18n();
  const { headers, rows } = data;
  const [groupField, setGroupField] = useState<string>(headers[0] || '');
  const [cardTitleField, setCardTitleField] = useState<string>(headers[0] || '');

  // 自动选择最佳分组字段（非ID的文本/分类字段）
  const candidateFields = useMemo(() => {
    return headers.filter(h => {
      const vals = rows.map(r => String(r[h] ?? '')).filter(v => v && v !== 'null' && v !== 'undefined');
      const unique = new Set(vals);
      // 排除ID字段（唯一值太多）和全空字段（唯一值太少）
      return unique.size > 1 && unique.size <= Math.min(rows.length * 0.3, 20);
    });
  }, [headers, rows]);

  // 分组数据
  const grouped = useMemo(() => {
    const groups: Record<string, Record<string, CellValue>[]> = {};
    rows.forEach(row => {
      const key = String(row[groupField] ?? '未分类');
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    // 按组内数量排序
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [rows, groupField]);

  // 为卡片选择展示字段（优先数值字段作为指标）
  const metricField = useMemo(() => {
    return headers.find(h => {
      if (h === groupField || h === cardTitleField) return false;
      const vals = rows.map(r => Number(r[h])).filter(n => !isNaN(n));
      return vals.length > rows.length * 0.5;
    }) || headers.find(h => h !== groupField && h !== cardTitleField) || '';
  }, [headers, rows, groupField, cardTitleField]);

  return (
    <div className="space-y-4">
      {/* 视图配置栏 */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-md">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <LayoutGrid className="w-4 h-4" />
          <span>{t('txt.看板视图')}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('txt.分组字段')}</span>
          <Select value={groupField} onValueChange={setGroupField}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {candidateFields.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
              {candidateFields.length === 0 && headers.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('txt.卡片标题')}</span>
          <Select value={cardTitleField} onValueChange={setCardTitleField}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {headers.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          共 {rows.length} 条数据 · {grouped.length} 个分组
        </div>
      </div>

      {/* 看板 */}
      <div className="flex gap-4 overflow-x-auto pb-2">
        {grouped.map(([groupName, groupRows]) => (
          <div key={groupName} className="flex-shrink-0 w-[280px]">
            {/* 列标题 */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground">{groupName}</h4>
                <Badge variant="secondary" className="text-xs">{groupRows.length}</Badge>
              </div>
            </div>
            {/* 卡片列表 */}
            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {groupRows.map((row, idx) => (
                <Card key={idx} className="p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary/60">
                  <div className="text-sm font-medium text-foreground mb-2 line-clamp-2">
                    {String(row[cardTitleField] ?? '未命名')}
                  </div>
                  {metricField && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{metricField}</span>
                      <span className="text-sm font-semibold text-primary">
                        {typeof row[metricField] === 'number'
                          ? row[metricField].toLocaleString()
                          : String(row[metricField] ?? '-')
                        }
                      </span>
                    </div>
                  )}
                  {/* 额外字段标签 */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {headers
                      .filter(h => h !== groupField && h !== cardTitleField && h !== metricField)
                      .slice(0, 2)
                      .map(h => (
                        <span key={h} className="text-xs px-1.5 py-0.5 bg-muted rounded text-muted-foreground truncate max-w-[100px]">
                          {h}: {String(row[h] ?? '-').substring(0, 15)}
                        </span>
                      ))
                    }
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
