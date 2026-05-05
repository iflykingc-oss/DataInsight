import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyAuth } from '@/lib/auth-middleware';
import { sanitizeUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const authResult = await verifyAuth(request);
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  return NextResponse.json({
    success: true,
    user: sanitizeUser(authResult.user!),
  });
}
