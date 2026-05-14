import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, handleWebhookEvent } from '@/lib/creem-payment';
import { getSupabaseClient } from '@/storage/database/supabase-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('creem-signature');

    // Verify webhook signature
    if (!verifyWebhookSignature(body, signature)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const event = JSON.parse(body);
    const result = handleWebhookEvent(event);

    // Process the event based on type
    if (result.type === 'payment_success' && result.userId) {
      const supabase = getSupabaseClient();
      if (!supabase) return NextResponse.json({ received: true });
      
      // Update user subscription in database
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: Number(result.userId),
          plan_key: result.planKey,
          status: 'active',
          billing_cycle: result.billingCycle || 'monthly',
          payment_provider: 'creem',
          payment_reference_id: result.checkoutId,
          current_period_start: new Date().toISOString(),
          current_period_end: result.billingCycle === 'yearly'
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('Failed to update subscription:', error);
      }
    }

    if (result.type === 'subscription_canceled') {
      // Mark subscription as canceled
      const supabase = getSupabaseClient();
      if (!supabase) return NextResponse.json({ received: true });
      await supabase
        .from('user_subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('payment_reference_id', result.subscriptionId);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
