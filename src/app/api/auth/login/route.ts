import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getUserByUsername, verifyPassword, addLoginLog, sanitizeUser } from '@/lib/auth';

const JWT_SECRET = new TextEncoder().encode('datainsight-jwt-secret-key-2024');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      addLoginLog({
        userId: 0,
        username: username || 'unknown',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        status: 'failed',
      });
      return NextResponse.json({ error: '请输入账户和密码' }, { status: 400 });
    }

    const user = getUserByUsername(username);
    if (!user) {
      addLoginLog({
        userId: 0,
        username,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        status: 'failed',
      });
      return NextResponse.json({ error: '账户或密码错误' }, { status: 401 });
    }

    if (user.status === 'disabled') {
      addLoginLog({
        userId: user.id,
        username,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        status: 'failed',
      });
      return NextResponse.json({ error: '账号已被禁用，请联系管理员' }, { status: 403 });
    }

    const valid = await verifyPassword(user, password);
    if (!valid) {
      addLoginLog({
        userId: user.id,
        username,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        status: 'failed',
      });
      return NextResponse.json({ error: '账户或密码错误' }, { status: 401 });
    }

    // 生成JWT token
    const token = await new SignJWT({
      userId: user.id,
      username: user.username,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    addLoginLog({
      userId: user.id,
      username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '登录失败' },
      { status: 500 }
    );
  }
}
