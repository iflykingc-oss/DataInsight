/**
 * 预测建模引擎
 * ARIMA、指数平滑、Prophet、线性回归、集成模型
 */

import type { ForecastConfig, ForecastResult } from './types';

export class ForecastingEngine {
  /**
   * 执行预测
   */
  async forecast(config: ForecastConfig, data: Array<{ timestamp: string; value: number }>): Promise<ForecastResult> {
    // 数据预处理
    const cleanData = data.filter(d => !isNaN(d.value) && d.value !== null);
    
    switch (config.method) {
      case 'arima':
        return this.arimaForecast(config, cleanData);
      case 'exponential_smoothing':
        return this.exponentialSmoothing(config, cleanData);
      case 'prophet':
        return this.prophetForecast(config, cleanData);
      case 'linear_regression':
        return this.linearRegressionForecast(config, cleanData);
      case 'ensemble':
        return this.ensembleForecast(config, cleanData);
      default:
        return this.exponentialSmoothing(config, cleanData);
    }
  }

  /**
   * ARIMA模型预测
   */
  private async arimaForecast(config: ForecastConfig, data: Array<{ timestamp: string; value: number }>): Promise<ForecastResult> {
    const values = data.map(d => d.value);
    const n = values.length;
    
    // 简化ARIMA(1,1,1)实现
    // 差分
    const diff = values.slice(1).map((v, i) => v - values[i]);
    
    // AR(1)系数估计
    const ar1 = this.estimateAR1(diff);
    const ma1 = 0.3; // 简化MA系数
    const c = this.calculateMean(diff);
    
    // 预测
    const predictions = this.generatePredictions(values, config.horizon, (history, h) => {
      const lastDiff = history[history.length - 1] - history[history.length - 2];
      const forecastDiff = c + ar1 * lastDiff;
      return history[history.length - 1] + forecastDiff;
    });

    // 计算置信区间
    const residuals = this.calculateResiduals(values, ar1, c);
    const residualStd = Math.sqrt(this.calculateVariance(residuals));
    
    const result: ForecastResult = {
      predictions: predictions.map((p, i) => ({
        timestamp: this.generateFutureTimestamp(data[data.length - 1].timestamp, i + 1, config.frequency),
        value: Number(p.toFixed(2)),
        lower: Number((p - 1.96 * residualStd * Math.sqrt(i + 1)).toFixed(2)),
        upper: Number((p + 1.96 * residualStd * Math.sqrt(i + 1)).toFixed(2)),
      })),
      modelMetrics: this.calculateMetrics(values, predictions.slice(0, values.length)),
      trend: this.analyzeTrend(values),
    };

    // 季节性检测
    if (config.seasonality !== false) {
      result.seasonality = this.detectSeasonality(values, config.frequency);
    }

    return result;
  }

  /**
   * 指数平滑预测
   */
  private async exponentialSmoothing(config: ForecastConfig, data: Array<{ timestamp: string; value: number }>): Promise<ForecastResult> {
    const values = data.map(d => d.value);
    const alpha = 0.3; // 平滑系数
    const beta = 0.1;  // 趋势系数
    const gamma = 0.1; // 季节性系数
    
    // Holt-Winters三指数平滑（简化版）
    const smoothed: number[] = [values[0]];
    const trend: number[] = [values[1] - values[0]];
    const seasonal: number[] = [];
    
    const seasonLength = this.getSeasonLength(config.frequency);
    
    // 初始化季节性
    for (let i = 0; i < seasonLength && i < values.length; i++) {
      seasonal.push(values[i] - values[0]);
    }
    
    // 平滑计算
    for (let t = 1; t < values.length; t++) {
      const seasonIdx = t % seasonLength;
      const level = alpha * (values[t] - (seasonal[seasonIdx] || 0)) + (1 - alpha) * (smoothed[t - 1] + trend[t - 1]);
      const newTrend = beta * (level - smoothed[t - 1]) + (1 - beta) * trend[t - 1];
      const newSeasonal = gamma * (values[t] - level) + (1 - gamma) * (seasonal[seasonIdx] || 0);
      
      smoothed.push(level);
      trend.push(newTrend);
      seasonal[seasonIdx] = newSeasonal;
    }
    
    // 预测
    const lastLevel = smoothed[smoothed.length - 1];
    const lastTrend = trend[trend.length - 1];
    
    const predictions = Array.from({ length: config.horizon }, (_, h) => {
      const seasonIdx = (values.length + h) % seasonLength;
      return lastLevel + (h + 1) * lastTrend + (seasonal[seasonIdx] || 0);
    });

    const residuals = values.map((v, i) => v - smoothed[i]);
    const residualStd = Math.sqrt(this.calculateVariance(residuals));

    return {
      predictions: predictions.map((p, i) => ({
        timestamp: this.generateFutureTimestamp(data[data.length - 1].timestamp, i + 1, config.frequency),
        value: Number(p.toFixed(2)),
        lower: Number((p - 1.96 * residualStd).toFixed(2)),
        upper: Number((p + 1.96 * residualStd).toFixed(2)),
      })),
      modelMetrics: this.calculateMetrics(values, smoothed),
      seasonality: this.detectSeasonality(values, config.frequency),
      trend: this.analyzeTrend(values),
    };
  }

