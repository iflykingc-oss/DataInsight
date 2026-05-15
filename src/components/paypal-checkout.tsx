'use client';

import { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { useI18n } from '@/lib/i18n';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PayPalCheckoutProps {
  planKey: string;
  billingCycle: 'monthly' | 'yearly';
  price: number;
  currency: string;
  onSuccess?: () => void;
  onError?: (msg: string) => void;
}

export function PayPalCheckout({
  planKey,
  billingCycle,
  price,
  currency,
  onSuccess,
  onError,
}: PayPalCheckoutProps) {
  const { t } = useI18n();
  const [status, setStatus] = useState<'idle' | 'creating' | 'approving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // PayPal Client ID is public by design (visible in frontend JS).
  // Fallback to hardcoded production ID if env var not available at build time.
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || 'AY3oWB9WeyCXOeZlllfp3t-6hEmfUURdJUz_FIbBlqZs56AEiOgQc_Y1-HDJ2RyGjgp06Ay8AgkvrSZI';
  const isSandbox = process.env.NEXT_PUBLIC_PAYPAL_SANDBOX !== 'false';

  if (!clientId) {
    return (
      <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-xs flex items-start gap-2">
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>{t('upgrade.notConfigured') || 'PayPal 未配置'}</span>
      </div>
    );
  }

  const createOrder = async () => {
    setStatus('creating');
    setMessage('');

    const res = await fetch('/api/checkout/paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planKey,
        billingCycle,
        price,
        currency,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || t('upgrade.error') || '创建订单失败');
    }
    return data.data.orderId;
  };

  const onApprove = async (data: { orderID: string }) => {
    setStatus('approving');

    const res = await fetch('/api/checkout/paypal/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: data.orderID,
        planKey,
        billingCycle,
      }),
    });

    const result = await res.json();

    if (result.success) {
      setStatus('success');
      setMessage(t('upgrade.success') || '支付成功！');
      onSuccess?.();
    } else {
      setStatus('error');
      const msg = result.error || t('upgrade.error') || '支付失败';
      setMessage(msg);
      onError?.(msg);
    }
  };

  return (
    <div className="space-y-3">
      <PayPalScriptProvider
        options={{
          clientId,
          currency: currency.toUpperCase(),
          intent: 'capture',
          ...(isSandbox ? { 'client-id': clientId } : {}),
        }}
      >
        <PayPalButtons
          style={{
            layout: 'vertical',
            color: 'gold',
            shape: 'rect',
            label: 'pay',
          }}
          disabled={status === 'creating' || status === 'approving'}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={(err: unknown) => {
            setStatus('error');
            let msg = '';
            if (typeof err === 'string') {
              msg = err;
            } else if (err && typeof err === 'object' && 'message' in err) {
              msg = String((err as { message?: string }).message);
            }
            if (!msg) msg = t('upgrade.error') || 'PayPal 错误';
            setMessage(msg);
            onError?.(msg);
          }}
          onCancel={() => {
            setStatus('idle');
          }}
        />
      </PayPalScriptProvider>

      {status === 'creating' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t('upgrade.creatingOrder') || '创建订单中...'}
        </div>
      )}

      {status === 'approving' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          {t('upgrade.processing') || '处理中...'}
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-start gap-2 p-3 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 rounded-lg text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
