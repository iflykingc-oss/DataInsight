import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAdmin } from '@/lib/auth-middleware';

// PUT /api/admin/announcements/[id] - 更新公告
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error || '权限不足' }, { status: auth.error === '未登录' ? 401 : 403 });
  }

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, type, priority, remindStrategy, scheduledAt, expiresAt, status: newStatus } = body;

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = { updated_at: now };

    if (title !== undefined) updateData.title = title.trim();
    if (content !== undefined) updateData.content = content.trim();
    if (type !== undefined) updateData.type = type;
    if (priority !== undefined) updateData.priority = priority;
    if (remindStrategy !== undefined) updateData.remind_strategy = remindStrategy;
    if (scheduledAt !== undefined) updateData.scheduled_at = scheduledAt;
    if (expiresAt !== undefined) updateData.expires_at = expiresAt;

    // 状态变更逻辑
    if (newStatus === 'published') {
      updateData.status = 'published';
    } else if (newStatus === 'draft') {
      updateData.status = 'draft';
    } else if (newStatus === 'scheduled' && scheduledAt) {
      updateData.status = 'scheduled';
    }

    const { data, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', parseInt(id))
      .select()
      .single();

    if (error) {
      console.error('[Announcements] Update error:', error.message);
      return NextResponse.json({ error: '更新公告失败' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: '公告不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('[Announcements] PUT error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

// DELETE /api/admin/announcements/[id] - 删除公告
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (!auth.user) {
    return NextResponse.json({ error: auth.error || '权限不足' }, { status: auth.error === '未登录' ? 401 : 403 });
  }

  const supabase = getSupabaseClient();
  try {
    const { id } = await params;

    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', parseInt(id));

    if (error) {
      console.error('[Announcements] Delete error:', error.message);
      return NextResponse.json({ error: '删除公告失败' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Announcements] DELETE error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
