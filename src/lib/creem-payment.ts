// Creem Payment Integration for DataInsight
// Docs: https://docs.creem.io/getting-started/quickstart
// SDK: @creem_io/nextjs or creem_io

import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const CREEM_API_KEY = process.env.CREEM_API_KEY || '';
const CREEM_WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET || '';
const IS_TEST_MODE = process.env.CREEM_TEST_MODE === 'true';
const CREEM_API_BASE = IS_TEST_MODE ? 'https://test-api.creem.io' : 'https://api.creem.io';

// Product IDs mapped from pricing plans (configured in Creem dashboard)
const PLAN_PRODUCT_IDS: Record<string, { monthly: string; yearly: string }> = {
  pro: {
    monthly: process.env.CREEM_PRO_MONTHLY_PRODUCT_ID || '',
    yearly: process.env.CREEM_PRO_YEARLY_PRODUCT_ID || '',
  },
  business: {
    monthly: process.env.CREEM_BUSINESS_MONTHLY_PRODUCT_ID || '',
    yearly: process.env.CREEM_BUSINESS_YEARLY_PRODUCT_ID || '',
  },
};

interface CheckoutParams {
  planKey: string;
  billingCycle: 'monthly' | 'yearly';
  userId: number;
  userEmail: string;
  successUrl?: string;
}

/**
 * Create a Creem checkout session
 */
export async function createCheckout(params: CheckoutParams) {
  const { planKey, billingCycle, userId, userEmail, successUrl } = params;

  const productId = PLAN_PRODUCT_IDS[planKey]?.[billingCycle];
  if (!productId) {
    throw new Error(`No product ID configured for plan: ${planKey} / ${billingCycle}`);
  }

  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';
  const finalSuccessUrl = successUrl || `${domain}/?payment=success`;

  const response = await fetch(`${CREEM_API_BASE}/v1/checkouts`, {
    method: 'POST',
    headers: {
      'x-api-key': CREEM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      product_id: productId,
      success_url: finalSuccessUrl,
      metadata: {
        user_id: String(userId),
        user_email: userEmail,
        plan_key: planKey,
        billing_cycle: billingCycle,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Creem checkout failed: ${error}`);
  }

  const data = await response.json();
  return {
    checkoutId: data.id,
    checkoutUrl: data.checkout_url,
    productId: data.product_id,
    status: data.status,
  };
}

/**
 * Verify Creem webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string | null): boolean {
  if (!signature || !CREEM_WEBHOOK_SECRET) return false;
  const expectedSignature = crypto
    .createHmac('sha256', CREEM_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Handle webhook events from Creem
 */
export function handleWebhookEvent(event: any) {
  const eventType = event.type;
  const data = event.data;

  switch (eventType) {
    case 'checkout.completed':
      return {
        type: 'payment_success',
        userId: data.metadata?.user_id,
        planKey: data.metadata?.plan_key,
        billingCycle: data.metadata?.billing_cycle,
        customerId: data.customer_id,
        orderId: data.order_id,
        checkoutId: data.id,
      };

    case 'subscription.created':
      return {
        type: 'subscription_created',
        userId: data.metadata?.user_id,
        planKey: data.metadata?.plan_key,
        subscriptionId: data.id,
        customerId: data.customer_id,
      };

    case 'subscription.canceled':
      return {
        type: 'subscription_canceled',
        subscriptionId: data.id,
        customerId: data.customer_id,
      };

    case 'subscription.renewed':
      return {
        type: 'subscription_renewed',
        subscriptionId: data.id,
        customerId: data.customer_id,
      };

    default:
      return { type: 'unknown', eventType };
  }
}

/**
 * Check if Creem payment is configured
 */
export function isCreemConfigured(): boolean {
  return !!(CREEM_API_KEY && PLAN_PRODUCT_IDS.pro.monthly);
}
