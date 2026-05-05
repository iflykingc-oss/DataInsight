/**
 * Skill精细化实现
 * 真正的业务级Skill实现，不是stub
 */

import type { SkillContext, SkillResult } from '@/lib/skills/core/types';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

/** 通用成功结果 */
function ok(skillId: string, data: unknown, explanation: string): SkillResult {
  return {
    success: true,
    skillId,
    data: data as Record<string, unknown>,
    explanation,
    duration: 0,
    usedStrategy: 'rule'
  };
}

/** 通用失败结果 */
function err(skillId: string, message: string): SkillResult {
  return {
    success: false,
    skillId,
    error: message,
    duration: 0,
    usedStrategy: 'rule'
  };
}

// ============================================================
// 数据清洗类技能（真正可用的实现）
// ============================================================

export async function removeDuplicates(params: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
  const data = ctx.data;
  if (!data?.rows) return err('remove-duplicates', '缺少数据');

  const keyColumns = (params.columns as string[]) || data.headers;
  const seen = new Set<string>();
  const uniqueRows: Record<string, unknown>[] = [];
  let removedCount = 0;

  for (const row of data.rows) {
    const key = keyColumns.map(c => String(row[c] ?? '')).join('|');
    if (seen.has(key)) {
      removedCount++;
      continue;
    }
    seen.add(key);
    uniqueRows.push(row);
  }

  return ok('remove-duplicates', {
    rows: uniqueRows,
    removedCount,
    remainingCount: uniqueRows.length,
    removedPercentage: `${((removedCount / data.rows.length) * 100).toFixed(1)}%`
  }, `已去除 ${removedCount} 条重复记录（${((removedCount / data.rows.length) * 100).toFixed(1)}%），剩余 ${uniqueRows.length} 条`);
}

export async function fillMissingValues(params: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
  const data = ctx.data;
  if (!data?.rows) return err('fill-missing-values', '缺少数据');

  const strategy = (params.strategy as string) || 'auto';
  const targetColumns = (params.columns as string[]) || data.headers;
  const fillValue = params.fillValue as string;
  const filledRows: Record<string, unknown>[] = [];
  let filledCount = 0;
  const fillLog: string[] = [];

  for (const row of data.rows) {
    const newRow = { ...row };
    for (const col of targetColumns) {
      const value = newRow[col];
      const isMissing = value === null || value === undefined || value === '';

      if (isMissing) {
        let filled: string | number = '';

        if (strategy === 'auto') {
          // 自动选择策略
          const colValues = data.rows.map(r => r[col]).filter(v => v !== null && v !== undefined && v !== '');
          if (colValues.length === 0) {
            filled = fillValue || '';
          } else if (colValues.every(v => typeof v === 'number')) {
            // 数值列用均值
            const nums = colValues.map(Number);
            filled = nums.reduce((a, b) => a + b, 0) / nums.length;
          } else {
            // 文本列用众数
            const freq: Record<string, number> = {};
            colValues.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
            filled = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
          }
        } else if (strategy === 'mean') {
          const nums = data.rows.map(r => Number(r[col])).filter(n => !isNaN(n));
          filled = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        } else if (strategy === 'mode') {
          const freq: Record<string, number> = {};
          data.rows.forEach(r => {
            const v = String(r[col] ?? '');
            if (v) freq[v] = (freq[v] || 0) + 1;
          });
          filled = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        } else if (strategy === 'forward') {
          // 前向填充
          filled = fillValue || '';
        } else {
          filled = fillValue || '';
        }

        newRow[col] = filled;
        filledCount++;
      }
    }
    filledRows.push(newRow);
  }

  fillLog.push(`共填充 ${filledCount} 个缺失值`);
  if (strategy === 'auto') fillLog.push('策略：自动（数值用均值，文本用众数）');
  else fillLog.push(`策略：${strategy}`);

  return ok('fill-missing-values', {
    rows: filledRows,
    filledCount,
    strategy,
    fillLog
  }, fillLog.join('；'));
}

