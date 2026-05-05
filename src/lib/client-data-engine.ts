/**
 * 客户端数据引擎
 * 数据零存储原则：所有数据解析、清洗、统计、分析均在浏览器端完成
 * 服务端不接收文件、不落地业务数据
 */

import type { ParsedData, CellValue, FieldStat, Summary, Anomaly, DataAnalysis } from './data-processor/types';

// ============================================================
// 1. 前端文件解析（替代服务端 /api/upload）
// ============================================================

export async function parseFileClient(file: File, onProgress?: (p: number) => void): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv' || extension === 'txt') {
    return parseCSVClient(file, onProgress);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcelClient(file, onProgress);
  }

  throw new Error(`不支持的文件格式: ${extension}`);
}

async function parseCSVClient(file: File, onProgress?: (p: number) => void): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 50));
      }
    };

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());

        if (lines.length === 0) throw new Error('文件为空');

        const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
        const rows: Record<string, CellValue>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const row: Record<string, CellValue> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] ?? null;
          });
          rows.push(row);

          if (onProgress && i % 100 === 0) {
            onProgress(50 + Math.round((i / lines.length) * 50));
          }
        }

        if (onProgress) onProgress(100);

        resolve({
          headers,
          rows,
          fileName: file.name,
          rowCount: rows.length,
          columnCount: headers.length,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('CSV解析失败'));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function parseExcelClient(file: File, onProgress?: (p: number) => void): Promise<ParsedData> {
  const XLSX = await import('xlsx');

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 40));
      }
    };

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });

        if (onProgress) onProgress(50);

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

        if (onProgress) onProgress(80);

        const headers = jsonData.length > 0 ? Object.keys(jsonData[0] as object) : [];
        const rows = jsonData as Record<string, CellValue>[];

        if (onProgress) onProgress(100);

        resolve({
          headers,
          rows,
          fileName: file.name,
          sheetNames: workbook.SheetNames,
          rowCount: rows.length,
          columnCount: headers.length,
        });
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Excel解析失败'));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

// ============================================================
// 2. 确定性字段分析（替代服务端 /api/analyze 的基础部分）
// ============================================================

export function analyzeFieldsClient(data: ParsedData): FieldStat[] {
  const { headers, rows } = data;

  const idPatterns = [
    /^id$/i, /^编号$/i, /序号/i, /^no\.?$/i, /^no$/i,
    /^serial$/i, /^序列$/i, /^index$/i, /^idx$/i,
    /^code$/i, /^编码$/i, /^code_?no\.?$/i,
    /^num$/i, /^n_?o\.?$/i, /^order_?id$/i, /^order_?no$/i,
    /^流水号$/i, /^单号$/i, /^订单号$/i, /^记录_?id$/i,
    /^user_?id$/i, /^customer_?id$/i, /^product_?id$/i,
    /^主键$/i, /^外键$/i, /^key$/i, /^pk$/i, /^fk$/i
  ];

  function isAutoIncrementSequence(values: CellValue[]): boolean {
    const nums = values
      .filter(v => v !== null && v !== undefined && v !== '')
      .map(v => Number(v))
      .filter(n => !isNaN(n));
    if (nums.length < 5) return false;
    const sorted = [...nums].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    if (max - min > nums.length * 2) return false;
    let consecutiveCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] <= 2) consecutiveCount++;
    }
    const consecutiveRatio = consecutiveCount / (sorted.length - 1);
    return consecutiveRatio > 0.9 && Math.abs(max - min - nums.length) < nums.length * 0.3;
  }

  return headers.map(field => {
    const values = rows.map(row => row[field]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNullValues.map(v => String(v)));

    const nameMatchesId = idPatterns.some(p => p.test(field));
    const highCardinality = nonNullValues.length >= 10 && uniqueValues.size > nonNullValues.length * 0.9;
    const isSequential = nameMatchesId ? false : isAutoIncrementSequence(values);
    const fieldIsId = nameMatchesId || highCardinality || isSequential;

    let type: 'string' | 'number' | 'date' | 'mixed' | 'id' = 'string';
    const numericCount = nonNullValues.filter(v => !isNaN(Number(v)) && String(v).trim() !== '').length;
    const dateCount = nonNullValues.filter(v => isDateValue(v)).length;

    if (fieldIsId) {
      type = 'id';
    } else if (numericCount > nonNullValues.length * 0.8) {
      type = 'number';
    } else if (dateCount > nonNullValues.length * 0.8) {
      type = 'date';
    } else if (numericCount > 0 && numericCount < nonNullValues.length * 0.8) {
      type = 'mixed';
    }

    let numericStats: FieldStat['numericStats'] = undefined;
    if (type === 'number') {
      const nums = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
      if (nums.length > 0) {
        nums.sort((a, b) => a - b);
        numericStats = {
          min: nums[0],
          max: nums[nums.length - 1],
          mean: nums.reduce((a, b) => a + b, 0) / nums.length,
          median: nums.length % 2 === 0
            ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
            : nums[Math.floor(nums.length / 2)],
          sum: nums.reduce((a, b) => a + b, 0)
        };
      }
    }

    const topValues = type === 'string' || type === 'id'
      ? computeTopValues(nonNullValues, 5)
      : undefined;

    return {
      field,
      type,
      count: values.length,
      nullCount: values.length - nonNullValues.length,
      uniqueCount: uniqueValues.size,
      sampleValues: nonNullValues.slice(0, 5),
      numericStats,
      ...(numericStats ? {
        min: numericStats.min,
        max: numericStats.max,
        mean: numericStats.mean,
        sum: numericStats.sum
      } : {}),
      topValues,
      isIdField: fieldIsId
    };
  });
}

