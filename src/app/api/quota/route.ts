import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getAllQuotas, checkQuota, incrementQuota } from '@/lib/quota-manager';

// GET /api/quota - 获取当前用户所有配额
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quotas = getAllQuotas(authResult.user.id);
    return NextResponse.json({ success: true, data: quotas });
  } catch (error: any) {
    console.error('Quota API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/quota
// action=check - 检查某项功能是否有配额
// action=increment - 记录一次使用
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, feature } = body;

    if (!feature) {
      return NextResponse.json({ error: 'feature required' }, { status: 400 });
    }

    if (action === 'check') {
      const result = checkQuota(authResult.user.id, feature);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'increment') {
      incrementQuota(authResult.user.id, feature);
      const result = checkQuota(authResult.user.id, feature);
      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Quota API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
