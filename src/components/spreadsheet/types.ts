import type { CellValue } from '@/lib/data-processor';
import type { CellRef } from './Spreadsheet';

export type { CellValue, CellRef };

export interface FilterCondition {
  column: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'is_empty' | 'is_not_empty';
  value: CellValue;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  backgroundColor?: string;
  alignment?: 'left' | 'center' | 'right';
  numberFormat?: string;
}

export interface ColumnFormat {
  width?: number;
  hidden?: boolean;
  style?: CellStyle;
}

export interface TableConfig {
  frozenRows?: number;
  frozenCols?: number;
  showGridLines?: boolean;
  alternatingRowColors?: boolean;
}

export interface SelectionRange {
  start: CellRef;
  end: CellRef;
}

export interface ClipboardData {
  rows: Record<string, CellValue>[];
  headers: string[];
}
