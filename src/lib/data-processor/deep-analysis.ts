/**
 * 数据分析引擎 - 深度分析
 * 包含：健康评分、关键发现、相关性、分布、趋势、图表推荐、行动建议、数据画像、归因分析、场景分析
 */
import type { ParsedData, FieldStat, Summary, Anomaly, DeepAnalysis, AttributionAnalysis, ScenarioAnalysis, AnalysisPlan, CellValue } from './types';
import { calculateStdDev } from './analyzer';

export function generateDeepAnalysis(
  data: ParsedData,
  fieldStats: FieldStat[],
  summary: Summary,
  anomalies: Anomaly[],
  plan?: AnalysisPlan
): DeepAnalysis {
  // 如果提供了分析计划，过滤字段并控制执行模块
  let effectiveFieldStats = fieldStats;
  let effectiveData = data;
  let effectiveSummary = summary;

  if (plan) {
    // 1. 跳过计划指定的字段
    if (plan.skipFields.length > 0) {
      const skipSet = new Set(plan.skipFields);
      effectiveFieldStats = fieldStats.filter(f => !skipSet.has(f.field));
      // 重新过滤数据中的这些字段（保持数据结构完整，只是分析时忽略）
      const keepHeaders = data.headers.filter(h => !skipSet.has(h));
      effectiveData = {
        headers: keepHeaders,
        fileName: data.fileName || '数据文件',
        rowCount: data.rowCount || data.rows.length,
        columnCount: data.columnCount || keepHeaders.length,
        rows: data.rows.map(row => {
          const newRow: Record<string, CellValue> = {};
          keepHeaders.forEach(h => { newRow[h] = row[h]; });
          return newRow;
        })
      };
      // 重新计算 summary（仅用于分析，不改原始数据）
      const numericWithStats = effectiveFieldStats.filter(f => f.type === 'number' && f.numericStats).length;
      effectiveSummary = {
        ...summary,
        totalColumns: effectiveFieldStats.length,
        numericColumns: numericWithStats,
        textColumns: effectiveFieldStats.filter(f => f.type === 'string' || f.type === 'id').length,
        dateColumns: effectiveFieldStats.filter(f => f.type === 'date').length,
      };
    }

    // 2. 按分析计划顺序和范围执行
    const moduleSet = new Set(plan.analysisSequence);
    const healthScore = moduleSet.has('health_score') ?
      calculateHealthScore(effectiveData, effectiveFieldStats, effectiveSummary, anomalies) : { overall: 0, completeness: 0, consistency: 0, quality: 0, usability: 0 };
    const keyFindings = moduleSet.has('key_findings') ?
      generateKeyFindings(effectiveData, effectiveFieldStats, effectiveSummary, anomalies) : [];
    const correlations = moduleSet.has('correlation') ?
      calculateCorrelations(effectiveData, effectiveFieldStats) : [];
    const distributions = moduleSet.has('distribution') ?
      analyzeDistributions(effectiveData, effectiveFieldStats) : [];
    const trends = moduleSet.has('trend') ?
      analyzeTrends(effectiveData, effectiveFieldStats) : [];
    const recommendedCharts = recommendCharts(effectiveData, effectiveFieldStats, effectiveSummary);
    const dataProfile = generateDataProfile(effectiveData, effectiveFieldStats, effectiveSummary);
    const actionItems = moduleSet.has('action_items') ?
      generateActionItems(healthScore, keyFindings, effectiveFieldStats, effectiveSummary, dataProfile) : [];
    const attribution = moduleSet.has('attribution') ?
      analyzeAttribution(effectiveData, effectiveFieldStats, correlations) : undefined;
    const scenarioAnalysis = moduleSet.has('scenario') ?
      generateScenarioAnalysis(effectiveData, effectiveFieldStats, dataProfile) : undefined;    

    return {
      healthScore,
      keyFindings,
      correlations,
      distributions,
      trends,
      recommendedCharts,
      actionItems,
      dataProfile,
      attribution,
      scenarioAnalysis
    };
  }

  // 默认：执行全部模块（向后兼容）
  const healthScore = calculateHealthScore(data, fieldStats, summary, anomalies);
  const keyFindings = generateKeyFindings(data, fieldStats, summary, anomalies);
  const correlations = calculateCorrelations(data, fieldStats);
  const distributions = analyzeDistributions(data, fieldStats);
  const trends = analyzeTrends(data, fieldStats);
  const recommendedCharts = recommendCharts(data, fieldStats, summary);
  const dataProfile = generateDataProfile(data, fieldStats, summary);
  const actionItems = generateActionItems(healthScore, keyFindings, fieldStats, summary, dataProfile);
  const attribution = analyzeAttribution(data, fieldStats, correlations);
  const scenarioAnalysis = generateScenarioAnalysis(data, fieldStats, dataProfile);

  return {
    healthScore,
    keyFindings,
    correlations,
    distributions,
    trends,
    recommendedCharts,
    actionItems,
    dataProfile,
    attribution,
    scenarioAnalysis
  };
}

// ==================== 健康评分 ====================

function calculateHealthScore(
  data: ParsedData,
  fieldStats: FieldStat[],
  summary: Summary,
  anomalies: Anomaly[]
): DeepAnalysis['healthScore'] {
  const totalCells = summary.totalRows * summary.totalColumns;
  const completeness = totalCells > 0 ? Math.round(((totalCells - summary.nullValues) / totalCells) * 100) : 100;
  const anomalyRatio = anomalies.length / Math.max(totalCells, 1);
  const consistency = Math.round(Math.max(0, (1 - anomalyRatio * 10)) * 100);
  const dupRatio = summary.duplicateRows / Math.max(summary.totalRows, 1);
  const quality = Math.round(Math.max(0, (1 - dupRatio) * completeness * 0.5 + consistency * 0.5));
  const typeRatio = (summary.numericColumns + summary.dateColumns) / Math.max(summary.totalColumns, 1);
  const usability = Math.round(Math.min(100, typeRatio * 80 + completeness * 0.2));
  const overall = Math.round(completeness * 0.3 + consistency * 0.2 + quality * 0.3 + usability * 0.2);

  return { overall, completeness, consistency, quality, usability };
}

// ==================== 关键发现 ====================

// 置信度辅助：基于缺失率和数据量动态计算
function calcConfidence(base: number, nullCount: number, total: number): number {
  const nullPenalty = total > 0 ? Math.min(20, (nullCount / total) * 30) : 0;
  return Math.max(30, Math.round(base - nullPenalty));
}

