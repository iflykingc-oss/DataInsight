import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CellValue = any;

export interface ParsedData {
  headers: string[];
  rows: Record<string, CellValue>[];
  fileName: string;
  sheetNames?: string[];
  rowCount: number;
  columnCount: number;
}

export interface DataAnalysis {
  fieldStats: FieldStat[];
  summary: Summary;
  insights: string[];
  anomalies: Anomaly[];
}

export interface FieldStat {
  field: string;
  type: 'string' | 'number' | 'date' | 'mixed';
  count: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: CellValue[];
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    sum: number;
  };
}

export interface Summary {
  totalRows: number;
  totalColumns: number;
  numericColumns: number;
  textColumns: number;
  dateColumns: number;
  nullValues: number;
  duplicateRows: number;
}

export interface Anomaly {
  row: number;
  field: string;
  value: CellValue;
  type: 'null' | 'duplicate' | 'outlier' | 'invalid';
  description: string;
}

export async function parseFile(file: File): Promise<ParsedData> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (extension === 'csv') {
    return parseCSV(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    return parseExcel(file);
  }
  
  throw new Error(`不支持的文件格式: ${extension}`);
}

async function parseCSV(file: File): Promise<ParsedData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<Record<string, CellValue>>) => {
        const headers = results.meta.fields || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rows = results.data as any[];
        
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj: Record<string, any> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row as any[]).forEach((value: CellValue, index: number) => {
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
  const fieldStats = analyzeFields(data);
  const summary = generateSummary(data);
  const anomalies = detectAnomalies(data, fieldStats);
  const insights = generateInsights(data, fieldStats, summary);
  
  return {
    fieldStats,
    summary,
    insights,
    anomalies
  };
}

function analyzeFields(data: ParsedData): FieldStat[] {
  const { headers, rows } = data;
  
  return headers.map(field => {
    const values = rows.map(row => row[field]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    
    // 判断字段类型
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
    
    const uniqueValues = new Set(nonNullValues.map(v => String(v)));
    
    // 数值统计
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
    
    return {
      field,
      type,
      count: values.length,
      nullCount: values.length - nonNullValues.length,
      uniqueCount: uniqueValues.size,
      sampleValues: nonNullValues.slice(0, 5),
      numericStats
    };
  });
}

function isDate(value: CellValue): boolean {
  if (typeof value === 'number' && value > 3000 && value < 10000) {
    // Excel日期序列号
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

function generateSummary(data: ParsedData): Summary {
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
  
  // 检测重复行
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
    headers.forEach((field, fieldIndex) => {
      const value = row[field];
      const stat = fieldStats.find(s => s.field === field);
      
      if (!stat) return;
      
      // 空值
      if (value === null || value === undefined || value === '') {
        anomalies.push({
          row: rowIndex,
          field,
          value,
          type: 'null',
          description: `第${rowIndex + 2}行 "${field}" 字段为空值`
        });
      }
      
      // 数值字段的异常值
      if (stat.type === 'number' && stat.numericStats && !isNaN(Number(value))) {
        const numValue = Number(value);
        const { min, max, mean } = stat.numericStats;
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

function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

function generateInsights(data: ParsedData, fieldStats: FieldStat[], summary: Summary): string[] {
  const insights: string[] = [];
  
  // 基础统计洞察
  if (summary.totalRows > 10000) {
    insights.push(`数据集包含 ${summary.totalRows.toLocaleString()} 行数据，建议进行数据采样或分批处理`);
  }
  
  if (summary.nullValues > summary.totalRows * summary.totalColumns * 0.1) {
    insights.push(`数据中存在 ${summary.nullValues} 个空值（约占 ${((summary.nullValues / (summary.totalRows * summary.totalColumns)) * 100).toFixed(1)}%），建议进行空值处理`);
  }
  
  if (summary.duplicateRows > 0) {
    insights.push(`检测到 ${summary.duplicateRows} 行重复数据，建议去重处理`);
  }
  
  // 字段洞察
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  if (numericFields.length > 0) {
    numericFields.slice(0, 3).forEach(field => {
      if (field.numericStats) {
        insights.push(`"${field.field}" 字段: 范围 ${field.numericStats.min.toLocaleString()} ~ ${field.numericStats.max.toLocaleString()}，均值 ${field.numericStats.mean.toLocaleString()}`);
      }
    });
  }
  
  // 高基数字段
  const highCardinalityFields = fieldStats.filter(f => f.uniqueCount > summary.totalRows * 0.8);
  if (highCardinalityFields.length > 0) {
    insights.push(`"${highCardinalityFields[0].field}" 等字段具有高基数（唯一值>80%行数），可能是ID或标识符字段`);
  }
  
  return insights;
}

export function cleanData(data: ParsedData, options: {
  removeDuplicates?: boolean;
  fillNulls?: boolean;
  nullFillValue?: CellValue;
}): ParsedData {
  let { rows } = data;
  
  if (options.removeDuplicates) {
    const seen = new Set<string>();
    rows = rows.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  if (options.fillNulls && options.nullFillValue !== undefined) {
    rows = rows.map(row => {
      const newRow = { ...row };
      data.headers.forEach(header => {
        if (newRow[header] === null || newRow[header] === undefined || newRow[header] === '') {
          newRow[header] = options.nullFillValue;
        }
      });
      return newRow;
    });
  }
  
  return {
    ...data,
    rows,
    rowCount: rows.length
  };
}

export function aggregateData(
  data: ParsedData,
  groupBy: string[],
  aggregations: { field: string; operation: 'sum' | 'avg' | 'count' | 'min' | 'max' }[]
): ParsedData {
  const groups = new Map<string, Record<string, CellValue>[]>();
  
  // 分组
  data.rows.forEach(row => {
    const key = groupBy.map(field => String(row[field])).join('|');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });
  
  // 聚合
  const result: Record<string, CellValue>[] = [];
  groups.forEach((groupRows, key) => {
    const row: Record<string, CellValue> = {};
    groupBy.forEach((field, i) => {
      const keys = key.split('|');
      row[field] = keys[i];
    });
    
    aggregations.forEach(agg => {
      const values = groupRows.map(r => Number(r[agg.field])).filter(v => !isNaN(v));
      const aggFieldName = `${agg.operation}_${agg.field}`;
      
      switch (agg.operation) {
        case 'sum':
          row[aggFieldName] = values.reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          row[aggFieldName] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
          break;
        case 'count':
          row[aggFieldName] = values.length;
          break;
        case 'min':
          row[aggFieldName] = Math.min(...values);
          break;
        case 'max':
          row[aggFieldName] = Math.max(...values);
          break;
      }
    });
    
    result.push(row);
  });
  
  return {
    headers: [...groupBy, ...aggregations.map(a => `${a.operation}_${a.field}`)],
    rows: result,
    fileName: data.fileName,
    rowCount: result.length,
    columnCount: result[0] ? Object.keys(result[0]).length : 0
  };
}
