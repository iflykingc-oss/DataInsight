import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { ParsedData, CellValue } from '@/lib/data-processor';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  Filter,
  Search,
  Download,
  Maximize2,
  Minimize2,
  GripVertical,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit3,
  Check,
  X,
  AlertCircle,
  Lock,
  Unlock,
} from 'lucide-react';

export interface CellRef {
  row: number;
  col: number;
}

export interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterCondition {
  column: string;
  operator: string;
  value: CellValue;
}

export interface ColumnWidth {
  [key: string]: number;
}

export interface ConditionalFormat {
  id: string;
  column: string;
  type: 'value' | 'text' | 'date';
  condition: 'gt' | 'lt' | 'eq' | 'contains' | 'between';
  value: CellValue;
  value2?: CellValue;
  style: ConditionalStyle;
}

export interface ConditionalStyle {
  backgroundColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface ValidationRule {
  column: string;
  type: 'required' | 'unique' | 'range' | 'pattern' | 'list';
  value?: CellValue;
  value2?: CellValue;
  pattern?: string;
  list?: CellValue[];
  message: string;
}

export interface SpreadsheetProps {
  data: ParsedData;
  onChange?: (data: ParsedData) => void;
  editable?: boolean;
  showLineNumbers?: boolean;
  pageSize?: number;
  selectedCell?: CellRef | null;
  onCellSelect?: (cell: CellRef | null) => void;
  sortState?: SortState;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  filterCondition?: FilterCondition | null;
  onFilterChange?: (condition: FilterCondition | null) => void;
  className?: string;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  frozenRows?: number;
  frozenCols?: number;
  conditionalFormats?: ConditionalFormat[];
  validationRules?: ValidationRule[];
  onValidationError?: (errors: ValidationError[]) => void;
  showToolbar?: boolean;
  showFooter?: boolean;
}

export interface ValidationError {
  row: number;
  col: string;
  message: string;
  value: CellValue;
}

export interface SpreadsheetState {
  sortState: SortState | null;
  filterCondition: FilterCondition | null;
  columnWidths: ColumnWidth;
  editingCell: CellRef | null;
  editValue: string;
  contextMenu: { x: number; y: number; row: number; col: number } | null;
  selectedRange: { start: CellRef; end: CellRef } | null;
  scrollTop: number;
  scrollLeft: number;
  isFullScreen: boolean;
  searchQuery: string;
  searchResults: CellRef[];
  currentSearchIndex: number;
}

const DEFAULT_COLUMN_WIDTH = 120;
const DEFAULT_ROW_HEIGHT = 36;
const MIN_COLUMN_WIDTH = 60;
const MAX_COLUMN_WIDTH = 500;

export const Spreadsheet: React.FC<SpreadsheetProps> = ({
  data,
  onChange,
  editable = false,
  showLineNumbers = true,
  pageSize = 100,
  selectedCell: externalSelectedCell,
  onCellSelect,
  sortState: externalSortState,
  onSort,
  filterCondition: externalFilterCondition,
  onFilterChange,
  className,
  onScroll,
  frozenRows = 0,
  frozenCols = 0,
  conditionalFormats = [],
  validationRules = [],
  onValidationError,
  showToolbar = true,
  showFooter = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, setState] = useState<SpreadsheetState>({
    sortState: externalSortState || null,
    filterCondition: externalFilterCondition || null,
    columnWidths: {},
    editingCell: null,
    editValue: '',
    contextMenu: null,
    selectedRange: null,
    scrollTop: 0,
    scrollLeft: 0,
    isFullScreen: false,
    searchQuery: '',
    searchResults: [],
    currentSearchIndex: 0,
  });

  const [selectedCell, setSelectedCell] = useState<CellRef | null>(externalSelectedCell || null);

  useEffect(() => {
    if (externalSelectedCell !== undefined) {
      setSelectedCell(externalSelectedCell);
    }
  }, [externalSelectedCell]);

  const processedData = useMemo(() => {
    let result = { ...data };

    if (state.sortState) {
      const { column, direction } = state.sortState;
      const headerIndex = data.headers.indexOf(column);
      if (headerIndex !== -1) {
        const sortedRows = [...result.rows].sort((a, b) => {
          const aVal = a[column];
          const bVal = b[column];
          const aNum = Number(aVal);
          const bNum = Number(bVal);

          if (!isNaN(aNum) && !isNaN(bNum)) {
            return direction === 'asc' ? aNum - bNum : bNum - aNum;
          }

          const cmp = String(aVal || '').localeCompare(String(bVal || ''), 'zh-CN');
          return direction === 'asc' ? cmp : -cmp;
        });
        result = { ...result, rows: sortedRows };
      }
    }

    if (state.filterCondition) {
      const { column, operator, value } = state.filterCondition;
      const filteredRows = result.rows.filter((row) => {
        const cellValue = row[column];
        const cellNum = Number(cellValue);
        const compareNum = Number(value);

        switch (operator) {
          case 'gt':
            return !isNaN(cellNum) && !isNaN(compareNum) && cellNum > compareNum;
          case 'lt':
            return !isNaN(cellNum) && !isNaN(compareNum) && cellNum < compareNum;
          case 'eq':
            return String(cellValue) === String(value);
          case 'contains':
            return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
          case 'neq':
            return String(cellValue) !== String(value);
          default:
            return true;
        }
      });
      result = { ...result, rows: filteredRows };
    }

    return result;
  }, [data, state.sortState, state.filterCondition]);

  const validationErrors = useMemo(() => {
    if (validationRules.length === 0) return [];

    const errors: ValidationError[] = [];
    const uniqueValues: Record<string, Set<string>> = {};

    for (const rule of validationRules) {
      if (rule.type === 'unique') {
        uniqueValues[rule.column] = new Set();
      }
    }

    for (let i = 0; i < processedData.rows.length; i++) {
      const row = processedData.rows[i];

      for (const rule of validationRules) {
        const value = row[rule.column];

        switch (rule.type) {
          case 'required':
            if (value === null || value === undefined || value === '') {
              errors.push({
                row: i,
                col: rule.column,
                message: rule.message || `${rule.column} 不能为空`,
                value,
              });
            }
            break;

          case 'unique':
            const strVal = String(value ?? '');
            if (uniqueValues[rule.column]?.has(strVal)) {
              errors.push({
                row: i,
                col: rule.column,
                message: rule.message || `${rule.column} 存在重复值`,
                value,
              });
            }
            uniqueValues[rule.column]?.add(strVal);
            break;

          case 'range':
            const numVal = Number(value);
            const min = Number(rule.value);
            const max = Number(rule.value2);
            if (!isNaN(numVal) && !isNaN(min) && !isNaN(max)) {
              if (numVal < min || numVal > max) {
                errors.push({
                  row: i,
                  col: rule.column,
                  message: rule.message || `${rule.column} 超出范围 [${min}, ${max}]`,
                  value,
                });
              }
            }
            break;

          case 'pattern':
            if (rule.pattern) {
              const regex = new RegExp(rule.pattern);
              if (!regex.test(String(value ?? ''))) {
                errors.push({
                  row: i,
                  col: rule.column,
                  message: rule.message || `${rule.column} 格式不正确`,
                  value,
                });
              }
            }
            break;
        }
      }
    }

    return errors;
  }, [processedData, validationRules]);

  useEffect(() => {
    if (onValidationError && validationErrors.length > 0) {
      onValidationError(validationErrors);
    }
  }, [validationErrors, onValidationError]);

  const totalPages = Math.ceil(processedData.rows.length / pageSize);
  const currentPage = Math.floor(state.scrollTop / (DEFAULT_ROW_HEIGHT * pageSize)) + 1;
  const startRow = (currentPage - 1) * pageSize;
  const endRow = Math.min(startRow + pageSize, processedData.rows.length);
  const paginatedData = processedData.rows.slice(startRow, endRow);

  const getColumnWidth = useCallback(
    (header: string): number => {
      return state.columnWidths[header] || DEFAULT_COLUMN_WIDTH;
    },
    [state.columnWidths]
  );

  const handleCellClick = useCallback(
    (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
      e.stopPropagation();
      const cell: CellRef = {
        row: startRow + rowIndex,
        col: colIndex,
      };
      setSelectedCell(cell);
      onCellSelect?.(cell);
    },
    [startRow, onCellSelect]
  );

  const handleCellDoubleClick = useCallback((rowIndex: number, colIndex: number) => {
    if (!editable) return;
    setState((prev) => ({
      ...prev,
      editingCell: { row: startRow + rowIndex, col: colIndex },
      editValue: String(processedData.rows[startRow + rowIndex]?.[processedData.headers[colIndex]] ?? ''),
    }));
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [editable, startRow, processedData]);

  const handleEditComplete = useCallback(() => {
    if (!state.editingCell) return;

    const { row, col } = state.editingCell;
    const newRows = [...processedData.rows];
    const header = processedData.headers[col];

    newRows[row] = {
      ...newRows[row],
      [header]: state.editValue,
    };

    onChange?.({ ...processedData, rows: newRows });

    setState((prev) => ({ ...prev, editingCell: null, editValue: '' }));
  }, [state.editingCell, state.editValue, processedData, onChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (state.editingCell) {
        if (e.key === 'Enter') {
          handleEditComplete();
        } else if (e.key === 'Escape') {
          setState((prev) => ({ ...prev, editingCell: null, editValue: '' }));
        }
        return;
      }

      const { row, col } = selectedCell || { row: 0, col: 0 };

      switch (e.key) {
        case 'ArrowUp':
          if (row > 0) {
            const newCell = { row: row - 1, col };
            setSelectedCell(newCell);
            onCellSelect?.(newCell);
          }
          e.preventDefault();
          break;
        case 'ArrowDown':
          if (row < processedData.rows.length - 1) {
            const newCell = { row: row + 1, col };
            setSelectedCell(newCell);
            onCellSelect?.(newCell);
          }
          e.preventDefault();
          break;
        case 'ArrowLeft':
          if (col > 0) {
            const newCell = { row, col: col - 1 };
            setSelectedCell(newCell);
            onCellSelect?.(newCell);
          }
          e.preventDefault();
          break;
        case 'ArrowRight':
          if (col < processedData.headers.length - 1) {
            const newCell = { row, col: col + 1 };
            setSelectedCell(newCell);
            onCellSelect?.(newCell);
          }
          e.preventDefault();
          break;
        case 'Enter':
          if (editable) {
            handleCellDoubleClick(row, col);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (editable && selectedCell) {
            const newRows = [...processedData.rows];
            const header = processedData.headers[selectedCell.col];
            newRows[selectedCell.row] = { ...newRows[selectedCell.row], [header]: '' };
            onChange?.({ ...processedData, rows: newRows });
          }
          break;
      }
    },
    [selectedCell, state.editingCell, processedData, editable, handleEditComplete, handleCellDoubleClick, onCellSelect, onChange]
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    setState((prev) => ({
      ...prev,
      contextMenu: { x: e.clientX, y: e.clientY, row: startRow + rowIndex, col: colIndex },
    }));
  }, [startRow]);

  const handleSort = useCallback(
    (column: string) => {
      const newDirection: 'asc' | 'desc' = state.sortState?.column === column && state.sortState.direction === 'asc' ? 'desc' : 'asc';
      const newSortState: SortState = { column, direction: newDirection };
      setState((prev) => ({ ...prev, sortState: newSortState }));
      onSort?.(column, newDirection);
    },
    [state.sortState, onSort]
  );

  const handleFilterChange = useCallback(
    (condition: FilterCondition | null) => {
      setState((prev) => ({ ...prev, filterCondition: condition }));
      onFilterChange?.(condition);
    },
    [onFilterChange]
  );

  const handleColumnResize = useCallback((header: string, delta: number) => {
    setState((prev) => {
      const currentWidth = prev.columnWidths[header] || DEFAULT_COLUMN_WIDTH;
      const newWidth = Math.max(MIN_COLUMN_WIDTH, Math.min(MAX_COLUMN_WIDTH, currentWidth + delta));
      return {
        ...prev,
        columnWidths: { ...prev.columnWidths, [header]: newWidth },
      };
    });
  }, []);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const scrollTop = target.scrollTop;
      const scrollLeft = target.scrollLeft;

      if (headerRef.current) {
        headerRef.current.scrollLeft = scrollLeft;
      }

      setState((prev) => ({ ...prev, scrollTop, scrollLeft }));
      onScroll?.(scrollTop, scrollLeft);
    },
    [onScroll]
  );

