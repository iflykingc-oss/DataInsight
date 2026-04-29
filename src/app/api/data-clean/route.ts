import { NextResponse } from 'next/server';

export interface ParsedData {
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface CleanOperation {
  type: 'deduplicate' | 'fillna' | 'outlier' | 'normalize';
  fields: string[];
  options?: Record<string, unknown>;
}

export interface CleanResult {
  success: boolean;
  data?: ParsedData;
  stats: {
    removedRows: number;
    filledNulls: number;
    removedOutliers: number;
    normalizedFields: string[];
  };
  error?: string;
}

function deduplicate(rows: Record<string, unknown>[], fields: string[], keepFirst: boolean = true): { data: Record<string, unknown>[]; removed: number } {
  const seen = new Map<string, Record<string, unknown>>();
  const result: Record<string, unknown>[] = [];
  let removed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = fields.map(f => String(row[f] ?? '')).join('|||');

    if (!seen.has(key)) {
      seen.set(key, row);
      if (keepFirst) {
        result.push(row);
      }
    } else {
      removed++;
      if (!keepFirst) {
        seen.set(key, row);
      }
    }
  }

  if (!keepFirst) {
    for (const row of seen.values()) {
      result.push(row);
    }
  }

  return { data: result, removed };
}

function fillNa(rows: Record<string, unknown>[], field: string, method: string, value?: unknown): { data: Record<string, unknown>[]; filled: number } {
  const result = [...rows];
  let filled = 0;

  const numericValues = rows
    .map(r => r[field])
    .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
    .map(Number);

  const sum = numericValues.reduce((a, b) => a + b, 0);
  const mean = numericValues.length > 0 ? sum / numericValues.length : 0;
  const sorted = [...numericValues].sort((a, b) => a - b);
  const median = sorted.length > 0
    ? sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]
    : 0;

  const modeMap = new Map<number, number>();
  for (const v of numericValues) {
    modeMap.set(v, (modeMap.get(v) || 0) + 1);
  }
  let mode = 0;
  let maxCount = 0;
  for (const [v, count] of modeMap) {
    if (count > maxCount) {
      maxCount = count;
      mode = v;
    }
  }

  for (let i = 0; i < result.length; i++) {
    const cell = result[i][field];
    if (cell === null || cell === undefined || cell === '') {
      filled++;
      switch (method) {
        case 'value':
          result[i][field] = value ?? '';
          break;
        case 'mean':
          result[i][field] = mean;
          break;
        case 'median':
          result[i][field] = median;
          break;
        case 'mode':
          result[i][field] = mode;
          break;
        case 'forward':
          result[i][field] = i > 0 ? result[i - 1][field] : '';
          break;
        case 'backward':
          result[i][field] = i < result.length - 1 ? result[i + 1][field] : '';
          break;
        default:
          result[i][field] = '';
      }
    }
  }

  return { data: result, filled };
}

function removeOutliers(rows: Record<string, unknown>[], field: string, method: string, threshold: number = 3): { data: Record<string, unknown>[]; removed: number } {
  const result: Record<string, unknown>[] = [];
  let removed = 0;

  const numericValues = rows
    .map((r, i) => ({ value: Number(r[field]), index: i }))
    .filter(({ value }) => !isNaN(value));

  if (method === 'iqr') {
    const sorted = numericValues.map(v => v.value).sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    for (const row of rows) {
      const value = Number(row[field]);
      if (isNaN(value) || (value >= lowerBound && value <= upperBound)) {
        result.push(row);
      } else {
        removed++;
      }
    }
  } else if (method === 'zscore') {
    const values = numericValues.map(v => v.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    for (const row of rows) {
      const value = Number(row[field]);
      if (isNaN(value)) {
        result.push(row);
      } else {
        const zScore = Math.abs((value - mean) / stdDev);
        if (zScore <= threshold) {
          result.push(row);
        } else {
          removed++;
        }
      }
    }
  } else {
    return { data: rows, removed: 0 };
  }

  return { data: result, removed };
}

function normalize(rows: Record<string, unknown>[], field: string, method: string): { data: Record<string, unknown>[]; normalized: number } {
  const result = [...rows];
  let normalized = 0;

  for (let i = 0; i < result.length; i++) {
    const value = result[i][field];
    if (typeof value === 'string') {
      normalized++;
      switch (method) {
        case 'lowercase':
          result[i][field] = value.toLowerCase();
          break;
        case 'uppercase':
          result[i][field] = value.toUpperCase();
          break;
        case 'trim':
          result[i][field] = value.trim();
          break;
        default:
          result[i][field] = value;
      }
    }
  }

  return { data: result, normalized };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { data, operations } = body as { data: ParsedData; operations: CleanOperation[] };

    if (!data?.headers || !data?.rows) {
      return NextResponse.json<CleanResult>(
        { success: false, stats: { removedRows: 0, filledNulls: 0, removedOutliers: 0, normalizedFields: [] }, error: '请提供有效的数据' },
        { status: 400 }
      );
    }

    if (!operations || !Array.isArray(operations)) {
      return NextResponse.json<CleanResult>(
        { success: false, stats: { removedRows: 0, filledNulls: 0, removedOutliers: 0, normalizedFields: [] }, error: '请提供清洗操作列表' },
        { status: 400 }
      );
    }

    let currentData = [...data.rows];
    const stats = {
      removedRows: 0,
      filledNulls: 0,
      removedOutliers: 0,
      normalizedFields: [] as string[],
    };

    for (const op of operations) {
      if (!op.fields || op.fields.length === 0) continue;

      switch (op.type) {
        case 'deduplicate': {
          const keepFirst = op.options?.keepFirst !== false;
          const { data: deduped, removed } = deduplicate(currentData, op.fields, keepFirst);
          currentData = deduped;
          stats.removedRows += removed;
          break;
        }

        case 'fillna': {
          const method = (op.options?.method as string) || 'value';
          const value = op.options?.value;
          for (const field of op.fields) {
            const { data: filled, filled: count } = fillNa(currentData, field, method, value);
            currentData = filled;
            stats.filledNulls += count;
          }
          break;
        }

        case 'outlier': {
          const method = (op.options?.method as string) || 'iqr';
          const threshold = (op.options?.threshold as number) || 3;
          for (const field of op.fields) {
            const { data: cleaned, removed } = removeOutliers(currentData, field, method, threshold);
            currentData = cleaned;
            stats.removedOutliers += removed;
          }
          break;
        }

        case 'normalize': {
          const method = (op.options?.method as string) || 'trim';
          for (const field of op.fields) {
            const { data: normalized, normalized: count } = normalize(currentData, field, method);
            currentData = normalized;
            if (count > 0) {
              stats.normalizedFields.push(field);
            }
          }
          break;
        }
      }
    }

    return NextResponse.json<CleanResult>({
      success: true,
      data: {
        headers: data.headers,
        rows: currentData,
      },
      stats,
    });
  } catch (error) {
    return NextResponse.json<CleanResult>(
      { success: false, stats: { removedRows: 0, filledNulls: 0, removedOutliers: 0, normalizedFields: [] }, error: `清洗失败: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
