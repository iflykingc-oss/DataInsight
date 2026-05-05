import type { CellValue } from '@/lib/data-processor';

export type { CellValue };

export interface CellRef {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellRef;
  end: CellRef;
}

export interface CellPosition extends CellRef {
  value: CellValue;
}

export interface ColumnDefinition {
  key: string;
  label: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  filterable?: boolean;
}

export interface RowDefinition {
  index: number;
  height: number;
  hidden?: boolean;
}

export interface TableSelection {
  type: 'none' | 'cell' | 'range' | 'row' | 'column';
  anchor?: CellRef;
  focus?: CellRef;
  ranges?: CellRange[];
}

export interface SortState {
  column: string | null;
  direction: 'asc' | 'desc';
}

export interface FilterState {
  column: string;
  operator: FilterOperator;
  value: CellValue;
}

export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_empty'
  | 'is_not_empty';

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}

export interface SpreadsheetState {
  data: ParsedData;
  selection: TableSelection;
  editingCell: CellRef | null;
  sortState: SortState;
  filterState: FilterState | null;
  pagination: PaginationState;
  columnWidths: Map<string, number>;
  rowHeights: Map<number, number>;
  scrollTop: number;
  scrollLeft: number;
  frozenRows: number;
  frozenCols: number;
  searchTerm: string;
  searchResults: number[];
}

export interface ParsedData {
  headers: string[];
  rows: Record<string, CellValue>[];
  fileName?: string;
  fileSize?: number;
  sheetName?: string;
}

export interface TableSnapshot {
  id: string;
  data: ParsedData;
  format: TableFormat;
  createdAt: number;
  operation?: string;
}

export interface TableFormat {
  columnWidths: Map<string, number>;
  rowHeights: Map<number, number>;
  alignments: Map<string, 'left' | 'center' | 'right'>;
  headerStyle: HeaderStyle;
  cellStyles: Map<string, CellStyle>;
}

export interface HeaderStyle {
  bold?: boolean;
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  numberFormat?: string;
  border?: CellBorder;
}

export interface CellBorder {
  top?: BorderStyle;
  bottom?: BorderStyle;
  left?: BorderStyle;
  right?: BorderStyle;
}

export interface BorderStyle {
  style: 'thin' | 'medium' | 'thick' | 'none';
  color?: string;
}
