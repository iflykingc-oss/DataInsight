import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getUserById, sanitizeUser } from '@/lib/auth';

function getJwtSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return new TextEncoder().encode(envSecret);
  }
  return new TextEncoder().encode('datainsight-jwt-ephemeral-' + Date.now());
}

const JWT_SECRET = getJwtSecret();

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    const userId = payload.userId as number;

    const user = getUserById(userId);
    if (!user || user.status === 'disabled') {
      return NextResponse.json({ error: '用户不存在或已被禁用' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: sanitizeUser(user),
    });
  } catch {
    return NextResponse.json({ error: '登录已过期，请重新登录' }, { status: 401 });
  }
}
