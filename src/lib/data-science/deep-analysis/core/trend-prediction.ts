import type { TrendDirection, ConfidenceLevel, DataPoint } from './types';

interface TrendAnalysisOptions {
  forecastPeriods?: number;
  method?: 'linear' | 'moving_average' | 'exponential_smoothing';
}

interface TrendAnalysisResult {
  direction: TrendDirection;
  slope: number;
  intercept: number;
  r2: number;
  confidence: ConfidenceLevel;
  forecast: number[];
  historical: number[];
}

class TrendPredictionEngine {
  private static instance: TrendPredictionEngine;

  static getInstance(): TrendPredictionEngine {
    if (!TrendPredictionEngine.instance) {
      TrendPredictionEngine.instance = new TrendPredictionEngine();
    }
    return TrendPredictionEngine.instance;
  }

  analyzeTrend(
    data: DataPoint[],
    dateField: string,
    valueField: string,
    options: TrendAnalysisOptions = {}
  ): TrendAnalysisResult {
    const { forecastPeriods = 3, method = 'linear' } = options;

    const sorted = [...data].sort((a, b) => {
      const da = new Date(String(a[dateField])).getTime();
      const db = new Date(String(b[dateField])).getTime();
      return da - db;
    });

    const values = sorted.map(d => parseFloat(String(d[valueField])) || 0);
    const n = values.length;

    if (n < 2) {
      return {
        direction: 'stable',
        slope: 0,
        intercept: values[0] || 0,
        r2: 0,
        confidence: 'low',
        forecast: Array(forecastPeriods).fill(values[0] || 0),
        historical: values,
      };
    }

    let result: TrendAnalysisResult;

    switch (method) {
      case 'moving_average':
        result = this.movingAverage(values, forecastPeriods);
        break;
      case 'exponential_smoothing':
        result = this.exponentialSmoothing(values, forecastPeriods);
        break;
      case 'linear':
      default:
        result = this.linearRegression(values, forecastPeriods);
        break;
    }

    return result;
  }

  private linearRegression(values: number[], forecastPeriods: number): TrendAnalysisResult {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
    const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    const ssTotal = values.reduce((acc, y) => acc + Math.pow(y - yMean, 2), 0);
    const ssResidual = values.reduce((acc, y, i) => {
      const predicted = slope * x[i] + intercept;
      return acc + Math.pow(y - predicted, 2);
    }, 0);
    const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

    const historical = x.map(xi => slope * xi + intercept);
    const forecast = Array.from({ length: forecastPeriods }, (_, i) => {
      const xVal = n + i;
      return slope * xVal + intercept;
    });

    return {
      direction: this.getDirection(slope),
      slope: Math.round(slope * 10000) / 10000,
      intercept: Math.round(intercept * 10000) / 10000,
      r2: Math.round(r2 * 100) / 100,
      confidence: this.getConfidence(r2),
      forecast: forecast.map(v => Math.round(v * 100) / 100),
      historical: historical.map(v => Math.round(v * 100) / 100),
    };
  }

  private movingAverage(values: number[], forecastPeriods: number): TrendAnalysisResult {
    const n = values.length;
    const window = Math.min(3, n);

    const historical: number[] = [];
    for (let i = 0; i < n; i++) {
      if (i < window - 1) {
        historical.push(values[i]);
      } else {
        const sum = values.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
        historical.push(sum / window);
      }
    }

    const lastMA = historical[n - 1];
    const forecast = Array(forecastPeriods).fill(lastMA);

    const slope = n > 1 ? (values[n - 1] - values[0]) / (n - 1) : 0;
    const r2 = 0.5;

    return {
      direction: this.getDirection(slope),
      slope: Math.round(slope * 10000) / 10000,
      intercept: values[0],
      r2,
      confidence: this.getConfidence(r2),
      forecast: forecast.map(v => Math.round(v * 100) / 100),
      historical: historical.map(v => Math.round(v * 100) / 100),
    };
  }

  private exponentialSmoothing(values: number[], forecastPeriods: number): TrendAnalysisResult {
    const n = values.length;
    const alpha = 0.3;

    const historical: number[] = [values[0]];
    for (let i = 1; i < n; i++) {
      historical.push(alpha * values[i] + (1 - alpha) * historical[i - 1]);
    }

    const lastSmoothed = historical[n - 1];
    const forecast = Array(forecastPeriods).fill(lastSmoothed);

    const slope = n > 1 ? (values[n - 1] - values[0]) / (n - 1) : 0;
    const r2 = 0.6;

    return {
      direction: this.getDirection(slope),
      slope: Math.round(slope * 10000) / 10000,
      intercept: values[0],
      r2,
      confidence: this.getConfidence(r2),
      forecast: forecast.map(v => Math.round(v * 100) / 100),
      historical: historical.map(v => Math.round(v * 100) / 100),
    };
  }

  private getDirection(slope: number): TrendDirection {
    if (slope > 0.01) return 'increasing';
    if (slope < -0.01) return 'decreasing';
    return 'stable';
  }

  private getConfidence(r2: number): ConfidenceLevel {
    if (r2 >= 0.8) return 'high';
    if (r2 >= 0.5) return 'medium';
    return 'low';
  }
}

export const trendPredictionEngine = TrendPredictionEngine.getInstance();
