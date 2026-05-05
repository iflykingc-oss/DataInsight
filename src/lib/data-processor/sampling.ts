/**
 * 数据分析引擎 - 智能采样
 */
import type { ParsedData, CellValue, SamplingOptions, SamplingResult } from './types';

/** 智能采样主函数 */
export function smartSample(
  data: ParsedData,
  options: SamplingOptions = {}
): SamplingResult {
  const { maxRows = 1000, strategy = 'stratified', seed = 42, labelColumn } = options;
  const originalRowCount = data.rows.length;

  if (originalRowCount <= maxRows) {
    return { data, wasSampled: false, originalRowCount, sampledRowCount: originalRowCount, samplingRatio: 1, method: 'none' };
  }

  let sampledRows: Record<string, CellValue>[];
  let method: string;

  switch (strategy) {
    case 'head':
      sampledRows = data.rows.slice(0, maxRows);
      method = 'head';
      break;
    case 'random':
      sampledRows = randomSample(data.rows, maxRows, seed);
      method = 'random';
      break;
    case 'stratified':
      if (labelColumn) {
        sampledRows = stratifiedSample(data.rows, maxRows, labelColumn, seed);
        method = 'stratified';
      } else {
        sampledRows = mixedSample(data.rows, maxRows, seed);
        method = 'mixed';
      }
      break;
    default:
      sampledRows = data.rows.slice(0, maxRows);
      method = 'head';
  }

  return {
    data: { ...data, rows: sampledRows, rowCount: sampledRows.length },
    wasSampled: true,
    originalRowCount,
    sampledRowCount: sampledRows.length,
    samplingRatio: sampledRows.length / originalRowCount,
    method
  };
}

function randomSample(rows: Record<string, CellValue>[], count: number, seed: number): Record<string, CellValue>[] {
  const shuffled = [...rows];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(seed % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

function stratifiedSample(rows: Record<string, CellValue>[], count: number, labelColumn: string, seed: number): Record<string, CellValue>[] {
  const groups = new Map<string, Record<string, CellValue>[]>();
  for (const row of rows) {
    const label = String(row[labelColumn] ?? 'unknown');
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label)!.push(row);
  }

  const result: Record<string, CellValue>[] = [];
  const perGroupCount = Math.max(1, Math.floor(count / groups.size));

  for (const [, groupRows] of groups) {
    if (groupRows.length <= perGroupCount) {
      result.push(...groupRows);
    } else {
      result.push(...randomSample(groupRows, perGroupCount, seed));
    }
  }

  if (result.length < count) {
    const remaining = count - result.length;
    const notInResult = rows.filter(r => !result.includes(r));
    result.push(...randomSample(notInResult, remaining, seed));
  }

  return result.slice(0, count);
}

function mixedSample(rows: Record<string, CellValue>[], count: number, seed: number): Record<string, CellValue>[] {
  const headCount = Math.floor(count * 0.4);
  const tailCount = Math.floor(count * 0.4);
  const randomCount = count - headCount - tailCount;
  return [
    ...rows.slice(0, headCount),
    ...rows.slice(-tailCount),
    ...randomSample(rows.slice(headCount, -tailCount), randomCount, seed)
  ];
}

/** 计算Token估算 */
export function estimateTokenCount(data: ParsedData): number {
  let tokenCount = data.headers.join(' ').length / 4;
  tokenCount += data.rows.length * data.headers.length * 5;
  return Math.ceil(tokenCount);
}

/** 判断字段是否为ID类字段 */
export function isIdField(header: string, rows: ParsedData['rows'], rowCount: number): boolean {
  const h = header.toLowerCase();
  if (/^(序号|no\.?|id|编号|code|编码|index|流水号|单号|订单号|user_?id|customer_?id|主键|外键)/.test(h)) return true;
  if (rowCount < 10) return false;
  const uniqueCount = new Set(rows.map(r => String(r[header]))).size;
  return uniqueCount > rowCount * 0.8;
}

/** 获取采样建议 */
export function getSamplingRecommendation(data: ParsedData): {
  shouldSample: boolean;
  recommendedStrategy: 'head' | 'random' | 'stratified';
  estimatedTokens: number;
  maxTokens: number;
  message: string;
} {
  const rowCount = data.rows.length;
  const estimatedTokens = estimateTokenCount(data);
  const maxTokens = 8000;

  let recommendedStrategy: 'head' | 'random' | 'stratified' = 'head';
  const idFieldCount = data.headers.filter(h => isIdField(h, data.rows, rowCount)).length;
  const categoryColumns = data.headers.filter(h => {
    if (idFieldCount > 0) return false;
    const uniqueCount = new Set(data.rows.map(r => String(r[h]))).size;
    return uniqueCount > 1 && uniqueCount < rowCount * 0.5;
  });

  if (categoryColumns.length > 0) recommendedStrategy = 'stratified';

  const shouldSample = estimatedTokens > maxTokens || rowCount > 10000;

  let message = '';
  if (shouldSample) {
    if (rowCount > 10000) {
      message = `数据量较大（${rowCount.toLocaleString()}行），建议采样以提升分析速度`;
    } else {
      message = `预估Token超过${maxTokens}，建议采样以避免超出模型上下文限制`;
    }
    if (recommendedStrategy === 'stratified') {
      message += '，检测到分类列，将使用分层采样保持数据分布';
    }
  }

  return { shouldSample, recommendedStrategy, estimatedTokens, maxTokens, message };
}
