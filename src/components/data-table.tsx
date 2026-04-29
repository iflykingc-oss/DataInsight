'use client';

import React, { useState, useMemo } from 'react';
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
import { Search, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

interface DataTableProps {
  data: ParsedData;
  fieldStats?: FieldStat[];
  onFieldClick?: (field: string, value: import('@/types').CellValue) => void;
}

export function DataTable({ data, fieldStats, onFieldClick }: DataTableProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
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
                paginatedData.map((row, rowIndex) => (
                  <TableRow key={`row-${rowIndex}`}>
                    <TableCell className="text-center text-gray-400">
                      {(page - 1) * pageSize + rowIndex + 1}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
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
