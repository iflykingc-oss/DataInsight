import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAuth } from '@/lib/auth-middleware';

// Valid event categories and types - server-side validation
const VALID_CATEGORIES = new Set(['auth', 'account', 'action', 'page_view']);

const VALID_EVENT_TYPES: Record<string, Set<string>> = {
  auth: new Set(['login', 'logout', 'register', 'bind_email', 'bind_phone', 'login_failed']),
  account: new Set(['permission_change', 'role_change', 'settings_change', 'password_change']),
  action: new Set([
    'payment_init', 'payment_success', 'payment_failed', 'export', 'share',
    'ai_analyze', 'upload', 'dashboard_create', 'report_generate', 'data_clean',
    'sql_query', 'formula_generate', 'chart_create',
  ]),
  page_view: new Set([
    'homepage', 'dashboard', 'settings', 'payment', 'analysis', 'data_table',
    'chart_center', 'metric_center', 'ai_assistant', 'sql_lab', 'admin_panel',
  ]),
};

// PII field patterns - reject any metadata containing these keys
const PII_PATTERNS = [
  /^email$/i, /^phone$/i, /^mobile$/i, /^tel$/i, /^address$/i,
  /^(first|last)?name$/i, /^password$/i, /^token$/i, /^secret$/i,
  /^ssn$/i, /^id_card$/i, /^ip$/i,
];

interface IncomingEvent {
  category: string;
  type: string;
  timestamp: number;
  sessionId: string;
  deviceIdHash: string;
  metadata?: Record<string, unknown>;
}

// POST /api/activity-log - Batch event upload
export async function POST(request: NextRequest) {
  // Verify user is authenticated (or allow anonymous security events)
  const auth = await verifyAuth(request);
  const userId = auth.user?.id || null;

  let events: IncomingEvent[];
  try {
    const body = await request.json();
    events = body.events;
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ error: 'Invalid events payload' }, { status: 400 });
    }
    // Cap batch size to prevent abuse
    if (events.length > 50) {
      events = events.slice(0, 50);
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Extract client info
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
  const userAgent = (request.headers.get('user-agent') || '').slice(0, 500);

  const supabase = getSupabaseClient();
  const rows: Record<string, unknown>[] = [];

  for (const event of events) {
    // Validate category
    if (!VALID_CATEGORIES.has(event.category)) continue;
    // Validate event type
    const validTypes = VALID_EVENT_TYPES[event.category];
    if (!validTypes || !validTypes.has(event.type)) continue;

    // Sanitize metadata - remove PII
    const sanitizedMeta: Record<string, unknown> = {};
    if (event.metadata && typeof event.metadata === 'object') {
      for (const [key, value] of Object.entries(event.metadata)) {
        // Skip PII keys
        if (PII_PATTERNS.some(pattern => pattern.test(key))) continue;
        // Only allow primitives
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
          sanitizedMeta[key] = value;
        }
      }
    }

    // Validate device ID hash format (should be 64-char hex SHA-256)
    let deviceIdHash = event.deviceIdHash || '';
    if (deviceIdHash && !/^[a-f0-9]{64}$/.test(deviceIdHash)) {
      deviceIdHash = ''; // Discard invalid hash
    }

    // Validate session ID format
    let sessionId = event.sessionId || '';
    if (sessionId.length > 64) {
      sessionId = sessionId.slice(0, 64);
    }

    rows.push({
      user_id: userId,
      event_category: event.category,
      event_type: event.type,
      device_id_hash: deviceIdHash || null,
      ip_address: ip.length <= 45 ? ip : ip.slice(0, 45),
      user_agent: userAgent,
      metadata: sanitizedMeta,
      session_id: sessionId || null,
      created_at: new Date(event.timestamp || Date.now()).toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (rows.length === 0) {
    return NextResponse.json({ success: true, inserted: 0 });
  }

  // Batch insert
  const { error } = await supabase
    .from('user_activity_logs')
    .insert(rows);

  if (error) {
    console.error('[ActivityLog] Insert error:', error.message);
    return NextResponse.json({ error: 'Failed to log events' }, { status: 500 });
  }

  return NextResponse.json({ success: true, inserted: rows.length });
}

// DELETE /api/activity-log - User requests data deletion (GDPR Right to Erasure / CCPA Right to Delete)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('user_activity_logs')
    .delete()
    .eq('user_id', auth.user.id);

  if (error) {
    console.error('[ActivityLog] Delete error:', error.message);
    return NextResponse.json({ error: 'Failed to delete activity data' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Your activity data has been deleted per your request.' });
}
