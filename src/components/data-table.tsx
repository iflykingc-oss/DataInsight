'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, ChevronLeft, ChevronRight, ArrowUpDown, Sparkles,
  MoreHorizontal, Eye, Trash2, Copy, Star, StarOff, FileText,
  RefreshCw, CheckSquare, Square, Bell, BellOff, MessageSquare, Share2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ParsedData, FieldStat } from '@/lib/data-processor';
import type { AIField } from '@/lib/ai-field-engine';
import { getAIFieldTypeIcon } from '@/lib/ai-field-engine';
import { AICellToolbar } from '@/components/ai-cell-toolbar';
import { RecordShareManager } from '@/components/record-share-manager';
import { cn } from '@/lib/utils';

interface RecordSubscription {
  rowIndex: number;
  field: string;
}

interface RecordSummary {
  rowIndex: number;
  summary: string;
  insights: string[];
  timestamp: number;
}

interface DataTableProps {
  data: ParsedData;
  fieldStats?: FieldStat[];
  aiFields?: AIField[];
  modelConfig?: { apiKey: string; baseUrl: string; model: string } | null;
  onFieldClick?: (field: string, value: import('@/types').CellValue) => void;
  onCellChange?: (rowIndex: number, field: string, value: import('@/types').CellValue) => void;
  onDeleteRow?: (rowIndex: number) => void;
  onBulkDelete?: (rowIndices: number[]) => void;
}

