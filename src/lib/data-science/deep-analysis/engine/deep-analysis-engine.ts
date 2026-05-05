import type {
  Industry,
  Region,
  AnalysisType,
  DataPoint,
  DeepAnalysisResult,
  MetricAnalysis,
  TrendPrediction,
  DataQualityAssessment,
} from '../core/types';
import { industryBenchmarkManager } from '../core/industry-benchmark';
import { trendPredictionEngine } from '../core/trend-prediction';
import { businessInterpretationGenerator } from '../core/business-interpretation';
import { dataQualityAssessor } from '../core/data-quality-assessor';

interface AnalysisOptions {
  industry: Industry;
  region: Region;
  templateId?: string;
  llmEnabled?: boolean;
  searchEnabled?: boolean;
}

class DeepAnalysisEngine {
  private static instance: DeepAnalysisEngine;

  static getInstance(): DeepAnalysisEngine {
    if (!DeepAnalysisEngine.instance) {
      DeepAnalysisEngine.instance = new DeepAnalysisEngine();
    }
    return DeepAnalysisEngine.instance;
  }

  async runDeepAnalysis(
    data: DataPoint[],
    fields: string[],
    options: AnalysisOptions
  ): Promise<DeepAnalysisResult> {
    const { industry, region, llmEnabled = false, searchEnabled = false } = options;

    const dataQuality = dataQualityAssessor.assessDataQuality(data, fields);

    const metricAnalyses = this.calculateCoreMetrics(data, fields, industry, region);

    const trendPredictions = this.calculateTrends(data, fields);

    const keyFindings = this.generateKeyFindings(metricAnalyses, dataQuality);

    const recommendations = this.generateRecommendations(metricAnalyses, dataQuality);

    const industryBenchmarks = industryBenchmarkManager.getBenchmarks(
      industry,
      region,
      metricAnalyses.map(m => m.metric)
    );

    const result: DeepAnalysisResult = {
      id: `analysis-${Date.now()}`,
      industry,
      region,
      analysisType: 'diagnostic',
      period: this.extractPeriod(data, fields),
      executiveSummary: '',
      keyFindings,
      metricAnalyses,
      trendPredictions,
      industryContext: {
        benchmarks: industryBenchmarks,
        marketTrends: [],
        regulatoryNotes: [],
      },
      recommendations,
      dataQuality,
      generatedAt: new Date().toISOString(),
      llmEnhanced: false,
      searchEnhanced: false,
    };

    result.executiveSummary = businessInterpretationGenerator.generateExecutiveSummary(result, industry);

    if (llmEnabled) {
      result.executiveSummary = await businessInterpretationGenerator.generateLLMEnhancedInterpretation(result, industry);
      result.llmEnhanced = true;
    }

    if (searchEnabled) {
      result.searchEnhanced = true;
    }

    return result;
  }

  private calculateCoreMetrics(
    data: DataPoint[],
    fields: string[],
    industry: Industry,
    region: Region
  ): MetricAnalysis[] {
    const analyses: MetricAnalysis[] = [];

    const numericFields = fields.filter(field => {
      const sample = data.find(row => row[field] !== null && row[field] !== undefined);
      return sample && (typeof sample[field] === 'number' || !isNaN(parseFloat(String(sample[field]))));
    });

    for (const field of numericFields) {
      const values = data
        .map(row => parseFloat(String(row[field])))
        .filter(v => !isNaN(v));

      if (values.length === 0) continue;

      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

      const metricName = field.toLowerCase();
      let displayName = field;
      let unit = '';

      if (metricName.includes('amount') || metricName.includes('price') || metricName.includes('cost') || metricName.includes('revenue') || metricName.includes('sales')) {
        displayName = '销售额';
        unit = '元';
      } else if (metricName.includes('margin') || metricName.includes('rate') || metricName.includes('ratio')) {
        displayName = '比率';
        unit = '%';
      } else if (metricName.includes('count') || metricName.includes('quantity')) {
        displayName = '数量';
        unit = '件';
      }

      const benchmark = industryBenchmarkManager.compareToBenchmark(metricName, avg, industry, region);

      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length || 0;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length || 0;
      const change = firstAvg !== 0 ? (secondAvg - firstAvg) / Math.abs(firstAvg) : 0;

      const interpretation = businessInterpretationGenerator.generateMetricInterpretation(
        metricName,
        displayName,
        avg,
        unit,
        change,
        benchmark,
        change > 0.01 ? 'increasing' : change < -0.01 ? 'decreasing' : 'stable',
        industry
      );

      analyses.push({
        metric: metricName,
        displayName,
        value: Math.round(avg * 100) / 100,
        unit,
        change: Math.round(change * 100) / 100,
        trend: change > 0.01 ? 'increasing' : change < -0.01 ? 'decreasing' : 'stable',
        benchmark,
        insights: interpretation.insights,
        recommendations: interpretation.recommendations,
      });
    }

    return analyses;
  }

