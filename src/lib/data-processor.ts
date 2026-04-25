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
  // 深度分析新增
  deepAnalysis?: DeepAnalysis;
}

export interface DeepAnalysis {
  // 数据健康评分
  healthScore: {
    overall: number;      // 0-100
    completeness: number; // 完整性
    consistency: number;  // 一致性
    quality: number;      // 数据质量
    usability: number;    // 可用性
  };
  // 关键发现
  keyFindings: Array<{
    severity: 'critical' | 'warning' | 'info' | 'positive';
    category: 'quality' | 'distribution' | 'trend' | 'correlation' | 'anomaly' | 'insight';
    title: string;
    detail: string;
    impact: string;       // 影响说明
    suggestion: string;   // 建议措施
    relatedFields: string[];
  }>;
  // 字段相关性分析
  correlations: Array<{
    field1: string;
    field2: string;
    coefficient: number;  // -1 ~ 1
    strength: 'strong' | 'moderate' | 'weak';
    direction: 'positive' | 'negative';
  }>;
  // 分布分析
  distributions: Array<{
    field: string;
    type: 'normal' | 'skewed_left' | 'skewed_right' | 'bimodal' | 'uniform';
    skewness: number;
    kurtosis: number;
    description: string;
  }>;
  // 趋势分析（对有时间维度的数据）
  trends: Array<{
    field: string;
    direction: 'up' | 'down' | 'stable' | 'volatile';
    changeRate: number;
    description: string;
  }>;
  // 推荐图表
  recommendedCharts: Array<{
    chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'radar' | 'heatmap' | 'funnel';
    title: string;
    xField: string;
    yField: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  // 行动建议
  actionItems: Array<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    detail: string;
    expectedBenefit: string;
  }>;
  // 数据画像
  dataProfile: {
    dataType: string;          // 如 "销售数据"、"用户行为数据"
    suggestedIndustry: string; // 推测行业
    dataMaturity: 'raw' | 'cleaned' | 'structured' | 'analyzed';
    analysisPotential: 'high' | 'medium' | 'low';
    summary: string;
  };
}

export interface FieldStat {
  field: string;
  type: 'string' | 'number' | 'date' | 'mixed';
  count: number;
  nullCount: number;
  uniqueCount: number;
  sampleValues: CellValue[];
  // 数值统计（可选，数值类型字段有）
  numericStats?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    sum: number;
  };
  // 直接访问（兼容）
  min?: number;
  max?: number;
  mean?: number;
  sum?: number;
  topValues?: Array<{ value: string; count: number; percentage: number }>;
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
      numericStats,
      // 兼容：直接访问
      ...(numericStats ? {
        min: numericStats.min,
        max: numericStats.max,
        mean: numericStats.mean,
        sum: numericStats.sum
      } : {})
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

function generateDeepAnalysis(
  data: ParsedData, 
  fieldStats: FieldStat[], 
  summary: Summary, 
  anomalies: Anomaly[]
): DeepAnalysis {
  const healthScore = calculateHealthScore(data, fieldStats, summary, anomalies);
  const keyFindings = generateKeyFindings(data, fieldStats, summary, anomalies);
  const correlations = calculateCorrelations(data, fieldStats);
  const distributions = analyzeDistributions(data, fieldStats);
  const trends = analyzeTrends(data, fieldStats);
  const recommendedCharts = recommendCharts(data, fieldStats, summary);
  const actionItems = generateActionItems(healthScore, keyFindings, fieldStats, summary);
  const dataProfile = generateDataProfile(data, fieldStats, summary);

  return {
    healthScore,
    keyFindings,
    correlations,
    distributions,
    trends,
    recommendedCharts,
    actionItems,
    dataProfile
  };
}

function calculateHealthScore(
  data: ParsedData, 
  fieldStats: FieldStat[], 
  summary: Summary, 
  anomalies: Anomaly[]
): DeepAnalysis['healthScore'] {
  const totalCells = summary.totalRows * summary.totalColumns;
  // 完整性：非空比例
  const completeness = totalCells > 0 ? Math.round(((totalCells - summary.nullValues) / totalCells) * 100) : 100;
  // 一致性：非异常比例
  const anomalyRatio = anomalies.length / Math.max(totalCells, 1);
  const consistency = Math.round(Math.max(0, (1 - anomalyRatio * 10)) * 100);
  // 质量：综合完整性和一致性，加上重复率
  const dupRatio = summary.duplicateRows / Math.max(summary.totalRows, 1);
  const quality = Math.round(Math.max(0, (1 - dupRatio) * completeness * 0.5 + consistency * 0.5));
  // 可用性：基于字段类型分布
  const typeRatio = (summary.numericColumns + summary.dateColumns) / Math.max(summary.totalColumns, 1);
  const usability = Math.round(Math.min(100, typeRatio * 80 + completeness * 0.2));
  // 综合
  const overall = Math.round(completeness * 0.3 + consistency * 0.2 + quality * 0.3 + usability * 0.2);

  return { overall, completeness, consistency, quality, usability };
}

