/**
 * 数据分析引擎 - 文件解析
 */
import * as XLSX from 'xlsx';
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
    const rowArray = row as CellValue[];
    const obj: Record<string, CellValue> = {};
    rowArray.forEach((value: CellValue, index: number) => {
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
