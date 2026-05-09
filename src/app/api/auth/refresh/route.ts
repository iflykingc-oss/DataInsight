import { NextRequest, NextResponse } from 'next/server';
import { refreshTokens } from '@/lib/auth-middleware';

/**
 * POST /api/auth/refresh - 刷新 Token 对
 * 当 Access Token 过期时，前端使用 Refresh Token 获取新的 Token 对
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ error: '缺少刷新令牌' }, { status: 400 });
    }

    const result = await refreshTokens(refreshToken);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      token: result.token,
      refreshToken: result.refreshToken,
    });
  } catch {
    return NextResponse.json({ error: '刷新令牌失败' }, { status: 401 });
  }
}
