import type { ParsedData, CellValue } from '@/lib/data-processor';

export interface StandardizationResult {
  success: boolean;
  originalValue: CellValue;
  convertedValue: CellValue;
  error?: string;
}

export interface DateFormatResult {
  column: string;
  originalFormats: string[];
  targetFormat: string;
  changes: number;
  results: StandardizationResult[];
}

export interface NumberFormatResult {
  column: string;
  decimalPlaces: number;
  changes: number;
  results: StandardizationResult[];
}

const DATE_PATTERNS = [
  { regex: /^\d{4}-\d{2}-\d{2}$/, name: 'YYYY-MM-DD' },
  { regex: /^\d{4}\/\d{2}\/\d{2}$/, name: 'YYYY/MM/DD' },
  { regex: /^\d{2}\/\d{2}\/\d{4}$/, name: 'MM/DD/YYYY' },
  { regex: /^\d{2}-\d{2}-\d{4}$/, name: 'DD-MM-YYYY' },
  { regex: /^\d{4}年\d{1,2}月\d{1,2}日$/, name: 'YYYY年MM月DD日' },
];

export class FormatStandardizer {
  private data: ParsedData;

  constructor(data: ParsedData) {
    this.data = data;
  }

  standardizeDateFormat(
    column: string,
    targetFormat: 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'MM/DD/YYYY' = 'YYYY-MM-DD'
  ): DateFormatResult {
    const results: StandardizationResult[] = [];
    const detectedFormats: Set<string> = new Set();

    for (const row of this.data.rows) {
      const val = row[column];
      const strVal = String(val ?? '').trim();

      if (!strVal) {
        results.push({ success: true, originalValue: val, convertedValue: val });
        continue;
      }

      let matchedFormat: string | null = null;
      for (const pattern of DATE_PATTERNS) {
        if (pattern.regex.test(strVal)) {
          matchedFormat = pattern.name;
          detectedFormats.add(pattern.name);
          break;
        }
      }

      if (!matchedFormat) {
        results.push({
          success: false,
          originalValue: val,
          convertedValue: val,
          error: '无法识别的日期格式',
        });
        continue;
      }

      if (matchedFormat === targetFormat) {
        results.push({ success: true, originalValue: val, convertedValue: val });
        continue;
      }

      const converted = this.convertDateFormat(strVal, matchedFormat, targetFormat);
      if (converted) {
        results.push({ success: true, originalValue: val, convertedValue: converted });
      } else {
        results.push({
          success: false,
          originalValue: val,
          convertedValue: val,
          error: '日期转换失败',
        });
      }
    }

    const changes = results.filter(
      (r) => r.success && r.originalValue !== r.convertedValue
    ).length;

    return {
      column,
      originalFormats: Array.from(detectedFormats),
      targetFormat,
      changes,
      results,
    };
  }

  private convertDateFormat(
    value: string,
    fromFormat: string,
    toFormat: string
  ): string | null {
    const parts = this.parseDateParts(value, fromFormat);
    if (!parts) return null;

    switch (toFormat) {
      case 'YYYY-MM-DD':
        return `${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}`;
      case 'YYYY/MM/DD':
        return `${parts.year}/${parts.month.padStart(2, '0')}/${parts.day.padStart(2, '0')}`;
      case 'MM/DD/YYYY':
        return `${parts.month}/${parts.day}/${parts.year}`;
      default:
        return null;
    }
  }

  private parseDateParts(
    value: string,
    format: string
  ): { year: string; month: string; day: string } | null {
    const cleanValue = value.replace(/[年日月]/g, '/');

    if (format === 'YYYY-MM-DD' || format === 'YYYY/MM/DD') {
      const [year, month, day] = cleanValue.split('/');
      if (year && month && day) {
        return { year, month, day };
      }
    } else if (format === 'MM/DD/YYYY' || format === 'DD-MM-YYYY') {
      const [first, second, year] = cleanValue.split('/');
      if (format === 'MM/DD/YYYY') {
        return { year, month: first, day: second };
      } else {
        return { year, month: second, day: first };
      }
    } else if (format === 'YYYY年MM月DD日') {
      const match = value.match(/(\d+)年(\d+)月(\d+)日/);
      if (match) {
        return { year: match[1], month: match[2], day: match[3] };
      }
    }

    return null;
  }

  standardizeNumberFormat(
    column: string,
    decimalPlaces: number = 2
  ): NumberFormatResult {
    const results: StandardizationResult[] = [];

    for (const row of this.data.rows) {
      const val = row[column];
      const num = Number(val);

      if (isNaN(num) || val === null || val === undefined || val === '') {
        results.push({ success: true, originalValue: val, convertedValue: val });
        continue;
      }

      const formatted = Number(num.toFixed(decimalPlaces));
      results.push({ success: true, originalValue: val, convertedValue: formatted });
    }

    const changes = results.filter(
      (r) => r.success && r.originalValue !== r.convertedValue
    ).length;

    return {
      column,
      decimalPlaces,
      changes,
      results,
    };
  }

  trimWhitespace(columns?: string[]): { column: string; changes: number }[] {
    const targetColumns = columns || this.data.headers;
    const changesByColumn: { column: string; changes: number }[] = [];

    for (const column of targetColumns) {
      let changes = 0;

      for (const row of this.data.rows) {
        const val = row[column];
        if (typeof val === 'string') {
          const trimmed = val.trim().replace(/\s+/g, ' ');
          if (trimmed !== val) {
            changes++;
          }
        }
      }

      if (changes > 0) {
        changesByColumn.push({ column, changes });
      }
    }

    return changesByColumn;
  }

  removeEmptyRows(): { newData: ParsedData; removedCount: number } {
    const nonEmptyRows = this.data.rows.filter((row) =>
      this.data.headers.some((h) => {
        const val = row[h];
        return val !== null && val !== undefined && val !== '';
      })
    );

    return {
      newData: { ...this.data, rows: nonEmptyRows },
      removedCount: this.data.rows.length - nonEmptyRows.length,
    };
  }

  removeDuplicates(): { newData: ParsedData; removedCount: number } {
    const seen = new Set<string>();
    const uniqueRows: typeof this.data.rows = [];

    for (const row of this.data.rows) {
      const key = this.data.headers.map((h) => String(row[h] ?? '')).join('|');

      if (!seen.has(key)) {
        seen.add(key);
        uniqueRows.push(row);
      }
    }

    return {
      newData: { ...this.data, rows: uniqueRows },
      removedCount: this.data.rows.length - uniqueRows.length,
    };
  }
}

export function standardizeDateFormat(
  data: ParsedData,
  column: string,
  targetFormat: 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'MM/DD/YYYY' = 'YYYY-MM-DD'
): DateFormatResult {
  const standardizer = new FormatStandardizer(data);
  return standardizer.standardizeDateFormat(column, targetFormat);
}

export function removeEmptyRows(
  data: ParsedData
): { newData: ParsedData; removedCount: number } {
  const standardizer = new FormatStandardizer(data);
  return standardizer.removeEmptyRows();
}

export function removeDuplicates(
  data: ParsedData
): { newData: ParsedData; removedCount: number } {
  const standardizer = new FormatStandardizer(data);
  return standardizer.removeDuplicates();
}
