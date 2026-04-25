import { NextRequest, NextResponse } from 'next/server';
import { analyzeData, type DataAnalysis } from '@/lib/data-processor';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data } = body;
    
    if (!data || !Array.isArray(data.rows) || !Array.isArray(data.headers)) {
      return NextResponse.json(
        { error: '无效的数据格式' },
        { status: 400 }
      );
    }

    // 数据大小限制：最多 50000 行 x 200 列
    const MAX_ROWS = 50000;
    const MAX_COLS = 200;
    if (data.rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `数据行数超过限制（最大 ${MAX_ROWS} 行），建议分批分析` },
        { status: 413 }
      );
    }
    if (data.headers.length > MAX_COLS) {
      return NextResponse.json(
        { error: `数据列数超过限制（最大 ${MAX_COLS} 列），建议精简字段` },
        { status: 413 }
      );
    }

    const analysis: DataAnalysis = analyzeData(data);
    
    return NextResponse.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('数据分析错误:', error);
    return NextResponse.json(
      { error: '数据分析失败' },
      { status: 500 }
    );
  }
}
