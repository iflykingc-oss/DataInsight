import {
  ParsedData,
  DataAnalysis,
  FieldStats,
  CellValue,
  CleanResult,
  AggregateOptions,
  GroupedData,
  createSuccessResponse,
  createErrorResponse,
  type ApiResponse
} from '@/types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export async function parseFile(file: File): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  } else {
    throw new Error(`不支持的文件格式: .${extension}。请上传 Excel 或 CSV 文件。`);
  }
}

async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, CellValue>>) => {
        const headers = results.meta.fields || [];
        const rows = results.data as Record<string, CellValue>[];
        resolve({
          headers,
          rows,
          fileName: file.name,
          rowCount: rows.length,
          columnCount: headers.length
        });
      },
      error: (error) => {
        reject(new Error(`CSV解析失败: ${error.message}`));
      }
    });
  });
}

async function parseExcel(file: File): Promise<ParsedData> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const sheetNames = workbook.SheetNames;
  const firstSheetName = sheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (jsonData.length === 0) {
    throw new Error('Excel文件为空');
  }

  const headers = (jsonData[0] as CellValue[]).map(h => String(h || ''));
  const rows = jsonData.slice(1).map(row => {
    const rowArray = row as CellValue[];
    const obj: Record<string, CellValue> = {};
    rowArray.forEach((value: CellValue, index: number) => {
      obj[headers[index]] = value;
    });
    return obj;
  });

  return {
    headers,
    rows,
    fileName: file.name,
    sheetNames,
    rowCount: rows.length,
    columnCount: headers.length
  };
}

export function analyzeData(data: ParsedData): DataAnalysis {
  const fieldStats = calculateFieldStats(data);
  const summary = calculateSummary(data);
  const qualityScore = calculateQualityScore(summary);
  const dataHealth = assessDataHealth(data, fieldStats);

  return {
    fieldStats,
    summary,
    qualityScore,
    dataHealth,
  };
}

function calculateFieldStats(data: ParsedData): FieldStats[] {
  const { headers, rows } = data;

  return headers.map(field => {
    const values = rows.map(row => row[field]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const type = inferFieldType(nonNullValues);
    const uniqueValues = new Set(nonNullValues.map(v => String(v)));

    const stats: FieldStats = {
      field,
      type,
      count: values.length,
      nullCount: values.length - nonNullValues.length,
      uniqueCount: uniqueValues.size,
      sampleValues: nonNullValues.slice(0, 10),
    };

    if (type === 'number') {
      const nums = nonNullValues.filter((v): v is number => typeof v === 'number' && !isNaN(v));
      if (nums.length > 0) {
        const sorted = [...nums].sort((a, b) => a - b);
        const sum = nums.reduce((a, b) => a + b, 0);
        const mean = sum / nums.length;
        const median = nums.length % 2 === 0
          ? (sorted[nums.length / 2 - 1] + sorted[nums.length / 2]) / 2
          : sorted[Math.floor(nums.length / 2)];
        const variance = nums.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / nums.length;
        const std = Math.sqrt(variance);

        stats.numericStats = {
          min: Math.min(...nums),
          max: Math.max(...nums),
          mean,
          median,
          sum,
          std,
          percentile25: sorted[Math.floor(nums.length * 0.25)],
          percentile75: sorted[Math.floor(nums.length * 0.75)],
          zeroCount: nums.filter(n => n === 0).length,
          negativeCount: nums.filter(n => n < 0).length,
        };
      }
    } else if (type === 'string') {
      const strs = nonNullValues.map(v => String(v));
      const lengths = strs.map(s => s.length);
      const topValues = getTopValues(strs, 5);

      stats.stringStats = {
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        avgLength: lengths.reduce((a, b) => a + b, 0) / lengths.length,
        topValues,
      };
    }

    return stats;
  });
}

function inferFieldType(values: CellValue[]): 'string' | 'number' | 'boolean' | 'date' | 'mixed' | 'empty' {
  if (values.length === 0) return 'empty';

  const types = values.map(v => {
    if (v === null || v === undefined || v === '') return 'empty';
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    if (v instanceof Date) return 'date';
    if (typeof v === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(v)) return 'date';
      if (!isNaN(Number(v)) && v.trim() !== '') return 'number';
      return 'string';
    }
    return 'string';
  });

  const nonEmpty = types.filter(t => t !== 'empty');
  if (nonEmpty.length === 0) return 'empty';

  const unique = [...new Set(nonEmpty)];
  if (unique.length === 1) return nonEmpty[0] as 'string' | 'number' | 'boolean' | 'date';
  return 'mixed';
}