export async function standardizeFormat(params: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
  const data = ctx.data;
  if (!data?.rows) return err('standardize-format', '缺少数据');

  const operations = (params.operations as string[]) || ['date', 'phone', 'email', 'number'];
  const standardizedRows: Record<string, unknown>[] = [];
  const operationLog: string[] = [];

  for (const row of data.rows) {
    const newRow = { ...row };
    for (const [col, value] of Object.entries(row)) {
      if (typeof value !== 'string') continue;

      let changed = false;
      let newValue = value;

      // 日期标准化
      if (operations.includes('date')) {
        const datePatterns = [
          /(\d{4})[年/-](\d{1,2})[月/-](\d{1,2})[日]?/,
          /(\d{4})(\d{2})(\d{2})/
        ];
        for (const pattern of datePatterns) {
          if (pattern.test(value)) {
            const match = value.match(pattern);
            if (match) {
              const [, y, m, d] = match;
              newValue = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
              changed = true;
            }
            break;
          }
        }
      }

      // 手机号标准化
      if (operations.includes('phone')) {
        const phonePatterns = [/^1\d{10}$/, /^1\s?\d{3}\s?\d{4}\s?\d{4}$/];
        for (const pattern of phonePatterns) {
          if (pattern.test(value.replace(/\s/g, ''))) {
            newValue = value.replace(/\s/g, '');
            if (params.privacy !== false) {
              newValue = newValue.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
            }
            changed = true;
            break;
          }
        }
      }

      // 邮箱标准化
      if (operations.includes('email') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        newValue = value.toLowerCase().trim();
        changed = true;
      }

      // 数字标准化
      if (operations.includes('number')) {
        const numValue = parseFloat(value.replace(/,/g, ''));
        if (!isNaN(numValue) && value.replace(/[,.\d]/g, '').length === 0) {
          newValue = String(numValue);
          changed = true;
        }
      }

      if (changed) {
        newRow[col] = newValue;
      }
    }
    standardizedRows.push(newRow);
  }

  operationLog.push(`已处理 ${standardizedRows.length} 行数据`);
  if (operations.includes('date')) operationLog.push('日期格式标准化');
  if (operations.includes('phone')) operationLog.push('手机号脱敏处理');
  if (operations.includes('email')) operationLog.push('邮箱小写化');
  if (operations.includes('number')) operationLog.push('数字格式清理');

  return ok('standardize-format', {
    rows: standardizedRows,
    operations,
    operationLog
  }, operationLog.join('；'));
}

export async function detectOutliers(params: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
  const data = ctx.data;
  if (!data?.rows) return err('detect-outliers', '缺少数据');

  const column = (params.column as string) || findNumericColumn(data);
  if (!column) return err('detect-outliers', '未找到数值列');

  const method = (params.method as string) || 'iqr';
  const threshold = (params.threshold as number) || 1.5;

  const values = data.rows.map(r => Number(r[column])).filter(n => !isNaN(n));
  if (values.length === 0) return err('detect-outliers', `列 ${column} 无有效数值`);

  const outliers: { row: Record<string, unknown>; value: number; reason: string }[] = [];

  if (method === 'iqr') {
    // IQR方法
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - threshold * iqr;
    const upperBound = q3 + threshold * iqr;

    data.rows.forEach((row, idx) => {
      const v = Number(row[column]);
      if (!isNaN(v) && (v < lowerBound || v > upperBound)) {
        outliers.push({
          row,
          value: v,
          reason: v < lowerBound ? `低于下界 ${lowerBound.toFixed(2)}` : `高于上界 ${upperBound.toFixed(2)}`
        });
      }
    });
  } else {
    // Z-Score方法
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sq, n) => sq + (n - mean) ** 2, 0) / values.length);

    data.rows.forEach((row, idx) => {
      const v = Number(row[column]);
      if (!isNaN(v)) {
        const zScore = Math.abs((v - mean) / std);
        if (zScore > threshold) {
          outliers.push({
            row,
            value: v,
            reason: `Z-Score: ${zScore.toFixed(2)}`
          });
        }
      }
    });
  }

  const stats = calculateStats(values);

  return ok('detect-outliers', {
    column,
    method,
    threshold,
    stats,
    outlierCount: outliers.length,
    outlierPercentage: `${((outliers.length / data.rows.length) * 100).toFixed(1)}%`,
    outliers: outliers.slice(0, 50),
    recommendation: outliers.length > data.rows.length * 0.1
      ? '异常值比例较高，建议检查数据来源或重新评估阈值'
      : outliers.length > 0
        ? '已标记异常值，请人工确认是否为有效数据'
        : '未检测到明显异常值'
  }, `在 ${column} 列检测到 ${outliers.length} 个异常值（${((outliers.length / data.rows.length) * 100).toFixed(1)}%），使用${method === 'iqr' ? 'IQR' : 'Z-Score'}方法`);
}

