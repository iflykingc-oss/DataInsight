import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let feature: string;
  try {
    const body = await request.json();
    feature = body.feature;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!feature) {
    return NextResponse.json({ error: 'Missing feature' }, { status: 400 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const userId = auth.user.id;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Upsert usage record — increment the feature counter
  const { error } = await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_feature: feature,
    p_period_start: monthStart,
    p_period_end: monthEnd,
  });

  if (error) {
    console.error('Failed to increment usage:', error.code);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
