import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCodeAsync } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // 管理员可通过环境变量 DISABLE_REGISTRATION=true 禁用注册
    if (process.env.DISABLE_REGISTRATION === 'true') {
      return NextResponse.json({ error: '注册功能已关闭，请联系管理员' }, { status: 403 });
    }

    const body = await request.json();
    const { email, type } = body;

    if (!email) {
      return NextResponse.json({ error: '请输入邮箱地址' }, { status: 400 });
    }

    const result = await sendVerificationCodeAsync(email, type || 'register');

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: '验证码已发送' });
  } catch (err) {
    console.error('[SendCode] Error:', err);
    return NextResponse.json({ error: '发送验证码失败，请稍后重试' }, { status: 500 });
  }
}
