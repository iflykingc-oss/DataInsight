export type CellValue = string | number | boolean | null | undefined;

export interface ParsedData {
  headers: string[];
  rows: Record<string, CellValue>[];
  fileName?: string;
  fileSize?: number;
  sheetName?: string;
}

export interface DataAnalysis {
  fieldStats: FieldStat[];
  healthScore: HealthScore;
  keyFindings: Finding[];
  correlations: Correlation[];
  distributions: Record<string, Distribution>;
  trends: Trend[];
  chartRecommendations: ChartRecommendation[];
  actionSuggestions: string[];
}

export interface FieldStat {
  field: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'id' | 'unknown';
  count: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues?: CellValue[];
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median?: number;
    stdDev?: number;
  };
  min?: number;
  max?: number;
  completeness?: number;
}

export interface HealthScore {
  overall: number;
  completeness: number;
  consistency: number;
  timeliness: number;
}

export interface Finding {
  type: '空行' | '重复行' | '格式不一致' | '类型混乱' | '缺失值' | '异常值';
  description: string;
  severity: 'critical' | 'warning' | 'info';
  location: string;
  count?: number;
  suggestion?: string;
}

export interface Correlation {
  field1: string;
  field2: string;
  coefficient: number;
  significance: 'high' | 'medium' | 'low';
}

export interface Distribution {
  skewness: number;
  kurtosis: number;
  isNormal: boolean;
  histogram?: number[];
}

export interface Trend {
  field: string;
  type: 'linear' | 'exponential' | 'periodic' | 'stable';
  direction: 'up' | 'down' | 'stable';
  slope?: number;
}

export interface ChartRecommendation {
  type: string;
  reason: string;
  fields?: string[];
}

export interface Operation {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  before: TableSnapshot;
  after: TableSnapshot;
  status: 'success' | 'failed' | 'pending';
  timestamp: number;
  error?: string;
}

export interface TableSnapshot {
  id: string;
  data: ParsedData;
  createdAt: number;
  operation?: string;
}
