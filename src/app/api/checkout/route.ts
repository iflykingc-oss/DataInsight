import { NextRequest, NextResponse } from 'next/server';
import { createCheckout, isCreemConfigured } from '@/lib/creem-payment';

export async function POST(request: NextRequest) {
  try {
    // Check if payment is configured
    if (!isCreemConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment system not configured. Please contact admin.',
          code: 'PAYMENT_NOT_CONFIGURED'
        },
        { status: 503 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { planKey, billingCycle, userId, userEmail, successUrl } = body;

    // Validate inputs
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

    // Create checkout session
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
