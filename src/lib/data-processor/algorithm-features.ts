/**
 * 算法能力释放 — 特征提取 + 建议输出
 * 
 * 核心思想：算法不仅输出计算结果，还输出"发现了什么特征"和"建议 LLM 怎么做"
 * 这样 LLM 就不是盲目分析，而是基于算法特征做精准决策
 * 
 * 使用流程：
 * 1. deep-analysis 生成 DeepAnalysis（纯算法结果）
 * 2. extractAlgorithmOutputs 将 DeepAnalysis 转为 AlgorithmOutput[]（含 features+suggestions）
 * 3. AlgorithmOutput 传给 LLM，LLM 基于 features+suggestions 做决策
 */

import type { DeepAnalysis, FieldStat } from './types';
import type { AlgorithmOutput } from '../analysis/industry-templates';

/**
 * 从 DeepAnalysis 提取算法特征和建议
 * 每个分析模块产出一个 AlgorithmOutput
 */
export function extractAlgorithmOutputs(
  deepAnalysis: DeepAnalysis,
  fieldStats: FieldStat[],
): AlgorithmOutput[] {
  const outputs: AlgorithmOutput[] = [];

  // 1. 健康评分模块
  outputs.push(extractHealthFeatures(deepAnalysis));

  // 2. 关键发现模块
  outputs.push(extractFindingFeatures(deepAnalysis));

  // 3. 相关性模块
  if (deepAnalysis.correlations.length > 0) {
    outputs.push(extractCorrelationFeatures(deepAnalysis));
  }

  // 4. 分布模块
  if (deepAnalysis.distributions.length > 0) {
    outputs.push(extractDistributionFeatures(deepAnalysis));
  }

  // 5. 趋势模块
  if (deepAnalysis.trends.length > 0) {
    outputs.push(extractTrendFeatures(deepAnalysis));
  }

  // 6. 异常检测模块
  outputs.push(extractAnomalyFeatures(deepAnalysis, fieldStats));

  // 7. 归因模块
  if (deepAnalysis.attribution) {
    outputs.push(extractAttributionFeatures(deepAnalysis));
  }

  return outputs;
}

/** 生成算法特征摘要文本（供 Prompt 注入） */
export function summarizeAlgorithmFeatures(outputs: AlgorithmOutput[]): string {
  return outputs
    .filter(o => o.success && Object.keys(o.features).length > 0)
    .map(o => {
      const featureParts = Object.entries(o.features)
        .map(([k, v]) => {
          if (typeof v === 'object' && v !== null) return `${k}: ${JSON.stringify(v)}`;
          return `${k}: ${v}`;
        })
        .join('；');
      return `【${o.module}】${featureParts}`;
    })
    .join('\n');
}

/** 生成算法建议摘要文本（供 Prompt 注入） */
export function summarizeAlgorithmSuggestions(outputs: AlgorithmOutput[]): string {
  return outputs
    .filter(o => o.success && o.suggestions)
    .map(o => {
      const parts: string[] = [];
      if (o.suggestions.adjustParams && Object.keys(o.suggestions.adjustParams).length > 0) {
        parts.push(`参数建议: ${JSON.stringify(o.suggestions.adjustParams)}`);
      }
      if (o.suggestions.nextModules && o.suggestions.nextModules.length > 0) {
        parts.push(`建议后续执行: ${o.suggestions.nextModules.join('→')}`);
      }
      if (o.suggestions.dataWarning && o.suggestions.dataWarning.length > 0) {
        parts.push(`数据警告: ${o.suggestions.dataWarning.join('；')}`);
      }
      return parts.length > 0 ? `【${o.module}】${parts.join('；')}` : '';
    })
    .filter(Boolean)
    .join('\n');
}


// ========== 各模块特征提取 ==========