function generateKeyFindings(
  data: ParsedData,
  fieldStats: FieldStat[],
  summary: Summary,
  _anomalies: Anomaly[]
): DeepAnalysis['keyFindings'] {
  const findings: DeepAnalysis['keyFindings'] = [];
  const totalCells = summary.totalRows * summary.totalColumns;

  // ===== 1. 数据质量发现（算法层，固定规则） =====
  if (summary.nullValues > 0) {
    const nullRatio = (summary.nullValues / totalCells) * 100;
    const worstFields = fieldStats
      .filter(f => f.nullCount > 0)
      .sort((a, b) => b.nullCount - a.nullCount)
      .slice(0, 3);
    findings.push({
      severity: nullRatio > 20 ? 'critical' : nullRatio > 5 ? 'warning' : 'info',
      category: 'quality',
      title: `数据缺失 ${nullRatio.toFixed(1)}%`,
      detail: `共 ${summary.nullValues} 个空值，最严重字段: ${worstFields.map(f => `${f.field}(${f.nullCount})`).join('、')}`,
      impact: nullRatio > 20 ? '严重影响分析结果准确性，可能导致统计偏差' : '可能影响部分统计指标的准确性',
      suggestion: worstFields.length > 0 ? `建议优先处理"${worstFields[0].field}"字段空值，可使用均值/中位数/众数填充` : '建议对空值进行填充或删除',
      relatedFields: worstFields.map(f => f.field),
      confidence: calcConfidence(90, summary.nullValues, totalCells),
      isBusinessInsight: false,
    });
  }

  if (summary.duplicateRows > 0) {
    const dupRatio = (summary.duplicateRows / summary.totalRows) * 100;
    findings.push({
      severity: dupRatio > 10 ? 'critical' : 'warning',
      category: 'quality',
      title: `发现 ${summary.duplicateRows} 行重复数据 (${dupRatio.toFixed(1)}%)`,
      detail: `数据集中存在 ${summary.duplicateRows} 行完全相同的数据记录`,
      impact: '重复数据会导致统计指标偏高，影响分析结论的可靠性',
      suggestion: '建议使用去重操作清除重复记录，去重前请确认是否为业务需要',
      relatedFields: [],
      confidence: 99,
      isBusinessInsight: false,
    });
  }

  // ===== 2. 业务洞察发现（算法精准计算 + 业务解读） =====

  // 2.1 分类字段集中度洞察
  const stringFields = fieldStats.filter(f => f.type === 'string' && f.topValues && f.topValues.length > 0);
  for (const catField of stringFields) {
    const stats = catField.topValues!;
    const totalCat = stats.reduce((s: number, c: {count: number}) => s + c.count, 0);
    if (totalCat === 0) continue;
    const sorted = [...stats].sort((a, b) => b.count - a.count);
    const top1Ratio = sorted[0].count / totalCat;
    const top3Ratio = sorted.slice(0, 3).reduce((s, c) => s + c.count, 0) / totalCat;

    if (top1Ratio > 0.8) {
      findings.push({
        severity: 'info',
        category: 'business',
        title: `"${catField.field}" 高度集中于"${sorted[0].value}"（占${(top1Ratio * 100).toFixed(0)}%）`,
        detail: `TOP1 "${sorted[0].value}" 占比超过80%，呈现极度集中的分布，说明该分类下存在明显的主导力量`,
        impact: '过度依赖单一类别可能带来业务风险，当该类别出现问题时整体将受到严重影响',
        suggestion: `建议拆分"${sorted[0].value}"的下级维度，分析其内部结构；同时关注增长潜力大的长尾类别，分散风险`,
        relatedFields: [catField.field],
        confidence: calcConfidence(92, catField.nullCount, summary.totalRows),
        isBusinessInsight: true,
      });
    } else if (top1Ratio < 0.25 && sorted.length >= 5) {
      findings.push({
        severity: 'info',
        category: 'business',
        title: `"${catField.field}" 分布均匀，TOP3合计仅占${(top3Ratio * 100).toFixed(0)}%`,
        detail: `${sorted.length}个类别分布相对均衡，没有单一主导力量，需要精细化运营策略`,
        impact: '均衡分布意味着没有明显的关键少数，需要找出真正影响分布的关键驱动因素',
        suggestion: `建议按"${catField.field}"做交叉分析，结合数值指标，找出影响各类别差异的关键因素`,
        relatedFields: [catField.field],
        confidence: calcConfidence(85, catField.nullCount, summary.totalRows),
        isBusinessInsight: true,
      });
    }
  }

  // 2.2 数值字段深度分布洞察
  fieldStats.filter(f => f.type === 'number' && f.numericStats).forEach(stat => {
    const ns = stat.numericStats!;
    const range = ns.max - ns.min;
    const values = data.rows.map(r => Number(r[stat.field])).filter(v => !isNaN(v));

    if (range === 0) {
      findings.push({
        severity: 'warning',
        category: 'distribution',
        title: `"${stat.field}" 字段无变化（所有值均为 ${ns.min}）`,
        detail: `所有 ${values.length} 条数据值完全相同，无统计意义`,
        impact: '该字段无分析价值，建议检查数据源或排除此字段',
        suggestion: '检查数据采集是否正确，或在分析时排除此字段',
        relatedFields: [stat.field],
        confidence: 99,
        isBusinessInsight: false,
      });
      return;
    }

    if (values.length > 2) {
      const sortedVals = [...values].sort((a, b) => a - b);
      const median = sortedVals.length % 2 === 0
        ? (sortedVals[sortedVals.length / 2 - 1] + sortedVals[sortedVals.length / 2]) / 2
        : sortedVals[Math.floor(sortedVals.length / 2)];
      const skewRatio = range > 0 ? Math.abs(ns.mean - median) / range : 0;

      if (skewRatio > 0.3) {
        const direction = ns.mean > median ? '右偏（被高值拉高）' : '左偏（被低值拉低）';
        findings.push({
          severity: 'info',
          category: 'distribution',
          title: `"${stat.field}" 分布${direction}，均值 ${ns.mean.toFixed(1)} vs 中位数 ${median.toFixed(1)}`,
          detail: `均值与中位数偏差占全距的 ${(skewRatio * 100).toFixed(0)}%，说明存在极端值影响了整体均值`,
          impact: '偏态分布下均值不能代表典型值，分析时应以中位数为准',
          suggestion: `建议使用中位数 ${median.toFixed(1)} 作为核心指标，结合箱线图分析极端值来源`,
          relatedFields: [stat.field],
          confidence: calcConfidence(88, stat.nullCount, summary.totalRows),
          isBusinessInsight: true,
        });
      }
    }

    if (Math.abs(ns.mean) > 0.001 && values.length > 5) {
      // 手动计算标准差
      const variance = values.reduce((acc, v) => acc + Math.pow(v - ns.mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const cv = Math.abs(stdDev) / Math.abs(ns.mean);
      if (cv > 2) {
        findings.push({
          severity: 'warning',
          category: 'business',
          title: `"${stat.field}" 波动性极高（变异系数 CV=${cv.toFixed(1)}）`,
          detail: `变异系数超过200%，数据极其不稳定，可能存在周期波动、季节性因素或异常干扰`,
          impact: '高波动数据意味着结果难以预测，需要重点关注并拆解波动来源',
          suggestion: `建议从时间维度拆解"${stat.field}"的波动，找出影响波动的关键因子（季节/渠道/产品等）`,
          relatedFields: [stat.field],
          confidence: calcConfidence(90, stat.nullCount, summary.totalRows),
          isBusinessInsight: true,
        });
      } else if (cv < 0.1) {
        findings.push({
          severity: 'info',
          category: 'business',
          title: `"${stat.field}" 高度稳定（变异系数 CV=${cv.toFixed(2)}）`,
          detail: `变异系数低于10%，数据非常稳定，适合建立基准线和预警机制`,
          impact: '稳定数据适合建立基线基准，超出基线即为异常信号',
          suggestion: `建议为"${stat.field}"建立 ±10% 的预警基线，持续监控以便及时发现异常`,
          relatedFields: [stat.field],
          confidence: calcConfidence(85, stat.nullCount, summary.totalRows),
          isBusinessInsight: true,
        });
      }
    }
  });

  // 2.3 相关性洞察
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  if (numericFields.length >= 2) {
    for (let i = 0; i < Math.min(numericFields.length, 5); i++) {
      for (let j = i + 1; j < Math.min(numericFields.length, 5); j++) {
        const f1 = numericFields[i];
        const f2 = numericFields[j];
        const pairs: Array<[number, number]> = [];
        data.rows.forEach(row => {
          const v1 = Number(row[f1.field]);
          const v2 = Number(row[f2.field]);
          if (!isNaN(v1) && !isNaN(v2)) pairs.push([v1, v2]);
        });
        if (pairs.length < 10) continue;
        const coef = pearsonCorrelation(pairs);
        const absCoef = Math.abs(coef);

        if (absCoef > 0.7) {
          findings.push({
            severity: 'info',
            category: 'business',
            title: `"${f1.field}" 与 "${f2.field}" 存在强${coef > 0 ? '正' : '负'}相关（r=${coef.toFixed(2)}）`,
            detail: `皮尔逊相关系数 ${coef.toFixed(3)}，两者${coef > 0 ? '同向变化' : '反向变化'}，一个指标变化时另一个倾向于同步变化`,
            impact: coef > 0
              ? '两者可互为预测指标，一个下跌时另一个可能同步下跌，存在联动风险'
              : '可能存在替代或挤出效应，可利用负相关做对冲策略',
            suggestion: coef > 0
              ? `建议将两者之一作为核心监控指标，同时监控可以互相验证数据准确性`
              : `建议深入分析因果关系，看是否存在真正的替代效应或对冲价值`,
            relatedFields: [f1.field, f2.field],
            confidence: Math.round(absCoef * 95),
            isBusinessInsight: true,
          });
        }
      }
    }
  }

  // 2.4 显著异常数据点
  const significantAnomalies = _anomalies
    .filter(a => a.type !== 'duplicate')
    .slice(0, 3);
  if (significantAnomalies.length > 0) {
    const contextLines = significantAnomalies.map(a => {
      const row = data.rows[a.row];
      const fields = data.headers.slice(0, 3).map(h => `${h}:${row?.[h]}`).join(', ');
      return `第${a.row + 1}行 ${a.type === 'outlier' ? '离群' : a.type === 'null' ? '缺失' : '异常'}值"${a.value}"（${fields}）`;
    }).join('；');
    findings.push({
      severity: 'warning',
      category: 'anomaly',
      title: `发现 ${significantAnomalies.length} 个显著异常数据点`,
      detail: contextLines,
      impact: '异常数据可能代表业务极端事件（欺诈/故障/特殊机会），需要逐一核实',
      suggestion: '建议打开原始数据定位异常记录，结合业务背景判断是数据错误还是真实异常',
      relatedFields: significantAnomalies.flatMap(a =>
        data.headers.filter(h => data.rows[a.row]?.[h] === a.value)
      ),
      confidence: 80,
      isBusinessInsight: true,
    });
  }

  // 2.5 分组分析建议
  const lowCardFields = fieldStats.filter(f =>
    f.type === 'string' && f.uniqueCount >= 2 && f.uniqueCount <= 20 && f.nullCount === 0
  );
  if (lowCardFields.length > 0 && numericFields.length > 0) {
    const topGroup = lowCardFields[0];
    findings.push({
      severity: 'positive',
      category: 'insight',
      title: `建议按"${topGroup.field}"分组分析（${topGroup.uniqueCount}个类别）`,
      detail: `"${topGroup.field}" 是理想的分组维度，最适合做维度拆解，可揭示被总量掩盖的组间差异`,
      impact: '分组分析是发现数据内部结构的最直接方式，往往能揭示关键业务差异',
      suggestion: `建议使用透视表或分组柱状图，按"${topGroup.field}"拆解"${numericFields[0].field}"等指标`,
      relatedFields: [topGroup.field, numericFields[0].field],
      confidence: 78,
      isBusinessInsight: true,
    });
  }

  if (summary.nullValues === 0 && summary.duplicateRows === 0) {
    findings.push({
      severity: 'positive',
      category: 'quality',
      title: '数据质量优秀',
      detail: '未发现空值和重复数据，数据可直接用于分析',
      impact: '高质量数据保证分析结果的可靠性',
      suggestion: '可以放心进行深度分析',
      relatedFields: [],
      confidence: 99,
      isBusinessInsight: false,
    });
  }

  return findings;
}

// ==================== 相关性分析 ====================

function calculateCorrelations(data: ParsedData, fieldStats: FieldStat[]): DeepAnalysis['correlations'] {
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  const correlations: DeepAnalysis['correlations'] = [];

  if (numericFields.length < 2) return correlations;

  const fields = numericFields.slice(0, 10);

  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const f1 = fields[i];
      const f2 = fields[j];

      const pairs: Array<[number, number]> = [];
      data.rows.forEach(row => {
        const v1 = Number(row[f1.field]);
        const v2 = Number(row[f2.field]);
        if (!isNaN(v1) && !isNaN(v2)) pairs.push([v1, v2]);
      });

      if (pairs.length < 5) continue;

      const coef = pearsonCorrelation(pairs);
      const absCoef = Math.abs(coef);

      if (absCoef > 0.3) {
        correlations.push({
          field1: f1.field,
          field2: f2.field,
          coefficient: Math.round(coef * 1000) / 1000,
          strength: absCoef > 0.7 ? 'strong' : absCoef > 0.5 ? 'moderate' : 'weak',
          direction: coef > 0 ? 'positive' : 'negative'
        });
      }
    }
  }

  return correlations.sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient));
}