  const getConditionalStyle = useCallback(
    (rowIndex: number, colIndex: number): React.CSSProperties => {
      const header = processedData.headers[colIndex];
      const value = processedData.rows[rowIndex]?.[header];

      for (const format of conditionalFormats) {
        if (format.column !== header) continue;

        let matches = false;
        const numValue = Number(value);
        const compareValue = Number(format.value);

        switch (format.condition) {
          case 'gt':
            matches = !isNaN(numValue) && !isNaN(compareValue) && numValue > compareValue;
            break;
          case 'lt':
            matches = !isNaN(numValue) && !isNaN(compareValue) && numValue < compareValue;
            break;
          case 'eq':
            matches = String(value) === String(format.value);
            break;
          case 'contains':
            matches = String(value).toLowerCase().includes(String(format.value).toLowerCase());
            break;
          case 'between':
            const numValue2 = Number(format.value2);
            matches = !isNaN(numValue) && !isNaN(compareValue) && !isNaN(numValue2) && numValue >= compareValue && numValue <= numValue2;
            break;
        }

        if (matches && format.style) {
          return {
            backgroundColor: format.style.backgroundColor,
            color: format.style.textColor,
            fontWeight: format.style.bold ? 'bold' : undefined,
            fontStyle: format.style.italic ? 'italic' : undefined,
          };
        }
      }

      return {};
    },
    [processedData, conditionalFormats]
  );

