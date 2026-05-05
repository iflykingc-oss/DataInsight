/**
 * 核心引擎类型定义
 * 底层能力为核心，模型为执行器
 */

// ============================================================
// 核心架构：数据层 -> 分析层 -> 洞察层 -> 呈现层
// ============================================================

/** 数据层 */
export interface DataLayer {
  raw: Record<string, unknown>[];
  schema: DataSchema;
  profile: DataProfile;
  quality: DataQualityReport;
}

export interface DataSchema {
  fields: FieldSchema[];
  primaryKey?: string;
  relationships?: Relationship[];
}

export interface FieldSchema {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'category';
  nullable: boolean;
  unique: boolean;
  stats: FieldStats;
  semanticType?: SemanticType;  // 语义类型：金额、数量、比率等
}

export type SemanticType =
  | 'id' | 'name' | 'amount' | 'quantity' | 'price' | 'rate'
  | 'date' | 'timestamp' | 'category' | 'region' | 'status'
  | 'email' | 'phone' | 'url' | 'percentage' | 'score';

export interface FieldStats {
  count: number;
  nullCount: number;
  uniqueCount: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  std?: number;
  topValues: Array<{ value: string; count: number }>;
}

export interface Relationship {
  from: string;
  to: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface DataProfile {
  rowCount: number;
  colCount: number;
  sizeBytes: number;
  updateTime: number;
  sourceType: 'upload' | 'api' | 'database' | 'generated';
}

export interface DataQualityReport {
  overallScore: number;  // 0-100
  dimensions: {
    completeness: number;
    consistency: number;
    accuracy: number;
    timeliness: number;
  };
  issues: DataQualityIssue[];
}

export interface DataQualityIssue {
  type: 'missing' | 'duplicate' | 'outlier' | 'format' | 'logic';
  field: string;
  severity: 'critical' | 'warning' | 'info';
  description: string;
  affectedRows: number;
  suggestion: string;
}

// ============================================================
// 分析层
// ============================================================

export interface AnalysisLayer {
  metrics: ComputedMetric[];
  dimensions: AnalysisDimension[];
  segments: Segment[];
  comparisons: Comparison[];
}

export interface ComputedMetric {
  name: string;
  formula: string;
  value: number;
  unit?: string;
  benchmark?: number;
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
}

export interface AnalysisDimension {
  field: string;
  type: 'temporal' | 'categorical' | 'numerical';
  distribution: Distribution;
  breakdowns: Breakdown[];
}

export interface Distribution {
  type: 'normal' | 'skewed' | 'uniform' | 'bimodal' | 'unknown';
  histogram: Array<{ bin: string; count: number }>;
  percentiles: Record<string, number>;
}

export interface Breakdown {
  value: string;
  count: number;
  percentage: number;
  metrics: Record<string, number>;
}

export interface Segment {
  name: string;
  filter: Record<string, unknown>;
  size: number;
  characteristics: string[];
  metrics: Record<string, number>;
}

export interface Comparison {
  name: string;
  baseline: string;
  target: string;
  metrics: Record<string, { baseline: number; target: number; diff: number; diffPct: number }>;
}

// ============================================================
// 洞察层
// ============================================================

export interface InsightLayer {
  findings: Finding[];
  rootCauses: RootCause[];
  predictions: Prediction[];
  recommendations: Recommendation[];
}

export interface Finding {
  id: string;
  type: 'anomaly' | 'pattern' | 'trend' | 'correlation' | 'gap';
  title: string;
  description: string;
  evidence: Evidence[];
  confidence: number;
  severity: 'critical' | 'warning' | 'info';
}

export interface Evidence {
  type: 'statistic' | 'chart' | 'example' | 'comparison';
  data: unknown;
  description: string;
}

export interface RootCause {
  findingId: string;
  causes: Array<{
    factor: string;
    impact: number;  // 0-1
    evidence: string;
  }>;
  confidence: number;
}

export interface Prediction {
  metric: string;
  horizon: string;
  forecast: number;
  range: [number, number];
  confidence: number;
  drivers: string[];
}

export interface Recommendation {
  id: string;
  type: 'action' | 'investigation' | 'monitoring';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expectedImpact: {
    metric: string;
    change: number;
    confidence: number;
  };
  implementation: string[];
  risks: string[];
}

// ============================================================
// 呈现层
// ============================================================

export interface PresentationLayer {
  summary: ExecutiveSummary;
  visualizations: Visualization[];
  narrative: Narrative;
  actions: ActionItem[];
}

export interface ExecutiveSummary {
  headline: string;
  keyPoints: string[];
  metrics: Array<{ label: string; value: string; trend: 'up' | 'down' | 'neutral' }>;
  alert?: string;
}

export interface Visualization {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text';
  config: ChartConfig | TableConfig | MetricConfig | TextConfig;
  insights: string[];
}

export interface ChartConfig {
  chartType: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap' | 'funnel' | 'gauge';
  data: unknown[];
  mapping: { x?: string; y?: string; color?: string; size?: string };
  options: Record<string, unknown>;
}

export interface TableConfig {
  columns: Array<{ field: string; header: string; type: string; format?: string }>;
  data: Record<string, unknown>[];
  pagination?: { page: number; pageSize: number; total: number };
}

export interface MetricConfig {
  value: number;
  label: string;
  unit?: string;
  benchmark?: number;
  trend?: { direction: 'up' | 'down' | 'stable'; value: number };
}

export interface TextConfig {
  content: string;
  style: 'paragraph' | 'bullet' | 'quote';
}

export interface Narrative {
  sections: Array<{
    title: string;
    content: string;
    visualizations: string[];
  }>;
}

export interface ActionItem {
  id: string;
  label: string;
  action: string;
  params: Record<string, unknown>;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================
// 模型执行器接口
// ============================================================

export interface ModelExecutor {
  execute(prompt: string, context: ExecutionContext): Promise<ModelOutput>;
  validate(output: unknown): ValidationResult;
  retry(prompt: string, context: ExecutionContext, error: Error): Promise<ModelOutput>;
}

export interface ExecutionContext {
  task: string;
  data: DataLayer;
  history: string[];
  constraints: string[];
}

export interface ModelOutput {
  content: string;
  structured?: Record<string, unknown>;
  usage?: { promptTokens: number; completionTokens: number };
  latency: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  fixed?: Record<string, unknown>;
}
