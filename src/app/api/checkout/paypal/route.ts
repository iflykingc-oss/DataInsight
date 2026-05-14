import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { createPayPalOrder, isPayPalConfigured } from '@/lib/paypal-payment';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    if (!isPayPalConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'PayPal not configured. Please contact admin.',
          code: 'PAYPAL_NOT_CONFIGURED',
        },
        { status: 503 }
      );
    }

    const authResult = await verifyAuth(request);
    if (authResult.error || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { planKey, billingCycle, successUrl, cancelUrl } = body;

    if (!planKey || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'planKey and billingCycle required' },
        { status: 400 }
      );
    }

    // 获取套餐信息
    const supabase = getSupabaseClient();
    let planName = planKey === 'pro' ? 'Pro' : 'Business';
    let price = 0;
    let currency = 'USD';

    if (supabase) {
      const { data: plan } = await supabase
        .from('pricing_plans')
        .select('name_en, price_monthly, price_yearly, currency')
        .eq('plan_key', planKey)
        .single();

      if (plan) {
        planName = (plan.name_en as string) || planName;
        price = billingCycle === 'yearly'
          ? (plan.price_yearly as number) || 0
          : (plan.price_monthly as number) || 0;
        currency = (plan.currency as string) || 'USD';
      }
    }

    // fallback 价格
    if (price === 0) {
      price = planKey === 'pro'
        ? (billingCycle === 'yearly' ? 99 : 12)
        : (billingCycle === 'yearly' ? 299 : 39);
    }

    const order = await createPayPalOrder({
      planKey,
      billingCycle,
      userId: authResult.user.id,
      userEmail: authResult.user.email || '',
      planName,
      price,
      currency,
      successUrl,
      cancelUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.orderId,
        approvalUrl: order.approvalUrl,
      },
    });
  } catch (error: any) {
    console.error('PayPal checkout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create PayPal order' },
      { status: 500 }
    );
  }
}
