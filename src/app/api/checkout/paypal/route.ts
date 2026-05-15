import { NextRequest } from 'next/server';
import { isPayPalConfigured, createPayPalOrder } from '@/lib/paypal-payment';
import { verifyAuth } from '@/lib/auth-middleware';

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyAuth(req);
    if (!auth.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { planKey, billingCycle, userId, userEmail } = body;

    if (!planKey || !billingCycle || !userId || !userEmail) {
      return Response.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!isPayPalConfigured()) {
      return Response.json(
        { error: 'PayPal not configured' },
        { status: 503 }
      );
    }

    // Get plan details from pricing config
    const pricingPlans = JSON.parse(
      process.env.PRICING_PLANS ||
        '[{"id":"pro","name":"Professional","name_zh":"专业版","price_monthly":9.99,"price_yearly":99.99}]'
    );

    const plan = pricingPlans.find((p: any) => p.id === planKey);
    const price = billingCycle === 'yearly'
      ? plan?.price_yearly || 99.99
      : plan?.price_monthly || 9.99;

    const order = await createPayPalOrder({
      planKey,
      billingCycle,
      price,
      userId,
      userEmail,
      currency: 'USD',
      planName: plan?.name || 'Professional',
    });

    return Response.json({
      success: true,
      orderId: order.orderId,
    });
  } catch (error: any) {
    console.error('PayPal checkout error:', error);
    return Response.json(
      { error: error.message || 'Payment initiation failed' },
      { status: 500 }
    );
  }
}
