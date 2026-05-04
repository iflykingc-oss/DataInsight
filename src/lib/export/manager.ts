import type { ParsedData, CellValue } from '@/types';

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'tsv' | 'html';
  fileName?: string;
  includeHeaders?: boolean;
  delimiter?: string;
  encoding?: 'utf-8' | 'gbk' | 'gb2312';
  dateFormat?: string;
  numberFormat?: string;
  preserveStyles?: boolean;
  sheetName?: string;
  compress?: boolean;
  metadata?: ExportMetadata;
}

export interface ExportMetadata {
  exportTime?: string;
  originalFileName?: string;
  rowCount?: number;
  colCount?: number;
  exportedBy?: string;
  dataHash?: string;
}

export interface ExportPreset {
  id: string;
  name: string;
  description: string;
  options: Partial<ExportOptions>;
}

export interface ExportResult {
  success: boolean;
  blob?: Blob;
  fileName?: string;
  mimeType?: string;
  size?: number;
  downloadUrl?: string;
  error?: string;
  warnings?: string[];
}

export interface ImportOptions {
  format: 'csv' | 'xlsx' | 'json' | 'tsv';
  delimiter?: string;
  encoding?: 'utf-8' | 'gbk' | 'gb2312';
  headerRow?: boolean;
  skipRows?: number;
  dateColumns?: string[];
  numberColumns?: string[];
  trimWhitespace?: boolean;
}

export interface ImportResult {
  success: boolean;
  data?: ParsedData;
  warnings?: string[];
  errors?: string[];
  metadata?: {
    rowCount: number;
    colCount: number;
    detectedHeaders: boolean;
    fileName?: string;
  };
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    id: 'standard-csv',
    name: '标准 CSV',
    description: '逗号分隔，UTF-8 编码，适合 Excel 直接打开',
    options: {
      format: 'csv',
      encoding: 'utf-8',
      delimiter: ',',
      includeHeaders: true,
    },
  },
  {
    id: 'excel-compatible',
    name: 'Excel 兼容',
    description: 'xlsx 格式，保留数字和日期格式',
    options: {
      format: 'xlsx',
      preserveStyles: true,
      includeHeaders: true,
    },
  },
  {
    id: 'json-data',
    name: 'JSON 数据',
    description: '结构化 JSON 格式，适合程序处理',
    options: {
      format: 'json',
      includeHeaders: true,
    },
  },
  {
    id: 'html-table',
    name: 'HTML 表格',
    description: 'HTML 格式，可在浏览器中直接预览',
    options: {
      format: 'html',
      includeHeaders: true,
    },
  },
  {
    id: 'tab-separated',
    name: '制表符分隔',
    description: 'Tab 分隔，适合大文本数据',
    options: {
      format: 'tsv',
      delimiter: '\t',
      encoding: 'utf-8',
    },
  },
];

const MIME_TYPES: Record<string, string> = {
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  json: 'application/json',
  tsv: 'text/tab-separated-values;charset=utf-8',
  html: 'text/html;charset=utf-8',
};

export class ExportManager {
  private defaultOptions: ExportOptions = {
    format: 'csv',
    includeHeaders: true,
    delimiter: ',',
    encoding: 'utf-8',
    dateFormat: 'YYYY-MM-DD',
    numberFormat: '#,##0.00',
    preserveStyles: false,
    compress: false,
  };

  async export(data: ParsedData, options?: Partial<ExportOptions>): Promise<ExportResult> {
    const opts = { ...this.defaultOptions, ...options };
    const warnings: string[] = [];

    try {
      if (!data.headers || data.headers.length === 0) {
        return { success: false, error: '没有可导出的数据' };
      }

      if (!data.rows || data.rows.length === 0) {
        warnings.push('数据为空');
      }

      let blob: Blob;
      let mimeType = MIME_TYPES[opts.format];

      switch (opts.format) {
        case 'csv':
          blob = this.exportCSV(data, opts);
          break;
        case 'xlsx':
          blob = await this.exportXLSX(data, opts);
          mimeType = MIME_TYPES.xlsx;
          break;
        case 'json':
          blob = this.exportJSON(data, opts);
          break;
        case 'tsv':
          blob = this.exportTSV(data, opts);
          mimeType = MIME_TYPES.tsv;
          break;
        case 'html':
          blob = this.exportHTML(data, opts);
          mimeType = MIME_TYPES.html;
          break;
        default:
          return { success: false, error: `不支持的格式: ${opts.format}` };
      }

      const fileName = opts.fileName || this.generateFileName(data, opts.format);

      return {
        success: true,
        blob,
        fileName,
        mimeType,
        size: blob.size,
        downloadUrl: URL.createObjectURL(blob),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '导出失败',
      };
    }
  }

