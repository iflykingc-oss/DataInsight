import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyPassword, sanitizeUser } from '@/lib/auth';
import { signToken } from '@/lib/auth-middleware';
import {
  getUserByUsernameAsync,
  addLoginLogAsync,
  isInitializedAsync,
  initializeAdminAsync,
} from '@/lib/auth-server';

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

    // 检查是否已初始化
    const initialized = await isInitializedAsync();
    if (!initialized) {
      return NextResponse.json(
        { error: '系统未初始化，请先创建管理员账号', needInit: true },
        { status: 403 }
      );
    }

    if (!username || !password) {
      await addLoginLogAsync({
        userId: 0,
        username: username || 'unknown',
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        status: 'failed',
      });
      return NextResponse.json({ error: '请输入账户和密码' }, { status: 400 });
    }

    const user = await getUserByUsernameAsync(username);
    if (!user) {
      await addLoginLogAsync({
        userId: 0,
        username,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        status: 'failed',
      });
      return NextResponse.json({ error: '账户或密码错误' }, { status: 401 });
    }

    if (user.status === 'disabled') {
      await addLoginLogAsync({
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
      await addLoginLogAsync({
        userId: user.id,
        username,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        status: 'failed',
      });
      return NextResponse.json({ error: '账户或密码错误' }, { status: 401 });
    }

    const token = await signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    await addLoginLogAsync({
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
