export type CellValue = string | number | boolean | null | undefined | Date;

export interface ParsedData {
  headers: string[];
  rows: Record<string, CellValue>[];
  fileName: string;
  sheetNames?: string[];
  rowCount: number;
  columnCount: number;
}

export interface DataAnalysis {
  fieldStats: FieldStats[];
  summary: DataSummary;
  qualityScore: number;
  dataHealth: DataHealth;
  correlations?: FieldCorrelation[];
  trends?: DataTrend[];
  outliers?: DataOutlier[];
  anomalies?: DataAnomaly[];
}

export interface FieldStats {
  field: string;
  type: FieldType;
  count: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: CellValue[];
  numericStats?: NumericStats;
  stringStats?: StringStats;
  dateStats?: DateStats;
}

export type FieldType = 'string' | 'number' | 'boolean' | 'date' | 'mixed' | 'empty';

export interface NumericStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  sum: number;
  std: number;
  percentile25?: number;
  percentile75?: number;
  zeroCount: number;
  negativeCount: number;
}

export interface StringStats {
  minLength: number;
  maxLength: number;
  avgLength: number;
  topValues: Array<{ value: string; count: number }>;
}

export interface DateStats {
  minDate: string;
  maxDate: string;
  range: string;
  format: string;
}

export interface DataSummary {
  totalRows: number;
  totalColumns: number;
  totalCells: number;
  emptyCells: number;
  duplicateRows: number;
  dataCompleteness: number;
  dataConsistency: number;
}

export interface DataHealth {
  hasEmptyRows: boolean;
  hasDuplicateRows: boolean;
  hasOutliers: boolean;
  hasInconsistentTypes: boolean;
  nullValueRatio: number;
  overallStatus: 'excellent' | 'good' | 'warning' | 'critical';
}

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
  value: CellValue;
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
  data: ParsedData;
  removedRows: number[];
  modifiedCells: Array<{ row: number; field: string; oldValue: CellValue; newValue: CellValue }>;
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
    key: Record<string, CellValue>;
    rows: Record<string, CellValue>[];
    aggregations: Record<string, number>;
  }>;
}
