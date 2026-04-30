/**
 * 统一数据结构定义
 * 标准化的表格数据接口，方便后续扩展数据源时统一处理
 */

export enum FieldType {
  STRING = 'string',
  NUMBER = 'number',
  DATE = 'date',
  BOOLEAN = 'boolean',
}

export interface TableField {
  name: string;
  displayName: string;
  type: FieldType;
  sampleValue?: unknown;
}

export interface StandardTableData {
  id: string;
  name: string;
  sourceType: 'local' | 'feishu' | 'dingtalk' | 'wps';
  fields: TableField[];
  rows: Record<string, unknown>[];
  totalRows: number;
  createTime: number;
  updateTime: number;
}

/**
 * 将现有的 ParsedData 格式转为 StandardTableData
 * 兼容当前 data-processor 的 { headers, rows } 格式
 */
export function parsedDataToStandardTable(
  headers: string[],
  rows: Record<string, unknown>[],
  name: string = '未命名表格'
): StandardTableData {
  const fields: TableField[] = headers.map(header => {
    const type = inferFieldType(rows, header);
    const sampleValue = rows[0]?.[header];
    return { name: header, displayName: header, type, sampleValue };
  });

  return {
    id: `table_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name,
    sourceType: 'local',
    fields,
    rows,
    totalRows: rows.length,
    createTime: Date.now(),
    updateTime: Date.now(),
  };
}

/**
 * 从行数据推断字段类型
 */
function inferFieldType(rows: Record<string, unknown>[], field: string): FieldType {
  const sampleSize = Math.min(rows.length, 20);
  const samples: unknown[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const val = rows[i]?.[field];
    if (val !== null && val !== undefined && val !== '') {
      samples.push(val);
    }
  }

  if (samples.length === 0) return FieldType.STRING;

  // 数值类型检测
  const numberCount = samples.filter(v => {
    if (typeof v === 'number') return true;
    if (typeof v === 'string') return !isNaN(Number(v)) && v.trim() !== '';
    return false;
  }).length;
  if (numberCount / samples.length >= 0.8) return FieldType.NUMBER;

  // 日期类型检测
  const dateCount = samples.filter(v => {
    if (v instanceof Date) return true;
    if (typeof v === 'string') {
      const parsed = Date.parse(v);
      return !isNaN(parsed) && v.length > 4; // 避免把 "1234" 当日期
    }
    return false;
  }).length;
  if (dateCount / samples.length >= 0.8) return FieldType.DATE;

  // 布尔类型检测
  const boolCount = samples.filter(v => {
    if (typeof v === 'boolean') return true;
    const s = String(v).toLowerCase().trim();
    return ['true', 'false', '是', '否', 'yes', 'no', '1', '0'].includes(s);
  }).length;
  if (boolCount / samples.length >= 0.8) return FieldType.BOOLEAN;

  return FieldType.STRING;
}
