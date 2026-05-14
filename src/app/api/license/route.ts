import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import {
  generateLicenseKeys,
  getAllLicenseKeys,
  validateLicenseCode,
  redeemLicenseCode,
  getUserSubscription,
  getLicenseCodeInfo,
} from '@/lib/license-key';

// GET /api/license?action=list - 列出所有激活码（admin）
// GET /api/license?action=validate&code=XXX - 验证激活码
// GET /api/license?action=my-subscription - 获取当前用户订阅
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'list') {
      const authResult = await verifyAuth(request);
      if (authResult.error || authResult.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const keys = getAllLicenseKeys();
      return NextResponse.json({ success: true, data: keys });
    }

    if (action === 'validate') {
      const code = searchParams.get('code');
      if (!code) {
        return NextResponse.json({ success: false, error: 'Code required' }, { status: 400 });
      }
      const result = validateLicenseCode(code);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'my-subscription') {
      const authResult = await verifyAuth(request);
      if (authResult.error || !authResult.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const sub = getUserSubscription(authResult.user.id);
      return NextResponse.json({ success: true, data: sub });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('License API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/license
// action=generate - 批量生成激活码（admin）
// action=redeem - 兑换激活码
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate') {
      const authResult = await verifyAuth(request);
      if (authResult.error || authResult.user?.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const { count, planKey, billingCycle, durationDays } = body;
      if (!count || !planKey || !billingCycle || !durationDays) {
        return NextResponse.json(
          { error: 'count, planKey, billingCycle, durationDays required' },
          { status: 400 }
        );
      }

      const keys = generateLicenseKeys(count, planKey, billingCycle, durationDays);
      return NextResponse.json({ success: true, data: keys });
    }

    if (action === 'redeem') {
      const authResult = await verifyAuth(request);
      if (authResult.error || !authResult.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const { code } = body;
      if (!code) {
        return NextResponse.json({ error: 'Code required' }, { status: 400 });
      }

      const result = redeemLicenseCode(code, authResult.user.id, authResult.user.email);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error, code: result.error },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true, data: result.subscription });
    }

    if (action === 'verify') {
      const { code } = body;
      if (!code) {
        return NextResponse.json({ error: 'Code required' }, { status: 400 });
      }
      const info = getLicenseCodeInfo(code);
      return NextResponse.json({ success: true, data: info });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('License API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
