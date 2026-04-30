/**
 * 数据分析引擎 - 类型定义
 * 纯类型，无运行时依赖
 */

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
  fieldStats: FieldStat[];
  summary: Summary;
  insights: string[];
  anomalies: Anomaly[];
  deepAnalysis?: DeepAnalysis;
}

export interface DeepAnalysis {
  healthScore: {
    overall: number;
    completeness: number;
    consistency: number;
    quality: number;
    usability: number;
  };
  keyFindings: Array<{
    severity: 'critical' | 'warning' | 'info' | 'positive';
    category: 'quality' | 'distribution' | 'trend' | 'correlation' | 'anomaly' | 'insight';
    title: string;
    detail: string;
    impact: string;
    suggestion: string;
    relatedFields: string[];
  }>;
  correlations: Array<{
    field1: string;
    field2: string;
    coefficient: number;
    strength: 'strong' | 'moderate' | 'weak';
    direction: 'positive' | 'negative';
  }>;
  distributions: Array<{
    field: string;
    type: 'normal' | 'skewed_left' | 'skewed_right' | 'bimodal' | 'uniform';
    skewness: number;
    kurtosis: number;
    description: string;
  }>;
  trends: Array<{
    field: string;
    direction: 'up' | 'down' | 'stable' | 'volatile';
    changeRate: number;
    description: string;
  }>;
  recommendedCharts: Array<{
    chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'radar' | 'heatmap' | 'funnel';
    title: string;
    xField: string;
    yField: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    detail: string;
    expectedBenefit: string;
  }>;
  dataProfile: {
    dataType: string;
    suggestedIndustry: string;
    subScenario?: string;
    dataMaturity: 'raw' | 'cleaned' | 'structured' | 'analyzed';
    analysisPotential: 'high' | 'medium' | 'low';
    periodFeature?: string;
    scaleFeature?: string;
    summary: string;
  };
  attribution?: AttributionAnalysis;
  scenarioAnalysis?: ScenarioAnalysis;
}

export interface ScenarioAnalysis {
  detectedScenario: string;
  confidence: 'high' | 'medium' | 'low';
  matchedIndicators: string[];
  kpiRecommendations: Array<{
    name: string;
    expression: string;
    fieldRefs?: string[];
    description: string;
    priority: 'p0' | 'p1' | 'p2';
  }>;
  recommendedDimensions: string[];
  industrySuggestions: Array<{
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface AttributionAnalysis {
  anomalyMetrics: Array<{
    field: string;
    direction: 'spike_up' | 'drop_down' | 'volatile' | 'outlier_cluster';
    severity: 'high' | 'medium' | 'low';
    description: string;
    changeRate: number;
    affectedRows: number;
    baseline: number;
    actualValue: number;
  }>;
  dimensionBreakdowns: Array<{
    metricField: string;
    dimensionField: string;
    segments: Array<{
      segmentValue: string;
      contribution: number;
      metricValue: number;
      deviation: number;
      isKeyDriver: boolean;
    }>;
    keyDriver: string;
    keyDriverContribution: number;
  }>;
  rootCauses: Array<{
    metric: string;
    cause: string;
    confidence: 'high' | 'medium' | 'low';
    evidence: string[];
    relatedDimensions: string[];
    suggestion: string;
  }>;
  summary: string;
}

export interface FieldStat {
  field: string;
  type: 'string' | 'number' | 'date' | 'mixed' | 'id';
  count: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: CellValue[];
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    sum: number;
  };
  min?: number;
  max?: number;
  mean?: number;
  sum?: number;
  topValues?: Array<{ value: string; count: number; percentage: number }>;
  isIdField?: boolean;
}

export interface Summary {
  totalRows: number;
  totalColumns: number;
  numericColumns: number;
  textColumns: number;
  dateColumns: number;
  idColumns: number;
  nullValues: number;
  duplicateRows: number;
}

export interface Anomaly {
  row: number;
  field: string;
  value: CellValue;
  type: 'null' | 'duplicate' | 'outlier' | 'invalid';
  description: string;
}

export interface SamplingOptions {
  maxRows?: number;
  strategy?: 'head' | 'random' | 'stratified';
  seed?: number;
  labelColumn?: string;
}

export interface SamplingResult {
  data: ParsedData;
  wasSampled: boolean;
  originalRowCount: number;
  sampledRowCount: number;
  samplingRatio: number;
  method: string;
}

export interface QualityReport {
  overallScore: number;
  completeness: number;
  consistency: number;
  quality: number;
  usability: number;
  missingRate: number;
  duplicateRate: number;
  outlierRate: number;
  beforeVsAfter?: { beforeRows: number; afterRows: number; removed: number; filled: number };
  fieldReports: Array<{
    field: string;
    type: string;
    missingRate: number;
    uniqueRate: number;
    outlierCount: number;
    score: number;
    issues: string[];
  }>;
}
