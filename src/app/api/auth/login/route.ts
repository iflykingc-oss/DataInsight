import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyPassword, sanitizeUser } from '@/lib/auth';
import { signToken, signRefreshToken } from '@/lib/auth-middleware';
import {
  getUserByUsernameAsync,
  getUserByEmailAsync,
  addLoginLogAsync,
  isInitializedAsync,
  initializeAdminAsync,
} from '@/lib/auth-server';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limiter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password, initMode, initName } = body;

    // 系统未初始化时，允许创建首个管理员
    if (initMode) {
      try {
        const user = await initializeAdminAsync(username, password, initName);
        const token = await signToken({
          userId: user.id,
          username: user.username,
          role: user.role,
        });
        const refreshToken = await signRefreshToken({
          userId: user.id,
          username: user.username,
          role: user.role,
        });

        return NextResponse.json({
          success: true,
          token,
          refreshToken,
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

    // 检查是否已初始化
    const initialized = await isInitializedAsync();
    if (!initialized) {
      return NextResponse.json(
        { error: '系统未初始化，请先创建管理员账号', needInit: true },
        { status: 403 }
      );
    }

    if (!username || !password) {
      return NextResponse.json({ error: '请输入账户和密码' }, { status: 400 });
    }

    // 限流检查：同一账号 5次失败/5分钟
    const rateLimitKey = `login:${username.toLowerCase()}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      const retrySeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `登录尝试过于频繁，请 ${retrySeconds} 秒后重试` },
        {
          status: 429,
          headers: { 'Retry-After': String(retrySeconds) },
        }
      );
    }

    // 支持用户名或邮箱登录
    let user = await getUserByUsernameAsync(username);
    if (!user && username.includes('@')) {
      user = await getUserByEmailAsync(username);
    }
    if (!user) {
      await addLoginLogAsync({
        userId: 0,
        username,
        status: 'failed',
      });
      return NextResponse.json({ error: '账户或密码错误' }, { status: 401 });
    }

    if (user.status === 'disabled') {
      await addLoginLogAsync({
        userId: user.id,
        username,
        status: 'failed',
      });
      return NextResponse.json({ error: '账号已被禁用，请联系管理员' }, { status: 403 });
    }

    const valid = await verifyPassword(user, password);
    if (!valid) {
      await addLoginLogAsync({
        userId: user.id,
        username,
        status: 'failed',
      });
      return NextResponse.json({ error: '账户或密码错误' }, { status: 401 });
    }

    // 登录成功，重置限流计数
    resetRateLimit(rateLimitKey);

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });
    const refreshToken = await signRefreshToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    await addLoginLogAsync({
      userId: user.id,
      username,
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      token,
      refreshToken,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json({ error: '登录失败，请稍后重试' }, { status: 500 });
  }
}