function pearsonCorrelation(pairs: Array<[number, number]>): number {
  const n = pairs.length;
  if (n < 2) return 0;

  const sumX = pairs.reduce((s, p) => s + p[0], 0);
  const sumY = pairs.reduce((s, p) => s + p[1], 0);
  const sumXY = pairs.reduce((s, p) => s + p[0] * p[1], 0);
  const sumX2 = pairs.reduce((s, p) => s + p[0] * p[0], 0);
  const sumY2 = pairs.reduce((s, p) => s + p[1] * p[1], 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

// ==================== 分布分析 ====================

function analyzeDistributions(data: ParsedData, fieldStats: FieldStat[]): DeepAnalysis['distributions'] {
  return fieldStats
    .filter(f => f.type === 'number' && f.numericStats)
    .map(stat => {
      const values = data.rows.map(r => Number(r[stat.field])).filter(v => !isNaN(v));
      const ns = stat.numericStats!;

      const mean = ns.mean;
      const stdDev = calculateStdDev(values, mean);
      const skewness = stdDev === 0 ? 0 :
        values.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 3), 0) / values.length;

      const kurtosis = stdDev === 0 ? 0 :
        values.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 4), 0) / values.length - 3;

      let type: DeepAnalysis['distributions'][0]['type'] = 'normal';
      let description = '';

      if (Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 1) {
        type = 'normal';
        description = `"${stat.field}" 近似正态分布，数据分布均匀，适合使用均值和标准差进行分析`;
      } else if (skewness > 0.5) {
        type = 'skewed_right';
        description = `"${stat.field}" 右偏分布，大部分数据集中在低值区域，存在少量高值拉高均值`;
      } else if (skewness < -0.5) {
        type = 'skewed_left';
        description = `"${stat.field}" 左偏分布，大部分数据集中在高值区域，存在少量低值`;
      } else if (ns.max === ns.min) {
        type = 'uniform';
        description = `"${stat.field}" 数据无变化，所有值均为 ${ns.min}`;
      } else {
        type = 'normal';
        description = `"${stat.field}" 分布较为均匀`;
      }

      return {
        field: stat.field,
        type,
        skewness: Math.round(skewness * 100) / 100,
        kurtosis: Math.round(kurtosis * 100) / 100,
        description
      };
    });
}

// ==================== 趋势分析 ====================

function analyzeTrends(data: ParsedData, fieldStats: FieldStat[]): DeepAnalysis['trends'] {
  const trends: DeepAnalysis['trends'] = [];
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);

  if (numericFields.length === 0) return trends;

  numericFields.slice(0, 5).forEach(stat => {
    const values = data.rows.map(r => Number(r[stat.field])).filter(v => !isNaN(v));
    if (values.length < 3) return;

    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const changeRate = firstMean !== 0 ? ((secondMean - firstMean) / Math.abs(firstMean)) * 100 : 0;

    const mean = stat.numericStats!.mean;
    const stdDev = calculateStdDev(values, mean);
    const cv = mean !== 0 ? (stdDev / Math.abs(mean)) * 100 : 0;

    let direction: DeepAnalysis['trends'][0]['direction'] = 'stable';
    let description = '';

    if (Math.abs(changeRate) < 5) {
      direction = 'stable';
      description = `"${stat.field}" 整体保持稳定，变化幅度仅 ${Math.abs(changeRate).toFixed(1)}%`;
    } else if (cv > 50) {
      direction = 'volatile';
      description = `"${stat.field}" 波动较大(变异系数${cv.toFixed(0)}%)，需关注异常波动原因`;
    } else if (changeRate > 5) {
      direction = 'up';
      description = `"${stat.field}" 呈上升趋势，增幅约 ${changeRate.toFixed(1)}%`;
    } else {
      direction = 'down';
      description = `"${stat.field}" 呈下降趋势，降幅约 ${Math.abs(changeRate).toFixed(1)}%`;
    }

    trends.push({
      field: stat.field,
      direction,
      changeRate: Math.round(changeRate * 10) / 10,
      description
    });
  });

  return trends;
}

