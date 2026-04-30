import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ParseWorkerMessage {
  type: 'parse' | 'analyze' | 'cancel';
  id: string;
  file?: File;
  data?: unknown;
  options?: ParseOptions;
}

export interface ParseOptions {
  enableProgress?: boolean;
  onProgress?: (progress: number) => void;
}

export interface ParseWorkerResponse {
  type: 'progress' | 'success' | 'error' | 'cancelled';
  id: string;
  progress?: number;
  result?: unknown;
  error?: string;
}

let cancelled = false;

self.onmessage = async (e: MessageEvent<ParseWorkerMessage>) => {
  const { type, id, file, data, options } = e.data;

  if (type === 'cancel') {
    cancelled = true;
    return;
  }

  cancelled = false;

  if (type === 'parse' && file) {
    try {
      const reportProgress = (progress: number) => {
        if (options?.enableProgress && !cancelled) {
          self.postMessage({ type: 'progress', id, progress } as ParseWorkerResponse);
        }
      };

      reportProgress(10);

      const extension = file.name.split('.').pop()?.toLowerCase();
      let parsedData;

      if (extension === 'csv' || extension === 'txt') {
        parsedData = await parseCSVWithProgress(file, reportProgress);
      } else {
        parsedData = await parseExcelWithProgress(file, reportProgress);
      }

      if (cancelled) {
        self.postMessage({ type: 'cancelled', id } as ParseWorkerResponse);
        return;
      }

      reportProgress(100);

      self.postMessage({
        type: 'success',
        id,
        result: parsedData
      } as ParseWorkerResponse);
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        error: error instanceof Error ? error.message : '解析失败'
      } as ParseWorkerResponse);
    }
  }
};

async function parseCSVWithProgress(
  file: File,
  onProgress: (p: number) => void
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 60) + 20;
        onProgress(Math.min(progress, 80));
      }
    };

    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: true,
        });

        const rows = result.data as Record<string, unknown>[];
        const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

        onProgress(100);
        resolve({ headers, rows });
      } catch (err) {
        reject(new Error('CSV解析失败'));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

async function parseExcelWithProgress(
  file: File,
  onProgress: (p: number) => void
): Promise<{ headers: string[]; rows: Record<string, unknown>[]; sheetNames?: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 40) + 10;
        onProgress(Math.min(progress, 50));
      }
    };

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, {
          type: 'array',
          cellDates: true,
          cellNF: true,
        });

        onProgress(60);

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          defval: '',
          raw: false
        });

        onProgress(80);

        const headers = jsonData.length > 0 ? Object.keys(jsonData[0] as object) : [];
        const rows = jsonData as Record<string, unknown>[];

        onProgress(100);

        resolve({
          headers,
          rows,
          sheetNames: workbook.SheetNames
        });
      } catch (err) {
        reject(new Error('Excel解析失败'));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

export {};
