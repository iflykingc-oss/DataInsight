/**
 * 高级分析引擎类型定义
 * 因果推断、预测建模、假设检验、A/B测试
 */

// ============================================================
// 因果推断
// ============================================================

export interface CausalAnalysisConfig {
  treatment: string;           // 处理变量（如：促销活动）
  outcome: string;             // 结果变量（如：销售额）
  confounders: string[];       // 混杂变量（如：季节、天气）
  method: 'propensity_score' | 'difference_in_differences' | 'regression_discontinuity' | 'instrumental_variable';
  timeWindow?: { start: string; end: string };
}

export interface CausalAnalysisResult {
  treatmentEffect: number;     // 处理效应（ATE）
  confidenceInterval: [number, number];  // 置信区间
  pValue: number;              // p值
  significance: 'significant' | 'not_significant';
  method: string;
  assumptions: string[];       // 假设检验
  limitations: string[];       // 局限性
  visualization: {
    type: 'scatter' | 'line' | 'bar';
    data: unknown[];
  };
}

// ============================================================
// 预测建模
// ============================================================

export interface ForecastConfig {
  target: string;              // 预测目标
  features: string[];          // 特征变量
  horizon: number;             // 预测步长
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  method: 'arima' | 'exponential_smoothing' | 'prophet' | 'linear_regression' | 'ensemble';
  seasonality?: boolean;
  confidenceLevel?: number;    // 默认0.95
}

export interface ForecastResult {
  predictions: Array<{
    timestamp: string;
    value: number;
    lower: number;
    upper: number;
  }>;
  modelMetrics: {
    mae: number;               // 平均绝对误差
    rmse: number;              // 均方根误差
    mape: number;              // 平均绝对百分比误差
    r2: number;                // R²
  };
  seasonality?: {
    detected: boolean;
    period: number;
    strength: number;
  };
  trend: {
    direction: 'up' | 'down' | 'stable';
    slope: number;
    changePoint?: string;
  };
}

// ============================================================
// 假设检验
// ============================================================

export interface HypothesisTestConfig {
  nullHypothesis: string;      // H0
  alternativeHypothesis: string; // H1
  testType: 't_test' | 'chi_square' | 'anova' | 'mann_whitney' | 'wilcoxon';
  alpha: number;               // 显著性水平，默认0.05
  variables: {
    group?: string;            // 分组变量
    metric: string;            // 度量变量
  };
}

export interface HypothesisTestResult {
  statistic: number;           // 检验统计量
  pValue: number;
  degreesOfFreedom?: number;
  criticalValue: number;
  decision: 'reject_null' | 'fail_to_reject_null';
  effectSize: number;          // 效应量（Cohen's d, Cramer's V等）
  power: number;               // 检验功效
  interpretation: string;
  assumptions: {
    checked: string[];
    violated: string[];
  };
}

// ============================================================
// A/B测试
// ============================================================

export interface ABTestConfig {
  variantA: string;            // 对照组
  variantB: string;            // 实验组
  metric: string;              // 核心指标
  secondaryMetrics?: string[]; // 次要指标
  sampleSize?: number;
  minDetectableEffect?: number; // 最小可检测效应
  alpha?: number;              // 默认0.05
  power?: number;              // 默认0.8
}

export interface ABTestResult {
  sampleSizes: {
    control: number;
    treatment: number;
  };
  metrics: {
    control: number;
    treatment: number;
    relativeLift: number;      // 相对提升
    absoluteLift: number;      // 绝对提升
  };
  statisticalTest: {
    pValue: number;
    confidenceInterval: [number, number];
    significance: boolean;
    power: number;
  };
  sampleSizeAnalysis: {
    required: number;
    actual: number;
    adequate: boolean;
  };
  durationEstimate: {
    daysRequired: number;
    daysActual: number;
  };
  recommendation: 'implement' | 'continue' | 'stop';
  risks: string[];
}

// ============================================================
// 智能洞察
// ============================================================

export interface SmartInsight {
  id: string;
  type: 'anomaly' | 'trend' | 'correlation' | 'segment' | 'prediction';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  dataEvidence: {
    metric: string;
    value: number;
    benchmark?: number;
    change?: number;
  };
  rootCause?: string;
  recommendation: string;
  confidence: number;
  actionable: boolean;
}

export interface InsightConfig {
  autoDetect: boolean;
  types: SmartInsight['type'][];
  minConfidence: number;
  maxInsights: number;
}
