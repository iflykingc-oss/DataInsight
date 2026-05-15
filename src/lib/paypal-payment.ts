/**
 * PayPal Payment Integration for DataInsight
 * 使用 PayPal Orders API v2
 * 中国大陆个人开发者可直接注册 PayPal 商业账户
 */

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const PAYPAL_SANDBOX = process.env.PAYPAL_SANDBOX !== 'false'; // 默认沙盒模式

const PAYPAL_API_BASE = PAYPAL_SANDBOX
  ? 'https://api-m.sandbox.paypal.com'
  : 'https://api-m.paypal.com';

interface PayPalOrderParams {
  planKey: string;
  billingCycle: 'monthly' | 'yearly';
  userId: number;
  userEmail: string;
  planName: string;
  price: number;
  currency: string;
  successUrl?: string;
  cancelUrl?: string;
}

/** 检查 PayPal 是否已配置 */
export function isPayPalConfigured(): boolean {
  return !!(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
}

/** 获取 PayPal Access Token */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal auth failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/** 创建 PayPal 订单 */
export async function createPayPalOrder(params: PayPalOrderParams) {
  const {
    planKey,
    billingCycle,
    userId,
    userEmail,
    planName,
    price,
    currency,
    successUrl,
    cancelUrl,
  } = params;

  const accessToken = await getAccessToken();
  const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || 'http://localhost:5000';

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency.toUpperCase(),
          value: price.toFixed(2),
        },
        description: `${planName} - ${billingCycle}`,
        custom_id: JSON.stringify({
          user_id: userId,
          user_email: userEmail,
          plan_key: planKey,
          billing_cycle: billingCycle,
        }),
      }],
      application_context: {
        brand_name: 'DataInsight',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        return_url: successUrl || `${domain}/?payment=success&provider=paypal`,
        cancel_url: cancelUrl || `${domain}/pricing?payment=cancel`,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal order creation failed: ${error}`);
  }

  const data = await response.json();
  return {
    orderId: data.id,
    status: data.status,
    approvalUrl: data.links.find((l: any) => l.rel === 'approve')?.href,
  };
}

/** 捕获 PayPal 订单（支付完成后） */
export async function capturePayPalOrder(orderId: string) {
  const accessToken = await getAccessToken();

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PayPal capture failed: ${error}`);
  }

  const data = await response.json();
  const customId = data.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id ||
                   data.purchase_units?.[0]?.custom_id;

  let metadata: Record<string, string> = {};
  try {
    metadata = customId ? JSON.parse(customId) : {};
  } catch {
    metadata = { raw_custom_id: customId };
  }

  return {
    orderId: data.id,
    status: data.status,
    captureId: data.purchase_units?.[0]?.payments?.captures?.[0]?.id,
    amount: data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value,
    currency: data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code,
    payerEmail: data.payer?.email_address,
    payerId: data.payer?.payer_id,
    metadata,
  };
}

/** 验证 PayPal Webhook */
export async function verifyPayPalWebhook(
  headers: Headers,
  body: string,
  webhookId: string
): Promise<boolean> {
  const transmissionId = headers.get('paypal-transmission-id');
  const transmissionTime = headers.get('paypal-transmission-time');
  const certUrl = headers.get('paypal-cert-url');
  const transmissionSig = headers.get('paypal-transmission-sig');

  if (!transmissionId || !transmissionTime || !certUrl || !transmissionSig || !webhookId) {
    return false;
  }

  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: transmissionId,
        transmission_time: transmissionTime,
        cert_url: certUrl,
        auth_algo: headers.get('paypal-auth-algo') || 'SHA256withRSA',
        transmission_sig: transmissionSig,
        webhook_id: webhookId,
        webhook_event: JSON.parse(body),
      }),
    });

    if (!response.ok) return false;
    const data = await response.json();
    return data.verification_status === 'SUCCESS';
  } catch {
    return false;
  }
}

/** 处理 PayPal Webhook 事件 */
export function handlePayPalWebhook(event: any) {
  const eventType = event.event_type;
  const resource = event.resource;

  switch (eventType) {
    case 'CHECKOUT.ORDER.APPROVED':
    case 'CHECKOUT.ORDER.COMPLETED': {
      let metadata: Record<string, string> = {};
      try {
        const customId = resource.purchase_units?.[0]?.custom_id;
        metadata = customId ? JSON.parse(customId) : {};
      } catch {
        metadata = {};
      }
      return {
        type: 'payment_success',
        orderId: resource.id,
        userId: metadata.user_id,
        planKey: metadata.plan_key,
        billingCycle: metadata.billing_cycle,
        amount: resource.purchase_units?.[0]?.amount?.value,
        currency: resource.purchase_units?.[0]?.amount?.currency_code,
        payerEmail: resource.payer?.email_address,
      };
    }

    case 'PAYMENT.CAPTURE.COMPLETED': {
      return {
        type: 'payment_capture_completed',
        captureId: resource.id,
        orderId: resource.supplementary_parent_id,
        status: resource.status,
        amount: resource.amount?.value,
        currency: resource.amount?.currency_code,
      };
    }

    default:
      return { type: 'unknown', eventType };
  }
}
