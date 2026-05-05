import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { getUserByUsername, verifyPassword, addLoginLog, sanitizeUser, isInitialized, initializeAdmin } from '@/lib/auth';

// 安全：从环境变量读取JWT密钥，与auth-middleware保持一致
function getJwtSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return new TextEncoder().encode(envSecret);
  }
  console.warn('[Security] JWT_SECRET not configured. Using ephemeral secret.');
  return new TextEncoder().encode('datainsight-jwt-ephemeral-' + Date.now());
}

const JWT_SECRET = getJwtSecret();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, initMode, initName } = body;

    // 系统未初始化时，允许创建首个管理员
    if (!isInitialized()) {
      if (initMode && username && password && initName) {
        try {
          const user = await initializeAdmin(username, password, initName);
          const token = await new SignJWT({
            userId: user.id,
            username: user.username,
            role: user.role,
          })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('7d')
            .sign(JWT_SECRET);

          return NextResponse.json({
            success: true,
            token,
            user: sanitizeUser(user),
            initialized: true,
          });
        } catch (initError) {
          return NextResponse.json(
            { error: initError instanceof Error ? initError.message : '初始化失败' },
            { status: 400 }
          );
        }
      }
      return NextResponse.json(
        { error: '系统未初始化，请先创建管理员账号', needInit: true },
        { status: 403 }
      );
    }

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