function getTopValues(arr: string[], n: number): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const v of arr) {
    counts.set(v, (counts.get(v) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([value, count]) => ({ value, count }));
}

function calculateSummary(data: ParsedData): import('@/types').DataSummary {
  const { headers, rows } = data;
  const totalCells = headers.length * rows.length;
  const emptyCells = rows.reduce((acc, row) =>
    acc + headers.filter(h => row[h] === null || row[h] === undefined || row[h] === '').length, 0
  );

  const seen = new Set<string>();
  let duplicateRows = 0;
  for (const row of rows) {
    const key = headers.map(h => String(row[h])).join('|');
    if (seen.has(key)) {
      duplicateRows++;
    } else {
      seen.add(key);
    }
  }

  return {
    totalRows: rows.length,
    totalColumns: headers.length,
    totalCells,
    emptyCells,
    duplicateRows,
    dataCompleteness: ((totalCells - emptyCells) / totalCells) * 100,
    dataConsistency: 100 - (duplicateRows / rows.length) * 100,
  };
}

function calculateQualityScore(summary: import('@/types').DataSummary): number {
  const completenessWeight = 0.4;
  const consistencyWeight = 0.3;
  const noDuplicatesWeight = 0.3;

  const completeness = summary.dataCompleteness;
  const consistency = summary.dataConsistency;
  const noDuplicates = ((summary.totalRows - summary.duplicateRows) / summary.totalRows) * 100;

  return Math.round(
    completeness * completenessWeight +
    consistency * consistencyWeight +
    noDuplicates * noDuplicatesWeight
  );
}

function assessDataHealth(data: ParsedData, fieldStats: FieldStats[]): import('@/types').DataHealth {
  const hasEmptyRows = data.rows.some(row =>
    data.headers.every(h => row[h] === null || row[h] === undefined || row[h] === '')
  );

  const hasDuplicateRows = data.rows.length !== new Set(
    data.rows.map(row => data.headers.map(h => String(row[h])).join('|'))
  ).size;

  const hasOutliers = fieldStats.some(stat => {
    if (!stat.numericStats) return false;
    const { min, max, mean, std } = stat.numericStats;
    return data.rows.some(row => {
      const v = row[stat.field];
      if (typeof v !== 'number') return false;
      const zScore = Math.abs((v - mean) / std);
      return zScore > 3;
    });
  });

  const hasInconsistentTypes = fieldStats.some(stat => stat.type === 'mixed');

  const nullValueRatio = fieldStats.reduce((acc, stat) =>
    acc + stat.nullCount / (stat.count || 1), 0
  ) / fieldStats.length * 100;

  let overallStatus: 'excellent' | 'good' | 'warning' | 'critical';
  if (nullValueRatio < 5 && !hasOutliers && !hasInconsistentTypes) {
    overallStatus = 'excellent';
  } else if (nullValueRatio < 15) {
    overallStatus = 'good';
  } else if (nullValueRatio < 30) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'critical';
  }

  return {
    hasEmptyRows,
    hasDuplicateRows,
    hasOutliers,
    hasInconsistentTypes,
    nullValueRatio,
    overallStatus,
  };
}

