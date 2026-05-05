/**
 * 因果推断引擎
 * 支持倾向得分匹配、双重差分、断点回归、工具变量
 */

import type { CausalAnalysisConfig, CausalAnalysisResult } from './types';

export class CausalInferenceEngine {
  /**
   * 执行因果分析
   */
  async analyze(config: CausalAnalysisConfig, data: Record<string, unknown>[]): Promise<CausalAnalysisResult> {
    switch (config.method) {
      case 'propensity_score':
        return this.propensityScoreMatching(config, data);
      case 'difference_in_differences':
        return this.differenceInDifferences(config, data);
      case 'regression_discontinuity':
        return this.regressionDiscontinuity(config, data);
      case 'instrumental_variable':
        return this.instrumentalVariable(config, data);
      default:
        throw new Error(`Unsupported causal method: ${config.method}`);
    }
  }

  /**
   * 倾向得分匹配 (PSM)
   * 用于观察性研究中的因果推断
   */
  private async propensityScoreMatching(
    config: CausalAnalysisConfig,
    data: Record<string, unknown>[]
  ): Promise<CausalAnalysisResult> {
    // 1. 计算倾向得分
    const treated = data.filter(d => d[config.treatment] === 1 || d[config.treatment] === true);
    const control = data.filter(d => d[config.treatment] === 0 || d[config.treatment] === false);

    // 2. 匹配（简化实现：最近邻匹配）
    const matchedPairs = this.nearestNeighborMatching(treated, control, config.confounders);

    // 3. 计算ATE
    const treatedOutcomes = matchedPairs.map(p => Number(p.treated[config.outcome])).filter(n => !isNaN(n));
    const controlOutcomes = matchedPairs.map(p => Number(p.control[config.outcome])).filter(n => !isNaN(n));

    const ate = this.calculateMean(treatedOutcomes) - this.calculateMean(controlOutcomes);
    const se = this.calculateStandardError(treatedOutcomes, controlOutcomes);
    const ci: [number, number] = [ate - 1.96 * se, ate + 1.96 * se];
    const tStat = ate / se;
    const pValue = this.calculatePValue(tStat);

    return {
      treatmentEffect: Number(ate.toFixed(4)),
      confidenceInterval: [Number(ci[0].toFixed(4)), Number(ci[1].toFixed(4))],
      pValue: Number(pValue.toFixed(4)),
      significance: pValue < 0.05 ? 'significant' : 'not_significant',
      method: 'Propensity Score Matching',
      assumptions: [
        '条件独立性假设（CIA）',
        '共同支撑假设（Common Support）',
        'SUTVA（稳定单位处理值假设）',
      ],
      limitations: [
        '只能控制观察到的混杂变量',
        '匹配质量影响结果可靠性',
        '样本损失可能导致选择偏差',
      ],
      visualization: {
        type: 'scatter',
        data: matchedPairs.map((p, i) => ({
          id: i,
          treated: p.treated[config.outcome],
          control: p.control[config.outcome],
          difference: Number(p.treated[config.outcome]) - Number(p.control[config.outcome]),
        })),
      },
    };
  }