function extractHealthFeatures(deep: DeepAnalysis): AlgorithmOutput {
  const hs = deep.healthScore;
  const weakAreas: string[] = [];
  if (hs.completeness < 60) weakAreas.push('数据完整性不足');
  if (hs.consistency < 60) weakAreas.push('数据一致性不足');
  if (hs.quality < 60) weakAreas.push('数据质量偏低');
  if (hs.usability < 60) weakAreas.push('数据可用性有限');

  return {
    module: 'health',
    success: true,
    data: hs,
    features: {
      overallScore: hs.overall,
      level: hs.overall >= 80 ? '良好' : hs.overall >= 60 ? '一般' : '较差',
      weakAreas,
      strongAreas: [
        hs.completeness >= 80 ? '数据完整性' : '',
        hs.consistency >= 80 ? '数据一致性' : '',
        hs.quality >= 80 ? '数据质量' : '',
        hs.usability >= 80 ? '数据可用性' : '',
      ].filter(Boolean),
    },
    suggestions: {
      nextModules: hs.overall < 70 ? ['quality'] : [],
      dataWarning: weakAreas.length > 0 ? [`数据健康评分${hs.overall}分，${weakAreas.join('，')}，建议先进行数据清洗`] : [],
    },
  };
}

function extractFindingFeatures(deep: DeepAnalysis): AlgorithmOutput {
  const criticalFindings = deep.keyFindings.filter(f => f.severity === 'critical');
  const businessInsights = deep.keyFindings.filter(f => f.isBusinessInsight);
  const highConfidenceFindings = deep.keyFindings.filter(f => f.confidence >= 80);

  return {
    module: 'findings',
    success: true,
    data: deep.keyFindings,
    features: {
      totalFindings: deep.keyFindings.length,
      criticalCount: criticalFindings.length,
      businessInsightCount: businessInsights.length,
      highConfidenceCount: highConfidenceFindings.length,
      topIssues: criticalFindings.slice(0, 3).map(f => f.title),
      topBusinessInsights: businessInsights.slice(0, 3).map(f => f.title),
    },
    suggestions: {
      nextModules: criticalFindings.length > 0 ? ['attribution'] : [],
      adjustParams: businessInsights.length === 0 ? { needBusinessAnalysis: true } : {},
      dataWarning: criticalFindings.map(f => `严重问题: ${f.title}`),
    },
  };
}

function extractCorrelationFeatures(deep: DeepAnalysis): AlgorithmOutput {
  const strongCorrs = deep.correlations.filter(c => c.strength === 'strong');
  const moderateCorrs = deep.correlations.filter(c => c.strength === 'moderate');

  return {
    module: 'correlation',
    success: true,
    data: deep.correlations,
    features: {
      totalPairs: deep.correlations.length,
      strongCount: strongCorrs.length,
      moderateCount: moderateCorrs.length,
      topCorrelations: strongCorrs.slice(0, 5).map(c =>
        `${c.field1}↔${c.field2}(${c.direction === 'positive' ? '正' : '负'}相关, r=${c.coefficient.toFixed(3)})`
      ),
    },
    suggestions: {
      nextModules: strongCorrs.length > 0 ? ['dimension'] : [],
      adjustParams: strongCorrs.length > 3 ? { correlationThreshold: 0.6 } : {},
    },
  };
}

function extractDistributionFeatures(deep: DeepAnalysis): AlgorithmOutput {
  const skewedFields = deep.distributions.filter(d => d.type === 'skewed_left' || d.type === 'skewed_right');
  const bimodalFields = deep.distributions.filter(d => d.type === 'bimodal');

  return {
    module: 'distribution',
    success: true,
    data: deep.distributions,
    features: {
      totalFields: deep.distributions.length,
      skewedCount: skewedFields.length,
      bimodalCount: bimodalFields.length,
      skewedFields: skewedFields.map(d => `${d.field}(${d.type}, 偏度=${d.skewness.toFixed(2)})`),
      bimodalFields: bimodalFields.map(d => `${d.field}(双峰分布，可能存在两个子群体)`),
    },
    suggestions: {
      nextModules: bimodalFields.length > 0 ? ['grouping'] : [],
      dataWarning: skewedFields.length > 0
        ? [`${skewedFields.length}个字段分布偏斜，均值可能不代表典型值，建议用中位数`]
        : [],
    },
  };
}

