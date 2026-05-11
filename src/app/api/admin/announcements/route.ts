import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAdmin } from '@/lib/auth-middleware';

// GET /api/admin/announcements - 获取公告列表（管理员）
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error || '权限不足' }, { status: auth.error === '未登录' ? 401 : 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  const supabase = getSupabaseClient();
  let query = supabase
    .from('announcements')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: '获取公告列表失败' }, { status: 500 });
  }

  // 自动更新过期公告状态（合规：不追踪用户行为，仅更新公告自身状态）
  const now = new Date().toISOString();
  const expiredIds = (data || [])
    .filter((a: Record<string, unknown>) => a.status === 'published' && a.expires_at && a.expires_at as string <= now)
    .map((a: Record<string, unknown>) => a.id);

  if (expiredIds.length > 0) {
    await supabase
      .from('announcements')
      .update({ status: 'expired', updated_at: now })
      .in('id', expiredIds);
  }

  // 自动发布到期的定时公告
  const scheduledToPublish = (data || [])
    .filter((a: Record<string, unknown>) => a.status === 'scheduled' && a.scheduled_at && a.scheduled_at as string <= now)
    .map((a: Record<string, unknown>) => a.id);

  if (scheduledToPublish.length > 0) {
    await supabase
      .from('announcements')
      .update({ status: 'published', updated_at: now })
      .in('id', scheduledToPublish);
  }

  // 刷新状态后的数据
  const refreshedData = (data || []).map((a: Record<string, unknown>) => {
    if (expiredIds.includes(a.id)) return { ...a, status: 'expired' };
    if (scheduledToPublish.includes(a.id)) return { ...a, status: 'published' };
    return a;
  });

  return NextResponse.json({
    success: true,
    data: refreshedData,
    total: count || 0,
    page,
    pageSize,
  });
}

// POST /api/admin/announcements - 创建公告
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error || '权限不足' }, { status: auth.error === '未登录' ? 401 : 403 });
  }

  const supabase = getSupabaseClient();
  try {
    const body = await request.json();
    const { title, content, type, priority, remindStrategy, scheduledAt, expiresAt } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: '标题和内容不能为空' }, { status: 400 });
    }

    // 合规：不存储任何用户行为追踪数据，仅存储公告本身
    const now = new Date().toISOString();
    let status = 'draft';

    // 如果设置了定时发布且时间在未来，状态为scheduled
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      status = 'scheduled';
    } else if (body.publishNow) {
      status = 'published';
    }

    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title: title.trim(),
        content: content.trim(),
        type: type || 'info',
        priority: priority || 'normal',
        remind_strategy: remindStrategy || 'once',
        status,
        scheduled_at: scheduledAt || null,
        expires_at: expiresAt || null,
        created_by: auth.user.id,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error('[Announcements] Create error:', error.message);
      return NextResponse.json({ error: '创建公告失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Announcements] POST error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
