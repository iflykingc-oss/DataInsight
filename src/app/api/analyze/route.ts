import { NextRequest, NextResponse } from 'next/server';
import { analyzeData, type DataAnalysis } from '@/lib/data-processor';
import { verifyAuth } from '@/lib/auth-middleware';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // D-04 修复：API后端鉴权，防止权限绕过
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  // 检查上传权限
  if (!auth.user?.permissions?.upload) {
    return NextResponse.json({ error: '无上传/分析权限' }, { status: 403 });
  }

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

    // D-06 修复：大表分析超时保护，超过10000行使用采样分析
    const ANALYSIS_TIMEOUT_MS = 25000;
    const SAMPLE_THRESHOLD = 10000;
    let analysisData = data;

    if (data.rows.length > SAMPLE_THRESHOLD) {
      // 大表采样：取前2000行 + 随机2000行，保证分析速度
      const sampleSize = 2000;
      const head = data.rows.slice(0, sampleSize);
      const randomIndices = new Set<number>();
      while (randomIndices.size < Math.min(sampleSize, data.rows.length - sampleSize)) {
        const idx = Math.floor(Math.random() * data.rows.length);
        if (idx >= sampleSize) randomIndices.add(idx);
      }
      const randomSample = Array.from(randomIndices).map(i => data.rows[i]);
      analysisData = { ...data, rows: [...head, ...randomSample] };
    }

    // 带超时的分析执行
    const analysisPromise = Promise.resolve(analyzeData(analysisData));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('分析超时，数据量过大')), ANALYSIS_TIMEOUT_MS)
    );

    let analysis: DataAnalysis;
    try {
      analysis = await Promise.race([analysisPromise, timeoutPromise]);
    } catch (timeoutErr) {
      return NextResponse.json(
        { error: timeoutErr instanceof Error ? timeoutErr.message : '分析超时', sampled: true },
        { status: 408 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis,
      sampled: data.rows.length > SAMPLE_THRESHOLD,
      originalRowCount: data.rows.length,
      sampledRowCount: analysisData.rows.length,
    });
  } catch (error) {
    console.error('数据分析错误:', error);
    return NextResponse.json(
      { error: '数据分析失败' },
      { status: 500 }
    );
  }
}