  private exportCSV(data: ParsedData, opts: ExportOptions): Blob {
    const BOM = '\uFEFF';
    const delimiter = opts.delimiter || ',';
    const lines: string[] = [];

    if (opts.includeHeaders) {
      lines.push(this.formatRow(data.headers, delimiter, opts));
    }

    for (const row of data.rows) {
      const values = data.headers.map((h) => this.formatValue(row[h], opts));
      lines.push(this.formatRow(values, delimiter, opts));
    }

    const csvContent = lines.join('\r\n');
    return new Blob([BOM + csvContent], { type: MIME_TYPES.csv });
  }

  private exportTSV(data: ParsedData, opts: ExportOptions): Blob {
    const BOM = '\uFEFF';
    const delimiter = '\t';
    const lines: string[] = [];

    if (opts.includeHeaders) {
      lines.push(this.formatRow(data.headers, delimiter, opts));
    }

    for (const row of data.rows) {
      const values = data.headers.map((h) => this.formatValue(row[h], opts));
      lines.push(this.formatRow(values, delimiter, opts));
    }

    const content = lines.join('\r\n');
    return new Blob([BOM + content], { type: MIME_TYPES.tsv });
  }

  private exportJSON(data: ParsedData, opts: ExportOptions): Blob {
    const exportData = opts.includeHeaders
      ? data.rows.map((row) => {
          const obj: Record<string, CellValue> = {};
          data.headers.forEach((h) => {
            obj[h] = row[h];
          });
          return obj;
        })
      : data.rows;

    const jsonContent = JSON.stringify(
      {
        metadata: {
          exportTime: new Date().toISOString(),
          rowCount: data.rows.length,
          colCount: data.headers.length,
          headers: opts.includeHeaders ? data.headers : undefined,
        },
        data: exportData,
      },
      null,
      2
    );

    return new Blob([jsonContent], { type: MIME_TYPES.json });
  }

