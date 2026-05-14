import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { verifyAuth } from '@/lib/auth-middleware';

// GET /api/data-compliance/export - Export all user data (GDPR Right to Access)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user!.id;
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Collect all user data from DB
    const [profile, loginLogs, usageStats, activityLogs, aiUsage, subscription] = await Promise.all([
      supabase.from('users').select('id, username, email, name, role, status, permissions, created_at').eq('id', userId).single(),
      supabase.from('login_logs').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('usage_stats').select('*').eq('user_id', userId).limit(100),
      supabase.from('user_activity_logs').select('event_category, event_type, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('ai_usage_logs').select('function_type, model_name, total_tokens, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
      supabase.from('user_subscriptions').select('*').eq('user_id', userId).single(),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'GDPR_DATA_EXPORT',
      user: {
        profile: profile.data,
        loginHistory: loginLogs.data,
        usageStats: usageStats.data,
        recentActivity: activityLogs.data,
        aiUsage: aiUsage.data,
        subscription: subscription.data,
      },
      notice: 'This export contains all personal data stored in our database. Browser-local data (dashboard configs, templates, etc.) is not included as it is stored locally on your device and never sent to our servers.'
    };

    // Log the export action
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'data.export',
      resource_type: 'user_data',
      resource_id: String(userId),
      details: { exportFormat: 'json' },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    });

    return NextResponse.json(exportData, {
      headers: {
        'Content-Disposition': `attachment; filename="data-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error) {
    console.error('Data export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/data-compliance/export - Delete all user data (GDPR Right to Erasure)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user!.id;
    const supabase = getSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
    }

    // Verify user confirmation
    const body = await request.json().catch(() => ({}));
    if (!body.confirm || body.confirm !== 'DELETE_ALL_MY_DATA') {
      return NextResponse.json({
        error: 'Confirmation required',
        message: 'Please send { "confirm": "DELETE_ALL_MY_DATA" } to confirm data deletion. This action is irreversible.'
      }, { status: 400 });
    }

    // Log the deletion request BEFORE deleting
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: 'data.delete_request',
      resource_type: 'user_data',
      resource_id: String(userId),
      details: { deletionType: 'full', confirmedAt: new Date().toISOString() },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
    });

    // Delete in order respecting foreign keys
    const tables = [
      'user_subscriptions',
      'ai_usage_logs',
      'user_activity_logs',
      'usage_stats',
      'login_logs',
    ];

    for (const table of tables) {
      await supabase.from(table).delete().eq('user_id', userId);
    }

    // Delete announcements created by user
    await supabase.from('announcements').delete().eq('created_by', userId);

    // Finally, delete the user account
    const { error: userDeleteError } = await supabase.from('users').delete().eq('id', userId);
    if (userDeleteError) {
      console.error('User deletion error:', userDeleteError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'All personal data has been permanently deleted. Browser-local data remains on your device and can be cleared manually.',
      deletedTables: tables,
      notice: 'This action is irreversible. Your account and all associated data have been removed from our servers.'
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
