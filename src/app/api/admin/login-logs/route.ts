import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-middleware';
import { getLoginLogs } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');
  const status = url.searchParams.get('status');
  const limit = url.searchParams.get('limit');

  const logs = getLoginLogs({
    userId: userId ? parseInt(userId) : undefined,
    status: status || undefined,
    limit: limit ? parseInt(limit) : undefined,
  });

  return NextResponse.json({ success: true, data: logs });
}
