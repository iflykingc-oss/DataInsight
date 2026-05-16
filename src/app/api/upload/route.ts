import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import type { ParsedData } from '@/lib/data-processor';
import { verifyAuth } from '@/lib/auth-middleware';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.user?.permissions?.upload) return NextResponse.json({ error: '无上传权限' }, { status: 403 });

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data') && !contentType.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json(
        { error: '请求格式错误，请使用 multipart/form-data 上传文件' },
        { status: 400 }
      );
    }
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    if (files.length === 0) {
      return NextResponse.json(
        { error: '没有上传文件' },
        { status: 400 }
      );
    }
    
    const results: ParsedData[] = [];
    const errors: { fileName: string; error: string }[] = [];

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB

    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: `总文件大小超过 ${MAX_TOTAL_SIZE / 1024 / 1024}MB 限制` },
        { status: 413 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push({ fileName: file.name, error: `文件大小超过 ${MAX_FILE_SIZE / 1024 / 1024}MB 限制` });
        continue;
      }
      try {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(Buffer.from(buffer).buffer);
        const worksheet = workbook.worksheets[0];

        // Get headers from first row (exceljs row values are 1-indexed)
        const headerRow = worksheet.getRow(1).values as (string | undefined)[];
        const headers = headerRow.slice(1).map(h => String(h ?? ''));

        // Get data rows
        const rows: Record<string, unknown>[] = [];
        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const values = row.values as unknown[];
          const obj: Record<string, unknown> = {};
          headers.forEach((h, i) => { obj[h] = values[i + 1] ?? null; }); // +1 for 1-indexed
          rows.push(obj);
        });

        const parsedData: ParsedData = {
          headers,
          rows: rows as ParsedData['rows'],
          fileName: file.name,
          rowCount: rows.length,
          columnCount: headers.length
        };
        results.push(parsedData);
      } catch (error) {
        errors.push({
          fileName: file.name,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }
    
    // 如果所有文件都失败
    if (results.length === 0) {
      return NextResponse.json(
        { error: '所有文件处理失败', details: errors },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('文件上传处理错误:', error);
    return NextResponse.json(
      { error: '文件处理失败' },
      { status: 500 }
    );
  }
}