function generateKeyFindings(
  data: ParsedData, 
  fieldStats: FieldStat[], 
  summary: Summary, 
  anomalies: Anomaly[]
): DeepAnalysis['keyFindings'] {
  const findings: DeepAnalysis['keyFindings'] = [];
  const totalCells = summary.totalRows * summary.totalColumns;

  // 1. 空值问题
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
      relatedFields: worstFields.map(f => f.field)
    });
  }

  // 2. 重复数据
  if (summary.duplicateRows > 0) {
    const dupRatio = (summary.duplicateRows / summary.totalRows) * 100;
    findings.push({
      severity: dupRatio > 10 ? 'critical' : 'warning',
      category: 'quality',
      title: `发现 ${summary.duplicateRows} 行重复数据 (${dupRatio.toFixed(1)}%)`,
      detail: `数据集中存在 ${summary.duplicateRows} 行完全相同的数据记录`,
      impact: '重复数据会导致统计指标偏高，影响分析结论的可靠性',
      suggestion: '建议使用去重操作清除重复记录，去重前请确认是否为业务需要',
      relatedFields: []
    });
  }

  // 3. 数值分布异常
  fieldStats.filter(f => f.type === 'number' && f.numericStats).forEach(stat => {
    const ns = stat.numericStats!;
    const range = ns.max - ns.min;
    if (range === 0) {
      findings.push({
        severity: 'warning',
        category: 'distribution',
        title: `"${stat.field}" 字段值完全相同`,
        detail: `所有值均为 ${ns.min}，无变化`,
        impact: '该字段无分析价值，建议检查数据源或排除此字段',
        suggestion: '检查数据采集是否正确，或在分析时排除此字段',
        relatedFields: [stat.field]
      });
    }
    // 检查偏态
    const values = data.rows.map(r => Number(r[stat.field])).filter(v => !isNaN(v));
    if (values.length > 2) {
      const mean = ns.mean;
      const sorted = [...values].sort((a, b) => a - b);
      const median = sorted.length % 2 === 0 
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2 
        : sorted[Math.floor(sorted.length / 2)];
      const skewRatio = (mean - median) / Math.max(range, 1);
      if (Math.abs(skewRatio) > 0.3) {
        findings.push({
          severity: 'info',
          category: 'distribution',
          title: `"${stat.field}" 数据分布偏斜`,
          detail: `均值(${mean.toFixed(1)})与中位数(${median.toFixed(1)})差异较大，数据${skewRatio > 0 ? '右偏' : '左偏'}`,
          impact: '偏态分布下，均值可能不能代表典型值，建议使用中位数',
          suggestion: `分析时建议使用中位数 ${median.toFixed(1)} 替代均值 ${mean.toFixed(1)}`,
          relatedFields: [stat.field]
        });
      }
    }
    // 检查离群值
    const stdDev = calculateStdDev(values, ns.mean);
    const outlierCount = values.filter(v => Math.abs(v - ns.mean) > 2 * stdDev).length;
    if (outlierCount > 0) {
      findings.push({
        severity: outlierCount > values.length * 0.05 ? 'warning' : 'info',
        category: 'anomaly',
        title: `"${stat.field}" 存在 ${outlierCount} 个离群值`,
        detail: `超出2倍标准差范围，可能影响分析结果`,
        impact: '离群值会拉偏均值，影响趋势判断的准确性',
        suggestion: outlierCount <= 3 ? '建议逐一核实离群值，确认是否为数据录入错误' : '建议使用IQR方法检测并处理离群值',
        relatedFields: [stat.field]
      });
    }
  });

  // 4. 高基数字段
  const highCardFields = fieldStats.filter(f => f.uniqueCount > summary.totalRows * 0.9 && f.type === 'string');
  if (highCardFields.length > 0) {
    findings.push({
      severity: 'info',
      category: 'insight',
      title: '检测到可能的主键/ID字段',
      detail: `${highCardFields.map(f => `"${f.field}"`).join('、')} 唯一值占比超90%`,
      impact: '这些字段通常不适用于聚合分析，但可用于关联查询',
      suggestion: '在做统计分析时建议排除ID类字段',
      relatedFields: highCardFields.map(f => f.field)
    });
  }

  // 5. 低基数字段（适合分组分析）
  const lowCardFields = fieldStats.filter(f => 
    f.type === 'string' && f.uniqueCount >= 2 && f.uniqueCount <= 20 && f.nullCount === 0
  );
  if (lowCardFields.length > 0) {
    findings.push({
      severity: 'positive',
      category: 'insight',
      title: '发现适合分组分析的字段',
      detail: `${lowCardFields.map(f => `"${f.field}"(${f.uniqueCount}个类别)`).join('、')}`,
      impact: '这些字段可以作为分组维度，进行交叉分析',
      suggestion: `建议按"${lowCardFields[0].field}"分组，分析各组的数值指标差异`,
      relatedFields: lowCardFields.map(f => f.field)
    });
  }

  // 6. 积极发现 - 数据完整
  if (summary.nullValues === 0 && summary.duplicateRows === 0) {
    findings.push({
      severity: 'positive',
      category: 'quality',
      title: '数据质量优秀',
      detail: '未发现空值和重复数据，数据可直接用于分析',
      impact: '高质量数据保证分析结果的可靠性',
      suggestion: '可以放心进行深度分析',
      relatedFields: []
    });
  }

  return findings;
}

