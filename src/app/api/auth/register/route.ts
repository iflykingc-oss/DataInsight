import { NextRequest, NextResponse } from 'next/server';
import {
  registerByEmailAsync,
  resetPasswordAsync,
  getSecurityQuestionAsync,
  verifySecurityAnswerAsync,
} from '@/lib/auth-server';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limiter';

/** POST /api/auth/register - 邮箱注册（安全问题验证） */
export async function POST(request: NextRequest) {
  try {
    // 检查注册是否被管理员开启
    if (process.env.ENABLE_REGISTRATION !== 'true') {
      return NextResponse.json(
        { error: 'Registration is not open. Please contact an administrator to create an account.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, email } = body;

    // 限流检查（所有操作都基于邮箱限频）
    const rateLimitKey = email ? `register:${email.toLowerCase()}` : 'register:anonymous';
    const rateLimit = checkRateLimit(rateLimitKey, 5, 5 * 60 * 1000);
    if (!rateLimit.allowed) {
      const retrySeconds = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `操作过于频繁，请 ${retrySeconds} 秒后重试` },
        { status: 429, headers: { 'Retry-After': String(retrySeconds) } }
      );
    }

    // 获取安全问题（密码重置时使用）
    if (action === 'get-question') {
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
      const { answer } = body;
      if (!email || !answer) {
        return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
      }
      // 安全问题答案验证更严格：3次/5分钟
      const answerRateKey = `security-answer:${email.toLowerCase()}`;
      const answerRateLimit = checkRateLimit(answerRateKey, 3, 5 * 60 * 1000);
      if (!answerRateLimit.allowed) {
        const retrySeconds = Math.ceil((answerRateLimit.resetAt - Date.now()) / 1000);
        return NextResponse.json(
          { error: `验证尝试过多，请 ${retrySeconds} 秒后重试` },
          { status: 429, headers: { 'Retry-After': String(retrySeconds) } }
        );
      }
      const result = await verifySecurityAnswerAsync(email, answer);
      if (!result.valid) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, verified: true });
    }

    // 密码重置
    if (action === 'reset-password') {
      const { securityAnswer, newPassword } = body;
      if (!email || !securityAnswer || !newPassword) {
        return NextResponse.json({ error: '请填写所有字段' }, { status: 400 });
      }
      // 密码重置更严格：3次/5分钟
      const resetRateKey = `reset-password:${email.toLowerCase()}`;
      const resetRateLimit = checkRateLimit(resetRateKey, 3, 5 * 60 * 1000);
      if (!resetRateLimit.allowed) {
        const retrySeconds = Math.ceil((resetRateLimit.resetAt - Date.now()) / 1000);
        return NextResponse.json(
          { error: `重置尝试过多，请 ${retrySeconds} 秒后重试` },
          { status: 429, headers: { 'Retry-After': String(retrySeconds) } }
        );
      }
      const result = await resetPasswordAsync({ email, securityAnswer, newPassword });
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: '密码重置成功' });
    }

    // 默认：邮箱注册
    const { password, name, securityQuestion, securityAnswer } = body;
    if (!email || !password || !name || !securityQuestion || !securityAnswer) {
      return NextResponse.json({ error: '请填写所有必填项' }, { status: 400 });
    }

    // 注册更严格：同一邮箱 3次/10分钟
    const regRateKey = `register-attempt:${email.toLowerCase()}`;
    const regRateLimit = checkRateLimit(regRateKey, 3, 10 * 60 * 1000);
    if (!regRateLimit.allowed) {
      const retrySeconds = Math.ceil((regRateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: `注册尝试过多，请 ${retrySeconds} 秒后重试` },
        { status: 429, headers: { 'Retry-After': String(retrySeconds) } }
      );
    }

    const { user, token } = await registerByEmailAsync({
      email,
      password,
      name,
      securityQuestion,
      securityAnswer,
    });

    // 注册成功，重置限流
    resetRateLimit(rateLimitKey);
    resetRateLimit(regRateKey);

    const { sanitizeUser } = await import('@/lib/auth');
    return NextResponse.json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err: unknown) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 400 });
  }
}