// ==================== 图表推荐 ====================

function recommendCharts(
  data: ParsedData,
  fieldStats: FieldStat[],
  summary: Summary
): DeepAnalysis['recommendedCharts'] {
  const charts: DeepAnalysis['recommendedCharts'] = [];
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  const textFields = fieldStats.filter(f => f.type === 'string' && f.uniqueCount <= 30 && f.uniqueCount >= 2);
  const dateFields = fieldStats.filter(f => f.type === 'date');

  if (textFields.length > 0 && numericFields.length > 0) {
    const xField = textFields[0];
    numericFields.slice(0, 2).forEach(yField => {
      charts.push({
        chartType: 'bar',
        title: `${xField.field} vs ${yField.field}`,
        xField: xField.field,
        yField: yField.field,
        reason: `"${xField.field}" 有 ${xField.uniqueCount} 个类别，适合用柱状图对比各组的"${yField.field}"`,
        priority: 'high'
      });
    });
  }

  if (dateFields.length > 0 && numericFields.length > 0) {
    charts.push({
      chartType: 'line',
      title: `${dateFields[0].field} 趋势`,
      xField: dateFields[0].field,
      yField: numericFields[0].field,
      reason: `时间序列数据适合用折线图展示"${numericFields[0].field}"的变化趋势`,
      priority: 'high'
    });
  }

  const pieFields = textFields.filter(f => f.uniqueCount <= 8);
  if (pieFields.length > 0) {
    charts.push({
      chartType: 'pie',
      title: `${pieFields[0].field} 占比分布`,
      xField: pieFields[0].field,
      yField: '',
      reason: `"${pieFields[0].field}" 有 ${pieFields[0].uniqueCount} 个类别，适合用饼图展示占比`,
      priority: 'medium'
    });
  }

  if (numericFields.length >= 2) {
    charts.push({
      chartType: 'scatter',
      title: `${numericFields[0].field} vs ${numericFields[1].field}`,
      xField: numericFields[0].field,
      yField: numericFields[1].field,
      reason: `散点图可揭示"${numericFields[0].field}"与"${numericFields[1].field}"的相关关系`,
      priority: 'high'
    });
  }

  if (numericFields.length > 0) {
    const xAxis = dateFields.length > 0 ? dateFields[0].field : (textFields.length > 0 ? textFields[0].field : '');
    if (xAxis) {
      charts.push({
        chartType: 'area',
        title: `${numericFields[0].field} 面积图`,
        xField: xAxis,
        yField: numericFields[0].field,
        reason: '面积图可直观展示数据量的累积变化',
        priority: 'medium'
      });
    }
  }

  if (textFields.length > 0 && numericFields.length >= 3) {
    charts.push({
      chartType: 'radar',
      title: `${textFields[0].field} 多维雷达图`,
      xField: textFields[0].field,
      yField: numericFields.slice(0, 4).map(f => f.field).join(','),
      reason: '雷达图可同时对比多个维度的表现',
      priority: 'low'
    });
  }

  return charts;
}

// ==================== 行动建议 ====================

function generateActionItems(
  healthScore: DeepAnalysis['healthScore'],
  keyFindings: DeepAnalysis['keyFindings'],
  fieldStats: FieldStat[],
  summary: Summary,
  dataProfile?: DeepAnalysis['dataProfile']
): DeepAnalysis['actionItems'] {
  const items: DeepAnalysis['actionItems'] = [];
  const industry = dataProfile?.suggestedIndustry || '通用';
  const allFields = fieldStats.map(f => f.field.toLowerCase());
  const _allText = allFields.join(' ');

  if (healthScore.completeness < 90) {
    const worstField = fieldStats.filter(f => f.nullCount > 0).sort((a, b) => b.nullCount - a.nullCount)[0];
    items.push({
      priority: 'high',
      action: '修复关键字段缺失值',
      detail: worstField
        ? `"${worstField.field}"字段有${worstField.nullCount}个空值，建议本周内用${worstField.type === 'number' ? '中位数' : '众数'}填充或联系数据源补充`
        : `数据完整性仅${healthScore.completeness}%，建议优先处理空值最多的字段`,
      expectedBenefit: '提升分析可信度，避免因缺失值导致的统计偏差'
    });
  }

  if (/电商|零售|销售/.test(industry)) {
    const salesField = fieldStats.find(f => /sale|revenue|amount|销售额|金额|gmv/i.test(f.field) && f.type === 'number');
    if (salesField && salesField.numericStats) {
      items.push({
        priority: 'high',
        action: '监控核心销售指标波动',
        detail: `"${salesField.field}"均值${salesField.numericStats.mean.toFixed(0)}，建议本周建立该指标的日报/周报监控机制，设置上下10%的预警阈值`,
        expectedBenefit: '及时发现销售异常，快速响应市场变化'
      });
    }
    const productField = fieldStats.find(f => /product|sku|品类|商品|item/i.test(f.field));
    if (productField && salesField) {
      items.push({
        priority: 'high',
        action: '输出TOP20商品/品类销售排行',
        detail: `按"${productField.field}"分组汇总"${salesField.field}"，输出销售额TOP20和BOTTOM20，本周内完成`,
        expectedBenefit: '快速识别明星商品和滞销品，指导本周备货和促销策略'
      });
    }
  }

  if (/用户|运营|互联网/.test(industry)) {
    const userField = fieldStats.find(f => /user|用户|member|会员/i.test(f.field));
    if (userField) {
      items.push({
        priority: 'high',
        action: '分析用户分层结构',
        detail: `基于现有数据，按"${userField.field}"或其他维度做用户分层（如新客/老客/高价值/沉默），本周输出分层占比`,
        expectedBenefit: '为精准运营提供用户画像基础'
      });
    }
  }

  if (/财务|成本/.test(industry)) {
    const costField = fieldStats.find(f => /cost|expense|费用|成本/i.test(f.field) && f.type === 'number');
    if (costField) {
      items.push({
        priority: 'high',
        action: '识别TOP3成本项',
        detail: `按维度分组汇总"${costField.field}"，找出占比最高的3个成本项，本周完成归因分析`,
        expectedBenefit: '快速定位成本控制关键点'
      });
    }
  }

  if (summary.numericColumns >= 2) {
    const metricFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
    if (metricFields.length >= 2) {
      items.push({
        priority: 'medium',
        action: '建立核心指标关联分析',
        detail: `分析"${metricFields[0].field}"与"${metricFields[1].field}"的相关性，建立指标联动监控看板，本月完成`,
        expectedBenefit: '发现指标间的驱动关系，优化资源配置'
      });
    }
  }

  if (fieldStats.some(f => f.type === 'date')) {
    items.push({
      priority: 'medium',
      action: '建立趋势监控和简单预测',
      detail: '基于时间序列数据，建立核心指标的周/月趋势图，并做简单环比/同比分析，本月完成',
      expectedBenefit: '提前预判业务走势，为决策预留响应时间'
    });
  }

  if (/电商|零售/.test(industry)) {
    items.push({
      priority: 'medium',
      action: '建立商品ABC分类管理',
      detail: '按销售额/销量对商品做ABC分类（20%商品贡献80%销售额），本月建立分类管理和差异化运营策略',
      expectedBenefit: '优化库存结构，提升周转效率和利润率'
    });
  }

  if (/库存|供应链/.test(industry)) {
    items.push({
      priority: 'medium',
      action: '建立安全库存预警机制',
      detail: '基于历史数据计算各SKU的安全库存水位，设置低于安全线的自动预警，本月上线',
      expectedBenefit: '降低缺货风险，提升客户满意度'
    });
  }

  if (summary.totalRows < 200) {
    items.push({
      priority: 'low',
      action: '扩大数据样本和维度',
      detail: `当前仅${summary.totalRows}行数据，建议本季度将数据量扩展至500+行，并补充${industry === '电商/零售' ? '客户画像、渠道来源' : industry === '互联网/用户运营' ? '行为路径、设备信息' : '更多业务维度'}等字段`,
      expectedBenefit: '支撑更复杂的分析模型（如预测、聚类），提升决策精度'
    });
  }

  if (summary.numericColumns >= 3 && summary.totalRows >= 100) {
    items.push({
      priority: 'low',
      action: '探索AI预测模型应用',
      detail: `数据量(${summary.totalRows}行)和维度(${summary.numericColumns}个数值字段)已满足基础预测条件，本季度可尝试用AI做${industry === '电商/零售' ? '销售预测' : industry === '库存/供应链' ? '需求预测' : '趋势预测'}`,
      expectedBenefit: '从描述性分析升级到预测性分析，实现数据驱动决策'
    });
  }

  items.push({
    priority: 'low',
    action: '建立数据质量监控体系',
    detail: '建立日常数据质量检查清单（完整性、一致性、时效性），设置自动化监控规则，本季度落地',
    expectedBenefit: '从源头保障数据质量，减少分析前的数据清洗工作量'
  });

  return items;
}

