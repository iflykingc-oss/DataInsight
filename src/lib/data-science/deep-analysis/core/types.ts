export type Industry = 'retail' | 'ecommerce' | 'finance' | 'project' | 'hr' | 'general';
export type Region = 'CN' | 'US' | 'EU' | 'SEA' | 'JP' | 'GLOBAL';
export type AnalysisType = 'descriptive' | 'diagnostic' | 'predictive' | 'prescriptive';
export type TrendDirection = 'increasing' | 'decreasing' | 'stable';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type DataPoint = Record<string, unknown>;

export interface IndustryBenchmark {
  metric: string;
  value: number;
  unit: string;
  source: string;
  region: Region;
  industry: Industry;
  updatedAt: string;
}

export interface BenchmarkComparison {
  value: number;
  comparison: 'above' | 'below' | 'at';
  gapPercentage: number;
  percentile: number;
}

export interface MetricAnalysis {
  metric: string;
  displayName: string;
  value: number;
  unit: string;
  change: number;
  trend: TrendDirection;
  benchmark: BenchmarkComparison | null;
  insights: string[];
  recommendations: string[];
}

export interface TrendPrediction {
  metric: string;
  direction: TrendDirection;
  forecastPeriod: number;
  forecastValues: number[];
  confidence: ConfidenceLevel;
  factors: string[];
}

export interface DataQualityAssessment {
  score: number;
  issues: Array<{
    type: 'completeness' | 'consistency' | 'validity' | 'timeliness' | 'uniqueness';
    field: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendations: string[];
}

export interface DeepAnalysisResult {
  id: string;
  industry: Industry;
  region: Region;
  analysisType: AnalysisType;
  period: { start: string; end: string };
  executiveSummary: string;
  keyFindings: string[];
  metricAnalyses: MetricAnalysis[];
  trendPredictions: TrendPrediction[];
  industryContext: {
    benchmarks: IndustryBenchmark[];
    marketTrends: string[];
    regulatoryNotes: string[];
  };
  recommendations: string[];
  dataQuality: DataQualityAssessment;
  generatedAt: string;
  llmEnhanced: boolean;
  searchEnhanced: boolean;
}

export interface AnalysisTemplate {
  id: string;
  name: string;
  industry: Industry;
  requiredMetrics: string[];
  optionalMetrics: string[];
  generate(data: DataPoint[], fields: string[]): DeepAnalysisResult;
}
