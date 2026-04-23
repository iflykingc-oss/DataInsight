import { NextRequest, NextResponse } from 'next/server';
import { parseFile, type ParsedData } from '@/lib/data-processor';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
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
    
    for (const file of files) {
      try {
        const parsedData = await parseFile(file);
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
