/**
 * 数据分析引擎 - 数据聚合
 */
import type { ParsedData, CellValue } from './types';

export function aggregateData(
  data: ParsedData,
  groupBy: string[],
  aggregations: { field: string; operation: 'sum' | 'avg' | 'count' | 'min' | 'max' }[]
): ParsedData {
  const groups = new Map<string, Record<string, CellValue>[]>();

  data.rows.forEach(row => {
    const key = groupBy.map(field => String(row[field])).join('|');
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(row);
  });

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
