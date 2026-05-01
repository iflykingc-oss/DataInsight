import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-middleware';
import { getLoginLogs } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const limit = url.searchParams.get('limit');
  const parsedLimit = limit ? Math.min(parseInt(limit), 100) : 50;

  const logs = getLoginLogs(parsedLimit);

  return NextResponse.json({ success: true, data: logs });
}