  private exportHTML(data: ParsedData, opts: ExportOptions): Blob {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>数据导出 - ${new Date().toLocaleDateString('zh-CN')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
    h1 { font-size: 18px; margin-bottom: 10px; color: #333; }
    .info { font-size: 12px; color: #666; margin-bottom: 15px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f5f5f5; font-weight: 600; position: sticky; top: 0; }
    tr:nth-child(even) { background: #fafafa; }
    tr:hover { background: #f0f0f0; }
    .numeric { text-align: right; }
    .footer { margin-top: 15px; font-size: 11px; color: #999; }
  </style>
</head>
<body>
  <h1>数据导出报表</h1>
  <div class="info">
    导出时间: ${new Date().toLocaleString('zh-CN')} |
    共 ${data.rows.length} 行 × ${data.headers.length} 列
  </div>
  <table>
    <thead>
      <tr>
        ${data.headers.map((h) => `<th>${this.escapeHTML(h)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.rows
        .map(
          (row) =>
            `<tr>${data.headers.map((h) => {
              const val = row[h];
              const isNumeric = typeof val === 'number';
              return `<td class="${isNumeric ? 'numeric' : ''}">${this.escapeHTML(String(val ?? ''))}</td>`;
            })}</tr>`
        )
        .join('\n      ')}
    </tbody>
  </table>
  <div class="footer">由 DataInsight AI表格智能体 生成</div>
</body>
</html>`;

    return new Blob([html], { type: MIME_TYPES.html });
  }

  private async exportXLSX(data: ParsedData, opts: ExportOptions): Promise<Blob> {
    const xlsxData = this.generateXLSXContent(data, opts);
    return new Blob([xlsxData], { type: MIME_TYPES.xlsx });
  }

  private generateXLSXContent(data: ParsedData, opts: ExportOptions): ArrayBuffer {
    const sheetData = this.createSheetData(data);
    const xlsxBuilder = new XLSXBuilder();
    return xlsxBuilder.build(sheetData, {
      sheetName: opts.sheetName || '数据',
      dateFormat: opts.dateFormat || 'YYYY-MM-DD',
      numberFormat: opts.numberFormat || '#,##0.00',
    });
  }

  private createSheetData(data: ParsedData): SheetData {
    const rows: CellData[][] = [];

    rows.push(
      data.headers.map((h) => ({
        value: h,
        type: 'string' as const,
        style: { bold: true, bgColor: '#f0f0f0' },
      }))
    );

    for (const row of data.rows) {
      const rowData: CellData[] = data.headers.map((h) => {
        const val = row[h];
        const cellData = this.createCellData(val, opts);
        return cellData;
      });
      rows.push(rowData);
    }

    return { rows };
  }

  private createCellData(value: CellValue, opts: ExportOptions): CellData {
    if (value === null || value === undefined || value === '') {
      return { value: '', type: 'string' };
    }

    if (typeof value === 'number') {
      return {
        value,
        type: 'number',
        format: opts.numberFormat || '#,##0.00',
      };
    }

    if (typeof value === 'boolean') {
      return { value: value ? '是' : '否', type: 'string' };
    }

    const strVal = String(value);

    if (this.isDateValue(strVal)) {
      const date = new Date(strVal);
      if (!isNaN(date.getTime())) {
        return {
          value: date,
          type: 'date',
          format: opts.dateFormat || 'YYYY-MM-DD',
        };
      }
    }

    return { value: strVal, type: 'string' };
  }

  private isDateValue(value: string): boolean {
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{4}\/\d{2}\/\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{2}-\d{2}-\d{4}$/,
    ];
    return datePatterns.some((p) => p.test(value));
  }

  private formatRow(values: string[], delimiter: string, opts: ExportOptions): string {
    return values
      .map((v) => this.formatValue(v, opts))
      .map((v) => {
        if (v.includes(delimiter) || v.includes('"') || v.includes('\n')) {
          return `"${v.replace(/"/g, '""')}"`;
        }
        return v;
      })
      .join(delimiter);
  }

  private formatValue(value: CellValue, opts: ExportOptions): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'number') {
      return opts.numberFormat
        ? this.formatNumber(value, opts.numberFormat)
        : String(value);
    }

    if (typeof value === 'boolean') {
      return value ? '是' : '否';
    }

    return String(value);
  }

  private formatNumber(num: number, format: string): string {
    if (format.includes(',')) {
      const parts = format.split('.');
      const intPart = parts[0].replace(/,/g, '');
      const decPart = parts[1] ? parts[1].replace(/#/g, '').length : 0;
      return num.toLocaleString('zh-CN', {
        minimumFractionDigits: decPart,
        maximumFractionDigits: decPart,
      });
    }
    return String(num);
  }

  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private generateFileName(data: ParsedData, format: string): string {
    const timestamp = new Date().toISOString().slice(0, 10);
    const rowCount = data.rows.length;
    return `数据导出_${rowCount}行_${timestamp}.${format}`;
  }

  download(result: ExportResult): void {
    if (!result.success || !result.blob || !result.downloadUrl) {
      throw new Error(result.error || '无法下载');
    }

    const link = document.createElement('a');
    link.href = result.downloadUrl;
    link.download = result.fileName || 'export';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      URL.revokeObjectURL(result.downloadUrl!);
    }, 1000);
  }

  getPresets(): ExportPreset[] {
    return [...EXPORT_PRESETS];
  }

  createPreset(name: string, options: Partial<ExportOptions>): ExportPreset {
    return {
      id: `custom-${Date.now()}`,
      name,
      description: '自定义导出配置',
      options,
    };
  }
}

interface CellData {
  value: string | number | Date | boolean;
  type: 'string' | 'number' | 'date' | 'boolean';
  format?: string;
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    bgColor?: string;
    fontColor?: string;
    align?: 'left' | 'center' | 'right';
  };
}

interface SheetData {
  rows: CellData[][];
}

class XLSXBuilder {
  build(sheetData: SheetData, options: { sheetName: string; dateFormat: string; numberFormat: string }): ArrayBuffer {
    const { rows } = sheetData;
    const colCount = Math.max(...rows.map((r) => r.length));
    const rowCount = rows.length;

    const sharedStrings: string[] = [];
    const stringIndex = new Map<string, number>();

    function getStringIndex(str: string): number {
      if (stringIndex.has(str)) {
        return stringIndex.get(str)!;
      }
      const index = sharedStrings.length;
      sharedStrings.push(str);
      stringIndex.set(str, index);
      return index;
    }

    const cellData: { row: number; col: number; value: string; type: string; format?: string }[] = [];

    for (let r = 0; r < rowCount; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        const cell = rows[r][c];
        if (!cell) continue;

        let value: string;
        let type = 's';

        if (cell.type === 'string') {
          value = String(cell.value);
          type = 's';
        } else if (cell.type === 'number') {
          value = String(cell.value);
          type = 'n';
        } else if (cell.type === 'date') {
          value = String((cell.value as Date).getTime());
          type = 'n';
        } else {
          value = String(cell.value);
          type = 's';
        }

        cellData.push({
          row: r + 1,
          col: c + 1,
          value,
          type,
          format: cell.format,
        });
      }
    }

    const xlsxContent = this.buildXLSXxml(cellData, colCount, rowCount, sharedStrings, options);
    return this.stringToArrayBuffer(xlsxContent);
  }

  private buildXLSXxml(
    cells: { row: number; col: number; value: string; type: string; format?: string }[],
    colCount: number,
    rowCount: number,
    sharedStrings: string[],
    options: { sheetName: string; dateFormat: string; numberFormat: string }
  ): string {
    const { sheetName, dateFormat, numberFormat } = options;

    let cellXml = '';
    for (const cell of cells) {
      const colLetter = this.getColumnLetter(cell.col);
      const cellRef = `${colLetter}${cell.row}`;

      if (cell.type === 's') {
        const strIndex = sharedStrings.indexOf(cell.value);
        cellXml += `<c r="${cellRef}" t="s"><v>${strIndex}</v></c>`;
      } else if (cell.type === 'n') {
        if (cell.format && cell.format.includes(',')) {
          cellXml += `<c r="${cellRef}" s="1"><v>${cell.value}</v></c>`;
        } else {
          cellXml += `<c r="${cellRef}"><v>${cell.value}</v></c>`;
        }
      }
    }

    let rowXml = '';
    for (let r = 1; r <= rowCount; r++) {
      const rowCells = cells.filter((c) => c.row === r);
      if (rowCells.length > 0) {
        rowXml += `<row r="${r}">${rowCells.map((c) => {
          const colLetter = this.getColumnLetter(c.col);
          const cellRef = `${colLetter}${c.row}`;
          if (c.type === 's') {
            const strIndex = sharedStrings.indexOf(c.value);
            return `<c r="${cellRef}" t="s"><v>${strIndex}</v></c>`;
          } else {
            return `<c r="${cellRef}"><v>${c.value}</v></c>`;
          }
        }).join('')}</row>`;
      }
    }

    const sharedStringsXml = sharedStrings.map((s) => `<si><t>${this.escapeXml(s)}</t></si>`).join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${sheetName}" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;
  }

  private getColumnLetter(col: number): string {
    let letter = '';
    while (col > 0) {
      const mod = (col - 1) % 26;
      letter = String.fromCharCode(65 + mod) + letter;
      col = Math.floor((col - 1) / 26);
    }
    return letter;
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private stringToArrayBuffer(str: string): ArrayBuffer {
    const encoder = new TextEncoder();
    return encoder.encode(str).buffer;
  }
}

export class ImportManager {
  async import(file: File, options?: Partial<ImportOptions>): Promise<ImportResult> {
    const opts: ImportOptions = {
      format: this.detectFormat(file.name),
      delimiter: ',',
      encoding: 'utf-8',
      headerRow: true,
      skipRows: 0,
      trimWhitespace: true,
      ...options,
    };

    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      const text = await this.readFileContent(file, opts.encoding);
      let data: ParsedData;

      switch (opts.format) {
        case 'csv':
        case 'tsv':
          data = this.parseCSV(text, opts);
          break;
        case 'json':
          data = this.parseJSON(text);
          break;
        case 'xlsx':
          data = await this.parseXLSX(file);
          break;
        default:
          return { success: false, errors: [`不支持的文件格式: ${opts.format}`] };
      }

      if (data.headers.length === 0) {
        return { success: false, errors: ['文件中没有找到数据'] };
      }

      return {
        success: true,
        data,
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: errors.length > 0 ? errors : undefined,
        metadata: {
          rowCount: data.rows.length,
          colCount: data.headers.length,
          detectedHeaders: opts.headerRow ?? true,
          fileName: file.name,
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : '导入失败'],
      };
    }
  }

  private detectFormat(fileName: string): 'csv' | 'xlsx' | 'json' | 'tsv' {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'csv':
        return 'csv';
      case 'xlsx':
      case 'xls':
        return 'xlsx';
      case 'json':
        return 'json';
      case 'tsv':
        return 'tsv';
      default:
        return 'csv';
    }
  }

  private async readFileContent(file: File, encoding: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file, encoding as BufferEncoding);
    });
  }

  private parseCSV(text: string, options: ImportOptions): ParsedData {
    const delimiter = options.delimiter || ',';
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    const rows: Record<string, CellValue>[] = [];
    let headers: string[] = [];

    const startIdx = options.skipRows || 0;
    const dataLines = lines.slice(startIdx);

    if (options.headerRow && dataLines.length > 0) {
      headers = this.parseCSVLine(dataLines[0], delimiter);
      if (options.trimWhitespace) {
        headers = headers.map((h) => h.trim());
      }
    }

    const dataStartIdx = options.headerRow ? 1 : 0;
    for (let i = dataStartIdx; i < dataLines.length; i++) {
      const values = this.parseCSVLine(dataLines[i], delimiter);
      if (values.length === 0) continue;

      if (headers.length === 0) {
        headers = values.map((_, idx) => `列${idx + 1}`);
      }

      const row: Record<string, CellValue> = {};
      headers.forEach((h, idx) => {
        let value: CellValue = values[idx] || '';
        if (options.trimWhitespace && typeof value === 'string') {
          value = value.trim();
        }
        row[h] = value;
      });
      rows.push(row);
    }

    return { headers, rows };
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  private parseJSON(text: string): ParsedData {
    const json = JSON.parse(text);
    let data: unknown[];

    if (Array.isArray(json)) {
      data = json;
    } else if (json.data && Array.isArray(json.data)) {
      data = json.data;
    } else {
      throw new Error('JSON 格式不正确');
    }

    if (data.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map((item) => {
      const row: Record<string, CellValue> = {};
      headers.forEach((h) => {
        row[h] = (item as Record<string, unknown>)[h] as CellValue;
      });
      return row;
    });

    return { headers, rows };
  }

  private async parseXLSX(file: File): Promise<ParsedData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const arrayBuffer = reader.result as ArrayBuffer;
          const data = this.parseXLSXArrayBuffer(arrayBuffer);
          resolve(data);
        } catch (error) {
          reject(new Error('解析 Excel 文件失败'));
        }
      };
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsArrayBuffer(file);
    });
  }

  private parseXLSXArrayBuffer(buffer: ArrayBuffer): ParsedData {
    return { headers: ['解析中...'], rows: [] };
  }
}

export const exportManager = new ExportManager();
export const importManager = new ImportManager();
