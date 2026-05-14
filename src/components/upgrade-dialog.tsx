'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Check,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Gift,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/use-auth';

type PaymentMethod = 'creem' | 'paypal' | 'license';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planKey: string;
  billingCycle: 'monthly' | 'yearly';
}

interface PlanInfo {
  name: string;
  nameEn: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
}

export function UpgradeDialog({ open, onOpenChange, planKey, billingCycle }: UpgradeDialogProps) {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('creem');
  const [licenseCode, setLicenseCode] = useState('');
  const [redeemResult, setRedeemResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!open || !planKey) return;
    setPlanLoading(true);
    setError(null);
    setRedeemResult(null);

    fetch('/api/pricing')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.plans) {
          const plan = data.plans.find((p: Record<string, unknown>) => p.plan_key === planKey);
          if (plan) {
            setPlanInfo({
              name: plan.name,
              nameEn: plan.name_en || plan.name,
              priceMonthly: plan.price_monthly,
              priceYearly: plan.price_yearly,
              currency: plan.currency || 'USD',
              features: plan.highlight_features || [],
            });
          }
        }
      })
      .catch(err => {
        console.error('Failed to fetch plan:', err);
      })
      .finally(() => setPlanLoading(false));
  }, [open, planKey]);

  const handleCheckout = async () => {
    if (!user) {
      setError(t('auth.loginRequired'));
      return;
    }

    if (paymentMethod === 'license') {
      handleLicenseRedeem();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = paymentMethod === 'paypal' ? '/api/checkout/paypal' : '/api/checkout';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey,
          billingCycle,
          userId: user.id,
          userEmail: user.email || user.username,
          successUrl: `${window.location.origin}?payment=success`,
          cancelUrl: `${window.location.origin}?payment=cancel`,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.code === 'PAYMENT_NOT_CONFIGURED' || data.code === 'PAYPAL_NOT_CONFIGURED'
          ? t('upgrade.notConfigured')
          : (data.error || t('upgrade.error'));
        setError(errMsg);
        return;
      }

      if (paymentMethod === 'paypal' && data.data?.approvalUrl) {
        window.location.href = data.data.approvalUrl;
      } else if (data.data?.checkoutUrl) {
        window.location.href = data.data.checkoutUrl;
      } else {
        setError(t('upgrade.error'));
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError(t('upgrade.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLicenseRedeem = async () => {
    if (!licenseCode.trim()) return;
    if (!user) {
      setError(t('auth.loginRequired'));
      return;
    }

    setLoading(true);
    setError(null);
    setRedeemResult(null);

    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', code: licenseCode.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setRedeemResult({
          success: true,
          message: t('license.redeemSuccess') || '激活成功！您的订阅已激活。',
        });
        window.location.reload();
      } else {
        const errorMap: Record<string, string> = {
          invalid_code: t('license.invalidCode') || '激活码无效',
          already_redeemed: t('license.alreadyRedeemed') || '该激活码已被使用',
          expired: t('license.expired') || '该激活码已过期',
        };
        setRedeemResult({
          success: false,
          message: errorMap[data.code] || data.error || '激活失败',
        });
      }
    } catch {
      setRedeemResult({
        success: false,
        message: t('license.networkError') || '网络错误，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number, currency: string) => {
    if (cents === 0) return t('pricing.free');
    const amount = cents / 100;
    if (currency === 'CNY') return `¥${amount}`;
    return `$${amount}`;
  };

  const getPrice = (): number => {
    if (!planInfo) return 0;
    return billingCycle === 'monthly' ? planInfo.priceMonthly : planInfo.priceYearly;
  };

  const getPeriodText = () => billingCycle === 'monthly' ? t('pricing.month') : t('pricing.year');

  const displayName = planInfo
    ? (locale === 'en-US' ? (planInfo.nameEn || planInfo.name) : planInfo.name)
    : planKey;

  const benefitMap: Record<string, string> = {
    unlimited_tables: t('pricing.hlUnlimitedTables'),
    sql_lab: t('pricing.hlSqlLab'),
    ai_field: t('pricing.hlAiField'),
    ai_formula: t('pricing.hlAiFormula'),
    echarts_10: t('pricing.hlEcharts10'),
    unlimited_ai: t('pricing.hlUnlimitedAi'),
    nl2dashboard: t('pricing.hlNl2dashboard'),
    data_story: t('pricing.hlDataStory'),
    industry_all: t('pricing.hlIndustryAll'),
    metric_semantic: t('pricing.hlMetricSemantic'),
    deep_analysis: t('pricing.hlDeepAnalysis'),
    priority_support: t('pricing.hlPrioritySupport'),
  };

  const paymentMethods: { key: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { key: 'creem', label: t('upgrade.payCreem') || '信用卡 / 借记卡', icon: <CreditCard className="w-4 h-4" /> },
    { key: 'paypal', label: 'PayPal', icon: <span className="text-xs font-bold">P</span> },
    { key: 'license', label: t('upgrade.payLicense') || '激活码', icon: <Gift className="w-4 h-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            {t('upgrade.confirmTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('upgrade.confirmDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          {planLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              {t('common.loading')}
            </div>
          ) : planInfo ? (
            <div className="space-y-4">
              {/* Plan summary card */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('upgrade.plan')}</span>
                  <span className="font-semibold text-foreground">{displayName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('upgrade.billing')}</span>
                  <span className="font-medium text-foreground">
                    {billingCycle === 'monthly' ? t('upgrade.monthly') : t('upgrade.yearly')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-sm text-muted-foreground">{t('upgrade.price')}</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(getPrice(), planInfo.currency)}
                    <span className="text-sm font-normal text-muted-foreground ml-1">/{getPeriodText()}</span>
                  </span>
                </div>
              </div>

              {/* Payment method selector */}
              <div>
                <div className="text-sm font-medium text-foreground mb-2">{t('upgrade.paymentMethod') || '支付方式'}</div>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map(m => (
                    <button
                      key={m.key}
                      onClick={() => {
                        setPaymentMethod(m.key);
                        setError(null);
                        setRedeemResult(null);
                      }}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all',
                        paymentMethod === m.key
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30'
                      )}
                    >
                      {m.icon}
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* License code input */}
              {paymentMethod === 'license' && (
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    {t('license.codePlaceholder') || '激活码'}
                  </label>
                  <input
                    type="text"
                    value={licenseCode}
                    onChange={e => setLicenseCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm font-mono tracking-wider uppercase focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              {/* Benefits */}
              {planInfo.features.length > 0 && (
                <div>
                  <div className="text-sm font-medium text-foreground mb-2">{t('upgrade.benefits')}</div>
                  <div className="space-y-1.5">
                    {planInfo.features.map((f: string) => (
                      <div key={f} className="flex items-center gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-muted-foreground">{benefitMap[f] || f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('upgrade.loadPlanFailed')}
            </div>
          )}

          {/* Redeem result */}
          {redeemResult && (
            <div
              className={cn(
                'mt-4 flex items-start gap-2 p-3 rounded-lg text-xs',
                redeemResult.success
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-destructive/10 text-destructive'
              )}
            >
              {redeemResult.success ? (
                <Check className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{redeemResult.message}</span>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2 border-t border-border">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {t('upgrade.cancel')}
          </Button>
          <Button
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleCheckout}
            disabled={loading || planLoading || !planInfo || (paymentMethod === 'license' && !licenseCode.trim())}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                {t('upgrade.processing')}
              </>
            ) : (
              <>
                {paymentMethod === 'license'
                  ? (t('license.redeem') || '兑换')
                  : t('upgrade.confirm')}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