// ==================== 数据画像 ====================

function generateDataProfile(
  data: ParsedData,
  fieldStats: FieldStat[],
  summary: Summary
): DeepAnalysis['dataProfile'] {
  const fieldNames = fieldStats.map(f => f.field.toLowerCase());
  const fieldNamesOriginal = fieldStats.map(f => f.field);
  const numericFields = fieldStats.filter(f => f.type === 'number');
  const textFields = fieldStats.filter(f => f.type === 'string');
  const dateFields = fieldStats.filter(f => f.type === 'date');

  const allText = fieldNames.join(' ') + ' ' + fieldNamesOriginal.join(' ').toLowerCase();

  let dataType = '通用业务数据';
  let suggestedIndustry = '通用行业';
  let subScenario = '';

  if (/sale|revenue|amount|price|order|customer|product|sku|gmv|transaction|qty|quantity|unit price|discount|销售额|销售|金额|价格|订单|客户|产品|数量|单价|折扣/.test(allText)) {
    dataType = '销售/交易数据';
    suggestedIndustry = '电商/零售';
    if (/daily|日|date|日期|time|时间/.test(allText)) subScenario = '日销跟踪';
    else if (/month|月|quarter|季度/.test(allText)) subScenario = '月度/季度汇总';
    else if (/product|sku|品类|商品/.test(allText)) subScenario = '商品维度分析';
    else if (/customer|客户|会员/.test(allText)) subScenario = '客户维度分析';
    else if (/region|地区|门店|store/.test(allText)) subScenario = '区域/门店维度';
    else subScenario = '交易流水';
  }
  else if (/user|member|注册|登录|留存|活跃|转化|dau|mau|uv|pv|click|session|retention|conversion|用户|会员|活跃|访问/.test(allText)) {
    dataType = '用户行为/运营数据';
    suggestedIndustry = '互联网/用户运营';
    if (/dau|mau|日活|月活|active/.test(allText)) subScenario = '活跃度分析';
    else if (/retention|留存|churn|流失/.test(allText)) subScenario = '留存/流失分析';
    else if (/conversion|转化|funnel|漏斗/.test(allText)) subScenario = '转化漏斗分析';
    else subScenario = '用户行为分析';
  }
  else if (/inventory|stock|warehouse|supply|purchase|入库|出库|库存|仓储|采购|供应链/.test(allText)) {
    dataType = '库存/供应链数据';
    suggestedIndustry = '制造/物流/供应链';
    if (/turnover|周转|周转率/.test(allText)) subScenario = '库存周转分析';
    else if (/purchase|采购|supplier|供应商/.test(allText)) subScenario = '采购管理';
    else subScenario = '库存管理';
  }
  else if (/cost|budget|expense|profit|income|asset|liability|revenue|财务|成本|预算|费用|利润|收入|资产|负债/.test(allText)) {
    dataType = '财务/成本数据';
    suggestedIndustry = '金融/财务';
    if (/budget|预算|forecast|预测/.test(allText)) subScenario = '预算管理';
    else if (/cost|成本|expense|费用/.test(allText)) subScenario = '成本分析';
    else subScenario = '财务报表';
  }
  else if (/employee|staff|salary|hr|hire|depart|position|绩效|考勤|员工|薪资|招聘|部门|岗位/.test(allText)) {
    dataType = '人力资源数据';
    suggestedIndustry = '人力资源';
    if (/salary|薪资|compensation|薪酬/.test(allText)) subScenario = '薪酬分析';
    else if (/performance|绩效|kpi|考核/.test(allText)) subScenario = '绩效管理';
    else if (/attendance|考勤|leave|请假/.test(allText)) subScenario = '考勤管理';
    else subScenario = '人员管理';
  }
  else if (/student|score|grade|course|teacher|class|exam|学生|成绩|课程|教师|班级|考试/.test(allText)) {
    dataType = '教育/教学数据';
    suggestedIndustry = '教育';
    if (/score|成绩|grade|分数/.test(allText)) subScenario = '成绩分析';
    else if (/attendance|出勤|签到/.test(allText)) subScenario = '出勤管理';
    else subScenario = '教学管理';
  }
  else if (/production|yield|defect|quality|产量|良品|不良|生产|质量/.test(allText)) {
    dataType = '生产/质量数据';
    suggestedIndustry = '制造';
    subScenario = '生产质量分析';
  }

  let dataMaturity: DeepAnalysis['dataProfile']['dataMaturity'] = 'raw';
  if (summary.nullValues === 0 && summary.duplicateRows === 0) {
    dataMaturity = summary.totalRows > 100 ? 'structured' : 'cleaned';
  }

  const analysisPotential: DeepAnalysis['dataProfile']['analysisPotential'] =
    numericFields.length >= 3 && summary.totalRows >= 50 ? 'high' :
    numericFields.length >= 1 && summary.totalRows >= 20 ? 'medium' : 'low';

  let periodFeature = '';
  if (dateFields.length > 0) {
    const dateVals = data.rows.slice(0, Math.min(data.rows.length, 100))
      .map(r => String(r[dateFields[0].field]))
      .filter(d => d && d !== 'null');
    if (dateVals.length >= 2) {
      try {
        const dates = dateVals.map(d => new Date(d)).filter(d => !isNaN(d.getTime())).sort((a, b) => a.getTime() - b.getTime());
        if (dates.length >= 2) {
          const spanDays = (dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24);
          if (spanDays < 7) periodFeature = '超短周期(<7天)';
          else if (spanDays < 30) periodFeature = '短周期(<1月)';
          else if (spanDays < 90) periodFeature = '中周期(1-3月)';
          else if (spanDays < 365) periodFeature = '中长周期(3-12月)';
          else periodFeature = '长周期(>1年)';
        }
      } catch { /* ignore */ }
    }
  }

  let scaleFeature = '';
  if (summary.totalRows < 50) scaleFeature = '极小样本';
  else if (summary.totalRows < 200) scaleFeature = '小样本';
  else if (summary.totalRows < 1000) scaleFeature = '中等样本';
  else scaleFeature = '大样本';

  const summary2 = `${suggestedIndustry}领域${subScenario ? `的${subScenario}` : ''}数据，` +
    `${scaleFeature}（${summary.totalRows}行x${summary.totalColumns}列），` +
    `${periodFeature ? `覆盖${periodFeature}，` : ''}` +
    `${analysisPotential === 'high' ? '数据维度丰富，适合深度业务分析' :
      analysisPotential === 'medium' ? '可进行基础统计分析，建议补充更多维度' :
      '样本量偏小，建议扩大数据后分析'}。` +
    `包含${numericFields.length}个数值字段、${textFields.length}个文本字段${dateFields.length > 0 ? `、${dateFields.length}个日期字段` : ''}`;

  return {
    dataType,
    suggestedIndustry,
    subScenario,
    dataMaturity,
    analysisPotential,
    periodFeature,
    scaleFeature,
    summary: summary2
  };
}