  /**
   * Prophet风格预测（简化实现）
   */
  private async prophetForecast(config: ForecastConfig, data: Array<{ timestamp: string; value: number }>): Promise<ForecastResult> {
    const values = data.map(d => d.value);
    const timestamps = data.map(d => new Date(d.timestamp).getTime());
    
    // 趋势组件：分段线性回归
    const trend = this.fitPiecewiseLinear(timestamps, values);
    
    // 季节性组件：傅里叶级数
    const seasonality = this.fitFourierSeasonality(timestamps, values, config.frequency);
    
    // 组合预测
    const predictions = Array.from({ length: config.horizon }, (_, h) => {
      const futureTime = timestamps[timestamps.length - 1] + (h + 1) * this.getTimeStep(config.frequency);
      const trendComponent = trend.slope * futureTime + trend.intercept;
      const seasonalComponent = seasonality[0] || 0; // 简化
      return trendComponent + seasonalComponent;
    });

    const fitted = timestamps.map((t, i) => trend.slope * t + trend.intercept + (seasonality[i] || 0));
    const residuals = values.map((v, i) => v - fitted[i]);
    const residualStd = Math.sqrt(this.calculateVariance(residuals));

    return {
      predictions: predictions.map((p, i) => ({
        timestamp: this.generateFutureTimestamp(data[data.length - 1].timestamp, i + 1, config.frequency),
        value: Number(p.toFixed(2)),
        lower: Number((p - 1.96 * residualStd).toFixed(2)),
        upper: Number((p + 1.96 * residualStd).toFixed(2)),
      })),
      modelMetrics: this.calculateMetrics(values, fitted),
      seasonality: this.detectSeasonality(values, config.frequency),
      trend: {
        direction: trend.slope > 0 ? 'up' : trend.slope < 0 ? 'down' : 'stable',
        slope: Number(trend.slope.toFixed(6)),
      },
    };
  }

  /**
   * 线性回归预测
   */
  private async linearRegressionForecast(config: ForecastConfig, data: Array<{ timestamp: string; value: number }>): Promise<ForecastResult> {
    const values = data.map(d => d.value);
    const n = values.length;
    
    // 时间序列回归
    const x = Array.from({ length: n }, (_, i) => i);
    const regression = this.fitLinearRegression(x, values);
    
    // 预测
    const predictions = Array.from({ length: config.horizon }, (_, h) => {
      return regression.slope * (n + h) + regression.intercept;
    });

    const fitted = x.map(xi => regression.slope * xi + regression.intercept);
    const residuals = values.map((v, i) => v - fitted[i]);
    const residualStd = Math.sqrt(this.calculateVariance(residuals));

    return {
      predictions: predictions.map((p, i) => ({
        timestamp: this.generateFutureTimestamp(data[data.length - 1].timestamp, i + 1, config.frequency),
        value: Number(p.toFixed(2)),
        lower: Number((p - 1.96 * residualStd).toFixed(2)),
        upper: Number((p + 1.96 * residualStd).toFixed(2)),
      })),
      modelMetrics: this.calculateMetrics(values, fitted),
      trend: {
        direction: regression.slope > 0 ? 'up' : regression.slope < 0 ? 'down' : 'stable',
        slope: Number(regression.slope.toFixed(4)),
      },
    };
  }

