'use client';

import React, { useState, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import type { ParsedData } from '@/lib/data-processor';

interface CalendarViewProps {
  rows: Record<string, import('@/lib/data-processor').CellValue>[];
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

export function CalendarView({ rows, headers }: CalendarViewProps) {

  // 自动检测日期字段
  const { t } = useI18n();
  const dateFields = useMemo(() => {
    return headers.filter(h => isDateField(rows.map(r => r[h])));
  }, [headers, rows]);

  const [dateField, setDateField] = useState<string>(dateFields[0] || headers[0] || '');
  const [titleField, setTitleField] = useState<string>(headers[0] || '');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // 月份数据
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay(); // 0=周日
  const daysInMonth = lastDay.getDate();

  // 将数据映射到日期
  const dateMap = useMemo(() => {
    const map: Record<string, Record<string, unknown>[]> = {};
    rows.forEach(row => {
      const d = parseDate(row[dateField]);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (!map[key]) map[key] = [];
        map[key].push(row);
      }
    });
    return map;
  }, [rows, dateField]);

  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 生成日历格子
  const calendarDays: { day: number | null; dateKey: string | null; events: Record<string, unknown>[] }[] = [];
  // 前置空白
  for (let i = 0; i < startWeekday; i++) {
    calendarDays.push({ day: null, dateKey: null, events: [] });
  }
  // 日期
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ day: d, dateKey: key, events: dateMap[key] || [] });
  }

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  return (
    <div className="space-y-4">
      {/* 配置栏 */}
      <div className="flex items-center gap-4 p-3 bg-muted/30 rounded-md">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarDays className="w-4 h-4" />
          <span>{t('txt.日历视图')}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('txt.日期字段')}</span>
          <Select value={dateField} onValueChange={setDateField}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateFields.length > 0 ? dateFields.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              )) : headers.map(f => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{t('txt.标题字段')}</span>
          <Select value={titleField} onValueChange={setTitleField}>
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
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm font-semibold min-w-[100px] text-center">{year}年 {monthNames[month]}</span>
          <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {/* 日历 */}
      <div className="border rounded-md overflow-hidden">
        {/* 星期标题 */}
        <div className="grid grid-cols-7 bg-muted/50">
          {weekDays.map(d => (
            <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
          ))}
        </div>
        {/* 日期格子 */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => (
            <div key={idx} className={`min-h-[100px] border-t border-r p-1 ${cell.day === null ? 'bg-muted/20' : ''}`}>
              {cell.day !== null && (
                <>
                  <div className="text-xs font-medium text-muted-foreground mb-1">{cell.day}</div>
                  <div className="space-y-1">
                    {cell.events.slice(0, 3).map((evt, eidx) => (
                      <div key={eidx} className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded truncate cursor-pointer hover:bg-primary/20">
                        {String(evt[titleField] ?? '-').substring(0, 12)}
                      </div>
                    ))}
                    {cell.events.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">+{cell.events.length - 3}</div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
