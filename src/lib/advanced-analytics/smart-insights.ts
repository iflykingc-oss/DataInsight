/**
 * 智能洞察引擎
 * 自动发现数据中的异常、趋势、关联、细分
 */

import type { SmartInsight, InsightConfig } from './types';

export class SmartInsightEngine {
  /**
   * 生成智能洞察
   */
  async generateInsights(
    data: Record<string, unknown>[],
    config: InsightConfig = { autoDetect: true, types: ['anomaly', 'trend', 'correlation', 'segment'], minConfidence: 0.7, maxInsights: 10 }
  ): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];

    if (config.types.includes('anomaly')) {
      const anomalyInsights = await this.detectAnomalies(data, config);
      insights.push(...anomalyInsights);
    }

    if (config.types.includes('trend')) {
      const trendInsights = await this.detectTrends(data, config);
      insights.push(...trendInsights);
    }

    if (config.types.includes('correlation')) {
      const correlationInsights = await this.detectCorrelations(data, config);
      insights.push(...correlationInsights);
    }

    if (config.types.includes('segment')) {
      const segmentInsights = await this.detectSegments(data, config);
      insights.push(...segmentInsights);
    }

    // 按置信度和严重度排序
    insights.sort((a, b) => {
      const severityOrder = { critical: 3, warning: 2, info: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });

    // 限制数量
    return insights.slice(0, config.maxInsights);
  }

  /**
   * 异常检测
   */
  private async detectAnomalies(data: Record<string, unknown>[], config: InsightConfig): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const numericColumns = this.findNumericColumns(data);

    for (const col of numericColumns) {
      const values = data.map(d => Number(d[col])).filter(n => !isNaN(n));
      if (values.length < 10) continue;

      // IQR方法
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(values.length * 0.25)];
      const q3 = sorted[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      // 找出异常值
      const anomalies = data.filter((d, i) => {
        const v = Number(d[col]);
        return !isNaN(v) && (v < lowerBound || v > upperBound);
      });

      if (anomalies.length > 0) {
        const anomalyValues = anomalies.map(d => Number(d[col]));
        const maxAnomaly = Math.max(...anomalyValues);
        const minAnomaly = Math.min(...anomalyValues);
        const mean = values.reduce((a, b) => a + b, 0) / values.length;

        insights.push({
          id: `anomaly-${col}-${Date.now()}`,
          type: 'anomaly',
          severity: anomalies.length > values.length * 0.1 ? 'critical' : 'warning',
          title: `${col} 存在 ${anomalies.length} 个异常值`,
          description: `检测到 ${anomalies.length} 个异常数据点，超出正常范围 [${lowerBound.toFixed(2)}, ${upperBound.toFixed(2)}]`,
          dataEvidence: {
            metric: col,
            value: maxAnomaly,
            benchmark: mean,
            change: ((maxAnomaly - mean) / Math.abs(mean) * 100),
          },
          rootCause: this.inferAnomalyCause(col, anomalies, data),
          recommendation: `建议检查这些异常数据的来源，确认是否为数据录入错误或真实的业务异常`,
          confidence: Math.min(0.95, anomalies.length / values.length + 0.5),
          actionable: true,
        });
      }
    }

    return insights;
  }

  /**
   * 趋势检测
   */
  private async detectTrends(data: Record<string, unknown>[], config: InsightConfig): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const numericColumns = this.findNumericColumns(data);
    const timeColumn = this.findTimeColumn(data);

    if (!timeColumn) return insights;

    for (const col of numericColumns) {
      const timeSeries = data
        .map(d => ({ time: new Date(String(d[timeColumn])).getTime(), value: Number(d[col]) }))
        .filter(d => !isNaN(d.value) && !isNaN(d.time))
        .sort((a, b) => a.time - b.time);

      if (timeSeries.length < 10) continue;

      const values = timeSeries.map(d => d.value);
      
      // 线性回归检测趋势
      const n = values.length;
      const x = Array.from({ length: n }, (_, i) => i);
      const regression = this.fitLinearRegression(x, values);
      
      // 计算R²判断趋势强度
      const yMean = values.reduce((a, b) => a + b, 0) / n;
      const ssTotal = values.reduce((sum, v) => sum + (v - yMean) ** 2, 0);
      const ssResidual = values.reduce((sum, v, i) => sum + (v - (regression.intercept + regression.slope * i)) ** 2, 0);
      const r2 = ssTotal > 0 ? 1 - ssResidual / ssTotal : 0;

      if (r2 > 0.3 && Math.abs(regression.slope) > 0.01) {
        const firstHalf = values.slice(0, Math.floor(n / 2));
        const secondHalf = values.slice(Math.floor(n / 2));
        const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        const changePercent = firstMean !== 0 ? ((secondMean - firstMean) / Math.abs(firstMean)) * 100 : 0;

        insights.push({
          id: `trend-${col}-${Date.now()}`,
          type: 'trend',
          severity: Math.abs(changePercent) > 20 ? 'critical' : Math.abs(changePercent) > 10 ? 'warning' : 'info',
          title: `${col} 呈现${regression.slope > 0 ? '上升' : '下降'}趋势`,
          description: `${col} 在过去${n}个周期内${regression.slope > 0 ? '增长' : '下降'}了 ${Math.abs(changePercent).toFixed(1)}%，趋势强度 R²=${r2.toFixed(2)}`,
          dataEvidence: {
            metric: col,
            value: secondMean,
            benchmark: firstMean,
            change: changePercent,
          },
          rootCause: this.inferTrendCause(col, regression.slope, data),
          recommendation: regression.slope > 0
            ? `趋势向好，建议分析增长驱动因素并复制成功经验`
            : `趋势下降，建议深入分析原因并制定改进措施`,
          confidence: r2,
          actionable: true,
        });
      }
    }

    return insights;
  }

  /**
   * 关联检测
   */
  private async detectCorrelations(data: Record<string, unknown>[], config: InsightConfig): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const numericColumns = this.findNumericColumns(data);

    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];

        const values1 = data.map(d => Number(d[col1])).filter(n => !isNaN(n));
        const values2 = data.map(d => Number(d[col2])).filter(n => !isNaN(n));

        if (values1.length !== values2.length || values1.length < 10) continue;

        const correlation = this.calculatePearsonCorrelation(values1, values2);
        const absCorrelation = Math.abs(correlation);

        if (absCorrelation > 0.7) {
          insights.push({
            id: `correlation-${col1}-${col2}-${Date.now()}`,
            type: 'correlation',
            severity: absCorrelation > 0.9 ? 'critical' : 'warning',
            title: `${col1} 与 ${col2} 强${correlation > 0 ? '正' : '负'}相关`,
            description: `相关系数 r=${correlation.toFixed(2)}，表明两者存在${absCorrelation > 0.9 ? '极强' : '强'}的${correlation > 0 ? '正向' : '负向'}关联`,
            dataEvidence: {
              metric: `${col1} vs ${col2}`,
              value: correlation,
              benchmark: 0,
              change: absCorrelation * 100,
            },
            rootCause: this.inferCorrelationCause(col1, col2, correlation, data),
            recommendation: correlation > 0
              ? `建议利用这种正向关系进行联动优化，提升整体效益`
              : `注意这种负向关系，可能需要权衡取舍或寻找平衡点`,
            confidence: absCorrelation,
            actionable: true,
          });
        }
      }
    }

    return insights;
  }

  /**
   * 细分检测
   */
  private async detectSegments(data: Record<string, unknown>[], config: InsightConfig): Promise<SmartInsight[]> {
    const insights: SmartInsight[] = [];
    const categoricalColumns = this.findCategoricalColumns(data);
    const numericColumns = this.findNumericColumns(data);

    for (const catCol of categoricalColumns) {
      const groups = this.groupBy(data, catCol);
      
      if (groups.size < 2 || groups.size > 20) continue;

      for (const numCol of numericColumns) {
        const groupStats = Array.from(groups.entries()).map(([group, rows]) => ({
          group,
          mean: rows.reduce((sum, r) => sum + Number(r[numCol]), 0) / rows.length,
          count: rows.length,
        }));

        // 找出表现最好和最差的组
        groupStats.sort((a, b) => b.mean - a.mean);
        const best = groupStats[0];
        const worst = groupStats[groupStats.length - 1];
        const overallMean = groupStats.reduce((sum, g) => sum + g.mean, 0) / groupStats.length;

        if (best.mean > worst.mean * 1.5) {
          const diffPercent = worst.mean !== 0 ? ((best.mean - worst.mean) / worst.mean) * 100 : 0;

          insights.push({
            id: `segment-${catCol}-${numCol}-${Date.now()}`,
            type: 'segment',
            severity: diffPercent > 100 ? 'critical' : diffPercent > 50 ? 'warning' : 'info',
            title: `${catCol} 各组${numCol}差异显著`,
            description: `${best.group} 的${numCol}(${best.mean.toFixed(2)}) 是 ${worst.group}(${worst.mean.toFixed(2)}) 的 ${(best.mean / worst.mean).toFixed(1)} 倍`,
            dataEvidence: {
              metric: numCol,
              value: best.mean,
              benchmark: overallMean,
              change: diffPercent,
            },
            rootCause: `不同${catCol}在${numCol}上存在结构性差异，可能由资源分配、管理水平、市场定位等因素导致`,
            recommendation: `建议深入分析 ${best.group} 的成功经验，并帮助 ${worst.group} 制定改进计划`,
            confidence: Math.min(0.95, diffPercent / 200),
            actionable: true,
          });
        }
      }
    }

    return insights;
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private findNumericColumns(data: Record<string, unknown>[]): string[] {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => {
      return data.slice(0, 10).some(d => {
        const val = d[key];
        return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
      });
    });
  }

  private findCategoricalColumns(data: Record<string, unknown>[]): string[] {
    if (data.length === 0) return [];
    return Object.keys(data[0]).filter(key => {
      const uniqueValues = new Set(data.slice(0, 100).map(d => String(d[key])));
      return uniqueValues.size > 1 && uniqueValues.size <= 20;
    });
  }

  private findTimeColumn(data: Record<string, unknown>[]): string | undefined {
    return Object.keys(data[0]).find(key => {
      return data.slice(0, 5).some(d => {
        const val = String(d[key] || '');
        return /^\d{4}[-/]/.test(val) || /^\d{8}$/.test(val);
      });
    });
  }

  private groupBy(data: Record<string, unknown>[], key: string): Map<string, Record<string, unknown>[]> {
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of data) {
      const groupKey = String(row[key] || '未知');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    }
    return groups;
  }

  private fitLinearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    return denominator !== 0 ? numerator / denominator : 0;
  }

  private inferAnomalyCause(column: string, anomalies: Record<string, unknown>[], allData: Record<string, unknown>[]): string {
    // 基于业务规则的简单推断
    if (column.includes('额') || column.includes('金额') || column.includes('收入')) {
      return '可能是大额订单、退款、价格异常或数据录入错误';
    }
    if (column.includes('量') || column.includes('数')) {
      return '可能是促销活动、系统故障、库存异常或数据重复';
    }
    if (column.includes('率') || column.includes('占比')) {
      return '可能是计算逻辑错误、分母为零或业务规则变化';
    }
    return '需要结合业务场景进一步分析异常原因';
  }

  private inferTrendCause(column: string, slope: number, data: Record<string, unknown>[]): string {
    if (slope > 0) {
      if (column.includes('销售') || column.includes('收入')) {
        return '可能受益于市场需求增长、营销活动效果、产品优化或渠道扩张';
      }
      if (column.includes('成本') || column.includes('费用')) {
        return '可能由于原材料涨价、人力成本上升或运营效率下降';
      }
      return '可能受季节性因素、市场环境变化或业务策略调整影响';
    } else {
      if (column.includes('销售') || column.includes('收入')) {
        return '可能受市场竞争加剧、产品老化、客户流失或经济下行影响';
      }
      if (column.includes('成本') || column.includes('费用')) {
        return '可能受益于规模效应、供应链优化或成本控制措施';
      }
      return '可能受季节性因素、市场环境变化或业务策略调整影响';
    }
  }

  private inferCorrelationCause(col1: string, col2: string, correlation: number, data: Record<string, unknown>[]): string {
    if (correlation > 0) {
      return `${col1} 与 ${col2} 同向变动，可能存在因果关系或共同影响因素`;
    } else {
      return `${col1} 与 ${col2} 反向变动，可能存在权衡关系或资源竞争`;
    }
  }
}

export const smartInsightEngine = new SmartInsightEngine();