export function DataTable({ data, fieldStats, aiFields = [], modelConfig, onFieldClick, onCellChange, onDeleteRow, onBulkDelete }: DataTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // 新功能状态
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [subscribedRows, setSubscribedRows] = useState<RecordSubscription[]>([]);
  const [recordSummaries, setRecordSummaries] = useState<RecordSummary[]>([]);
  const [detailRow, setDetailRow] = useState<{ row: Record<string, unknown>; index: number } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number; rowIndex: number } | null>(null);

  // AI单元格工具栏状态
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');
  const [selectedCell, setSelectedCell] = useState<{ rowIndex: number; field: string; value: string } | null>(null);
  
  const pageCount = Math.ceil(data.rows.length / pageSize);
  
  // 过滤和排序数据
  const processedData = useMemo(() => {
    let filtered = data.rows;
    
    // 搜索过滤
    if (searchTerm) {
      filtered = filtered.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
    
    // 排序
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        
        if (aVal === null || aVal === undefined || aVal === '') return 1;
        if (bVal === null || bVal === undefined || bVal === '') return -1;
        
        const aNum = Number(aVal);
        const bNum = Number(bVal);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
        }
        
        return sortDirection === 'asc'
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
    }
    
    return filtered;
  }, [data.rows, searchTerm, sortField, sortDirection]);
  
  // 分页
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, page, pageSize]);
  
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // 文本选择检测
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setToolbarPos({ x: rect.left + rect.width / 2, y: rect.top - 10 });
      setToolbarVisible(true);

      // 尝试获取单元格信息
      const cell = range.startContainer.parentElement?.closest('td');
      if (cell) {
        const row = cell.closest('tr');
        const table = row?.closest('table');
        if (row && table) {
          const rowIndex = Array.from(table.querySelectorAll('tbody tr')).indexOf(row);
          const cellIndex = Array.from(row.querySelectorAll('td')).indexOf(cell);
          if (rowIndex >= 0 && cellIndex > 0) {
            const field = data.headers[cellIndex - 1];
            setSelectedCell({ rowIndex: (page - 1) * pageSize + rowIndex, field, value: text });
          }
        }
      }
    } else {
      setToolbarVisible(false);
    }
  }, [data.headers, page, pageSize]);

  useEffect(() => {
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('mouseup', handleTextSelection);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [handleTextSelection]);

  // 处理点击空白处关闭右键菜单
  const handleClickOutside = useCallback(() => {
    setContextMenuPos(null);
  }, []);

  // 右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, rowIndex: number) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY, rowIndex });
  }, []);

  // 切换关注记录
  const toggleSubscribe = useCallback((rowIndex: number) => {
    setSubscribedRows(prev => {
      const exists = prev.find(r => r.rowIndex === rowIndex);
      if (exists) {
        return prev.filter(r => r.rowIndex !== rowIndex);
      }
      return [...prev, { rowIndex, field: data.headers[0] }];
    });
    setContextMenuPos(null);
  }, [data.headers]);

  // 复制行数据
  const copyRowData = useCallback((rowIndex: number) => {
    const row = data.rows[rowIndex];
    const text = data.headers.map(h => `${h}: ${row[h] ?? ''}`).join('\n');
    navigator.clipboard.writeText(text);
    setContextMenuPos(null);
  }, [data.rows, data.headers]);

  // 删除单行
  const handleDeleteRow = useCallback((rowIndex: number) => {
    onDeleteRow?.(rowIndex);
    setContextMenuPos(null);
  }, [onDeleteRow]);

  // 批量删除选中行
  const handleBulkDelete = useCallback(() => {
    const indices = Array.from(selectedRows);
    onBulkDelete?.(indices);
    setSelectedRows(new Set());
    setContextMenuPos(null);
  }, [selectedRows, onBulkDelete]);

  // 智能总结单条记录
  const generateSummary = useCallback(async (rowIndex: number) => {
    if (!modelConfig?.apiKey) {
      alert('请先在设置中配置AI模型');
      return;
    }
    
    setSummaryLoading(true);
    setDetailRow({ row: data.rows[rowIndex], index: rowIndex });
    
    try {
      const response = await fetch('/api/llm-insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `请总结这条记录的关键信息，生成一句话概括和关键洞察：\n${
            data.headers.map(h => `${h}: ${data.rows[rowIndex][h] ?? ''}`).join('\n')
          }`,
          data: { headers: data.headers, rows: [data.rows[rowIndex]] },
          chatHistory: []
        })
      });
      
      // SSE流式处理
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let summaryText = '';
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                summaryText += data.content || '';
              } catch {}
            }
          }
        }
      }
      
      setRecordSummaries(prev => [
        ...prev.filter(s => s.rowIndex !== rowIndex),
        {
          rowIndex,
          summary: summaryText || '记录摘要生成中...',
          insights: [],
          timestamp: Date.now()
        }
      ]);
    } catch (error) {
      console.error('生成摘要失败:', error);
    } finally {
      setSummaryLoading(false);
      setContextMenuPos(null);
    }
  }, [modelConfig, data.rows, data.headers]);

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((_, i) => (page - 1) * pageSize + i)));
    }
  }, [selectedRows.size, paginatedData.length, page, pageSize]);

  // 切换单行选中
  const toggleRowSelect = useCallback((rowIndex: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  }, []);

  // 检查行是否被关注
  const isRowSubscribed = useCallback((rowIndex: number) => {
    return subscribedRows.some(r => r.rowIndex === rowIndex);
  }, [subscribedRows]);

  // 获取记录摘要
  const getRecordSummary = useCallback((rowIndex: number) => {
    return recordSummaries.find(s => s.rowIndex === rowIndex);
  }, [recordSummaries]);

  const getFieldType = (field: string) => {
    return fieldStats?.find(f => f.field === field)?.type || 'string';
  };
  
  const formatValue = (value: import('@/types').CellValue, type: string) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">空</span>;
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }
    
    if (type === 'number' && !isNaN(Number(value))) {
      const num = Number(value);
      if (num % 1 !== 0) {
        return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      return num.toLocaleString();
    }
    
    return String(value);
  };
  
  return (
    <div className="space-y-4">
      {/* 批量操作栏 */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg">
          <Badge variant="secondary">
            已选择 {selectedRows.size} 条记录
          </Badge>
          <Button size="sm" variant="outline" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-1" />
            批量删除
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedRows(new Set())}>
            取消选择
          </Button>
        </div>
      )}
      
      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="搜索数据..."
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          
          <Badge variant="secondary">
            共 {processedData.length.toLocaleString()} 条数据
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <Select
            value={String(pageSize)}
            onValueChange={v => {
              setPageSize(Number(v));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10 text-center">
                  <Checkbox 
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="w-12 text-center">#</TableHead>
                {data.headers.map(header => (
                  <TableHead
                    key={header}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleSort(header)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate">{header}</span>
                      <ArrowUpDown className="w-3 h-3 text-gray-400" />
                      <Badge variant="outline" className="text-xs">
                        {getFieldType(header)}
                      </Badge>
                    </div>
                  </TableHead>
                ))}
                {/* AI字段列 */}
                {aiFields.map(field => (
                  <TableHead
                    key={field.id}
                    className="bg-primary/5 border-l-2 border-primary/20"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{getAIFieldTypeIcon(field.type)}</span>
                      <span className="truncate font-medium text-primary">{field.name}</span>
                      {field.status === 'running' && (
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      )}
                      {field.status === 'completed' && (
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={data.headers.length + 1} className="text-center py-8 text-gray-500">
                    没有找到匹配的数据
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, rowIndex) => {
                  const actualRowIndex = (page - 1) * pageSize + rowIndex;
                  const isSubscribed = isRowSubscribed(actualRowIndex);
                  const hasSummary = !!getRecordSummary(actualRowIndex);
                  return (
                    <TableRow 
                      key={`row-${rowIndex}`} 
                      className={cn(selectedRows.has(actualRowIndex) && 'bg-primary/5')}
                      onContextMenu={(e) => handleContextMenu(e, actualRowIndex)}
                    >
                      <TableCell className="text-center">
                        <Checkbox 
                          checked={selectedRows.has(actualRowIndex)}
                          onCheckedChange={() => toggleRowSelect(actualRowIndex)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="text-center text-gray-400">
                        <div className="flex items-center gap-1">
                          {isSubscribed && (
                            <Bell className="w-3 h-3 text-yellow-500" />
                          )}
                          <span>{actualRowIndex + 1}</span>
                        </div>
                      </TableCell>
                      {data.headers.map(header => (
                        <TableCell
                          key={header}
                          className="max-w-xs truncate"
                          onClick={() => onFieldClick?.(header, row[header])}
                        >
                          {formatValue(row[header], getFieldType(header))}
                        </TableCell>
                      ))}
                      {/* AI字段值 */}
                      {aiFields.map(field => (
                        <TableCell
                          key={field.id}
                          className={cn(
                            'max-w-xs truncate border-l-2 border-primary/10',
                            field.results[actualRowIndex] ? 'bg-primary/5' : 'bg-gray-50'
                          )}
                        >
                          {field.status === 'running' && !field.results[actualRowIndex] ? (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                              处理中...
                            </span>
                          ) : field.results[actualRowIndex] ? (
                            <span className="text-sm">{String(field.results[actualRowIndex])}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">未处理</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      {/* 右键菜单 */}
      {contextMenuPos && (
        <div
          className="fixed z-50 bg-background border rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <DropdownMenuItem onClick={() => { setDetailRow({ row: data.rows[contextMenuPos.rowIndex], index: contextMenuPos.rowIndex }); setContextMenuPos(null); }}>
            <Eye className="w-4 h-4 mr-2" />
            查看详情
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => generateSummary(contextMenuPos.rowIndex)}>
            <Sparkles className="w-4 h-4 mr-2" />
            智能总结
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toggleSubscribe(contextMenuPos.rowIndex)}>
            {isRowSubscribed(contextMenuPos.rowIndex) ? (
              <>
                <BellOff className="w-4 h-4 mr-2" />
                取消关注
              </>
            ) : (
              <>
                <Bell className="w-4 h-4 mr-2" />
                关注记录
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={(e) => {
              e.stopPropagation();
              // 打开分享弹窗
              setDetailRow({ row: data.rows[contextMenuPos.rowIndex], index: contextMenuPos.rowIndex });
              setContextMenuPos(null);
              // 触发分享
              setTimeout(() => {
                const shareBtn = document.querySelector('[data-share-record]') as HTMLButtonElement;
                shareBtn?.click();
              }, 100);
            }}
          >
            <Share2 className="w-4 h-4 mr-2" />
            分享记录
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => copyRowData(contextMenuPos.rowIndex)}>
            <Copy className="w-4 h-4 mr-2" />
            复制数据
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(JSON.stringify(data.rows[contextMenuPos.rowIndex], null, 2))}>
            <FileText className="w-4 h-4 mr-2" />
            复制JSON
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => handleDeleteRow(contextMenuPos.rowIndex)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            删除记录
          </DropdownMenuItem>
        </div>
      )}

      {/* 记录详情弹窗 */}
      <Dialog open={!!detailRow} onOpenChange={() => setDetailRow(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              记录详情 #{detailRow ? detailRow.index + 1 : ''}
              {detailRow && isRowSubscribed(detailRow.index) && (
                <Badge variant="secondary" className="gap-1">
                  <Bell className="w-3 h-3" /> 已关注
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {detailRow && (
            <div className="space-y-4">
              {/* 字段详情 */}
              <div className="grid gap-3">
                {data.headers.map(header => (
                  <div key={header} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <Label className="w-32 shrink-0 font-medium">{header}</Label>
                    <span className="flex-1 break-all">
                      {detailRow.row[header] !== null && detailRow.row[header] !== undefined 
                        ? String(detailRow.row[header]) 
                        : <span className="text-muted-foreground italic">空</span>}
                    </span>
                  </div>
                ))}
              </div>
              
              {/* 智能总结 */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium">智能总结</span>
                  {summaryLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                </div>
                
                {getRecordSummary(detailRow.index) ? (
                  <div className="p-4 bg-primary/5 rounded-lg">
                    <p className="text-sm mb-2">{getRecordSummary(detailRow.index)?.summary}</p>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Button onClick={() => generateSummary(detailRow.index)} disabled={summaryLoading}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      生成总结
                    </Button>
                  </div>
                )}
              </div>
              
              {/* 操作按钮 */}
              <div className="flex items-center gap-2 border-t pt-4">
                {detailRow && (
                  <RecordShareManager
                    recordData={detailRow.row}
                    headers={data.headers}
                    recordIndex={detailRow.index}
                    trigger={
                      <Button variant="outline" data-share-record>
                        <Share2 className="w-4 h-4 mr-2" />
                        分享记录
                      </Button>
                    }
                  />
                )}
                <Button variant="outline" onClick={() => toggleSubscribe(detailRow.index)}>
                  {isRowSubscribed(detailRow.index) ? (
                    <>
                      <BellOff className="w-4 h-4 mr-2" />
                      取消关注
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4 mr-2" />
                      关注记录
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => { copyRowData(detailRow.index); }}>
                  <Copy className="w-4 h-4 mr-2" />
                  复制数据
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => { handleDeleteRow(detailRow.index); setDetailRow(null); }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除记录
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AI单元格工具栏 */}
      {toolbarVisible && selectedCell && (
        <div
          className="fixed z-50"
          style={{
            left: `${toolbarPos.x}px`,
            top: `${toolbarPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <AICellToolbar
            selectedText={selectedText}
            cellValue={String(data.rows[selectedCell.rowIndex]?.[selectedCell.field] ?? '')}
            modelConfig={modelConfig}
            onApply={(newValue) => {
              onCellChange?.(selectedCell.rowIndex, selectedCell.field, newValue);
              setToolbarVisible(false);
            }}
            onClose={() => setToolbarVisible(false)}
          />
        </div>
      )}

      {/* 分页 */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, processedData.length)} 条，
            共 {processedData.length.toLocaleString()} 条
          </p>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                let pageNum: number;
                if (pageCount <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pageCount - 2) {
                  pageNum = pageCount - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(pageCount, p + 1))}
              disabled={page === pageCount}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
