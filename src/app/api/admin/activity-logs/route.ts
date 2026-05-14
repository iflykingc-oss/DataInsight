import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAdmin } from '@/lib/auth-middleware';

// GET /api/admin/activity-logs - Query user activity logs (admin only)
// Supports filtering by: category, eventType, userId, dateRange, search
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (!auth.user) {
    return NextResponse.json(
      { error: auth.error || '权限不足' },
      { status: auth.error === '未登录' ? 401 : 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const eventType = searchParams.get('eventType');
  const userId = searchParams.get('userId');
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const search = searchParams.get('search');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100);

  const supabase = getSupabaseClient();
  if (!supabase) return NextResponse.json({ success: true, data: [], total: 0 });

  // First, purge expired records (compliance: data retention)
  await supabase
    .from('user_activity_logs')
    .delete()
    .lt('expires_at', new Date().toISOString());

  // Build query
  let query = supabase
    .from('user_activity_logs')
    .select('*, users:user_id(username, name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (category) query = query.eq('event_category', category);
  if (eventType) query = query.eq('event_type', eventType);
  if (userId) query = query.eq('user_id', parseInt(userId));
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (search) {
    query = query.or(`event_type.ilike.%${search}%,metadata::text.ilike.%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('[AdminActivityLogs] GET error:', error.message);
    return NextResponse.json({ error: '获取用户日志失败' }, { status: 500 });
  }

  // Compute summary statistics
  const { data: statsData } = await supabase
    .from('user_activity_logs')
    .select('event_category, event_type')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const categoryCounts: Record<string, number> = {};
  const eventTypeCounts: Record<string, number> = {};
  for (const row of statsData || []) {
    categoryCounts[row.event_category] = (categoryCounts[row.event_category] || 0) + 1;
    eventTypeCounts[row.event_type] = (eventTypeCounts[row.event_type] || 0) + 1;
  }

  // Sanitize response - never expose full IP or user agent to frontend
  const sanitizedData = (data || []).map((row: Record<string, unknown>) => ({
    ...row,
    ip_address: maskIp(row.ip_address as string),
    user_agent: truncateUA(row.user_agent as string),
  }));

  return NextResponse.json({
    success: true,
    data: sanitizedData,
    total: count || 0,
    page,
    pageSize,
    stats: {
      last24h: {
        categoryCounts,
        eventTypeCounts,
        total: (statsData || []).length,
      },
    },
  });
}

// Mask IP address for privacy - show only first 2 octets for IPv4
function maskIp(ip: string): string {
  if (!ip || ip === 'unknown') return ip;
  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
  }
  // IPv6 - show first 2 segments only
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 2).join(':') + '::****';
  }
  return ip.slice(0, 4) + '****';
}

// Truncate user agent to prevent excessive data exposure
function truncateUA(ua: string): string {
  if (!ua) return '';
  if (ua.length <= 80) return ua;
  return ua.slice(0, 80) + '...';
}