function extractTrendFeatures(deep: DeepAnalysis): AlgorithmOutput {
  const upTrends = deep.trends.filter(t => t.direction === 'up');
  const downTrends = deep.trends.filter(t => t.direction === 'down');
  const volatileTrends = deep.trends.filter(t => t.direction === 'volatile');

  return {
    module: 'trend',
    success: true,
    data: deep.trends,
    features: {
      totalFields: deep.trends.length,
      upCount: upTrends.length,
      downCount: downTrends.length,
      volatileCount: volatileTrends.length,
      topGrowing: upTrends.slice(0, 3).map(t => `${t.field}(+${(t.changeRate * 100).toFixed(1)}%)`),
      topDeclining: downTrends.slice(0, 3).map(t => `${t.field}(-${(Math.abs(t.changeRate) * 100).toFixed(1)}%)`),
      volatileFields: volatileTrends.map(t => t.field),
    },
    suggestions: {
      nextModules: downTrends.length > 0 ? ['attribution'] : volatileTrends.length > 0 ? ['outlier'] : [],
      adjustParams: volatileTrends.length > 0 ? { outlierSensitivity: 'high' as const } : {},
    },
  };
}

function extractAnomalyFeatures(deep: DeepAnalysis, fieldStats: FieldStat[]): AlgorithmOutput {
  const anomalyFields = new Set(fieldStats.filter(f => f.type === 'number' && f.numericStats).map(f => f.field));
  const criticalFindings = deep.keyFindings.filter(f => f.category === 'anomaly' && f.severity === 'critical');
  const warningFindings = deep.keyFindings.filter(f => f.category === 'anomaly' && f.severity === 'warning');

  return {
    module: 'outlier',
    success: true,
    data: { criticalFindings, warningFindings },
    features: {
      criticalAnomalyCount: criticalFindings.length,
      warningAnomalyCount: warningFindings.length,
      affectedFields: [...new Set(criticalFindings.map(f => f.relatedFields).flat())].filter(f => anomalyFields.has(f)),
      anomalyRate: fieldStats.length > 0
        ? ((criticalFindings.length + warningFindings.length) / anomalyFields.size * 100).toFixed(1)
        : '0',
    },
    suggestions: {
      nextModules: criticalFindings.length > 0 ? ['attribution'] : [],
      adjustParams: criticalFindings.length > 3 ? { outlierSensitivity: 'low' as const } : {},
      dataWarning: criticalFindings.slice(0, 3).map(f => f.title),
    },
  };
}

function extractAttributionFeatures(deep: DeepAnalysis): AlgorithmOutput {
  const attr = deep.attribution;
  if (!attr) {
    return { module: 'attribution', success: false, data: null, features: {}, suggestions: {} };
  }

  const keyDrivers = attr.dimensionBreakdowns
    .map(db => db.keyDriver)
    .filter(Boolean);

  return {
    module: 'attribution',
    success: true,
    data: attr,
    features: {
      anomalyMetricsCount: attr.anomalyMetrics.length,
      keyDrivers,
      rootCausesCount: attr.rootCauses.length,
      topRootCauses: attr.rootCauses.slice(0, 3).map(rc => `${rc.metric}: ${rc.cause}(置信度${rc.confidence})`),
    },
    suggestions: {
      nextModules: [],
      dataWarning: attr.anomalyMetrics
        .filter(m => m.severity === 'high')
        .map(m => `${m.field}${m.direction === 'spike_up' ? '激增' : '骤降'}${Math.abs(m.changeRate).toFixed(1)}%`),
    },
  };
}
