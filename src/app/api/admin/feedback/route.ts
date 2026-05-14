import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAuth } from '@/lib/auth-middleware';

// 获取所有反馈（管理员）
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (auth.error || !auth.user || auth.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ success: true, data: [], total: 0 });
    let query = supabase
      .from('feedback')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }
    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// 回复反馈（管理员）
export async function PUT(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (auth.error || !auth.user || auth.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { id, adminReply, status: newStatus, priority } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: 'Feedback ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 503 });
    const updateData: Record<string, unknown> = {};

    if (adminReply !== undefined) {
      updateData.admin_reply = adminReply;
      updateData.replied_by = auth.userId;
      updateData.replied_at = new Date().toISOString();
    }
    if (newStatus) {
      updateData.status = newStatus;
    }
    if (priority) {
      updateData.priority = priority;
    }

    const { data, error } = await supabase
      .from('feedback')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}

// 删除反馈（管理员）
export async function DELETE(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (auth.error || !auth.user || auth.user.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Feedback ID is required' }, { status: 400 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 503 });
    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
