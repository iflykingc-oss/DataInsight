import { NextRequest, NextResponse } from 'next/server';
import { registerByEmailAsync, addLoginLogAsync } from '@/lib/auth-server';
import { sanitizeUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // 管理员可通过环境变量 DISABLE_REGISTRATION=true 禁用注册
    if (process.env.DISABLE_REGISTRATION === 'true') {
      return NextResponse.json({ error: '注册功能已关闭，请联系管理员' }, { status: 403 });
    }

    const body = await request.json();
    const { email, code, password, name } = body;

    if (!email || !code || !password || !name) {
      return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 });
    }

    const result = await registerByEmailAsync({ email, code, password, name });

    // 记录登录日志
    await addLoginLogAsync({
      userId: result.user.id,
      username: result.user.username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      token: result.token,
      user: sanitizeUser(result.user),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : '注册失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
