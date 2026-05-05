/**
 * 数据分析引擎 - 数据清洗
 */
import type { ParsedData, CellValue } from './types';

export function cleanData(data: ParsedData, options: {
  removeDuplicates?: boolean;
  fillNulls?: boolean;
  nullFillValue?: CellValue;
  nullFillStrategy?: 'value' | 'mean' | 'median' | 'mode' | 'forward';
  outlierMethod?: 'iqr' | 'zscore' | 'none';
  outlierThreshold?: number;
  outlierAction?: 'remove' | 'mark' | 'replace';
}): ParsedData {
  let { rows } = data;

  // 1. 去重
  if (options.removeDuplicates) {
    const seen = new Set<string>();
    rows = rows.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // 2. 缺失值填充
  if (options.fillNulls) {
    const strategy = options.nullFillStrategy || 'value';
    rows = rows.map((row, rowIdx) => {
      const newRow = { ...row };
      data.headers.forEach(header => {
        if (newRow[header] === null || newRow[header] === undefined || newRow[header] === '') {
          switch (strategy) {
            case 'value':
              newRow[header] = options.nullFillValue ?? '';
              break;
            case 'mean': {
              const validNums = rows.map(row => Number(row[header])).filter(v => !isNaN(v));
              newRow[header] = validNums.length > 0 ? validNums.reduce((a, b) => a + b, 0) / validNums.length : 0;
              break;
            }
            case 'median': {
              const nums = rows.map(row => Number(row[header])).filter(v => !isNaN(v)).sort((a, b) => a - b);
              newRow[header] = nums.length > 0
                ? (nums.length % 2 === 0
                  ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
                  : nums[Math.floor(nums.length / 2)])
                : 0;
              break;
            }
            case 'mode': {
              const countMap = new Map<string, number>();
              rows.forEach(r => {
                const v = String(r[header]);
                if (v !== '' && v !== 'null' && v !== 'undefined') {
                  countMap.set(v, (countMap.get(v) || 0) + 1);
                }
              });
              let maxCount = 0; let modeValue = '';
              countMap.forEach((count, v) => {
                if (count > maxCount) { maxCount = count; modeValue = v; }
              });
              newRow[header] = (modeValue || options.nullFillValue) ?? '';
              break;
            }
            case 'forward': {
              for (let i = rowIdx - 1; i >= 0; i--) {
                const prev = rows[i]?.[header];
                if (prev !== null && prev !== undefined && prev !== '') {
                  newRow[header] = prev;
                  break;
                }
              }
              break;
            }
          }
        }
      });
      return newRow;
    });
  }

  // 3. 异常值检测与处理
  if (options.outlierMethod && options.outlierMethod !== 'none') {
    const threshold = options.outlierThreshold || (options.outlierMethod === 'iqr' ? 1.5 : 3);
    const action = options.outlierAction || 'mark';

    data.headers.forEach(header => {
      const values = rows.map(r => Number(r[header])).filter(v => !isNaN(v));
      if (values.length === 0) return;

      const isOutlier = options.outlierMethod === 'iqr'
        ? getIQROutlierChecker(values, threshold)
        : getZScoreOutlierChecker(values, threshold);

      rows = rows.map(row => {
        const val = Number(row[header]);
        if (isNaN(val) || !isOutlier(val)) return row;

        const newRow: Record<string, CellValue> = { ...row };
        switch (action) {
          case 'mark':
            newRow[header] = `⚠${val}`;
            return newRow;
          case 'replace': {
            const sorted = values.filter(v => !isOutlier(v)).sort((a, b) => a - b);
            newRow[header] = sorted.length > 0
              ? (sorted.length % 2 === 0
                ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
                : sorted[Math.floor(sorted.length / 2)])
              : val;
            return newRow;
          }
          case 'remove':
            return null as unknown as Record<string, CellValue>;
        }
        return row;
      }).filter((row): row is Record<string, CellValue> => row !== null);
    });
  }

  return {
    ...data,
    rows,
    rowCount: rows.length,
  };
}

/** IQR异常值检测器 */
export function getIQROutlierChecker(values: number[], multiplier: number): (v: number) => boolean {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;
  return (v: number) => v < lower || v > upper;
}

/** Z-score异常值检测器 */
export function getZScoreOutlierChecker(values: number[], threshold: number): (v: number) => boolean {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  if (std === 0) return () => false;
  return (v: number) => Math.abs((v - mean) / std) > threshold;
}