function calculateCorrelations(data: ParsedData, fieldStats: FieldStat[]): DeepAnalysis['correlations'] {
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  const correlations: DeepAnalysis['correlations'] = [];
  
  if (numericFields.length < 2) return correlations;
  
  // 取前10个数值字段做相关性分析
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

function analyzeDistributions(data: ParsedData, fieldStats: FieldStat[]): DeepAnalysis['distributions'] {
  return fieldStats
    .filter(f => f.type === 'number' && f.numericStats)
    .map(stat => {
      const values = data.rows.map(r => Number(r[stat.field])).filter(v => !isNaN(v));
      const ns = stat.numericStats!;
      
      // 计算偏度
      const mean = ns.mean;
      const stdDev = calculateStdDev(values, mean);
      const skewness = stdDev === 0 ? 0 : 
        values.reduce((s, v) => s + Math.pow((v - mean) / stdDev, 3), 0) / values.length;
      
      // 计算峰度
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

function analyzeTrends(data: ParsedData, fieldStats: FieldStat[]): DeepAnalysis['trends'] {
  const trends: DeepAnalysis['trends'] = [];
  
  // 找日期字段
  const dateFields = fieldStats.filter(f => f.type === 'date' || f.type === 'string');
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  
  if (numericFields.length === 0) return trends;
  
  // 对数值字段做趋势分析（按数据顺序）
  numericFields.slice(0, 5).forEach(stat => {
    const values = data.rows.map(r => Number(r[stat.field])).filter(v => !isNaN(v));
    if (values.length < 3) return;
    
    // 简单线性趋势：前半段均值 vs 后半段均值
    const mid = Math.floor(values.length / 2);
    const firstHalf = values.slice(0, mid);
    const secondHalf = values.slice(mid);
    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const changeRate = firstMean !== 0 ? ((secondMean - firstMean) / Math.abs(firstMean)) * 100 : 0;
    
    // 计算波动性
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

function recommendCharts(
  data: ParsedData, 
  fieldStats: FieldStat[], 
  summary: Summary
): DeepAnalysis['recommendedCharts'] {
  const charts: DeepAnalysis['recommendedCharts'] = [];
  const numericFields = fieldStats.filter(f => f.type === 'number' && f.numericStats);
  const textFields = fieldStats.filter(f => f.type === 'string' && f.uniqueCount <= 30 && f.uniqueCount >= 2);
  const dateFields = fieldStats.filter(f => f.type === 'date');
  
  // 有分类字段+数值字段 → 柱状图
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
  
  // 有日期字段+数值字段 → 折线图
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
  
  // 分类字段唯一值<=8 → 饼图
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
  
  // 两个数值字段 → 散点图
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
  
  // 面积图
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
  
  // 雷达图（多维度对比）
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

function generateActionItems(
  healthScore: DeepAnalysis['healthScore'],
  keyFindings: DeepAnalysis['keyFindings'],
  fieldStats: FieldStat[],
  summary: Summary
): DeepAnalysis['actionItems'] {
  const items: DeepAnalysis['actionItems'] = [];
  
  // 根据健康评分
  if (healthScore.completeness < 80) {
    items.push({
      priority: 'high',
      action: '处理缺失数据',
      detail: `数据完整性仅 ${healthScore.completeness}%，需优先处理空值`,
      expectedBenefit: '提升分析准确性，避免统计偏差'
    });
  }
  
  if (healthScore.consistency < 80) {
    items.push({
      priority: 'high',
      action: '修复数据异常',
      detail: `数据一致性为 ${healthScore.consistency}%，存在异常数据需要修正`,
      expectedBenefit: '保证分析结果的可靠性和可信度'
    });
  }
  
  // 根据关键发现
  const criticalFindings = keyFindings.filter(f => f.severity === 'critical');
  criticalFindings.forEach(f => {
    items.push({
      priority: 'high',
      action: f.suggestion.slice(0, 20),
      detail: f.suggestion,
      expectedBenefit: f.impact
    });
  });
  
  const warningFindings = keyFindings.filter(f => f.severity === 'warning');
  warningFindings.forEach(f => {
    items.push({
      priority: 'medium',
      action: f.suggestion.slice(0, 20),
      detail: f.suggestion,
      expectedBenefit: f.impact
    });
  });
  
  // 通用建议
  if (summary.numericColumns >= 2) {
    items.push({
      priority: 'medium',
      action: '进行相关性分析',
      detail: '数据中有多个数值字段，建议分析字段间的相关性，发现潜在关联',
      expectedBenefit: '可能发现隐藏的业务规律和因果关系'
    });
  }
  
  if (summary.totalRows > 100) {
    items.push({
      priority: 'low',
      action: '尝试AI深度洞察',
      detail: '数据量充足，建议使用AI助手进行更深度的自然语言分析',
      expectedBenefit: '获得更丰富的业务洞察和决策建议'
    });
  }
  
  return items;
}

function generateDataProfile(
  data: ParsedData, 
  fieldStats: FieldStat[], 
  summary: Summary
): DeepAnalysis['dataProfile'] {
  const fieldNames = fieldStats.map(f => f.field.toLowerCase());
  const numericFields = fieldStats.filter(f => f.type === 'number');
  const textFields = fieldStats.filter(f => f.type === 'string');
  
  // 推测数据类型
  let dataType = '通用数据';
  let suggestedIndustry = '通用';
  
  if (fieldNames.some(n => n.includes('销售') || n.includes('订单') || n.includes('金额') || n.includes('收入'))) {
    dataType = '销售/交易数据';
    suggestedIndustry = '电商/零售';
  } else if (fieldNames.some(n => n.includes('用户') || n.includes('注册') || n.includes('登录'))) {
    dataType = '用户行为数据';
    suggestedIndustry = '互联网/IT';
  } else if (fieldNames.some(n => n.includes('库存') || n.includes('入库') || n.includes('出库'))) {
    dataType = '库存管理数据';
    suggestedIndustry = '制造/物流';
  } else if (fieldNames.some(n => n.includes('学生') || n.includes('成绩') || n.includes('课程'))) {
    dataType = '教育/成绩数据';
    suggestedIndustry = '教育';
  } else if (fieldNames.some(n => n.includes('员工') || n.includes('薪资') || n.includes('部门'))) {
    dataType = '人力资源数据';
    suggestedIndustry = '人力资源';
  } else if (fieldNames.some(n => n.includes('财务') || n.includes('利润') || n.includes('成本'))) {
    dataType = '财务数据';
    suggestedIndustry = '金融/财务';
  }
  
  // 数据成熟度
  let dataMaturity: DeepAnalysis['dataProfile']['dataMaturity'] = 'raw';
  if (summary.nullValues === 0 && summary.duplicateRows === 0) {
    dataMaturity = summary.totalRows > 100 ? 'structured' : 'cleaned';
  }
  
  // 分析潜力
  const analysisPotential: DeepAnalysis['dataProfile']['analysisPotential'] = 
    numericFields.length >= 3 && summary.totalRows >= 50 ? 'high' :
    numericFields.length >= 1 && summary.totalRows >= 20 ? 'medium' : 'low';
  
  const summary2 = `共 ${summary.totalRows} 行 ${summary.totalColumns} 列${dataType !== '通用数据' ? `的${dataType}` : ''}，` +
    `包含 ${numericFields.length} 个数值字段和 ${textFields.length} 个文本字段，` +
    `${analysisPotential === 'high' ? '数据量充足、维度丰富，具有较高分析价值' : analysisPotential === 'medium' ? '可以进行基础的数据统计分析' : '建议补充更多数据后进行分析'}`;
  
  return {
    dataType,
    suggestedIndustry,
    dataMaturity,
    analysisPotential,
    summary: summary2
  };
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
