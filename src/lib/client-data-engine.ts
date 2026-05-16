/**
 * 客户端数据引擎
 * 数据零存储原则：所有数据解析、清洗、统计、分析均在浏览器端完成
 * 服务端不接收文件、不落地业务数据
 */

import type { ParsedData, CellValue, FieldStat, Summary, Anomaly, DataAnalysis, DeepAnalysis } from './data-processor/types';

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

  const deepAnalysis = buildDeepAnalysis(data, fieldStats, summary);

  return {
    fieldStats,
    summary,
    insights,
    anomalies,
    deepAnalysis,
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

function buildDeepAnalysis(data: ParsedData, fieldStats: FieldStat[], summary: Summary): DeepAnalysis {
  const keyFindings: DeepAnalysis['keyFindings'] = [];
  const correlations: DeepAnalysis['correlations'] = [];
  const trends: DeepAnalysis['trends'] = [];
  const recommendedCharts: DeepAnalysis['recommendedCharts'] = [];
  const actionItems: DeepAnalysis['actionItems'] = [];

  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  const categoryFields = fieldStats.filter(f => f.type === 'string' && f.uniqueCount >= 2 && f.uniqueCount <= 30 && !f.isIdField);
  const dateFields = fieldStats.filter(f => f.type === 'date');

  const missingRate = summary.nullValues / Math.max(summary.totalRows * summary.totalColumns, 1);
  const duplicateRate = summary.duplicateRows / Math.max(summary.totalRows, 1);
  const completeness = Math.round(Math.max(0, (1 - missingRate) * 100));
  const consistency = Math.round(Math.max(0, (1 - duplicateRate) * 100));
  const quality = Math.min(100, Math.round(60 + (numericFields.length / Math.max(summary.totalColumns, 1)) * 40));
  const usability = Math.min(100, Math.round(
    (summary.totalRows > 50 ? 60 : 30)
    + (dateFields.length > 0 ? 20 : 0)
    + (categoryFields.length > 0 ? 20 : 0)
  ));
  const overall = Math.round(completeness * 0.3 + consistency * 0.2 + quality * 0.2 + usability * 0.3);
  const healthScore = { overall, completeness, consistency, quality, usability };

  keyFindings.push({
    severity: 'info',
    category: 'insight',
    title: `${summary.totalRows.toLocaleString()} rows x ${summary.totalColumns} columns | Quality ${overall}/100`,
    detail: `${numericFields.length} numeric, ${categoryFields.length} category${dateFields.length > 0 ? `, ${dateFields.length} date` : ''} fields. ${summary.duplicateRows > 0 ? `${summary.duplicateRows} duplicate rows detected.` : 'No duplicates.'}`,
    impact: summary.totalRows < 100 ? 'Small dataset - statistical conclusions have lower confidence.' : 'Adequate data for multi-dimensional analysis.',
    suggestion: summary.totalRows < 100 ? 'Consider collecting more data (target 200+ rows).' : 'Ready for trend, comparison, and correlation analysis.',
    relatedFields: [],
    confidence: 99,
    isBusinessInsight: false,
  });

  const highMissingFields = fieldStats.filter(f => f.nullCount > summary.totalRows * 0.1);
  if (highMissingFields.length > 0) {
    const maxRate = Math.max(...highMissingFields.map(f => f.nullCount / summary.totalRows));
    keyFindings.push({
      severity: maxRate > 0.3 ? 'critical' : 'warning',
      category: 'quality',
      title: `${highMissingFields.length} fields with >10% missing values`,
      detail: highMissingFields.map(f => `"${f.field}": ${((f.nullCount / summary.totalRows) * 100).toFixed(1)}% missing`).join('; '),
      impact: 'High missing rates cause statistical bias and may distort key metric calculations.',
      suggestion: 'Fill or exclude missing values in core business fields before drawing conclusions.',
      relatedFields: highMissingFields.map(f => f.field),
      confidence: 99,
      isBusinessInsight: false,
    });
  }

  const primaryMetricField = numericFields.find(f => {
    const n = f.field.toLowerCase();
    return ['sales', 'revenue', 'amount', 'profit', 'income'].some(k => n.includes(k))
      || ['销售', '金额', '收入', '利润'].some(k => f.field.includes(k));
  }) || numericFields[0];

  for (const catField of categoryFields.slice(0, 3)) {
    if (!catField.topValues || catField.topValues.length === 0) continue;
    if (primaryMetricField) {
      const catSums = new Map<string, number>();
      let total = 0;
      data.rows.forEach(row => {
        const cat = String(row[catField.field] ?? '');
        const val = Number(row[primaryMetricField.field]);
        if (cat && cat !== 'null' && !isNaN(val) && val >= 0) {
          catSums.set(cat, (catSums.get(cat) || 0) + val);
          total += val;
        }
      });
      const sorted = Array.from(catSums.entries()).sort((a, b) => b[1] - a[1]).filter(([c]) => c && c !== 'null');
      if (sorted.length >= 2 && total > 0) {
        const top = sorted[0];
        const topPct = (top[1] / total * 100).toFixed(1);
        const bottomPct = (sorted[sorted.length - 1][1] / total * 100).toFixed(1);
        keyFindings.push({
          severity: Number(topPct) > 60 ? 'warning' : 'info',
          category: 'business',
          title: `${primaryMetricField.field}: "${top[0]}" leads at ${topPct}% share`,
          detail: sorted.slice(0, 5).map(([cat, sum]) => `${cat}: ${sum.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`).join(' | '),
          impact: Number(topPct) > 60
            ? `High concentration risk: "${top[0]}" dominates, bottom "${sorted[sorted.length-1][0]}" only ${bottomPct}%.`
            : `Distribution across ${catField.field} is relatively balanced.`,
          suggestion: Number(topPct) > 60
            ? `Diversify across ${catField.field} to reduce single-category dependency risk.`
            : `Reinforce top performers while raising floor for lower segments.`,
          relatedFields: [catField.field, primaryMetricField.field],
          confidence: 88,
          isBusinessInsight: true,
        });
        recommendedCharts.push({
          chartType: 'bar',
          title: `${catField.field} x ${primaryMetricField.field}`,
          xField: catField.field,
          yField: primaryMetricField.field,
          reason: `Compare ${primaryMetricField.field} across ${catField.field}`,
          priority: 'high',
        });
      }
    }
  }

  if (dateFields.length > 0 && numericFields.length > 0) {
    const dateField = dateFields[0];
    const metricField = primaryMetricField || numericFields[0];
    const monthlyData = new Map<string, number>();
    data.rows.forEach(row => {
      const dv = String(row[dateField.field] ?? '');
      const nv = Number(row[metricField.field]);
      if (dv.length >= 7 && !isNaN(nv)) {
        const ym = dv.substring(0, 7);
        monthlyData.set(ym, (monthlyData.get(ym) || 0) + nv);
      }
    });
    const sortedMonths = Array.from(monthlyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    if (sortedMonths.length >= 3) {
      const first = sortedMonths[0][1];
      const last = sortedMonths[sortedMonths.length - 1][1];
      const totalChange = first > 0 ? ((last - first) / first * 100) : 0;
      const peak = sortedMonths.reduce((a, b) => a[1] > b[1] ? a : b);
      const valley = sortedMonths.reduce((a, b) => a[1] < b[1] ? a : b);
      const recent3 = sortedMonths.slice(-3);
      const recentChange = recent3.length >= 2 && recent3[0][1] > 0
        ? ((recent3[recent3.length - 1][1] - recent3[0][1]) / recent3[0][1] * 100) : 0;
      trends.push({
        field: metricField.field,
        direction: totalChange > 5 ? 'up' : totalChange < -5 ? 'down' : 'stable',
        changeRate: totalChange,
        description: `${sortedMonths[0][0]} to ${sortedMonths[sortedMonths.length - 1][0]}: ${metricField.field} ${totalChange >= 0 ? 'grew' : 'declined'} ${Math.abs(totalChange).toFixed(1)}% overall`,
      });
      keyFindings.push({
        severity: totalChange > 10 ? 'positive' : totalChange < -10 ? 'warning' : 'info',
        category: 'trend',
        title: `${metricField.field}: ${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}% over ${sortedMonths.length} months`,
        detail: `Peak: ${peak[0]} (${peak[1].toLocaleString('zh-CN', { maximumFractionDigits: 0 })}); Trough: ${valley[0]} (${valley[1].toLocaleString('zh-CN', { maximumFractionDigits: 0 })}). Recent 3-month trend: ${recentChange >= 0 ? '+' : ''}${recentChange.toFixed(1)}%.`,
        impact: totalChange > 10 ? 'Sustained growth - scale resources proactively to meet demand.'
          : totalChange < -10 ? 'Sustained decline - diagnose root cause and evaluate recovery measures.'
          : 'Stable trend - identify new growth drivers.',
        suggestion: peak[0].substring(5) === '11' || peak[0].substring(5) === '12'
          ? `${peak[0]} is the seasonal peak - stock up and increase marketing 6-8 weeks prior.`
          : `${peak[0]} was the highest month - analyze what drove it and replicate those conditions.`,
        relatedFields: [dateField.field, metricField.field],
        confidence: 85,
        isBusinessInsight: true,
      });
      recommendedCharts.push({
        chartType: 'line',
        title: `${metricField.field} Monthly Trend`,
        xField: dateField.field,
        yField: metricField.field,
        reason: 'Show time-series trend',
        priority: 'high',
      });
    }
  }

  if (numericFields.length >= 2) {
    const limit = Math.min(numericFields.length, 5);
    for (let i = 0; i < limit; i++) {
      for (let j = i + 1; j < limit; j++) {
        const fa = numericFields[i], fb = numericFields[j];
        const pairs: [number, number][] = [];
        data.rows.forEach(row => {
          const a = Number(row[fa.field]), b = Number(row[fb.field]);
          if (!isNaN(a) && !isNaN(b)) pairs.push([a, b]);
        });
        if (pairs.length < 5) continue;
        const ma = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
        const mb = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
        const num = pairs.reduce((s, p) => s + (p[0] - ma) * (p[1] - mb), 0);
        const da = Math.sqrt(pairs.reduce((s, p) => s + (p[0] - ma) ** 2, 0));
        const db = Math.sqrt(pairs.reduce((s, p) => s + (p[1] - mb) ** 2, 0));
        const r = da > 0 && db > 0 ? num / (da * db) : 0;
        const absR = Math.abs(r);
        if (absR >= 0.6) {
          const strength = absR >= 0.8 ? 'strong' : 'moderate';
          const direction = r > 0 ? 'positive' : 'negative';
          correlations.push({ field1: fa.field, field2: fb.field, coefficient: r, strength, direction });
          if (absR >= 0.7) {
            keyFindings.push({
              severity: r < -0.7 ? 'warning' : 'info',
              category: 'correlation',
              title: `"${fa.field}" vs "${fb.field}": ${r < 0 ? 'strong negative' : 'strong positive'} correlation (r=${r.toFixed(2)})`,
              detail: `Pearson r=${r.toFixed(3)}, ${strength} ${direction} correlation from ${pairs.length} data points.`,
              impact: r < -0.7
                ? `Inverse relationship: as ${fa.field} rises, ${fb.field} tends to fall - check if discounts are eroding margins.`
                : `Co-movement detected: both metrics likely driven by a common business factor.`,
              suggestion: r < -0.7
                ? 'Review discount/pricing policy impact on profitability - find the balance point.'
                : 'Monitor these together as a composite KPI for business performance.',
              relatedFields: [fa.field, fb.field],
              confidence: Math.round(absR * 100),
              isBusinessInsight: true,
            });
          }
        }
      }
    }
  }

  for (const f of numericFields.slice(0, 5)) {
    if (!f.numericStats) continue;
    const { mean, min, max } = f.numericStats;
    if (min <= 0 || mean <= 0) continue;
    if ((max - min) / mean > 1.5 && max > min * 5) {
      keyFindings.push({
        severity: 'warning',
        category: 'anomaly',
        title: `"${f.field}" shows high volatility (range is ${((max - min) / mean * 100).toFixed(0)}% of mean)`,
        detail: `Min: ${min.toLocaleString()}, Mean: ${mean.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}, Max: ${max.toLocaleString()}.`,
        impact: 'High variance may indicate promotions, seasonal spikes, or data entry errors.',
        suggestion: 'Segment analysis by dimension (region, category) to isolate peak vs trough drivers.',
        relatedFields: [f.field],
        confidence: 78,
        isBusinessInsight: false,
      });
    }
  }

  if (numericFields.length > 0) {
    actionItems.push({
      priority: 'high',
      action: `Set up monitoring alerts for ${numericFields.slice(0, 2).map(f => f.field).join(', ')}`,
      detail: 'Define threshold rules and period-over-period alerts for key metrics.',
      expectedBenefit: 'Reduce mean time to detect anomalies and limit business impact.',
    });
  }
  if (categoryFields.length > 0) {
    actionItems.push({
      priority: 'high',
      action: `Deep-dive ${categoryFields[0].field} performance gaps`,
      detail: `Benchmark top vs bottom ${categoryFields[0].field} performers and identify replicable success patterns.`,
      expectedBenefit: 'Raise floor performance across all segments.',
    });
  }
  if (correlations.some(c => c.direction === 'negative' && c.strength === 'strong')) {
    actionItems.push({
      priority: 'high',
      action: 'Audit discount/promotion strategy for margin erosion',
      detail: 'Strong negative correlation between metrics suggests pricing pressure may be compressing profitability.',
      expectedBenefit: 'Maintain revenue scale while improving net margin.',
    });
  }
  if (trends.some(t => t.direction === 'down')) {
    actionItems.push({
      priority: 'high',
      action: 'Investigate and reverse declining trend',
      detail: 'Key metric shows sustained decline. Prioritize root-cause attribution across market, product, and ops dimensions.',
      expectedBenefit: 'Stop the bleed and restore growth trajectory.',
    });
  }

  const isBusinessData = numericFields.some(f => {
    const n = f.field.toLowerCase();
    return ['sales', 'revenue', 'profit', 'amount', 'income'].some(k => n.includes(k))
      || ['销售', '利润', '金额', '收入'].some(k => f.field.includes(k));
  });
  const hasDateAndNumeric = dateFields.length > 0 && numericFields.length > 0;
  const hasCategoryAndNumeric = categoryFields.length > 0 && numericFields.length > 0;
  const dataType = hasDateAndNumeric ? 'Time-series business data' : hasCategoryAndNumeric ? 'Multi-dimensional business data' : 'Structured data';
  const suggestedIndustry = isBusinessData ? 'Retail / Sales' : hasCategoryAndNumeric ? 'Operations / Business' : 'General';

  const distributions: DeepAnalysis['distributions'] = numericFields.slice(0, 5).map(f => {
    if (!f.numericStats) return null;
    const { mean, median, min, max } = f.numericStats;
    const skewness = max > min ? (mean - median) / (max - min) * 3 : 0;
    const type = Math.abs(skewness) < 0.2 ? 'normal' : skewness > 0 ? 'skewed_right' : 'skewed_left';
    return {
      field: f.field,
      type: type as 'normal' | 'skewed_left' | 'skewed_right' | 'bimodal' | 'uniform',
      skewness,
      kurtosis: 0,
      description: type === 'normal' ? `Near-normal distribution, mean ${mean.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}`
        : type === 'skewed_right' ? `Right-skewed: high-end outliers inflate the mean; use median as reference`
        : `Left-skewed: low-end outliers drag the mean down; use median as reference`,
    };
  }).filter((d): d is NonNullable<typeof d> => d !== null);

  const issueCount = keyFindings.filter(f => f.severity === 'warning' || f.severity === 'critical').length;
  return {
    healthScore,
    keyFindings,
    correlations,
    distributions,
    trends,
    recommendedCharts,
    actionItems,
    dataProfile: {
      dataType,
      suggestedIndustry,
      dataMaturity: summary.nullValues === 0 ? 'cleaned' : 'structured',
      analysisPotential: (hasDateAndNumeric && hasCategoryAndNumeric) ? 'high' : hasCategoryAndNumeric ? 'medium' : 'low',
      periodFeature: dateFields.length > 0 ? 'Time-series data - trend analysis available' : undefined,
      scaleFeature: summary.totalRows > 1000 ? 'Large dataset' : summary.totalRows > 100 ? 'Medium dataset' : 'Small dataset',
      summary: `${dataType}, ${summary.totalRows.toLocaleString()} records, ${numericFields.length} numeric metrics, ${categoryFields.length} categorical dimensions. ${keyFindings.length} insights found, ${issueCount} risk point(s) require attention.`,
    },
  };
}
