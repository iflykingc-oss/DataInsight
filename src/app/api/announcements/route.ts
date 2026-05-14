import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET /api/announcements - 获取当前生效的公告（公开接口，无需登录）
// 合规：此接口不记录任何用户访问行为，不追踪谁查看了公告
export async function GET() {
  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ success: true, data: [] });
  try {
    const now = new Date().toISOString();

    // 自动发布到期的定时公告
    await supabase
      .from('announcements')
      .update({ status: 'published', updated_at: now })
      .eq('status', 'scheduled')
      .lte('scheduled_at', now);

    // 自动过期已到期的公告
    await supabase
      .from('announcements')
      .update({ status: 'expired', updated_at: now })
      .eq('status', 'published')
      .lte('expires_at', now);

    // 获取所有已发布且未过期的公告
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, content, type, priority, remind_strategy, created_at')
      .eq('status', 'published')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Announcements] GET error:', error.message);
      return NextResponse.json({ error: '获取公告失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (err) {
    console.error('[Announcements] GET error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
