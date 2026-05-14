import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyAdmin } from '@/lib/auth-middleware';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
  const offset = (page - 1) * limit;
  const username = url.searchParams.get('username') || '';
  const status = url.searchParams.get('status') || '';
  const startDate = url.searchParams.get('startDate') || '';
  const endDate = url.searchParams.get('endDate') || '';

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ success: true, data: [], total: 0 });

  let query = supabase
    .from('login_logs')
    .select('*, users(username)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate + 'T23:59:59');
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // Filter by username if provided (post-filter since it's from joined table)
  let filteredData = data || [];
  if (username) {
    filteredData = filteredData.filter((row: Record<string, unknown>) => {
      const usersObj = row.users as Record<string, unknown> | null;
      const uName = (usersObj?.username as string) || '';
      return uName.toLowerCase().includes(username.toLowerCase());
    });
  }

  const mapped = filteredData.map((row: Record<string, unknown>) => {
    const usersObj = row.users as Record<string, unknown> | null;
    return {
      id: row.id,
      username: (usersObj?.username as string) || '',
      status: row.status,
      ip_address: row.ip_address,
      error_message: row.error_message,
      created_at: row.created_at,
    };
  });

  return NextResponse.json({
    success: true,
    data: mapped,
    total: count || 0,
    page,
    limit,
  });
}
