'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search, ArrowUpDown, ArrowUp, ArrowDown, Download, Filter, X,
  ChevronLeft, ChevronRight, Eye, EyeOff, Columns, Table2, FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor/types';
import DataPrepInline from './data-prep-inline';

type SortDirection = 'asc' | 'desc' | null;
interface SortConfig { field: string; direction: SortDirection; }

interface DataTableViewProps {
  data: ParsedData;
  analysis: DataAnalysis;
  onDataChange?: (newData: ParsedData) => void;
  onViewInsights?: () => void;
  onViewVisualization?: () => void;
  onViewAI?: () => void;
}

export default function DataTableView({
  data,
  analysis,
  onDataChange,
}: DataTableViewProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('table');
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ field: '', direction: null });
  const [page, setPage] = useState(1);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [showColumnPanel, setShowColumnPanel] = useState(false);
  const [filterField, setFilterField] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const PAGE_SIZE = 20;

  const fields = data.fields;
  const visibleFields = fields.filter(f => !hiddenColumns.has(f));

  const filtered = useMemo(() => {
    let rows = data.rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        Object.values(r).some(v => String(v ?? '').toLowerCase().includes(q))
      );
    }
    if (filterField && filterValue.trim()) {
      const q = filterValue.toLowerCase();
      rows = rows.filter(r => String(r[filterField] ?? '').toLowerCase().includes(q));
    }
    if (sortConfig.field && sortConfig.direction) {
      rows = [...rows].sort((a, b) => {
        const av = a[sortConfig.field];
        const bv = b[sortConfig.field];
        if (av === null || av === undefined) return 1;
        if (bv === null || bv === undefined) return -1;
        const an = Number(av), bn = Number(bv);
        if (!isNaN(an) && !isNaN(bn)) {
          return sortConfig.direction === 'asc' ? an - bn : bn - an;
        }
        return sortConfig.direction === 'asc'
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }
    return rows;
  }, [data.rows, search, filterField, filterValue, sortConfig]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => {
      if (prev.field !== field) return { field, direction: 'asc' };
      if (prev.direction === 'asc') return { field, direction: 'desc' };
      return { field: '', direction: null };
    });
    setPage(1);
  }, []);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const exportCSV = useCallback(() => {
    const header = visibleFields.join(',');
    const rows = filtered.map(r =>
      visibleFields.map(f => {
        const v = String(r[f] ?? '');
        return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
      }).join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'export.csv'; a.click();
    URL.revokeObjectURL(url);
  }, [filtered, visibleFields]);

  const anomalyCount = analysis.anomalies?.length ?? 0;
  const qualityScore = Math.round(
    analysis.fieldStats.reduce((s, f) => s + (1 - f.nullCount / Math.max(1, f.count)), 0) /
    Math.max(1, analysis.fieldStats.length) * 100
  );

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
        <div className="px-4 pt-3 pb-0 border-b border-border/50 bg-background shrink-0">
          <TabsList className="h-8 bg-transparent p-0 gap-0 border-b-0">
            <TabsTrigger
              value="table"
              className="h-8 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"
            >
              <Table2 className="w-3.5 h-3.5 mr-1.5" />
              {t('dataTable.title')}
            </TabsTrigger>
            <TabsTrigger
              value="prep"
              className="h-8 px-3 text-xs rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              {t('dataTable.prep')}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TABLE TAB */}
        <TabsContent value="table" className="flex-1 overflow-hidden m-0 p-0">
          {/* Toolbar */}
          <div className="px-4 py-2 flex items-center gap-2 border-b border-border/30 bg-background/80 shrink-0 flex-wrap">
            <div className="relative flex-1 min-w-[160px] max-w-[260px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={handleSearch}
                placeholder={t('common.search') + '...'}
                className="h-7 pl-8 text-xs"
              />
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowFilterPanel(v => !v)}>
              <Filter className="w-3.5 h-3.5" />
              {t('common.filter')}
              {filterField && <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">1</Badge>}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowColumnPanel(v => !v)}>
              <Columns className="w-3.5 h-3.5" />
              {t('dataTable.columns')}
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={exportCSV}>
              <Download className="w-3.5 h-3.5" />
              {t('common.export')}
            </Button>
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <span>{filtered.length} {t('dataTable.rows')}</span>
              {anomalyCount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                  {anomalyCount} {t('dataTable.anomalies')}
                </Badge>
              )}
              <Badge variant={qualityScore >= 90 ? 'default' : qualityScore >= 70 ? 'secondary' : 'destructive'} className="text-[10px] h-4 px-1.5">
                {t('dataTable.quality')} {qualityScore}%
              </Badge>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilterPanel && (
            <div className="px-4 py-2 flex items-center gap-2 bg-muted/30 border-b border-border/30 shrink-0">
              <select
                value={filterField}
                onChange={e => { setFilterField(e.target.value); setFilterValue(''); setPage(1); }}
                className="h-7 text-xs border rounded px-2 bg-background"
              >
                <option value="">{t('dataTable.filterField')}</option>
                {fields.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
              {filterField && (
                <Input
                  value={filterValue}
                  onChange={e => { setFilterValue(e.target.value); setPage(1); }}
                  placeholder={t('dataTable.filterValue')}
                  className="h-7 text-xs w-40"
                />
              )}
              {filterField && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setFilterField(''); setFilterValue(''); }}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Column Toggle Panel */}
          {showColumnPanel && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-muted/30 border-b border-border/30 shrink-0">
              {fields.map(f => (
                <button
                  key={f}
                  onClick={() => setHiddenColumns(prev => {
                    const next = new Set(prev);
                    if (next.has(f)) next.delete(f); else next.add(f);
                    return next;
                  })}
                  className={cn(
                    'text-[10px] px-2 py-0.5 rounded border transition-colors',
                    hiddenColumns.has(f)
                      ? 'border-border/50 text-muted-foreground/50'
                      : 'border-primary/30 bg-primary/5 text-primary'
                  )}
                >
                  {hiddenColumns.has(f) ? <EyeOff className="inline w-3 h-3 mr-1" /> : <Eye className="inline w-3 h-3 mr-1" />}
                  {f}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  {visibleFields.map(f => (
                    <TableHead
                      key={f}
                      className="text-xs h-8 cursor-pointer select-none whitespace-nowrap"
                      onClick={() => handleSort(f)}
                    >
                      <div className="flex items-center gap-1">
                        {f}
                        {sortConfig.field === f ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-30" />
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((row, i) => (
                  <TableRow key={i} className="text-xs hover:bg-muted/30">
                    {visibleFields.map(f => {
                      const v = row[f];
                      const stat = analysis.fieldStats.find(s => s.field === f);
                      const isAnomaly = analysis.anomalies?.some(a => a.field === f && a.row === i + (page - 1) * PAGE_SIZE);
                      return (
                        <TableCell
                          key={f}
                          className={cn(
                            'py-1.5 max-w-[200px] truncate',
                            isAnomaly && 'bg-destructive/5 text-destructive'
                          )}
                        >
                          {v === null || v === undefined || v === ''
                            ? <span className="text-muted-foreground/40 italic text-[10px]">—</span>
                            : stat?.type === 'numeric' && typeof v === 'number'
                            ? <span className="tabular-nums">{v.toLocaleString()}</span>
                            : String(v)
                          }
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="px-4 py-2 flex items-center justify-between border-t border-border/30 text-xs text-muted-foreground shrink-0">
            <span>{t('dataTable.page')} {page} / {totalPages}</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPage(1)} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* PREP TAB */}
        <TabsContent value="prep" className="flex-1 overflow-hidden m-0 p-0">
          <DataPrepInline data={data} analysis={analysis} onDataChange={onDataChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
