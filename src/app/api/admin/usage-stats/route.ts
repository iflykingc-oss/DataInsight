import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyAdmin } from '@/lib/auth-middleware';
import { getUsageStatsAsync } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  // 过滤用户统计（前端按需过滤，非关键路径直接返回全部）
  const allStats = await getUsageStatsAsync();
  const stats = userId ? allStats.filter(s => s.userId === parseInt(userId)) : allStats;

  return NextResponse.json({ success: true, data: stats });
}
