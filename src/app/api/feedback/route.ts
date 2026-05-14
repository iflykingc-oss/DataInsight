import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAuth } from '@/lib/auth-middleware';

// 输入验证
function validateFeedbackInput(body: Record<string, unknown>) {
  const errors: string[] = [];

  if (!body.type || typeof body.type !== 'string') {
    errors.push('Feedback type is required');
  }
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 1) {
    errors.push('Title is required');
  }
  if (!body.content || typeof body.content !== 'string' || body.content.trim().length < 5) {
    errors.push('Content must be at least 5 characters');
  }

  return errors;
}

// 提交反馈（支持匿名）
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const errors = validateFeedbackInput(body);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, message: errors.join(', ') }, { status: 400 });
    }

    // 尝试获取当前用户（可选）
    let userId = null;
    try {
      const auth = await verifyAuth(req);
      if (!auth.error && auth.userId) {
        userId = auth.userId;
      }
    } catch {
      // 未登录用户也可以提交反馈
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Database not configured' }, { status: 503 });
    }
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: userId,
        type: String(body.type).trim().toLowerCase(),
        title: String(body.title).trim(),
        content: String(body.content).trim(),
        contact: body.contact ? String(body.contact).trim() : null,
        status: 'open',
        priority: 'normal',
      })
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

// 获取当前用户的反馈列表
export async function GET(req: NextRequest) {
  try {
    const auth = await verifyAuth(req);
    if (auth.error) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ success: true, data: [] });
    }
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e) {
    return NextResponse.json({ success: false, message: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 });
  }
}
