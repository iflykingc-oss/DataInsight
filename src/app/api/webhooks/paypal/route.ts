import { NextRequest, NextResponse } from 'next/server';
import { verifyPayPalWebhook, handlePayPalWebhook } from '@/lib/paypal-payment';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = request.headers;

    // 基础验证
    const isValid = await verifyPayPalWebhook(headers, body);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const result = handlePayPalWebhook(event);

    if (result.type === 'payment_success' && result.userId) {
      const supabase = getSupabaseClient();
      if (supabase) {
        const durationDays = result.billingCycle === 'yearly' ? 365 : 30;
        await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: Number(result.userId),
            plan_key: result.planKey,
            status: 'active',
            billing_cycle: result.billingCycle || 'monthly',
            payment_provider: 'paypal',
            payment_reference_id: result.orderId,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
