/**
 * 数据分析引擎 - 数据质量报告
 */
import type { ParsedData, FieldStat, QualityReport } from './types';

export function generateQualityReport(data: ParsedData, fieldStats: Array<FieldStat & { numericStats?: { min: number; max: number; mean: number; std?: number } }>): QualityReport {
  const totalCells = data.rowCount * data.headers.length;
  const nullCells = fieldStats.reduce((sum, f) => sum + (f.nullCount || 0), 0);
  const missingRate = totalCells > 0 ? nullCells / totalCells : 0;

  const seen = new Set<string>();
  let dupes = 0;
  data.rows.forEach(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) dupes++;
    seen.add(key);
  });
  const duplicateRate = data.rowCount > 0 ? dupes / data.rowCount : 0;

  let outlierCount = 0;
  const fieldReports = fieldStats.map(f => {
    const issues: string[] = [];
    const fieldMissingRate = data.rowCount > 0 ? (f.nullCount || 0) / data.rowCount : 0;

    if (f.type === 'number' && f.numericStats && f.numericStats.std && f.numericStats.std > 0) {
      const mean = f.numericStats.mean;
      const std = f.numericStats.std;
      const outlierThreshold = 3;
      const isOutlier = (v: number) => Math.abs((v - mean) / std) > outlierThreshold;
      let fieldOutliers = 0;
      data.rows.forEach(row => {
        const val = Number(row[f.field]);
        if (!isNaN(val) && isOutlier(val)) fieldOutliers++;
      });
      outlierCount += fieldOutliers;

      if (fieldOutliers > 0) issues.push(`${fieldOutliers}个异常值`);
    }

    if (fieldMissingRate > 0.2) issues.push(`缺失率${(fieldMissingRate * 100).toFixed(1)}%`);
    if (f.uniqueCount !== undefined && data.rowCount > 0) {
      const uniqueRate = f.uniqueCount / data.rowCount;
      if (f.type === 'string' && uniqueRate < 0.01) issues.push('低区分度');
    }

    const score = Math.max(0, 100 - fieldMissingRate * 50 - (issues.length > 0 ? 15 : 0));

    return {
      field: f.field,
      type: f.type,
      missingRate: fieldMissingRate,
      uniqueRate: data.rowCount > 0 ? (f.uniqueCount || 0) / data.rowCount : 0,
      outlierCount: 0,
      score,
      issues,
    };
  });

  const outlierRate = data.rowCount > 0 ? outlierCount / data.rowCount : 0;
  const completeness = Math.max(0, 100 - missingRate * 100);
  const consistency = Math.max(0, 100 - duplicateRate * 100);
  const quality = Math.max(0, 100 - missingRate * 40 - duplicateRate * 30 - outlierRate * 30);
  const usability = data.rowCount > 10 && data.headers.length > 2 ? 100 : 50;
  const overallScore = Math.round(completeness * 0.3 + consistency * 0.2 + quality * 0.3 + usability * 0.2);

  return {
    overallScore,
    completeness: Math.round(completeness),
    consistency: Math.round(consistency),
    quality: Math.round(quality),
    usability: Math.round(usability),
    missingRate,
    duplicateRate,
    outlierRate,
    fieldReports,
  };
}