// ==================== 归因分析 ====================

function analyzeAttribution(
  data: ParsedData,
  fieldStats: FieldStat[],
  correlations: DeepAnalysis['correlations']
): AttributionAnalysis | undefined {
  const { rows } = data;
  if (rows.length < 5) return undefined;

  const numericFields = fieldStats.filter(f => f.type === 'number');
  const categoryFields = fieldStats.filter(f =>
    f.type === 'string' && f.uniqueCount >= 2 && f.uniqueCount <= Math.min(50, rows.length * 0.5)
  );

  if (numericFields.length === 0) return undefined;

  const anomalyMetrics: AttributionAnalysis['anomalyMetrics'] = [];

  for (const field of numericFields) {
    const values = rows.map(r => Number(r[field.field])).filter(v => !isNaN(v));
    if (values.length < 5) continue;

    values.sort((a, b) => a - b);
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    if (stdDev === 0) continue;

    const q1 = values[Math.floor(n * 0.25)];
    const q3 = values[Math.floor(n * 0.75)];
    const iqr = q3 - q1;
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;

    const topDecile = values.slice(Math.floor(n * 0.9));
    const bottomDecile = values.slice(0, Math.ceil(n * 0.1));
    const topMean = topDecile.reduce((a, b) => a + b, 0) / topDecile.length;
    const bottomMean = bottomDecile.reduce((a, b) => a + b, 0) / bottomDecile.length;
    const median = values[Math.floor(n / 2)];

    if (topMean > median * 1.3 && topMean > upperFence) {
      const changeRate = median !== 0 ? Math.round(((topMean - median) / Math.abs(median)) * 100) : 0;
      const affectedRows = values.filter(v => v > upperFence).length;
      anomalyMetrics.push({
        field: field.field,
        direction: 'spike_up',
        severity: changeRate > 100 ? 'high' : changeRate > 50 ? 'medium' : 'low',
        description: `${field.field}出现显著上行波动，头部均值偏离中位数${changeRate}%`,
        changeRate,
        affectedRows,
        baseline: Math.round(median * 100) / 100,
        actualValue: Math.round(topMean * 100) / 100,
      });
    }

    if (bottomMean < median * 0.7 && bottomMean < lowerFence) {
      const changeRate = median !== 0 ? Math.round(((median - bottomMean) / Math.abs(median)) * 100) : 0;
      const affectedRows = values.filter(v => v < lowerFence).length;
      anomalyMetrics.push({
        field: field.field,
        direction: 'drop_down',
        severity: changeRate > 50 ? 'high' : changeRate > 25 ? 'medium' : 'low',
        description: `${field.field}出现显著下行波动，底部均值偏离中位数${changeRate}%`,
        changeRate,
        affectedRows,
        baseline: Math.round(median * 100) / 100,
        actualValue: Math.round(bottomMean * 100) / 100,
      });
    }

    const cv = stdDev / Math.abs(mean);
    if (cv > 0.5 && !anomalyMetrics.some(m => m.field === field.field)) {
      anomalyMetrics.push({
        field: field.field,
        direction: 'volatile',
        severity: cv > 1 ? 'high' : cv > 0.7 ? 'medium' : 'low',
        description: `${field.field}波动性极高（变异系数${(cv * 100).toFixed(0)}%），数据离散程度大`,
        changeRate: Math.round(cv * 100),
        affectedRows: values.filter(v => Math.abs((v - mean) / stdDev) > 2).length,
        baseline: Math.round(mean * 100) / 100,
        actualValue: Math.round(stdDev * 100) / 100,
      });
    }
  }

  if (anomalyMetrics.length === 0 && numericFields.length > 0) {
    const field = numericFields[0];
    const values = rows.map(r => Number(r[field.field])).filter(v => !isNaN(v));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
    const cv = stdDev / Math.abs(mean);
    if (cv > 0.2) {
      anomalyMetrics.push({
        field: field.field,
        direction: 'volatile',
        severity: 'low',
        description: `${field.field}存在一定波动（变异系数${(cv * 100).toFixed(0)}%）`,
        changeRate: Math.round(cv * 100),
        affectedRows: 0,
        baseline: Math.round(mean * 100) / 100,
        actualValue: Math.round(stdDev * 100) / 100,
      });
    }
  }

  const dimensionBreakdowns: AttributionAnalysis['dimensionBreakdowns'] = [];

  for (const metric of anomalyMetrics.slice(0, 5)) {
    for (const catField of categoryFields.slice(0, 5)) {
      const groupMap = new Map<string, number[]>();
      for (const row of rows) {
        const catValue = String(row[catField.field] ?? '未知');
        const numValue = Number(row[metric.field]);
        if (isNaN(numValue)) continue;
        if (!groupMap.has(catValue)) groupMap.set(catValue, []);
        groupMap.get(catValue)!.push(numValue);
      }

      if (groupMap.size < 2) continue;

      const overallSum = rows.reduce((acc, r) => {
        const v = Number(r[metric.field]);
        return isNaN(v) ? acc : acc + v;
      }, 0);

      const segments: AttributionAnalysis['dimensionBreakdowns'][0]['segments'] = [];
      let keyDriverValue = '';
      let keyDriverContribution = 0;

      for (const [segValue, segValues] of groupMap) {
        const segSum = segValues.reduce((a, b) => a + b, 0);
        const contribution = overallSum !== 0 ? (segSum / overallSum) * 100 : 0;
        const segMean = segValues.reduce((a, b) => a + b, 0) / segValues.length;
        const overallMean = overallSum / rows.filter(r => !isNaN(Number(r[metric.field]))).length;
        const deviation = overallMean !== 0 ? ((segMean - overallMean) / Math.abs(overallMean)) * 100 : 0;

        segments.push({
          segmentValue: segValue,
          contribution: Math.round(contribution * 100) / 100,
          metricValue: Math.round(segSum * 100) / 100,
          deviation: Math.round(deviation * 100) / 100,
          isKeyDriver: false,
        });

        if (Math.abs(contribution) > Math.abs(keyDriverContribution)) {
          keyDriverContribution = contribution;
          keyDriverValue = segValue;
        }
      }

      const sortedSegments = segments.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
      if (sortedSegments.length > 0) {
        sortedSegments[0].isKeyDriver = true;
      }

      dimensionBreakdowns.push({
        metricField: metric.field,
        dimensionField: catField.field,
        segments: sortedSegments.slice(0, 10),
        keyDriver: keyDriverValue,
        keyDriverContribution: Math.round(keyDriverContribution * 100) / 100,
      });
    }
  }

  const rootCauses: AttributionAnalysis['rootCauses'] = [];

  for (const metric of anomalyMetrics) {
    const relatedCorrelations = correlations.filter(
      c => (c.field1 === metric.field || c.field2 === metric.field) && c.strength !== 'weak'
    );

    const breakdowns = dimensionBreakdowns.filter(b => b.metricField === metric.field);

    const evidence: string[] = [];
    const relatedDimensions: string[] = [];
    let causeDescription = '';
    let confidence: 'high' | 'medium' | 'low' = 'low';
    let suggestion = '';

    if (breakdowns.length > 0) {
      const mainBreakdown = breakdowns[0];
      evidence.push(
        `维度"${mainBreakdown.dimensionField}"中"${mainBreakdown.keyDriver}"贡献了${Math.abs(mainBreakdown.keyDriverContribution).toFixed(1)}%的${metric.field}`
      );
      relatedDimensions.push(mainBreakdown.dimensionField);

      if (metric.direction === 'spike_up') {
        causeDescription = `${metric.field}上行主要由"${mainBreakdown.dimensionField}"="${mainBreakdown.keyDriver}"驱动，该维度贡献度${mainBreakdown.keyDriverContribution.toFixed(1)}%`;
        suggestion = `重点关注"${mainBreakdown.keyDriver}"相关业务，评估增长是否可持续，考虑是否需要资源倾斜`;
      } else if (metric.direction === 'drop_down') {
        causeDescription = `${metric.field}下降主要由"${mainBreakdown.dimensionField}"="${mainBreakdown.keyDriver}"拖累，该维度贡献度${mainBreakdown.keyDriverContribution.toFixed(1)}%`;
        suggestion = `优先排查"${mainBreakdown.keyDriver}"相关业务下滑原因，制定针对性修复方案`;
      } else {
        causeDescription = `${metric.field}波动主要由"${mainBreakdown.dimensionField}"维度差异导致，最大贡献维度"${mainBreakdown.keyDriver}"占比${Math.abs(mainBreakdown.keyDriverContribution).toFixed(1)}%`;
        suggestion = `对"${mainBreakdown.dimensionField}"各维度值分别制定标准化运营策略，减少波动`;
      }
      confidence = mainBreakdown.keyDriverContribution > 50 ? 'high' : 'medium';
    }

    for (const corr of relatedCorrelations.slice(0, 2)) {
      const relatedField = corr.field1 === metric.field ? corr.field2 : corr.field1;
      evidence.push(
        `与"${relatedField}"存在${corr.strength === 'strong' ? '强' : '中等'}${corr.direction === 'positive' ? '正' : '负'}相关（r=${corr.coefficient.toFixed(2)}）`
      );
      relatedDimensions.push(relatedField);
    }

    if (relatedCorrelations.length > 0 && breakdowns.length === 0) {
      const topCorr = relatedCorrelations[0];
      const relatedField = topCorr.field1 === metric.field ? topCorr.field2 : topCorr.field1;
      causeDescription = `${metric.field}异常与"${relatedField}"高度相关（r=${topCorr.coefficient.toFixed(2)}），变化可能由"${relatedField}"传导`;
      suggestion = `同步监控"${relatedField}"的变化趋势，考虑联动调控策略`;
      confidence = topCorr.strength === 'strong' ? 'high' : 'medium';
    }

    if (causeDescription) {
      rootCauses.push({
        metric: metric.field,
        cause: causeDescription,
        confidence,
        evidence,
        relatedDimensions: [...new Set(relatedDimensions)],
        suggestion,
      });
    }
  }

  const anomalyCount = anomalyMetrics.length;
  const highSeverity = anomalyMetrics.filter(m => m.severity === 'high').length;
  const driverCount = dimensionBreakdowns.filter(b => Math.abs(b.keyDriverContribution) > 30).length;
  const causeCount = rootCauses.length;

  let summaryText = '';
  if (anomalyCount === 0) {
    summaryText = '当前数据整体平稳，未检测到显著异常波动。建议持续监控关键指标变化。';
  } else {
    summaryText = `检测到${anomalyCount}个指标存在异常波动`;
    if (highSeverity > 0) summaryText += `（其中${highSeverity}个高严重度）`;
    if (driverCount > 0) summaryText += `，${driverCount}个指标已定位核心驱动因素`;
    if (causeCount > 0) summaryText += `，${causeCount}个指标已生成根因分析`;
    summaryText += '。建议优先处理高严重度异常，关注核心驱动因素的业务变化。';
  }

  return {
    anomalyMetrics,
    dimensionBreakdowns,
    rootCauses,
    summary: summaryText,
  };
}