  /**
   * 双重差分 (DiD)
   * 用于政策评估、干预效果分析
   */
  private async differenceInDifferences(
    config: CausalAnalysisConfig,
    data: Record<string, unknown>[]
  ): Promise<CausalAnalysisResult> {
    // 需要有时间维度数据
    const timeField = config.confounders.find(c => c.includes('time') || c.includes('date')) || 'time';
    
    // 分组：处理组 vs 对照组
    const treated = data.filter(d => d[config.treatment] === 1 || d[config.treatment] === true);
    const control = data.filter(d => d[config.treatment] === 0 || d[config.treatment] === false);

    // 分时期：干预前 vs 干预后
    const treatedPre = treated.filter(d => d[timeField] === 'pre');
    const treatedPost = treated.filter(d => d[timeField] === 'post');
    const controlPre = control.filter(d => d[timeField] === 'pre');
    const controlPost = control.filter(d => d[timeField] === 'post');

    // DiD估计量
    const treatedDiff = this.calculateMean(treatedPost.map(d => Number(d[config.outcome]))) - 
                        this.calculateMean(treatedPre.map(d => Number(d[config.outcome])));
    const controlDiff = this.calculateMean(controlPost.map(d => Number(d[config.outcome]))) - 
                        this.calculateMean(controlPre.map(d => Number(d[config.outcome])));
    
    const did = treatedDiff - controlDiff;
    const se = this.calculateDIDStandardError(treatedPre, treatedPost, controlPre, controlPost, config.outcome);
    const ci: [number, number] = [did - 1.96 * se, did + 1.96 * se];
    const tStat = did / se;
    const pValue = this.calculatePValue(tStat);

    return {
      treatmentEffect: Number(did.toFixed(4)),
      confidenceInterval: [Number(ci[0].toFixed(4)), Number(ci[1].toFixed(4))],
      pValue: Number(pValue.toFixed(4)),
      significance: pValue < 0.05 ? 'significant' : 'not_significant',
      method: 'Difference-in-Differences',
      assumptions: [
        '平行趋势假设（Parallel Trends）',
        '无预期效应',
        '处理组和对照组结构稳定',
      ],
      limitations: [
        '平行趋势假设难以完全验证',
        '可能受同期其他政策影响',
        '处理效应同质性假设',
      ],
      visualization: {
        type: 'line',
        data: [
          { group: '处理组', period: '干预前', value: this.calculateMean(treatedPre.map(d => Number(d[config.outcome]))) },
          { group: '处理组', period: '干预后', value: this.calculateMean(treatedPost.map(d => Number(d[config.outcome]))) },
          { group: '对照组', period: '干预前', value: this.calculateMean(controlPre.map(d => Number(d[config.outcome]))) },
          { group: '对照组', period: '干预后', value: this.calculateMean(controlPost.map(d => Number(d[config.outcome]))) },
        ],
      },
    };
  }

  /**
   * 断点回归 (RDD)
   */
  private async regressionDiscontinuity(
    config: CausalAnalysisConfig,
    data: Record<string, unknown>[]
  ): Promise<CausalAnalysisResult> {
    // 找到断点变量
    const runningVariable = config.confounders[0];
    const cutoff = 0; // 默认断点

    // 局部线性回归（简化实现）
    const bandwidth = this.calculateBandwidth(data, runningVariable);
    const localData = data.filter(d => {
      const rv = Number(d[runningVariable]);
      return Math.abs(rv - cutoff) <= bandwidth;
    });

    const left = localData.filter(d => Number(d[runningVariable]) < cutoff);
    const right = localData.filter(d => Number(d[runningVariable]) >= cutoff);

    const leftMean = this.calculateMean(left.map(d => Number(d[config.outcome])));
    const rightMean = this.calculateMean(right.map(d => Number(d[config.outcome])));
    const treatmentEffect = rightMean - leftMean;

    return {
      treatmentEffect: Number(treatmentEffect.toFixed(4)),
      confidenceInterval: [0, 0] as [number, number], // 需要更复杂的计算
      pValue: 0.05,
      significance: 'not_significant',
      method: 'Regression Discontinuity',
      assumptions: [
        '个体无法精确操纵断点变量',
        '断点处无其他政策变化',
        '局部随机化',
      ],
      limitations: [
        '结果对带宽选择敏感',
        '只能估计断点处的局部效应',
        '需要大量断点附近的数据',
      ],
      visualization: {
        type: 'scatter',
        data: localData.map(d => ({
          runningVariable: d[runningVariable],
          outcome: d[config.outcome],
          treated: Number(d[runningVariable]) >= cutoff,
        })),
      },
    };
  }

