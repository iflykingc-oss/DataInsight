import { NextRequest, NextResponse } from 'next/server';
import {
  registerByEmailAsync,
  resetPasswordAsync,
  getSecurityQuestionAsync,
  verifySecurityAnswerAsync,
} from '@/lib/auth-server';

/** POST /api/auth/register - 邮箱注册（安全问题验证） */
export async function POST(request: NextRequest) {
  try {
    // 检查注册是否被管理员关闭
    if (process.env.DISABLE_REGISTRATION === 'true') {
      return NextResponse.json(
        { error: '管理员已关闭公开注册，请联系管理员创建账号' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    // 获取安全问题（密码重置时使用）
    if (action === 'get-question') {
      const { email } = body;
      if (!email) {
        return NextResponse.json({ error: '请输入邮箱' }, { status: 400 });
      }
      const result = await getSecurityQuestionAsync(email);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, question: result.question });
    }

    // 验证安全问题答案（密码重置步骤2）
    if (action === 'verify-answer') {
      const { email, answer } = body;
      if (!email || !answer) {
        return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
      }
      const result = await verifySecurityAnswerAsync(email, answer);
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, verified: true });
    }

    // 密码重置
    if (action === 'reset-password') {
      const { email, securityAnswer, newPassword } = body;
      if (!email || !securityAnswer || !newPassword) {
        return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
      }
      const result = await resetPasswordAsync({ email, securityAnswer, newPassword });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: '密码重置成功' });
    }

    // 默认：邮箱注册
    const { email, password, name, securityQuestion, securityAnswer } = body;
    if (!email || !password || !name || !securityQuestion || !securityAnswer) {
      return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 });
    }

    const { user, token } = await registerByEmailAsync({
      email,
      password,
      name,
      securityQuestion,
      securityAnswer,
    });

    const { sanitizeUser } = await import('@/lib/auth');
    return NextResponse.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '注册失败';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
