/**
 * 字段有效性引擎
 * 参考企业级数据质量最佳实践，融合到 DataInsight 架构中
 * 核心职责：判断字段是否有效、适合做指标/维度/排序
 */

import { percent } from '@/lib/utils';

// ===== 类型定义 =====

export enum FieldValidityType {
  VALID = 'valid',                      // 可正常分析
  INVALID_MISSING = 'invalid_missing',  // 缺失率过高（>80%）
  INVALID_CONSTANT = 'invalid_constant', // 常量无变化
  INVALID_UNIQUE = 'invalid_unique',     // 全唯一/主键，无统计意义
  INVALID_NOISE = 'invalid_noise',       // 噪声文本（长文本/URL/备注）
  ONLY_ORDER = 'only_order',             // 仅用于排序（序号/自增ID）
}

export interface FieldValidityStats {
  totalCount: number;
  validCount: number;
  missingRate: number;
  uniqueRate: number;
  sequentialScore: number;  // 序号模式评分 0-1
  idPatternScore: number;   // ID模式评分 0-1
}

export interface FieldValidityResult {
  fieldName: string;
  displayName: string;
  fieldType: string;
  validity: FieldValidityType;
  reason: string;
  stats: FieldValidityStats;
  canBeMetric: boolean;    // 可作为指标（数值字段，有统计意义）
  canBeDimension: boolean;  // 可作为维度（低基数文本字段）
  canBeOrderBy: boolean;   // 可用于排序（任意有效字段）
}

export interface FieldValidityConfig {
  missingRateThreshold: number;   // 缺失率阈值，默认80
  uniqueRateThreshold: number;    // 唯一率阈值，默认98
  constantThreshold: number;      // 常量阈值，默认1
  maxSequentialTolerance: number; // 序号容差，默认2
  maxTextLength: number;         // 噪声文本长度阈值，默认500
}

// ===== 默认配置 =====

const DEFAULT_CONFIG: FieldValidityConfig = {
  missingRateThreshold: 80,
  uniqueRateThreshold: 98,
  constantThreshold: 1,
  maxSequentialTolerance: 2,
  maxTextLength: 500,
};

// ===== 核心引擎 =====

/**
 * 分析所有字段的有效性
 */
export function analyzeFieldValidity(
  rows: Record<string, unknown>[],
  headers: string[]
): FieldValidityResult[] {
  if (!rows || rows.length === 0 || !headers || headers.length === 0) {
    return [];
  }
  const totalRows = rows.length;
  return headers.map(fieldName => {
    const displayName = fieldName;
    const rawValues = rows.map(row => row[fieldName]);
    return analyzeSingleField(fieldName, displayName, rawValues, totalRows, DEFAULT_CONFIG);
  });
}

/**
 * 分析单个字段的有效性
 */