export function cleanData(data: ParsedData, strategies: Record<string, string>): CleanResult {
  const removedRows: number[] = [];
  const modifiedCells: Array<{ row: number; field: string; oldValue: CellValue; newValue: CellValue }> = [];
  let removedDuplicates = 0;
  let filledNulls = 0;

  let cleanedRows = [...data.rows];
  const seen = new Set<string>();
  const rowsToRemove: number[] = [];

  cleanedRows.forEach((row, idx) => {
    const key = data.headers.map(h => String(row[h])).join('|');
    if (seen.has(key)) {
      rowsToRemove.push(idx);
      removedDuplicates++;
    } else {
      seen.add(key);
    }
  });

  cleanedRows = cleanedRows.filter((_, idx) => !rowsToRemove.includes(idx));

  for (const field of data.headers) {
    const strategy = strategies[field];
    if (!strategy) continue;

    cleanedRows.forEach((row, idx) => {
      const value = row[field];

      if (value === null || value === undefined || value === '') {
        if (strategy === 'remove_row') {
          rowsToRemove.push(idx);
        } else if (strategy === 'fill_mean' || strategy === 'fill_median' || strategy === 'fill_zero') {
          const stat = data.headers.map(h => ({ field: h, type: inferFieldType(cleanedRows.map(r => r[h])) }))
            .find(s => s.field === field);
          if (stat?.type === 'number') {
            const nums = cleanedRows
              .filter(r => r[field] !== null && r[field] !== undefined && r[field] !== '')
              .map(r => Number(r[field]));
            let newValue: CellValue;
            if (strategy === 'fill_mean') {
              newValue = nums.reduce((a, b) => a + b, 0) / nums.length;
            } else if (strategy === 'fill_median') {
              const sorted = [...nums].sort((a, b) => a - b);
              newValue = sorted[Math.floor(sorted.length / 2)];
            } else {
              newValue = 0;
            }
            row[field] = newValue;
            modifiedCells.push({ row: idx, field, oldValue: value, newValue });
            filledNulls++;
          }
        }
      }
    });
  }

  cleanedRows = cleanedRows.filter((_, idx) => !rowsToRemove.includes(idx));

  return {
    data: { ...data, rows: cleanedRows, rowCount: cleanedRows.length },
    removedRows: rowsToRemove,
    modifiedCells,
    removedDuplicates,
    filledNulls,
  };
}

export function aggregateData(data: ParsedData, options: AggregateOptions): GroupedData {
  const { groupBy, measures } = options;
  const groupMap = new Map<string, { key: Record<string, CellValue>; rows: Record<string, CellValue>[] }>();

  for (const row of data.rows) {
    const keyValues = groupBy.map(field => `${field}:${row[field]}`).join('|');
    if (!groupMap.has(keyValues)) {
      const keyObj: Record<string, CellValue> = {};
      groupBy.forEach(field => { keyObj[field] = row[field]; });
      groupMap.set(keyValues, { key: keyObj, rows: [] });
    }
    groupMap.get(keyValues)!.rows.push(row);
  }

  const groups = [...groupMap.values()].map(({ key, rows }) => {
    const aggregations: Record<string, number> = {};

    for (const measure of measures) {
      const values = rows
        .map(row => row[measure.field])
        .filter((v): v is number => typeof v === 'number' && !isNaN(v));

      let result: number;
      switch (measure.operation) {
        case 'sum':
          result = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case 'count':
          result = rows.length;
          break;
        case 'min':
          result = values.length > 0 ? Math.min(...values) : 0;
          break;
        case 'max':
          result = values.length > 0 ? Math.max(...values) : 0;
          break;
        case 'std':
          if (values.length > 0) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            result = Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length);
          } else {
            result = 0;
          }
          break;
        default:
          result = 0;
      }
      aggregations[measure.alias || `${measure.field}_${measure.operation}`] = result;
    }

    return { key, rows, aggregations };
  });

  return { groups };
}

export class DataService {
  private static instance: DataService;

  static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  async parseFile(file: File): Promise<ApiResponse<ParsedData>> {
    try {
      const data = await parseFile(file);
      return createSuccessResponse(data);
    } catch (error) {
      return createErrorResponse(
        'PARSE_ERROR',
        error instanceof Error ? error.message : '文件解析失败'
      );
    }
  }

  analyzeData(data: ParsedData): ApiResponse<DataAnalysis> {
    try {
      const analysis = analyzeData(data);
      return createSuccessResponse(analysis);
    } catch (error) {
      return createErrorResponse(
        'ANALYSIS_ERROR',
        error instanceof Error ? error.message : '数据分析失败'
      );
    }
  }

  cleanData(data: ParsedData, strategies: Record<string, string>): ApiResponse<CleanResult> {
    try {
      const result = cleanData(data, strategies);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(
        'CLEAN_ERROR',
        error instanceof Error ? error.message : '数据清洗失败'
      );
    }
  }

  aggregateData(data: ParsedData, options: AggregateOptions): ApiResponse<GroupedData> {
    try {
      const result = aggregateData(data, options);
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(
        'AGGREGATE_ERROR',
        error instanceof Error ? error.message : '数据聚合失败'
      );
    }
  }
}

export const dataService = DataService.getInstance();