// ==================== 场景化分析 ====================

const SCENARIO_DEFINITIONS: Array<{
  id: string;
  name: string;
  keywords: RegExp;
  indicators: Array<{ name: string; keywords: RegExp; expression: string; description: string; priority: 'p0' | 'p1' | 'p2' }>;
  dimensions: string[];
  suggestions: Array<{ title: string; description: string; priority: 'high' | 'medium' | 'low' }>;
}> = [
  {
    id: 'retail',
    name: '电商/零售',
    keywords: /销售|sale|订单|order|商品|product|客户|customer|库存|inventory|单价|price|金额|amount|营收|revenue|毛利|profit|gmv|uv|pv|转化率|conversion/i,
    indicators: [
      { name: '总销售额', keywords: /销售额|销售金额|amount|revenue|gmv|sales|sale/i, expression: 'SUM(销售额字段)', description: '统计周期内所有销售订单的总金额', priority: 'p0' },
      { name: '订单量', keywords: /订单|order|单量|quantity|count/i, expression: 'COUNT(订单ID)', description: '统计周期内的总订单数量', priority: 'p0' },
      { name: '客单价', keywords: /单价|客单价|avg.*price|price.*avg|unit.*price|aov/i, expression: 'SUM(金额) / COUNT(订单)', description: '平均每笔订单的金额', priority: 'p0' },
      { name: '毛利率', keywords: /毛利|利润|profit|margin|gross/i, expression: '(销售额 - 成本) / 销售额', description: '销售收入扣除成本后的利润率', priority: 'p1' },
      { name: '转化率', keywords: /转化|conversion|rate|convert/i, expression: '成交数 / 访客数', description: '访客转化为购买客户的比例', priority: 'p1' },
    ],
    dimensions: ['时间（日/周/月）', '商品类别', '客户等级', '区域/渠道', '促销活动'],
    suggestions: [
      { title: 'TOP商品分析', description: '识别销售额TOP20%的商品，重点优化其库存和供应链', priority: 'high' },
      { title: '滞销商品清理', description: '找出30天无销量的SKU，制定清仓或下架策略', priority: 'high' },
      { title: '客户分层运营', description: '基于消费金额和频次将客户分为高价值/潜力/流失群体', priority: 'medium' },
      { title: '促销效果追踪', description: '对比促销期间与非促销期间的销售额变化，评估ROI', priority: 'medium' },
    ],
  },
  {
    id: 'finance',
    name: '财务/成本',
    keywords: /收入|income|支出|expense|成本|cost|预算|budget|费用|fee|报销|reimburse|资产|asset|负债|liability|现金流|cashflow|利润|profit|税务|tax|发票|invoice/i,
    indicators: [
      { name: '总收入', keywords: /收入|revenue|income|营业额/i, expression: 'SUM(收入字段)', description: '统计周期内所有收入来源的总和', priority: 'p0' },
      { name: '总支出', keywords: /支出|expense|成本|cost|费用/i, expression: 'SUM(支出字段)', description: '统计周期内所有支出的总和', priority: 'p0' },
      { name: '净利润', keywords: /净利|利润|profit|net/i, expression: '总收入 - 总支出', description: '扣除所有成本费用后的净收益', priority: 'p0' },
      { name: '费用占比', keywords: /费用|fee|expense/i, expression: '某类费用 / 总支出', description: '各类费用在总支出中的占比', priority: 'p1' },
    ],
    dimensions: ['时间（月/季/年）', '部门/项目', '费用类别', '收支类型'],
    suggestions: [
      { title: '预算执行监控', description: '对比实际支出与预算，识别超支部门并预警', priority: 'high' },
      { title: '费用结构优化', description: '分析固定成本与变动成本比例，寻找降本空间', priority: 'high' },
      { title: '应收应付管理', description: '跟踪应收账款账龄，加速资金回笼', priority: 'medium' },
    ],
  },
  {
    id: 'hr',
    name: '人力资源',
    keywords: /员工|employee|人员|staff|招聘|recruit|入职|onboard|离职|turnover|考勤|attendance|绩效|performance|薪资|salary|薪酬|compensation|培训|training|人事|hr/i,
    indicators: [
      { name: '在职人数', keywords: /员工|人员|在职|人数|count.*emp|headcount/i, expression: 'COUNT(员工ID)', description: '当前在职员工总数', priority: 'p0' },
      { name: '离职率', keywords: /离职|流失|turnover|leave/i, expression: '离职人数 / 平均在职人数', description: '统计周期内员工离职的比例', priority: 'p0' },
      { name: '平均薪资', keywords: /薪资|工资|salary|compensation/i, expression: 'AVG(薪资)', description: '员工平均薪酬水平', priority: 'p1' },
      { name: '招聘完成率', keywords: /招聘|recruit|hire/i, expression: '实际入职 / 计划招聘', description: '招聘计划完成情况', priority: 'p1' },
    ],
    dimensions: ['部门', '岗位级别', '入职时间', '性别/年龄区间'],
    suggestions: [
      { title: '离职风险预警', description: '识别高离职率部门，分析根因并制定留人方案', priority: 'high' },
      { title: '薪酬竞争力分析', description: '对比行业平均薪酬，评估薪资竞争力', priority: 'medium' },
      { title: '人才结构优化', description: '分析各部门人员配比，识别冗余或短缺', priority: 'medium' },
    ],
  },
  {
    id: 'education',
    name: '教育培训',
    keywords: /学生|student|学员|course|课程|成绩|score|考试|exam|教师|teacher|班级|class|学校|school|培训|training|课时|hour|出勤|attendance/i,
    indicators: [
      { name: '学员总数', keywords: /学生|学员|student|learner/i, expression: 'COUNT(学员ID)', description: '在册学员总数', priority: 'p0' },
      { name: '平均成绩', keywords: /成绩|分数|score|grade/i, expression: 'AVG(成绩)', description: '学员平均成绩', priority: 'p0' },
      { name: '出勤率', keywords: /出勤|attendance|到课/i, expression: '实际出勤 / 应出勤', description: '学员出勤比例', priority: 'p1' },
      { name: '及格率', keywords: /及格|pass|合格/i, expression: '及格人数 / 总人数', description: '考试及格比例', priority: 'p1' },
    ],
    dimensions: ['课程/科目', '班级', '时间（月/学期）', '教师'],
    suggestions: [
      { title: '学业预警', description: '识别成绩低于及格线或出勤率不足的学员，及时干预', priority: 'high' },
      { title: '课程效果评估', description: '对比不同课程的平均成绩，优化教学内容', priority: 'medium' },
      { title: '教师绩效分析', description: '分析各班级成绩分布，识别教学薄弱环节', priority: 'medium' },
    ],
  },
  {
    id: 'manufacturing',
    name: '生产制造',
    keywords: /生产|production|产量|output|产能|capacity|设备|equipment|质量|quality|质检|inspect|缺陷|defect|工单|workorder|工序|process|物料|material|库存|inventory|供应商|supplier/i,
    indicators: [
      { name: '总产量', keywords: /产量|产出|output|production/i, expression: 'SUM(产量)', description: '统计周期内生产的产品总量', priority: 'p0' },
      { name: '良品率', keywords: /良品|合格|质量|quality|pass.*rate/i, expression: '良品数 / 总生产数', description: '合格产品占总产量的比例', priority: 'p0' },
      { name: '设备稼动率', keywords: /设备|稼动|利用率|utilization/i, expression: '实际运行时间 / 计划运行时间', description: '设备有效利用比例', priority: 'p1' },
      { name: '单位成本', keywords: /成本|cost|单位/i, expression: '总成本 / 总产量', description: '每单位产品的生产成本', priority: 'p1' },
    ],
    dimensions: ['生产线/车间', '产品型号', '时间（日/周）', '班次', '供应商'],
    suggestions: [
      { title: '质量异常追溯', description: '分析缺陷产品分布，定位问题工序和根因', priority: 'high' },
      { title: '产能瓶颈识别', description: '对比各产线产能利用率，找出瓶颈环节', priority: 'high' },
      { title: '库存周转优化', description: '分析原材料和成品库存周转天数，减少资金占用', priority: 'medium' },
    ],
  },
  {
    id: 'general',
    name: '通用数据',
    keywords: /.*/,
    indicators: [
      { name: '数据总量', keywords: /.*/, expression: 'COUNT(*)', description: '数据记录总数', priority: 'p0' },
      { name: '平均值', keywords: /.*/, expression: 'AVG(数值字段)', description: '数值字段的平均值', priority: 'p1' },
    ],
    dimensions: ['时间', '类别', '状态'],
    suggestions: [
      { title: '数据质量提升', description: '检查缺失值和异常值，提升数据完整性', priority: 'medium' },
      { title: '趋势监控', description: '建立关键指标的趋势监控，及时发现异常', priority: 'medium' },
    ],
  },
];