function analyzeSingleField(
  fieldName: string,
  displayName: string,
  rawValues: unknown[],
  totalRows: number,
  cfg: FieldValidityConfig
): FieldValidityResult {
  // Step 1: 计算基础统计
  const cleaned = rawValues.filter(v => v != null && v !== undefined && v !== '');
  const validCount = cleaned.length;
  const missingRate = percent(totalRows - validCount, totalRows);
  const uniqueValues = new Set(cleaned.map(v => String(v).trim()));
  const uniqueCount = uniqueValues.size;
  const uniqueRate = percent(uniqueCount, validCount);

  // Step 2: 推断字段类型
  const fieldType = inferFieldType(cleaned);

  // Step 3: 计算特殊评分
  const sequentialScore = computeSequentialScore(cleaned, cfg);
  const idPatternScore = computeIdPatternScore(displayName, uniqueRate);

  // Step 4: 有效性判断流水线（按优先级）
  const isSequential = sequentialScore >= 0.85;
  const isUniqueId = idPatternScore >= 0.8;
  const isNoise = isNoiseText(cleaned, fieldType, cfg.maxTextLength);

  // 3.1 缺失率过高
  if (missingRate >= cfg.missingRateThreshold || validCount === 0) {
    return buildResult(fieldName, displayName, fieldType, FieldValidityType.INVALID_MISSING,
      '缺失率过高，无法分析', validCount, missingRate, uniqueRate,
      sequentialScore, idPatternScore, false, false, false);
  }
  // 3.2 常量字段
  if (uniqueRate <= cfg.constantThreshold) {
    return buildResult(fieldName, displayName, fieldType, FieldValidityType.INVALID_CONSTANT,
      '字段值无变化，无分析价值', validCount, missingRate, uniqueRate,
      sequentialScore, idPatternScore, false, false, false);
  }
  // 3.3 序号/自增ID
  if (isSequential) {
    return buildResult(fieldName, displayName, fieldType, FieldValidityType.ONLY_ORDER,
      '序号/自增ID，仅用于排序', validCount, missingRate, uniqueRate,
      sequentialScore, idPatternScore, false, false, true);
  }
  // 3.4 主键/唯一标识
  if (isUniqueId) {
    return buildResult(fieldName, displayName, fieldType, FieldValidityType.INVALID_UNIQUE,
      '唯一标识，无统计意义', validCount, missingRate, uniqueRate,
      sequentialScore, idPatternScore, false, false, true);
  }
  // 3.5 噪声文本
  if (isNoise) {
    return buildResult(fieldName, displayName, fieldType, FieldValidityType.INVALID_NOISE,
      '长文本/URL/备注，不参与分析', validCount, missingRate, uniqueRate,
      sequentialScore, idPatternScore, false, false, false);
  }
  // 3.6 字符串全唯一
  if (uniqueRate >= cfg.uniqueRateThreshold && fieldType === 'string') {
    return buildResult(fieldName, displayName, fieldType, FieldValidityType.INVALID_UNIQUE,
      '字符串全唯一，无分组价值', validCount, missingRate, uniqueRate,
      sequentialScore, idPatternScore, false, false, true);
  }

  // Step 5: 判断字段用途
  const canBeMetric = fieldType === 'number';
  const canBeDimension = fieldType === 'string' && uniqueCount >= 2 && uniqueCount <= 50;
  const canBeOrderBy = true;

  return buildResult(fieldName, displayName, fieldType, FieldValidityType.VALID,
    '可正常分析', validCount, missingRate, uniqueRate,
    sequentialScore, idPatternScore, canBeMetric, canBeDimension, canBeOrderBy);
}

// ===== 工具函数 =====

/**
 * 推断字段类型
 */
function inferFieldType(values: unknown[]): string {
  if (values.length === 0) return 'string';
  const sample = values.slice(0, 100);
  const numericCount = sample.filter(v => isNumeric(v)).length;
  const dateCount = sample.filter(v => isDateValue(v)).length;
  const boolCount = sample.filter(v => isBooleanValue(v)).length;
  const total = sample.length;
  if (numericCount / total >= 0.8) return 'number';
  if (dateCount / total >= 0.8) return 'date';
  if (boolCount / total >= 0.8) return 'boolean';
  return 'string';
}

function isNumeric(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  const n = Number(val);
  return !isNaN(n) && isFinite(n);
}

function isDateValue(val: unknown): boolean {
  if (val === null || val === undefined || val === '') return false;
  const d = new Date(String(val));
  return !isNaN(d.getTime());
}

function isBooleanValue(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const lower = String(val).toLowerCase();
  return lower === 'true' || lower === 'false' || val === true || val === false;
}

/**
 * 计算序号模式评分（0-1）
 * 识别自增序号、连续数字等
 */
function computeSequentialScore(values: unknown[], cfg: FieldValidityConfig): number {
  try {
    const nums = values
      .map(v => Number(v))
      .filter(n => !isNaN(n) && isFinite(n));

    if (nums.length < Math.max(10, values.length * 0.5)) return 0;

    // 检查是否是自增序列（差值稳定）
    let matchCount = 0;
    for (let i = 1; i < nums.length; i++) {
      const diff = nums[i] - nums[i - 1];
      // 允许一定的容差
      if (diff >= 1 && diff <= cfg.maxSequentialTolerance + 1) {
        matchCount++;
      }
    }
    return matchCount / (nums.length - 1);
  } catch {
    return 0;
  }
}