  private calculateTrends(data: DataPoint[], fields: string[]): TrendPrediction[] {
    const predictions: TrendPrediction[] = [];

    const dateField = fields.find(f =>
      f.toLowerCase().includes('date') || f.toLowerCase().includes('time')
    );

    if (!dateField) return predictions;

    const numericFields = fields.filter(field => {
      if (field === dateField) return false;
      const sample = data.find(row => row[field] !== null && row[field] !== undefined);
      return sample && (typeof sample[field] === 'number' || !isNaN(parseFloat(String(sample[field]))));
    });

    for (const field of numericFields) {
      const trend = trendPredictionEngine.analyzeTrend(data, dateField, field, {
        forecastPeriods: 3,
        method: 'linear',
      });

      predictions.push({
        metric: field,
        direction: trend.direction,
        forecastPeriod: 3,
        forecastValues: trend.forecast,
        confidence: trend.confidence,
        factors: trend.r2 > 0.7 ? ['历史趋势稳定'] : ['历史波动较大，预测不确定性高'],
      });
    }

    return predictions;
  }

  private generateKeyFindings(metricAnalyses: MetricAnalysis[], dataQuality: DataQualityAssessment): string[] {
    const findings: string[] = [];

    if (dataQuality.score < 70) {
      findings.push(`数据质量评分为 ${dataQuality.score} 分，存在 ${dataQuality.issues.length} 项数据质量问题，可能影响分析准确性`);
    }

    const aboveBenchmark = metricAnalyses.filter(m => m.benchmark?.comparison === 'above');
    if (aboveBenchmark.length > 0) {
      findings.push(`${aboveBenchmark.length} 项指标高于行业平均水平，表现优秀`);
    }

    const belowBenchmark = metricAnalyses.filter(m => m.benchmark?.comparison === 'below');
    if (belowBenchmark.length > 0) {
      findings.push(`${belowBenchmark.length} 项指标低于行业平均水平，需要关注`);
    }

    const increasing = metricAnalyses.filter(m => m.trend === 'increasing');
    if (increasing.length > 0) {
      findings.push(`${increasing.length} 项指标呈上升趋势`);
    }

    const decreasing = metricAnalyses.filter(m => m.trend === 'decreasing');
    if (decreasing.length > 0) {
      findings.push(`${decreasing.length} 项指标呈下降趋势，需关注`);
    }

    if (findings.length === 0) {
      findings.push('数据整体表现平稳，各项指标处于正常区间');
    }

    return findings;
  }

  private generateRecommendations(metricAnalyses: MetricAnalysis[], dataQuality: DataQualityAssessment): string[] {
    const recommendations: string[] = [];

    if (dataQuality.score < 80) {
      recommendations.push('优先处理数据质量问题，提升数据完整性后再进行深度分析');
    }

    metricAnalyses.forEach(ma => {
      if (ma.benchmark?.comparison === 'below') {
        recommendations.push(...ma.recommendations);
      }
    });

    const uniqueRecs = [...new Set(recommendations)];
    return uniqueRecs.slice(0, 5);
  }

  private extractPeriod(data: DataPoint[], fields: string[]): { start: string; end: string } {
    const dateField = fields.find(f =>
      f.toLowerCase().includes('date') || f.toLowerCase().includes('time')
    );

    if (!dateField) {
      return { start: 'N/A', end: 'N/A' };
    }

    const dates = data
      .map(row => new Date(String(row[dateField])))
      .filter(d => !isNaN(d.getTime()));

    if (dates.length === 0) {
      return { start: 'N/A', end: 'N/A' };
    }

    const min = new Date(Math.min(...dates.map(d => d.getTime())));
    const max = new Date(Math.max(...dates.map(d => d.getTime())));

    return {
      start: min.toISOString().split('T')[0],
      end: max.toISOString().split('T')[0],
    };
  }
}

export const deepAnalysisEngine = DeepAnalysisEngine.getInstance();
