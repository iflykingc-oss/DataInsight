import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

/** POST /api/auth/delete-account - 用户自主注销账号 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: '请输入密码确认' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 验证密码
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('id', auth.userId)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 使用 bcrypt 验证密码
    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '密码错误' }, { status: 401 });
    }

    // 级联删除：login_logs 和 usage_stats 有 ON DELETE CASCADE
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', auth.userId);

    if (deleteError) {
      console.error('[DeleteAccount] 删除失败:', deleteError);
      return NextResponse.json({ error: '注销失败，请稍后重试' }, { status: 500 });
    }

    console.log(`[DeleteAccount] 用户 ${auth.user.username} (ID:${auth.userId}) 已注销账号`);
    return NextResponse.json({ success: true, message: '账号已注销' });
  } catch (error) {
    console.error('[DeleteAccount] 错误:', error);
    return NextResponse.json({ error: '注销失败' }, { status: 500 });
  }
}