  const hasValidationError = useCallback(
    (rowIndex: number, colIndex: number): ValidationError | undefined => {
      const header = processedData.headers[colIndex];
      return validationErrors.find((e) => e.row === rowIndex && e.col === header);
    },
    [processedData, validationErrors]
  );

  const renderCell = (rowIndex: number, colIndex: number) => {
    const row = paginatedData[rowIndex];
    if (!row) return null;

    const header = processedData.headers[colIndex];
    const value = row[header];
    const displayValue = value != null ? String(value) : '';
    const isEditing = state.editingCell?.row === startRow + rowIndex && state.editingCell?.col === colIndex;
    const isSelected = selectedCell?.row === startRow + rowIndex && selectedCell?.col === colIndex;
    const conditionalStyle = getConditionalStyle(rowIndex, colIndex);
    const validationError = hasValidationError(rowIndex, colIndex);

    return (
      <div
        key={`${rowIndex}-${colIndex}`}
        className={cn(
          'spreadsheet-cell relative border-r border-b border-border flex items-center px-2 text-sm',
          'transition-colors duration-75 select-none',
          isSelected && 'bg-blue-50 outline outline-2 outline-blue-500 z-10',
          validationError && 'bg-red-50 border-red-300'
        )}
        style={{ width: getColumnWidth(header), height: DEFAULT_ROW_HEIGHT, ...conditionalStyle }}
        onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
        onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
        onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={state.editValue}
            onChange={(e) => setState((prev) => ({ ...prev, editValue: e.target.value }))}
            onBlur={handleEditComplete}
            onKeyDown={handleKeyDown}
            className="w-full h-full px-2 border-none outline-none bg-white text-sm"
            autoFocus
          />
        ) : (
          <>
            <span className="truncate flex-1">{displayValue}</span>
            {validationError && (
              <span className="ml-1 text-red-500" title={validationError.message}>
                <AlertCircle className="w-3 h-3" />
              </span>
            )}
          </>
        )}
      </div>
    );
  };

  const renderHeader = (colIndex: number) => {
    const header = processedData.headers[colIndex];
    const isSorted = state.sortState?.column === header;
    const sortDirection = isSorted && state.sortState ? state.sortState.direction : null;
    const isFiltered = state.filterCondition?.column === header;

    return (
      <div
        key={`header-${colIndex}`}
        className={cn(
          'spreadsheet-header border-r border-b border-border flex items-center px-2 text-sm font-medium',
          'bg-muted cursor-pointer select-none hover:bg-muted transition-colors',
          isSorted && 'bg-blue-100',
          isFiltered && 'bg-green-100'
        )}
        style={{ width: getColumnWidth(header), height: DEFAULT_ROW_HEIGHT }}
        onClick={() => handleSort(header)}
      >
        <span className="truncate flex-1">{header}</span>
        <div className="flex items-center gap-1 ml-1">
          {sortDirection === 'asc' && <ChevronUp className="w-3 h-3 text-blue-600" />}
          {sortDirection === 'desc' && <ChevronDown className="w-3 h-3 text-blue-600" />}
          {isFiltered && <Filter className="w-3 h-3 text-green-600" />}
        </div>
      </div>
    );
  };

  const renderFrozenRows = () => {
    const frozenData = processedData.rows.slice(0, frozenRows);
    return frozenData.map((row, rowIndex) => (
      <div key={`frozen-row-${rowIndex}`} className="flex">
        {showLineNumbers && (
          <div
            className="spreadsheet-line-number border-r border-b border-border flex items-center justify-center text-xs text-muted-foreground bg-muted/30"
            style={{ width: 50, height: DEFAULT_ROW_HEIGHT }}
          >
            {rowIndex + 1}
          </div>
        )}
        {processedData.headers.map((_, colIndex) => renderCell(rowIndex, colIndex))}
      </div>
    ));
  };

  const renderFrozenCols = () => {
    return paginatedData.map((row, rowIndex) => (
      <div key={`frozen-col-${rowIndex}`} className="flex">
        {showLineNumbers && (
          <div
            className="spreadsheet-line-number border-r border-b border-border flex items-center justify-center text-xs text-muted-foreground bg-muted/30"
            style={{ width: 50, height: DEFAULT_ROW_HEIGHT }}
          >
            {startRow + rowIndex + 1}
          </div>
        )}
      </div>
    ));
  };

  if (showToolbar) {
    return (
      <div className={cn('flex flex-col bg-white rounded-lg border shadow-sm', className)}>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-lg">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">数据表格</span>
            <span className="text-xs text-muted-foreground">
              {processedData.rows.length} 行 × {processedData.headers.length} 列
            </span>
            {state.filterCondition && (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                已筛选
              </span>
            )}
            {validationErrors.length > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">
                {validationErrors.length} 个错误
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="搜索..."
                value={state.searchQuery}
                onChange={(e) => setState((prev) => ({ ...prev, searchQuery: e.target.value }))}
                className="pl-8 pr-3 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {state.sortState && (
              <button
                onClick={() => {
                  setState((prev) => ({ ...prev, sortState: null }));
                  onSort?.('', 'asc');
                }}
                className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
              >
                <X className="w-3 h-3" />
                清除排序
              </button>
            )}

            {state.filterCondition && (
              <button
                onClick={() => handleFilterChange(null)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-green-600 hover:bg-green-50 rounded"
              >
                <X className="w-3 h-3" />
                清除筛选
              </button>
            )}

            <button
              onClick={() => setState((prev) => ({ ...prev, isFullScreen: !prev.isFullScreen }))}
              className="p-1.5 hover:bg-muted rounded"
            >
              {state.isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div
          ref={containerRef}
          className={cn(
            'overflow-auto relative',
            state.isFullScreen ? 'h-screen' : 'max-h-96'
          )}
          onScroll={handleScroll}
          onClick={() => setState((prev) => ({ ...prev, contextMenu: null }))}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          <div className="min-w-full inline-block">
            <div className="sticky top-0 z-20 flex bg-muted">
              {showLineNumbers && (
                <div
                  className="border-r border-b border-border flex items-center justify-center text-xs font-medium bg-muted"
                  style={{ width: 50, height: DEFAULT_ROW_HEIGHT }}
                >
                  #
                </div>
              )}
              {processedData.headers.map((_, colIndex) => renderHeader(colIndex))}
            </div>

            {frozenRows > 0 && (
              <div className="sticky top-0 z-10 bg-muted/30 border-b-2 border-border">
                {renderFrozenRows()}
              </div>
            )}

            <div className="bg-white">
              {paginatedData.map((_, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex">
                  {showLineNumbers && (
                    <div
                      className="spreadsheet-line-number border-r border-b border-border flex items-center justify-center text-xs text-muted-foreground bg-muted/30"
                      style={{ width: 50, height: DEFAULT_ROW_HEIGHT }}
                    >
                      {startRow + rowIndex + 1}
                    </div>
                  )}
                  {processedData.headers.map((_, colIndex) => renderCell(rowIndex, colIndex))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {showFooter && (
          <div className="flex items-center justify-between px-4 py-2 border-t bg-muted/30 rounded-b-lg">
            <div className="text-xs text-muted-foreground">
              第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const newScroll = Math.max(0, state.scrollTop - DEFAULT_ROW_HEIGHT * pageSize);
                  bodyRef.current?.scrollTo({ top: newScroll });
                }}
                disabled={currentPage <= 1}
                className="px-2 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => {
                  const newScroll = state.scrollTop + DEFAULT_ROW_HEIGHT * pageSize;
                  bodyRef.current?.scrollTo({ top: newScroll });
                }}
                disabled={currentPage >= totalPages}
                className="px-2 py-1 text-xs border rounded hover:bg-muted disabled:opacity-50"
              >
                下一页
              </button>
            </div>
          </div>
        )}

        {state.contextMenu && (
          <div
            className="fixed z-50 bg-white rounded-lg border shadow-lg py-1 min-w-32"
            style={{ left: state.contextMenu.x, top: state.contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
              onClick={() => {
                const header = processedData.headers[state.contextMenu!.col];
                const value = processedData.rows[state.contextMenu!.row]?.[header];
                navigator.clipboard.writeText(String(value ?? ''));
                setState((prev) => ({ ...prev, contextMenu: null }));
              }}
            >
              <Copy className="w-4 h-4" />
              复制
            </button>
            {editable && (
              <>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2"
                  onClick={() => {
                    setState((prev) => ({ ...prev, contextMenu: null }));
                    handleCellDoubleClick(state.contextMenu!.row, state.contextMenu!.col);
                  }}
                >
                  <Edit3 className="w-4 h-4" />
                  编辑
                </button>
                <button
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted flex items-center gap-2 text-red-600"
                  onClick={() => {
                    const newRows = [...processedData.rows];
                    newRows.splice(state.contextMenu!.row, 1);
                    onChange?.({ ...processedData, rows: newRows });
                    setState((prev) => ({ ...prev, contextMenu: null }));
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  删除行
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      onScroll={handleScroll}
      onClick={() => setState((prev) => ({ ...prev, contextMenu: null }))}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <table className="border-collapse min-w-full">
        <thead>
          <tr className="bg-muted">
            {showLineNumbers && (
              <th className="border border-border px-2 py-2 text-xs font-medium text-muted-foreground bg-muted">
                #
              </th>
            )}
            {processedData.headers.map((header, colIndex) => (
              <th
                key={header}
                className="border border-border px-2 py-2 text-sm font-medium text-foreground cursor-pointer hover:bg-muted"
                onClick={() => handleSort(header)}
                style={{ width: getColumnWidth(header) }}
              >
                <div className="flex items-center gap-1">
                  <span>{header}</span>
                  {state.sortState?.column === header && (
                    state.sortState.direction === 'asc' ? (
                      <ChevronUp className="w-3 h-3 text-blue-600" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-blue-600" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-muted/30">
              {showLineNumbers && (
                <td className="border border-border px-2 py-2 text-xs text-muted-foreground text-center bg-muted/30">
                  {startRow + rowIndex + 1}
                </td>
              )}
              {processedData.headers.map((_, colIndex) => {
                const isSelected = selectedCell?.row === startRow + rowIndex && selectedCell?.col === colIndex;
                return (
                  <td
                    key={colIndex}
                    className={cn(
                      'border border-border px-2 py-2 text-sm',
                      isSelected && 'bg-blue-50 outline outline-1 outline-blue-500'
                    )}
                    style={{ width: getColumnWidth(processedData.headers[colIndex]) }}
                    onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                    onDoubleClick={() => handleCellDoubleClick(rowIndex, colIndex)}
                    onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
                  >
                    {String(row[processedData.headers[colIndex]] ?? '')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export interface ColumnFilterProps {
  column: string;
  values: CellValue[];
  onApply: (condition: FilterCondition) => void;
  onClose: () => void;
}

export const ColumnFilter: React.FC<ColumnFilterProps> = ({ column, values, onApply, onClose }) => {
  const [operator, setOperator] = useState('contains');
  const [value, setValue] = useState('');

  const operators = [
    { value: 'contains', label: '包含' },
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' },
    { value: 'gt', label: '大于' },
    { value: 'lt', label: '小于' },
  ];

  return (
    <div className="p-3 bg-white rounded-lg border shadow-lg w-64">
      <div className="flex items-center justify-between mb-3">
        <span className="font-medium text-sm">筛选: {column}</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        <select
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="输入筛选值..."
          className="w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        <div className="flex gap-2">
          <button
            onClick={() => {
              onApply({ column, operator, value });
              onClose();
            }}
            className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            应用
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-3 py-1.5 text-sm border rounded hover:bg-muted/30"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export interface ConditionalFormatEditorProps {
  columns: string[];
  existingFormats: ConditionalFormat[];
  onSave: (formats: ConditionalFormat[]) => void;
  onClose: () => void;
}

export const ConditionalFormatEditor: React.FC<ConditionalFormatEditorProps> = ({
  columns,
  existingFormats,
  onSave,
  onClose,
}) => {
  const [formats, setFormats] = useState<ConditionalFormat[]>(existingFormats);

  const addFormat = () => {
    setFormats([
      ...formats,
      {
        id: crypto.randomUUID(),
        column: columns[0] || '',
        type: 'value',
        condition: 'gt',
        value: 0,
        style: { backgroundColor: '#fee2e2', textColor: '#991b1b' },
      },
    ]);
  };

  const removeFormat = (id: string) => {
    setFormats(formats.filter((f) => f.id !== id));
  };

  const updateFormat = (id: string, updates: Partial<ConditionalFormat>) => {
    setFormats(formats.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  return (
    <div className="p-4 bg-white rounded-lg border shadow-lg w-96">
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium">条件格式</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 mb-4">
        {formats.map((format) => (
          <div key={format.id} className="p-3 bg-muted/30 rounded border">
            <div className="flex items-center gap-2 mb-2">
              <select
                value={format.column}
                onChange={(e) => updateFormat(format.id, { column: e.target.value })}
                className="flex-1 px-2 py-1 text-sm border rounded"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <button
                onClick={() => removeFormat(format.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={format.condition}
                onChange={(e) => updateFormat(format.id, { condition: e.target.value as ConditionalFormat['condition'] })}
                className="px-2 py-1 text-sm border rounded"
              >
                <option value="gt">大于</option>
                <option value="lt">小于</option>
                <option value="eq">等于</option>
                <option value="contains">包含</option>
              </select>
              <input
                type="text"
                value={String(format.value)}
                onChange={(e) => updateFormat(format.id, { value: e.target.value })}
                className="flex-1 px-2 py-1 text-sm border rounded"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="color"
                value={format.style.backgroundColor || '#fee2e2'}
                onChange={(e) => updateFormat(format.id, { style: { ...format.style, backgroundColor: e.target.value } })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">背景色</span>
              <input
                type="color"
                value={format.style.textColor || '#991b1b'}
                onChange={(e) => updateFormat(format.id, { style: { ...format.style, textColor: e.target.value } })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">文字色</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addFormat}
        className="w-full px-3 py-2 text-sm border border-dashed border-gray-400 rounded hover:bg-muted/30"
      >
        + 添加条件格式
      </button>

      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSave(formats)}
          className="flex-1 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          保存
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-3 py-2 text-sm border rounded hover:bg-muted/30"
        >
          取消
        </button>
      </div>
    </div>
  );
};