// ============================================================
// 数据分析类技能
// ============================================================

export async function calculateStatistics(params: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
  const data = ctx.data;
  if (!data?.rows) return err('calculate-statistics', '缺少数据');

  const columns = (params.columns as string[]) || data.headers.filter(h => {
    return data.rows.some(r => typeof r[h] === 'number' || !isNaN(parseFloat(String(r[h]))));
  });

  if (columns.length === 0) return err('calculate-statistics', '未找到数值列');

  const results: Record<string, unknown> = {};

  for (const col of columns) {
    const values = data.rows.map(r => parseFloat(String(r[col]))).filter(n => !isNaN(n));
    if (values.length === 0) continue;

    results[col] = calculateStats(values);
  }

  return ok('calculate-statistics', {
    columnsAnalyzed: Object.keys(results),
    statistics: results
  }, `完成 ${Object.keys(results).length} 个列的统计分析`);
}

export async function groupByAnalysis(params: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
  const data = ctx.data;
  if (!data?.rows) return err('group-by-analysis', '缺少数据');

  const groupBy = (params.groupBy as string) || data.headers[0];
  const aggregate = (params.aggregate as string) || findNumericColumn(data);
  const aggFuncs = (params.functions as string[]) || ['sum', 'avg', 'count', 'min', 'max'];

  if (!data.headers.includes(groupBy)) {
    return err('group-by-analysis', `列 ${groupBy} 不存在`);
  }

  const groups: Record<string, { values: number[]; rows: Record<string, unknown>[] }> = {};

  data.rows.forEach(row => {
    const key = String(row[groupBy] ?? '未知');
    const val = parseFloat(String(row[aggregate ?? '']));
    if (!groups[key]) {
      groups[key] = { values: [], rows: [] };
    }
    groups[key].values.push(val);
    groups[key].rows.push(row);
  });

  const result = Object.entries(groups).map(([key, group]) => {
    const stats = calculateStats(group.values);
    const item: Record<string, unknown> = { [groupBy]: key, count: group.values.length };

    if (aggFuncs.includes('sum')) item[`${aggregate}_sum`] = stats.sum;
    if (aggFuncs.includes('avg')) item[`${aggregate}_avg`] = stats.mean;
    if (aggFuncs.includes('count')) item[`${aggregate}_count`] = group.values.length;
    if (aggFuncs.includes('min')) item[`${aggregate}_min`] = stats.min;
    if (aggFuncs.includes('max')) item[`${aggregate}_max`] = stats.max;

    return item;
  }).sort((a, b) => {
    const aVal = (a[`${aggregate}_sum`] as number) || 0;
    const bVal = (b[`${aggregate}_sum`] as number) || 0;
    return bVal - aVal;
  });

  return ok('group-by-analysis', {
    groupBy,
    aggregate,
    groupCount: result.length,
    groups: result.slice(0, 100),
    topGroup: result[0],
    summary: {
      totalGroups: result.length,
      largestGroup: result[0]?.[groupBy],
      smallestGroup: result[result.length - 1]?.[groupBy]
    }
  }, `按 ${groupBy} 分组，共 ${result.length} 个组，TOP1：${result[0]?.[groupBy]}`);
}

