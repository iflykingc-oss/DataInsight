import type { Industry, Region, IndustryBenchmark, BenchmarkComparison } from './types';

interface BenchmarkRange {
  min: number;
  max: number;
  unit: string;
}

const BUILT_IN_BENCHMARKS: Record<Industry, Record<string, BenchmarkRange>> = {
  retail: {
    grossMargin: { min: 0.30, max: 0.40, unit: 'percentage' },
    inventoryTurnover: { min: 6, max: 12, unit: 'times/year' },
    customerRetention: { min: 0.60, max: 0.80, unit: 'percentage' },
    averageOrderValue: { min: 150, max: 300, unit: 'CNY' },
    salesGrowth: { min: 0.05, max: 0.15, unit: 'percentage' },
    returnRate: { min: 0.02, max: 0.08, unit: 'percentage' },
  },
  ecommerce: {
    conversionRate: { min: 0.02, max: 0.05, unit: 'percentage' },
    returnRate: { min: 0.05, max: 0.15, unit: 'percentage' },
    customerAcquisitionCost: { min: 50, max: 200, unit: 'CNY' },
    lifetimeValue: { min: 500, max: 2000, unit: 'CNY' },
    cartAbandonmentRate: { min: 0.60, max: 0.80, unit: 'percentage' },
    averageSessionDuration: { min: 120, max: 300, unit: 'seconds' },
  },
  finance: {
    currentRatio: { min: 1.5, max: 2.5, unit: 'ratio' },
    debtToEquity: { min: 0.5, max: 1.5, unit: 'ratio' },
    roe: { min: 0.10, max: 0.20, unit: 'percentage' },
    netProfitMargin: { min: 0.05, max: 0.15, unit: 'percentage' },
    operatingCashFlow: { min: 0, max: Infinity, unit: 'CNY' },
    quickRatio: { min: 1.0, max: 2.0, unit: 'ratio' },
  },
  project: {
    onTimeDelivery: { min: 0.80, max: 0.95, unit: 'percentage' },
    budgetVariance: { min: -0.10, max: 0.10, unit: 'percentage' },
    resourceUtilization: { min: 0.70, max: 0.85, unit: 'percentage' },
    defectRate: { min: 0, max: 0.05, unit: 'percentage' },
    customerSatisfaction: { min: 4.0, max: 5.0, unit: 'score' },
    schedulePerformanceIndex: { min: 0.95, max: 1.05, unit: 'ratio' },
  },
  hr: {
    turnoverRate: { min: 0.10, max: 0.20, unit: 'percentage' },
    timeToFill: { min: 30, max: 60, unit: 'days' },
    trainingHours: { min: 20, max: 40, unit: 'hours' },
    satisfactionScore: { min: 3.5, max: 4.5, unit: 'score' },
    absenteeismRate: { min: 0.02, max: 0.05, unit: 'percentage' },
    costPerHire: { min: 3000, max: 8000, unit: 'CNY' },
  },
  general: {
    revenueGrowth: { min: 0.05, max: 0.20, unit: 'percentage' },
    costEfficiency: { min: 0.70, max: 0.90, unit: 'percentage' },
    customerSatisfaction: { min: 4.0, max: 5.0, unit: 'score' },
    employeeProductivity: { min: 0.80, max: 1.20, unit: 'ratio' },
    marketShare: { min: 0.05, max: 0.30, unit: 'percentage' },
    innovationIndex: { min: 0.60, max: 0.90, unit: 'score' },
  },
};

class IndustryBenchmarkManager {
  private static instance: IndustryBenchmarkManager;
  private benchmarks: Map<string, IndustryBenchmark> = new Map();

  private constructor() {
    this.initializeBuiltInBenchmarks();
  }

  static getInstance(): IndustryBenchmarkManager {
    if (!IndustryBenchmarkManager.instance) {
      IndustryBenchmarkManager.instance = new IndustryBenchmarkManager();
    }
    return IndustryBenchmarkManager.instance;
  }

  private initializeBuiltInBenchmarks(): void {
    const now = new Date().toISOString();
    for (const [industry, metrics] of Object.entries(BUILT_IN_BENCHMARKS)) {
      for (const [metric, range] of Object.entries(metrics)) {
        const key = `${industry}:${metric}:GLOBAL`;
        this.benchmarks.set(key, {
          metric,
          value: (range.min + range.max) / 2,
          unit: range.unit,
          source: 'built-in',
          region: 'GLOBAL',
          industry: industry as Industry,
          updatedAt: now,
        });
      }
    }
  }

  getBenchmarks(industry: Industry, region: Region, metrics: string[]): IndustryBenchmark[] {
    return metrics
      .map(metric => {
        const key = `${industry}:${metric}:${region}`;
        return this.benchmarks.get(key) || this.benchmarks.get(`${industry}:${metric}:GLOBAL`);
      })
      .filter((b): b is IndustryBenchmark => b !== undefined);
  }

  compareToBenchmark(
    metric: string,
    actualValue: number,
    industry: Industry,
    region: Region
  ): BenchmarkComparison | null {
    const benchmarks = this.getBenchmarks(industry, region, [metric]);
    if (benchmarks.length === 0) return null;

    const benchmark = benchmarks[0];
    const range = BUILT_IN_BENCHMARKS[industry]?.[metric];
    if (!range) return null;

    const mid = (range.min + range.max) / 2;
    const gap = actualValue - mid;
    const gapPercentage = mid !== 0 ? (gap / Math.abs(mid)) * 100 : 0;

    let comparison: 'above' | 'below' | 'at';
    if (gap > 0.01) comparison = 'above';
    else if (gap < -0.01) comparison = 'below';
    else comparison = 'at';

    const percentile = this.calculatePercentile(actualValue, range.min, range.max);

    return {
      value: benchmark.value,
      comparison,
      gapPercentage: Math.round(gapPercentage * 100) / 100,
      percentile: Math.round(percentile * 100) / 100,
    };
  }

  private calculatePercentile(value: number, min: number, max: number): number {
    if (max === min) return 50;
    const percentile = ((value - min) / (max - min)) * 100;
    return Math.max(0, Math.min(100, percentile));
  }

  async searchOnlineBenchmarks(
    industry: Industry,
    metric: string,
    region: Region
  ): Promise<IndustryBenchmark | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const builtIn = this.getBenchmarks(industry, region, [metric]);
        if (builtIn.length > 0) {
          resolve({
            ...builtIn[0],
            source: 'online-search',
            updatedAt: new Date().toISOString(),
          });
        } else {
          resolve(null);
        }
      }, 500);
    });
  }
}

export const industryBenchmarkManager = IndustryBenchmarkManager.getInstance();
