import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyAdmin } from '@/lib/auth-middleware';
import { getUsageStats } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  const stats = getUsageStats(userId ? parseInt(userId) : undefined);

  return NextResponse.json({ success: true, data: stats });
}