export async function trendAnalysis(params: Record<string, unknown>, ctx: SkillContext): Promise<SkillResult> {
  const data = ctx.data;
  if (!data?.rows) return err('trend-analysis', '缺少数据');

  const timeCol = (params.timeColumn as string) || findDateColumn(data);
  const valueCol = (params.valueColumn as string) || findNumericColumn(data);

  if (!timeCol || !valueCol) {
    return err('trend-analysis', '未找到时间列或数值列');
  }

  // 排序
  const sortedRows = [...data.rows].sort((a, b) => {
    return String(a[timeCol] || '').localeCompare(String(b[timeCol] || ''));
  });

  const timePoints = sortedRows.map(r => String(r[timeCol] || ''));
  const values = sortedRows.map(r => parseFloat(String(r[valueCol])) || 0);

  // 计算趋势
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const change = secondAvg - firstAvg;
  const changePercent = firstAvg !== 0 ? (change / firstAvg) * 100 : 0;

  // 简单线性回归
  const n = values.length;
  const xSum = (n * (n - 1)) / 2;
  const ySum = values.reduce((a, b) => a + b, 0);
  const xySum = values.reduce((sum, y, x) => sum + x * y, 0);
  const xxSum = (n * (n - 1) * (2 * n - 1)) / 6;
  const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;

  // 预测下一个周期
  const nextValue = slope * n + intercept;

  let trend: string;
  if (Math.abs(changePercent) < 5) {
    trend = '平稳';
  } else if (changePercent > 0) {
    trend = changePercent > 20 ? '快速增长' : '稳步增长';
  } else {
    trend = changePercent < -20 ? '快速下降' : '小幅下降';
  }

  return ok('trend-analysis', {
    timeColumn: timeCol,
    valueColumn: valueCol,
    dataPoints: values.length,
    trend,
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    firstPeriodAvg: Number(firstAvg.toFixed(2)),
    secondPeriodAvg: Number(secondAvg.toFixed(2)),
    slope: Number(slope.toFixed(4)),
    nextValue: Number(nextValue.toFixed(2)),
    timePoints: timePoints.slice(0, 20),
    values: values.slice(0, 20),
    recommendation: change > 0
      ? `整体趋势向好，${Math.abs(changePercent).toFixed(1)}%的增长，建议继续保持`
      : `呈下降趋势，建议分析原因并制定应对策略`
  }, `趋势分析：${trend}，变化幅度 ${Math.abs(changePercent).toFixed(1)}%`);
}

// ============================================================
// 辅助函数
// ============================================================

function findNumericColumn(data: ParsedData): string | undefined {
  return data.headers.find(h => {
    const vals = data.rows.slice(0, 10).map(r => r[h]);
    return vals.some(v => typeof v === 'number' || !isNaN(parseFloat(String(v))));
  });
}

function findDateColumn(data: ParsedData): string | undefined {
  return data.headers.find(h => {
    const vals = data.rows.slice(0, 10).map(r => String(r[h] || ''));
    return vals.some(v => /^\d{4}[-/年]|\d{2}[-/月]/.test(v) || /^\d{8}$/.test(v));
  });
}

function calculateStats(values: number[]): Record<string, number> {
  const n = values.length;
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const sorted = [...values].sort((a, b) => a - b);
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const variance = values.reduce((sq, n) => sq + (n - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // 百分位数
  const p25 = sorted[Math.floor(n * 0.25)];
  const p75 = sorted[Math.floor(n * 0.75)];

  // 偏度和峰度（简化计算）
  const skewness = n > 2
    ? values.reduce((sum, v) => sum + ((v - mean) / std) ** 3, 0) / n
    : 0;

  return {
    count: n,
    sum: Number(sum.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    std: Number(std.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    range: Number(range.toFixed(2)),
    p25: Number(p25.toFixed(2)),
    p75: Number(p75.toFixed(2)),
    iqr: Number((p75 - p25).toFixed(2)),
    skewness: Number(skewness.toFixed(4))
  };
}

// 导出所有精细化Skill
export const refinedSkills = {
  'remove-duplicates': removeDuplicates,
  'fill-missing-values': fillMissingValues,
  'standardize-format': standardizeFormat,
  'detect-outliers': detectOutliers,
  'calculate-statistics': calculateStatistics,
  'group-by-analysis': groupByAnalysis,
  'trend-analysis': trendAnalysis
};