  /**
   * 集成预测（多模型平均）
   */
  private async ensembleForecast(config: ForecastConfig, data: Array<{ timestamp: string; value: number }>): Promise<ForecastResult> {
    // 运行多个模型
    const arimaResult = await this.arimaForecast(config, data);
    const esResult = await this.exponentialSmoothing(config, data);
    const lrResult = await this.linearRegressionForecast(config, data);
    
    // 加权平均（基于历史表现）
    const weights = this.calculateEnsembleWeights([
      arimaResult.modelMetrics,
      esResult.modelMetrics,
      lrResult.modelMetrics,
    ]);
    
    // 组合预测
    const predictions = arimaResult.predictions.map((p, i) => ({
      timestamp: p.timestamp,
      value: Number((
        weights[0] * p.value +
        weights[1] * esResult.predictions[i].value +
        weights[2] * lrResult.predictions[i].value
      ).toFixed(2)),
      lower: Number((
        weights[0] * p.lower +
        weights[1] * esResult.predictions[i].lower +
        weights[2] * lrResult.predictions[i].lower
      ).toFixed(2)),
      upper: Number((
        weights[0] * p.upper +
        weights[1] * esResult.predictions[i].upper +
        weights[2] * lrResult.predictions[i].upper
      ).toFixed(2)),
    }));

    // 组合指标
    const values = data.map(d => d.value);
    const combinedMetrics = this.calculateEnsembleMetrics(values, [
      arimaResult.modelMetrics,
      esResult.modelMetrics,
      lrResult.modelMetrics,
    ], weights);

    return {
      predictions,
      modelMetrics: combinedMetrics,
      seasonality: esResult.seasonality || arimaResult.seasonality,
      trend: this.analyzeTrend(values),
    };
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private estimateAR1(diff: number[]): number {
    if (diff.length < 2) return 0;
    const n = diff.length - 1;
    const sumXY = diff.slice(1).reduce((sum, y, i) => sum + y * diff[i], 0);
    const sumX2 = diff.slice(0, -1).reduce((sum, x) => sum + x * x, 0);
    return sumX2 !== 0 ? sumXY / sumX2 : 0;
  }

  private generatePredictions(
    history: number[],
    horizon: number,
    predictor: (history: number[], h: number) => number
  ): number[] {
    const predictions: number[] = [];
    const extendedHistory = [...history];
    
    for (let h = 0; h < horizon; h++) {
      const pred = predictor(extendedHistory, h);
      predictions.push(pred);
      extendedHistory.push(pred);
    }
    
    return predictions;
  }

  private calculateResiduals(values: number[], ar1: number, c: number): number[] {
    return values.slice(1).map((v, i) => {
      const predicted = values[i] + c + ar1 * (values[i] - (values[i - 1] || values[i]));
      return v - predicted;
    });
  }

  private calculateMetrics(actual: number[], predicted: number[]): ForecastResult['modelMetrics'] {
    const n = Math.min(actual.length, predicted.length);
    const actualSlice = actual.slice(-n);
    const predictedSlice = predicted.slice(-n);
    
    // MAE
    const mae = actualSlice.reduce((sum, a, i) => sum + Math.abs(a - predictedSlice[i]), 0) / n;
    
    // RMSE
    const rmse = Math.sqrt(actualSlice.reduce((sum, a, i) => sum + (a - predictedSlice[i]) ** 2, 0) / n);
    
    // MAPE
    const mape = actualSlice.reduce((sum, a, i) => {
      return a !== 0 ? sum + Math.abs((a - predictedSlice[i]) / a) : sum;
    }, 0) / n * 100;
    
    // R²
    const meanActual = actualSlice.reduce((a, b) => a + b, 0) / n;
    const ssTotal = actualSlice.reduce((sum, a) => sum + (a - meanActual) ** 2, 0);
    const ssResidual = actualSlice.reduce((sum, a, i) => sum + (a - predictedSlice[i]) ** 2, 0);
    const r2 = ssTotal !== 0 ? 1 - ssResidual / ssTotal : 0;
    
    return {
      mae: Number(mae.toFixed(4)),
      rmse: Number(rmse.toFixed(4)),
      mape: Number(mape.toFixed(4)),
      r2: Number(r2.toFixed(4)),
    };
  }

  private analyzeTrend(values: number[]): ForecastResult['trend'] {
    if (values.length < 2) {
      return { direction: 'stable', slope: 0 };
    }
    
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const regression = this.fitLinearRegression(x, values);
    
    // 检测变化点
    const changePoint = this.detectChangePoint(values);
    
    return {
      direction: regression.slope > 0.01 ? 'up' : regression.slope < -0.01 ? 'down' : 'stable',
      slope: Number(regression.slope.toFixed(6)),
      changePoint: changePoint ? new Date(changePoint).toISOString() : undefined,
    };
  }

  private detectChangePoint(values: number[]): number | null {
    if (values.length < 10) return null;
    
    let maxDiff = 0;
    let changePoint = null;
    
    for (let i = 5; i < values.length - 5; i++) {
      const before = values.slice(0, i);
      const after = values.slice(i);
      const beforeMean = before.reduce((a, b) => a + b, 0) / before.length;
      const afterMean = after.reduce((a, b) => a + b, 0) / after.length;
      const diff = Math.abs(afterMean - beforeMean);
      
      if (diff > maxDiff) {
        maxDiff = diff;
        changePoint = i;
      }
    }
    
    return changePoint;
  }

  private detectSeasonality(values: number[], frequency: string): ForecastResult['seasonality'] {
    const seasonLength = this.getSeasonLength(frequency);
    if (values.length < seasonLength * 2) {
      return { detected: false, period: seasonLength, strength: 0 };
    }
    
    // 计算季节性强度
    const detrended = this.detrend(values);
    const seasonalVar = this.calculateSeasonalVariance(detrended, seasonLength);
    const totalVar = this.calculateVariance(detrended);
    
    const strength = totalVar > 0 ? 1 - seasonalVar / totalVar : 0;
    
    return {
      detected: strength > 0.3,
      period: seasonLength,
      strength: Number(strength.toFixed(4)),
    };
  }

  private detrend(values: number[]): number[] {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const regression = this.fitLinearRegression(x, values);
    return values.map((v, i) => v - (regression.slope * i + regression.intercept));
  }

  private calculateSeasonalVariance(values: number[], period: number): number {
    const seasonalMeans: number[] = [];
    for (let i = 0; i < period; i++) {
      const seasonValues = values.filter((_, idx) => idx % period === i);
      seasonalMeans.push(seasonValues.reduce((a, b) => a + b, 0) / seasonValues.length);
    }
    
    const overallMean = values.reduce((a, b) => a + b, 0) / values.length;
    return seasonalMeans.reduce((sum, m) => sum + (m - overallMean) ** 2, 0) / period;
  }

  private fitLinearRegression(x: number[], y: number[]): { slope: number; intercept: number; r2: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
    const ssResidual = y.reduce((sum, yi, i) => sum + (yi - (intercept + slope * x[i])) ** 2, 0);
    const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;
    
    return { slope, intercept, r2 };
  }

  private fitPiecewiseLinear(timestamps: number[], values: number[]): { slope: number; intercept: number } {
    // 简化：拟合单段线性回归
    const x = timestamps.map((t, i) => i);
    return this.fitLinearRegression(x, values);
  }

  private fitFourierSeasonality(timestamps: number[], values: number[], frequency: string): number[] {
    const period = this.getSeasonLength(frequency);
    const n = values.length;
    
    // 简化：使用正弦波近似
    return values.map((_, i) => {
      return Math.sin(2 * Math.PI * i / period) * this.calculateStd(values) * 0.1;
    });
  }

  private calculateEnsembleWeights(metrics: ForecastResult['modelMetrics'][]): number[] {
    // 基于MAPE的逆权重
    const inverseMape = metrics.map(m => 1 / (m.mape + 0.001));
    const sum = inverseMape.reduce((a, b) => a + b, 0);
    return inverseMape.map(w => w / sum);
  }

  private calculateEnsembleMetrics(
    actual: number[],
    metrics: ForecastResult['modelMetrics'][],
    weights: number[]
  ): ForecastResult['modelMetrics'] {
    return {
      mae: Number(this.weightedAverage(metrics.map(m => m.mae), weights).toFixed(4)),
      rmse: Number(this.weightedAverage(metrics.map(m => m.rmse), weights).toFixed(4)),
      mape: Number(this.weightedAverage(metrics.map(m => m.mape), weights).toFixed(4)),
      r2: Number(this.weightedAverage(metrics.map(m => m.r2), weights).toFixed(4)),
    };
  }

  private weightedAverage(values: number[], weights: number[]): number {
    return values.reduce((sum, v, i) => sum + v * weights[i], 0);
  }

  private generateFutureTimestamp(lastTimestamp: string, steps: number, frequency: string): string {
    const last = new Date(lastTimestamp);
    const step = this.getTimeStep(frequency);
    const future = new Date(last.getTime() + steps * step);
    return future.toISOString();
  }

  private getTimeStep(frequency: string): number {
    const steps: Record<string, number> = {
      daily: 24 * 60 * 60 * 1000,
      weekly: 7 * 24 * 60 * 60 * 1000,
      monthly: 30 * 24 * 60 * 60 * 1000,
      quarterly: 90 * 24 * 60 * 60 * 1000,
    };
    return steps[frequency] || steps.daily;
  }

  private getSeasonLength(frequency: string): number {
    const lengths: Record<string, number> = {
      daily: 7,      // 周季节性
      weekly: 52,    // 年季节性
      monthly: 12,   // 年季节性
      quarterly: 4,  // 年季节性
    };
    return lengths[frequency] || 7;
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = this.calculateMean(values);
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  }

  private calculateStd(values: number[]): number {
    return Math.sqrt(this.calculateVariance(values));
  }
}

export const forecastingEngine = new ForecastingEngine();
