// 统一从 lib/data-processor 重导出核心数据类型，避免类型定义冲突
export type { CellValue, ParsedData, DataAnalysis, FieldStat, Summary, Anomaly, DeepAnalysis } from '@/lib/data-processor';

/** 兼容旧组件的行数据类型，用于 Recharts 等只接受 string|number 的场景 */
export type ChartRow = Record<string, string | number>;

// 以下为 types/data.ts 独有的扩展类型，未在 data-processor 中定义
export interface FieldCorrelation {
  field1: string;
  field2: string;
  correlation: number;
  type: 'positive' | 'negative' | 'none';
}

export interface DataTrend {
  field: string;
  direction: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  strength: number;
  seasonal?: boolean;
}

export interface DataOutlier {
  field: string;
  rowIndex: number;
  value: import('@/lib/data-processor').CellValue;
  type: 'high' | 'low' | 'invalid';
  zScore?: number;
}

export interface DataAnomaly {
  field: string;
  rowIndex: number;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface CleanResult {
  data: import('@/lib/data-processor').ParsedData;
  removedRows: number[];
  modifiedCells: Array<{ row: number; field: string; oldValue: import('@/lib/data-processor').CellValue; newValue: import('@/lib/data-processor').CellValue }>;
  removedDuplicates: number;
  filledNulls: number;
}

export interface AggregateOptions {
  groupBy: string[];
  measures: AggregateMeasure[];
}

export interface AggregateMeasure {
  field: string;
  operation: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'std';
  alias?: string;
}

export interface GroupedData {
  groups: Array<{
    key: Record<string, import('@/lib/data-processor').CellValue>;
    rows: Record<string, import('@/lib/data-processor').CellValue>[];
    aggregations: Record<string, number>;
  }>;
}
