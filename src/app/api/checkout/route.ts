import { NextRequest, NextResponse } from 'next/server';
import { createCheckout, isCreemConfigured } from '@/lib/creem-payment';
import { verifyAuth } from '@/lib/auth-middleware';
import { redeemLicenseCode } from '@/lib/license-key';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // License code redeem path
    if (body.action === 'redeem') {
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

    // Standard checkout path
    const { planKey, billingCycle, userId, userEmail, successUrl } = body;

    if (!isCreemConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment system not configured. Please contact admin.',
          code: 'PAYMENT_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    if (!planKey || !billingCycle || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: planKey, billingCycle, userId' },
        { status: 400 }
      );
    }

    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return NextResponse.json(
        { success: false, error: 'billingCycle must be "monthly" or "yearly"' },
        { status: 400 }
      );
    }

    if (!['pro', 'business'].includes(planKey)) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan key. Must be "pro" or "business"' },
        { status: 400 }
      );
    }

    const checkout = await createCheckout({
      planKey,
      billingCycle,
      userId: Number(userId),
      userEmail: userEmail || '',
      successUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        checkoutUrl: checkout.checkoutUrl,
        checkoutId: checkout.checkoutId,
      },
    });
  } catch (error: any) {
    console.error('Checkout creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
