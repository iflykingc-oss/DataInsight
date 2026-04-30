/**
 * 数据分析引擎 - 统一导出入口
 * 从各模块重新导出所有类型和函数，保持向后兼容
 */

// Types
export type {
  CellValue,
  ParsedData,
  DataAnalysis,
  DeepAnalysis,
  ScenarioAnalysis,
  AttributionAnalysis,
  FieldStat,
  Summary,
  Anomaly,
  SamplingOptions,
  SamplingResult,
  QualityReport,
} from './types';

// Parser
export { parseFile } from './parser';

// Sampling
export {
  smartSample,
  estimateTokenCount,
  isIdField,
  getSamplingRecommendation,
} from './sampling';

// Analyzer
export {
  analyzeData,
  generateSummary,
  calculateStdDev,
} from './analyzer';

// Deep Analysis (internal, used by analyzer - not exported directly)
// generateDeepAnalysis is internal to the analyzer module

// Cleaner
export {
  cleanData,
  getIQROutlierChecker,
  getZScoreOutlierChecker,
} from './cleaner';

// Quality
export { generateQualityReport } from './quality';

// Aggregation
export { aggregateData } from './aggregation';
