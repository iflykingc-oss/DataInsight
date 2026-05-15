/**
 * 数据分析引擎 - 文件解析
 */
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import type { ParsedData, CellValue } from './types';

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
        const rows: Record<string, CellValue>[] = results.data as Record<string, CellValue>[];

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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheetNames = workbook.worksheets.map(ws => ws.name);
  const worksheet = workbook.worksheets[0];

  if (!worksheet) {
    throw new Error('Excel文件为空');
  }

  // Get headers from first row
  const headers: string[] = [];
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    headers.push(String(cell.value ?? ''));
  });

  if (headers.length === 0) {
    throw new Error('Excel文件为空');
  }

  // Get data rows
  const rows: Record<string, CellValue>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const obj: Record<string, CellValue> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      obj[headers[colNumber - 1]] = (cell.value ?? null) as CellValue;
    });
    rows.push(obj);
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
