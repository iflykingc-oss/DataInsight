import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { capturePayPalOrder } from '@/lib/paypal-payment';
import { SupabaseAuthStorage } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Verify user
    const auth = await verifyAuth(request);
    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId } = await request.json();
    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Capture the order
    const capture = await capturePayPalOrder(orderId);

    // Get metadata from the capture
    const userId = capture.metadata?.user_id;
    const planKey = capture.metadata?.plan_key;
    const billingCycle = capture.metadata?.billing_cycle as 'monthly' | 'yearly';

    if (!planKey || !billingCycle) {
      return NextResponse.json(
        { error: 'Invalid order metadata' },
        { status: 400 }
      );
    }

    // Calculate subscription end date
    const now = new Date();
    const endDate = billingCycle === 'yearly'
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Update user subscription
    const storage = new SupabaseAuthStorage();
    await storage.saveUserAsync({
      ...auth.user,
      subscription: {
        planKey,
        status: 'active',
        startDate: now.toISOString(),
        currentPeriodEnd: endDate.toISOString(),
        billingCycle,
        paymentProvider: 'paypal',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: capture.orderId,
        status: capture.status,
        plan: planKey,
        billingCycle,
        endDate: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error('PayPal capture error:', error);
    return NextResponse.json(
      { error: 'Payment capture failed' },
      { status: 500 }
    );
  }
}
