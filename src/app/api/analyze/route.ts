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