function isDateValue(value: CellValue): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (typeof value === 'number' && value > 3000 && value < 100000) return true;
  if (typeof value === 'string') {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/,
    ];
    return datePatterns.some(p => p.test(value));
  }
  return false;
}

function computeTopValues(values: CellValue[], limit: number): Array<{ value: string; count: number; percentage: number }> {
  const countMap = new Map<string, number>();
  values.forEach(v => {
    const key = String(v);
    countMap.set(key, (countMap.get(key) || 0) + 1);
  });

  const total = values.length;
  return Array.from(countMap.entries())
    .map(([value, count]) => ({ value, count, percentage: (count / total) * 100 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ============================================================
// 3. 确定性数据清洗（替代服务端 /api/data-clean）
// ============================================================

export interface CleanOptions {
  removeDuplicates?: boolean;
  fillNulls?: boolean;
  nullFillStrategy?: 'value' | 'mean' | 'median' | 'mode' | 'forward';
  nullFillValue?: CellValue;
  outlierMethod?: 'iqr' | 'zscore' | 'none';
  outlierThreshold?: number;
  outlierAction?: 'mark' | 'replace' | 'remove';
}

export function cleanDataClient(data: ParsedData, options: CleanOptions): ParsedData {
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
        if (isNullValue(newRow[header])) {
          switch (strategy) {
            case 'value':
              newRow[header] = options.nullFillValue ?? '';
              break;
            case 'mean': {
              const validNums = rows.map(r => Number(r[header])).filter(v => !isNaN(v));
              newRow[header] = validNums.length > 0 ? validNums.reduce((a, b) => a + b, 0) / validNums.length : 0;
              break;
            }
            case 'median': {
              const nums = rows.map(r => Number(r[header])).filter(v => !isNaN(v)).sort((a, b) => a - b);
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
                if (!isNullValue(r[header])) {
                  countMap.set(v, (countMap.get(v) || 0) + 1);
                }
              });
              let maxCount = 0; let modeValue = '';
              countMap.forEach((count, v) => {
                if (count > maxCount) { maxCount = count; modeValue = v; }
              });
              newRow[header] = modeValue || options.nullFillValue || '';
              break;
            }
            case 'forward': {
              for (let i = rowIdx - 1; i >= 0; i--) {
                const prev = rows[i]?.[header];
                if (!isNullValue(prev)) {
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

  // 3. 异常值处理
  if (options.outlierMethod && options.outlierMethod !== 'none') {
    const threshold = options.outlierThreshold || (options.outlierMethod === 'iqr' ? 1.5 : 3);
    const action = options.outlierAction || 'mark';

    data.headers.forEach(header => {
      const values = rows.map(r => Number(r[header])).filter(v => !isNaN(v));
      if (values.length === 0) return;

      const isOutlier = options.outlierMethod === 'iqr'
        ? createIQROutlierChecker(values, threshold)
        : createZScoreOutlierChecker(values, threshold);

      rows = rows.map(row => {
        const val = Number(row[header]);
        if (isNaN(val) || !isOutlier(val)) return row;

        const newRow = { ...row };
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

function isNullValue(value: CellValue): boolean {
  return value === null || value === undefined || value === '' || value === 'null' || value === 'undefined';
}

function createIQROutlierChecker(values: number[], multiplier: number): (v: number) => boolean {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lower = q1 - multiplier * iqr;
  const upper = q3 + multiplier * iqr;
  return (v: number) => v < lower || v > upper;
}

function createZScoreOutlierChecker(values: number[], threshold: number): (v: number) => boolean {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  if (std === 0) return () => false;
  return (v: number) => Math.abs((v - mean) / std) > threshold;
}

// ============================================================
// 4. 确定性摘要生成
// ============================================================

export function generateSummaryClient(data: ParsedData): Summary {
  const fieldStats = analyzeFieldsClient(data);
  const numericColumns = fieldStats.filter(f => f.type === 'number').length;
  const textColumns = fieldStats.filter(f => f.type === 'string' || f.type === 'id').length;
  const dateColumns = fieldStats.filter(f => f.type === 'date').length;
  const idColumns = fieldStats.filter(f => f.type === 'id').length;

  let nullValues = 0;
  data.rows.forEach(row => {
    data.headers.forEach(h => {
      if (isNullValue(row[h])) nullValues++;
    });
  });

  const rowStrings = data.rows.map(row => JSON.stringify(row));
  const uniqueRows = new Set(rowStrings);

  return {
    totalRows: data.rows.length,
    totalColumns: data.headers.length,
    numericColumns,
    textColumns,
    dateColumns,
    idColumns,
    nullValues,
    duplicateRows: data.rows.length - uniqueRows.size
  };
}

// ============================================================
// 5. 确定性异常检测
// ============================================================

export function detectAnomaliesClient(data: ParsedData, fieldStats: FieldStat[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const { rows, headers } = data;

  rows.forEach((row, rowIndex) => {
    headers.forEach(field => {
      const value = row[field];
      const stat = fieldStats.find(s => s.field === field);
      if (!stat || stat.type === 'id') return;

      if (isNullValue(value)) {
        anomalies.push({
          row: rowIndex,
          field,
          value,
          type: 'null',
          description: `第${rowIndex + 2}行 "${field}" 字段为空值`
        });
      }

      if (stat.type === 'number' && stat.numericStats && !isNaN(Number(value))) {
        const numValue = Number(value);
        const { mean } = stat.numericStats;
        const nums = rows.map(r => Number(r[field])).filter(n => !isNaN(n));
        const stdDev = calculateStdDev(nums, mean);

        if (stdDev > 0 && (numValue < mean - 3 * stdDev || numValue > mean + 3 * stdDev)) {
          anomalies.push({
            row: rowIndex,
            field,
            value,
            type: 'outlier',
            description: `第${rowIndex + 2}行 "${field}" 字段存在异常值: ${value} (超出3倍标准差)`
          });
        }
      }
    });
  });

  return anomalies;
}

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

// ============================================================
// 6. 完整数据分析（前端版，替代 /api/analyze 基础部分）
// ============================================================

export function analyzeDataClient(data: ParsedData): DataAnalysis {
  const fieldStats = analyzeFieldsClient(data);
  const summary = generateSummaryClient(data);
  const anomalies = detectAnomaliesClient(data, fieldStats);
  const insights = generateInsightsClient(data, fieldStats, summary);

  return {
    fieldStats,
    summary,
    insights,
    anomalies,
  };
}

function generateInsightsClient(data: ParsedData, fieldStats: FieldStat[], summary: Summary): string[] {
  const insights: string[] = [];

  if (summary.totalRows > 10000) {
    insights.push(`数据集包含 ${summary.totalRows.toLocaleString()} 行数据，建议进行数据采样或分批处理`);
  }

  if (summary.nullValues > summary.totalRows * summary.totalColumns * 0.1) {
    insights.push(`数据中存在 ${summary.nullValues} 个空值（约占 ${((summary.nullValues / (summary.totalRows * summary.totalColumns)) * 100).toFixed(1)}%），建议进行空值处理`);
  }

  if (summary.duplicateRows > 0) {
    insights.push(`检测到 ${summary.duplicateRows} 行重复数据，建议去重处理`);
  }

  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  if (numericFields.length > 0) {
    numericFields.slice(0, 3).forEach(field => {
      if (field.numericStats) {
        insights.push(`"${field.field}" 字段: 范围 ${field.numericStats.min.toLocaleString()} ~ ${field.numericStats.max.toLocaleString()}，均值 ${field.numericStats.mean.toLocaleString()}`);
      }
    });
  }

  return insights;
}

// ============================================================
// 7. 数据采样（用于LLM输入限制）
// ============================================================

export function smartSampleClient(data: ParsedData, maxRows: number = 5000): ParsedData {
  if (data.rowCount <= maxRows) return data;

  const ratio = maxRows / data.rowCount;
  const sampledRows: Record<string, CellValue>[] = [];

  // 保留首尾各10%（通常包含重要数据），中间随机采样
  const headCount = Math.floor(maxRows * 0.1);
  const tailCount = Math.floor(maxRows * 0.1);
  const middleCount = maxRows - headCount - tailCount;

  sampledRows.push(...data.rows.slice(0, headCount));

  const middleStart = headCount;
  const middleEnd = data.rowCount - tailCount;
  const middlePool = data.rows.slice(middleStart, middleEnd);

  // Fisher-Yates 洗牌采样
  for (let i = middlePool.length - 1; i > 0 && sampledRows.length < headCount + middleCount; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    if (Math.random() < ratio) {
      sampledRows.push(middlePool[j]);
    }
  }

  sampledRows.push(...data.rows.slice(-tailCount));

  return {
    ...data,
    rows: sampledRows,
    rowCount: sampledRows.length,
  };
}
