/**
 * 数据分析引擎 - 核心分析器
 */
import type { ParsedData, CellValue, DataAnalysis, FieldStat, Summary, Anomaly } from './types';
import { generateDeepAnalysis } from './deep-analysis';
import { isIdField } from './sampling';

export function analyzeData(data: ParsedData): DataAnalysis {
  const fieldStats = analyzeFields(data);
  const summary = generateSummary(data);
  const anomalies = detectAnomalies(data, fieldStats);
  const insights = generateInsights(data, fieldStats, summary);
  const deepAnalysis = generateDeepAnalysis(data, fieldStats, summary, anomalies);

  return {
    fieldStats,
    summary,
    insights,
    anomalies,
    deepAnalysis
  };
}

function analyzeFields(data: ParsedData): FieldStat[] {
  const { headers, rows } = data;

  const idPatterns = [
    /^id$/i, /^编号$/i, /^序号$/i, /^no\.?$/i, /^no$/i,
    /^serial$/i, /^序列$/i, /^index$/i, /^idx$/i,
    /^code$/i, /^编码$/i, /^code_?no\.?$/i,
    /^num$/i, /^n_?o\.?$/i, /^order_?id$/i, /^order_?no$/i,
    /^流水号$/i, /^单号$/i, /^订单号$/i, /^记录_?id$/i,
    /^user_?id$/i, /^customer_?id$/i, /^product_?id$/i,
    /^主键$/i, /^外键$/i, /^key$/i, /^pk$/i, /^fk$/i
  ];

  return headers.map(field => {
    const values = rows.map(row => row[field]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNullValues.map(v => String(v)));

    const nameMatchesId = idPatterns.some(p => p.test(field));
    const highCardinality = nonNullValues.length >= 10 && uniqueValues.size > nonNullValues.length * 0.9;
    const fieldIsId = nameMatchesId || highCardinality;

    let type: 'string' | 'number' | 'date' | 'mixed' = 'string';
    const numericCount = nonNullValues.filter(v => !isNaN(Number(v))).length;
    const dateCount = nonNullValues.filter(v => isDate(v)).length;

    if (numericCount > nonNullValues.length * 0.8) {
      type = 'number';
    } else if (dateCount > nonNullValues.length * 0.8) {
      type = 'date';
    } else if (numericCount > 0 && numericCount < nonNullValues.length * 0.8) {
      type = 'mixed';
    }

    let numericStats: FieldStat['numericStats'] = undefined;
    if (type === 'number' && !fieldIsId) {
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
      isIdField: fieldIsId
    };
  });
}

function isDate(value: CellValue): boolean {
  if (typeof value === 'number' && value > 3000 && value < 10000) {
    return true;
  }
  if (typeof value === 'string') {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/
    ];
    return datePatterns.some(pattern => pattern.test(value));
  }
  return false;
}

export function generateSummary(data: ParsedData): Summary {
  const { rows, headers } = data;

  const fieldStats = analyzeFields(data);
  const numericColumns = fieldStats.filter(f => f.type === 'number').length;
  const textColumns = fieldStats.filter(f => f.type === 'string').length;
  const dateColumns = fieldStats.filter(f => f.type === 'date').length;

  let nullValues = 0;
  rows.forEach(row => {
    headers.forEach(h => {
      if (row[h] === null || row[h] === undefined || row[h] === '') {
        nullValues++;
      }
    });
  });

  const rowStrings = rows.map(row => JSON.stringify(row));
  const uniqueRows = new Set(rowStrings);

  return {
    totalRows: rows.length,
    totalColumns: headers.length,
    numericColumns,
    textColumns,
    dateColumns,
    nullValues,
    duplicateRows: rows.length - uniqueRows.size
  };
}

function detectAnomalies(data: ParsedData, fieldStats: FieldStat[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const { rows, headers } = data;

  rows.forEach((row, rowIndex) => {
    headers.forEach((field, _fieldIndex) => {
      const value = row[field];
      const stat = fieldStats.find(s => s.field === field);

      if (!stat) return;

      if (value === null || value === undefined || value === '') {
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
        const stdDev = calculateStdDev(rows.map(r => Number(r[field])).filter(n => !isNaN(n)), mean);

        if (numValue < mean - 3 * stdDev || numValue > mean + 3 * stdDev) {
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

export function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

function generateInsights(data: ParsedData, fieldStats: FieldStat[], summary: Summary): string[] {
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

  const highCardinalityFields = fieldStats.filter(f => f.uniqueCount > summary.totalRows * 0.8);
  if (highCardinalityFields.length > 0) {
    insights.push(`"${highCardinalityFields[0].field}" 等字段具有高基数（唯一值>80%行数），可能是ID或标识符字段`);
  }

  return insights;
}
