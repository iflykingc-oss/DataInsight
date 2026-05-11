'use client';

import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, GanttChart } from 'lucide-react';
import type { CellValue } from '@/lib/data-processor';

interface GanttViewProps {
  rows: Record<string, CellValue>[];
  headers: string[];
}

function isDateField(values: unknown[]): boolean {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return false;
  const dateCount = nonNull.filter(v => !isNaN(Date.parse(String(v)))).length;
  return dateCount / nonNull.length > 0.5;
}

function parseDate(val: unknown): Date | null {
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function formatDateCN(d: Date): string {
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function GanttView({ rows, headers }: GanttViewProps) {

  // 自动检测日期字段
  const dateFields = useMemo(() => {
    return headers.filter(h => isDateField(rows.map(r => r[h])));
  }, [headers, rows]);

  const [taskField, setTaskField] = useState<string>(headers[0] || '');
  const [startField, setStartField] = useState<string>(dateFields[0] || '');
  const [endField, setEndField] = useState<string>(dateFields[1] || dateFields[0] || '');
  const [progressField, setProgressField] = useState<string>('');

  // 有效任务行（必须有任务名和起始日期）
  const tasks = useMemo(() => {
    return rows
      .map((row, idx) => {
        const name = String(row[taskField] ?? '').trim();
        const start = parseDate(row[startField]);
        const end = parseDate(row[endField]) || (start ? new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000) : null);
        if (!name || !start || !end) return null;
        const progress = progressField && !isNaN(Number(row[progressField]))
          ? Math.min(100, Math.max(0, Number(row[progressField])))
          : 0;
        return { name, start, end, progress, row, idx };
      })
      .filter(Boolean) as { name: string; start: Date; end: Date; progress: number; row: Record<string, unknown>; idx: number }[];
  }, [rows, taskField, startField, endField, progressField]);

  // 时间范围
  const timeRange = useMemo(() => {
    if (tasks.length === 0) {
      return { min: new Date(2025, 0, 1), max: new Date(2025, 1, 1) };
    }
    const min = new Date(Math.min(...tasks.map(t => t.start.getTime())));
    const max = new Date(Math.max(...tasks.map(t => t.end.getTime())));
    // 前后各加7天
    min.setDate(min.getDate() - 7);
    max.setDate(max.getDate() + 7);
    return { min, max };
  }, [tasks]);

  const totalDays = Math.max(1, Math.ceil((timeRange.max.getTime() - timeRange.min.getTime()) / (24 * 60 * 60 * 1000)));

  // 计算任务条位置
  const getTaskStyle = (start: Date, end: Date) => {
    const offset = (start.getTime() - timeRange.min.getTime()) / (24 * 60 * 60 * 1000);
    const duration = Math.max(1, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const left = (offset / totalDays) * 100;
    const width = (duration / totalDays) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  // 日期刻度（每7天一个刻度）
  const ticks = useMemo(() => {
    const t: { date: Date; label: string }[] = [];
    for (let i = 0; i <= totalDays; i += 7) {
      const d = new Date(timeRange.min.getTime() + i * 24 * 60 * 60 * 1000);
      t.push({ date: d, label: formatDateCN(d) });
    }
    return t;
  }, [totalDays, timeRange.min]);

  return (
    <div className="space-y-4">
      {/* 配置栏 */}
      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg flex-wrap">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <GanttChart className="w-4 h-4" />
          <span>甘特图视图</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">任务</span>
          <Select value={taskField} onValueChange={setTaskField}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{headers.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">开始</span>
          <Select value={startField} onValueChange={setStartField}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{dateFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">结束</span>
          <Select value={endField} onValueChange={setEndField}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{dateFields.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">进度</span>
          <Select value={progressField} onValueChange={setProgressField}>
            <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="可选" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="">无</SelectItem>
              {headers.filter(h => {
                const vals = rows.map(r => Number(r[h])).filter(n => !isNaN(n) && n >= 0 && n <= 100);
                return vals.length > rows.length * 0.3;
              }).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          {tasks.length} 个任务 · {totalDays} 天
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          未找到有效任务数据。请确保有任务名称字段和日期字段。
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          {/* 时间刻度 */}
          <div className="flex border-b bg-muted/50">
            <div className="w-[200px] flex-shrink-0 p-2 text-xs font-medium text-muted-foreground border-r">任务名称</div>
            <div className="flex-1 relative h-8">
              {ticks.map((t, i) => (
                <div key={i} className="absolute top-0 text-xs text-muted-foreground border-l h-full pl-1 pt-1" style={{ left: `${(i * 7 / totalDays) * 100}%` }}>
                  {t.label}
                </div>
              ))}
            </div>
          </div>
          {/* 任务行 */}
          <div className="max-h-[500px] overflow-y-auto">
            {tasks.map((task, idx) => {
              const style = getTaskStyle(task.start, task.end);
              return (
                <div key={idx} className="flex border-b hover:bg-muted/20">
                  <div className="w-[200px] flex-shrink-0 p-2 text-xs truncate border-r" title={task.name}>{task.name}</div>
                  <div className="flex-1 relative h-10">
                    <div
                      className="absolute top-2 h-5 bg-primary/80 rounded text-xs text-white flex items-center px-1.5 overflow-hidden"
                      style={{ left: style.left, width: style.width }}
                      title={`${task.name}: ${formatDateCN(task.start)} - ${formatDateCN(task.end)}`}
                    >
                      {task.progress > 0 && (
                        <div className="absolute inset-0 bg-primary/40" style={{ width: `${task.progress}%` }} />
                      )}
                      <span className="relative z-10">{task.progress > 0 ? `${task.progress}%` : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