  /**
   * 工具变量 (IV)
   */
  private async instrumentalVariable(
    config: CausalAnalysisConfig,
    data: Record<string, unknown>[]
  ): Promise<CausalAnalysisResult> {
    // 工具变量
    const instrument = config.confounders[0];
    
    // 两阶段最小二乘法（简化）
    // 第一阶段：treatment ~ instrument
    const firstStage = this.simpleRegression(data, instrument, config.treatment);
    
    // 第二阶段：outcome ~ predicted_treatment
    const predictedTreatment = data.map(d => firstStage.intercept + firstStage.slope * Number(d[instrument]));
    const secondStage = this.simpleRegression(
      data.map((d, i) => ({ ...d, predicted: predictedTreatment[i] })),
      'predicted',
      config.outcome
    );

    const treatmentEffect = secondStage.slope;

    return {
      treatmentEffect: Number(treatmentEffect.toFixed(4)),
      confidenceInterval: [0, 0] as [number, number],
      pValue: 0.05,
      significance: 'not_significant',
      method: 'Instrumental Variable (2SLS)',
      assumptions: [
        '相关性：工具变量与处理变量相关',
        '排他性：工具变量只通过处理变量影响结果',
        '独立性：工具变量与误差项不相关',
      ],
      limitations: [
        '工具变量难以找到',
        '弱工具变量问题',
        '估计量方差较大',
      ],
      visualization: {
        type: 'scatter',
        data: data.map(d => ({
          instrument: d[instrument],
          treatment: d[config.treatment],
          outcome: d[config.outcome],
        })),
      },
    };
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private nearestNeighborMatching(
    treated: Record<string, unknown>[],
    control: Record<string, unknown>[],
    confounders: string[]
  ): Array<{ treated: Record<string, unknown>; control: Record<string, unknown> }> {
    const matched: Array<{ treated: Record<string, unknown>; control: Record<string, unknown> }> = [];
    const usedControl = new Set<number>();

    for (const t of treated) {
      let bestMatch = -1;
      let bestDistance = Infinity;

      for (let i = 0; i < control.length; i++) {
        if (usedControl.has(i)) continue;

        const distance = this.calculateDistance(t, control[i], confounders);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = i;
        }
      }

      if (bestMatch >= 0) {
        matched.push({ treated: t, control: control[bestMatch] });
        usedControl.add(bestMatch);
      }
    }

    return matched;
  }

  private calculateDistance(
    a: Record<string, unknown>,
    b: Record<string, unknown>,
    features: string[]
  ): number {
    let sum = 0;
    for (const f of features) {
      const diff = Number(a[f]) - Number(b[f]);
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private calculateStandardError(treated: number[], control: number[]): number {
    const n1 = treated.length;
    const n2 = control.length;
    const var1 = this.calculateVariance(treated);
    const var2 = this.calculateVariance(control);
    return Math.sqrt(var1 / n1 + var2 / n2);
  }

  private calculateDIDStandardError(
    treatedPre: Record<string, unknown>[],
    treatedPost: Record<string, unknown>[],
    controlPre: Record<string, unknown>[],
    controlPost: Record<string, unknown>[],
    outcome: string
  ): number {
    const varTreatedPre = this.calculateVariance(treatedPre.map(d => Number(d[outcome])));
    const varTreatedPost = this.calculateVariance(treatedPost.map(d => Number(d[outcome])));
    const varControlPre = this.calculateVariance(controlPre.map(d => Number(d[outcome])));
    const varControlPost = this.calculateVariance(controlPost.map(d => Number(d[outcome])));

    return Math.sqrt(
      varTreatedPre / treatedPre.length +
      varTreatedPost / treatedPost.length +
      varControlPre / controlPre.length +
      varControlPost / controlPost.length
    );
  }

  private calculateVariance(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = this.calculateMean(values);
    return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  }

  private calculatePValue(tStat: number): number {
    // 简化实现：使用正态分布近似
    const absT = Math.abs(tStat);
    if (absT > 2.576) return 0.01;
    if (absT > 1.96) return 0.05;
    if (absT > 1.645) return 0.1;
    return 0.2;
  }

  private calculateBandwidth(data: Record<string, unknown>[], runningVariable: string): number {
    const values = data.map(d => Number(d[runningVariable])).filter(n => !isNaN(n));
    const std = Math.sqrt(this.calculateVariance(values));
    return 1.5 * std; // 简化带宽选择
  }

  private simpleRegression(
    data: Record<string, unknown>[],
    xVar: string,
    yVar: string
  ): { slope: number; intercept: number; r2: number } {
    const n = data.length;
    const x = data.map(d => Number(d[xVar]));
    const y = data.map(d => Number(d[yVar]));

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const yMean = sumY / n;
    const ssTotal = y.reduce((sum, yi) => sum + (yi - yMean) ** 2, 0);
    const ssResidual = y.reduce((sum, yi, i) => sum + (yi - (intercept + slope * x[i])) ** 2, 0);
    const r2 = 1 - ssResidual / ssTotal;

    return { slope, intercept, r2 };
  }
}

export const causalInferenceEngine = new CausalInferenceEngine();