/**
 * 计算ID模式评分（0-1）
 * 基于字段名称和基数判断
 */
function computeIdPatternScore(fieldName: string, uniqueRate: number): number {
  const lower = fieldName.toLowerCase();
  const idPatterns = [
    'id', 'no', 'num', '编号', '序号', '流水号', '编码', 'code',
    'uuid', 'guid', 'key', 'pk', 'uid', 'sid'
  ];
  const hasIdPattern = idPatterns.some(p => lower.includes(p));
  const hasHighCardinality = uniqueRate >= 90;

  if (hasIdPattern && hasHighCardinality) return 0.95;
  if (hasIdPattern) return 0.7;
  if (hasHighCardinality) return 0.5;
  return 0;
}

/**
 * 检测是否为噪声文本
 */
function isNoiseText(values: unknown[], fieldType: string, maxLength: number): boolean {
  if (fieldType !== 'string') return false;
  if (values.length === 0) return false;

  // 检查是否是URL
  const urlPattern = /^https?:\/\/|www\.|\.com|\.cn|\.org/i;
  const urlCount = values.filter(v => typeof v === 'string' && urlPattern.test(v)).length;
  if (urlCount / values.length >= 0.5) return true;

  // 检查是否过长（可能是备注/描述/文本内容）
  const avgLength = values.reduce((sum: number, v) => sum + String(v).length, 0) / values.length;
  if (avgLength > maxLength) return true;

  // 检查是否包含大量标点（可能是备注/日志）
  const punctPattern = /[,，。;；!！?？]{3,}/;
  const punctCount = values.filter(v => typeof v === 'string' && punctPattern.test(v)).length;
  if (punctCount / values.length >= 0.3) return true;

  return false;
}

/**
 * 构建结果对象
 */
function buildResult(
  fieldName: string,
  displayName: string,
  fieldType: string,
  validity: FieldValidityType,
  reason: string,
  validCount: number,
  missingRate: number,
  uniqueRate: number,
  sequentialScore: number,
  idPatternScore: number,
  canBeMetric: boolean,
  canBeDimension: boolean,
  canBeOrderBy: boolean
): FieldValidityResult {
  return {
    fieldName,
    displayName,
    fieldType,
    validity,
    reason,
    stats: {
      totalCount: validCount + Math.round(validCount * missingRate / (100 - missingRate + 0.001)),
      validCount,
      missingRate,
      uniqueRate,
      sequentialScore: Math.round(sequentialScore * 100) / 100,
      idPatternScore: Math.round(idPatternScore * 100) / 100,
    },
    canBeMetric,
    canBeDimension,
    canBeOrderBy,
  };
}

/**
 * 快速获取可分析字段列表（排除无效字段）
 */
export function getValidFields(validityResults: FieldValidityResult[]): FieldValidityResult[] {
  return validityResults.filter(r =>
    r.validity === FieldValidityType.VALID ||
    r.validity === FieldValidityType.ONLY_ORDER
  );
}

/**
 * 获取可作为指标的字段
 */
export function getMetricFields(validityResults: FieldValidityResult[]): FieldValidityResult[] {
  return validityResults.filter(r => r.canBeMetric);
}

/**
 * 获取可作为维度的字段
 */
export function getDimensionFields(validityResults: FieldValidityResult[]): FieldValidityResult[] {
  return validityResults.filter(r => r.canBeDimension);
}

/**
 * 获取需要清洗的字段
 */
export function getFieldsNeedingCleaning(validityResults: FieldValidityResult[]): FieldValidityResult[] {
  return validityResults.filter(r =>
    r.validity !== FieldValidityType.VALID &&
    r.validity !== FieldValidityType.INVALID_MISSING
  );
}