function generateScenarioAnalysis(
  data: ParsedData,
  fieldStats: FieldStat[],
  _dataProfile: DeepAnalysis['dataProfile']
): ScenarioAnalysis | undefined {
  const { rows } = data;
  if (rows.length === 0 || fieldStats.length === 0) return undefined;

  const fieldTexts = fieldStats.map(f => f.field).join(' ');
  const sampleTexts = fieldStats.flatMap(f => f.sampleValues?.slice(0, 3) || []).join(' ');
  const combinedText = `${fieldTexts} ${sampleTexts}`;

  let bestScenario = SCENARIO_DEFINITIONS[SCENARIO_DEFINITIONS.length - 1];
  let bestScore = 0;

  for (const scenario of SCENARIO_DEFINITIONS) {
    if (scenario.id === 'general') continue;
    const match = combinedText.match(scenario.keywords);
    if (match) {
      const score = match.length;
      if (score > bestScore) {
        bestScore = score;
        bestScenario = scenario;
      }
    }
  }

  const matchedIndicators: typeof bestScenario.indicators = [];
  const matchedFieldNames = new Set<string>();

  for (const indicator of bestScenario.indicators) {
    for (const field of fieldStats) {
      const fieldText = `${field.field} ${(field.sampleValues || []).join(' ')}`;
      const fieldNameLower = field.field.toLowerCase();
      if (indicator.keywords.test(fieldText) || indicator.keywords.test(fieldNameLower)) {
        matchedIndicators.push(indicator);
        matchedFieldNames.add(field.field);
        break;
      }
    }
  }

  const recommendedDimensions = bestScenario.dimensions.filter(dim => {
    return fieldStats.some(f => {
      const fieldText = `${f.field} ${(f.sampleValues || []).join(' ')} ${f.type}`;
      return dim.split(/[/（]/).some(part => fieldText.includes(part.trim()));
    });
  });

  const finalDimensions = recommendedDimensions.length > 0 ? recommendedDimensions : bestScenario.dimensions;

  const confidence: ScenarioAnalysis['confidence'] = bestScore >= 3 ? 'high' : bestScore >= 1 ? 'medium' : 'low';

  const fallbackFields = matchedFieldNames.size === 0
    ? new Set(fieldStats.filter(f => f.type === 'number').map(f => f.field).slice(0, 3))
    : matchedFieldNames;

  const kpiRecommendations = (matchedIndicators.length > 0 ? matchedIndicators : bestScenario.indicators.slice(0, 2))
    .map(kpi => ({
      ...kpi,
      fieldRefs: Array.from(fallbackFields).slice(0, 3),
    }));

  return {
    detectedScenario: bestScenario.name,
    confidence,
    matchedIndicators: Array.from(matchedFieldNames),
    kpiRecommendations,
    recommendedDimensions: finalDimensions.slice(0, 5),
    industrySuggestions: bestScenario.suggestions,
  };
}
