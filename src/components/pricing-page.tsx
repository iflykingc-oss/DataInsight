'use client';

import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';

interface PricingPlan {
  id: number;
  plan_key: string;
  name: string;
  name_en: string;
  description: string;
  description_en: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  features: Record<string, unknown>;
  is_popular: boolean;
  sort_order: number;
}

export default function PricingPage() {
  const { t, locale } = useI18n();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly');
  const [currentPlan, setCurrentPlan] = useState('free');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pricing');
      const data = await res.json();
      if (data.success) setPlans(data.plans);

      // Check current plan
      const token = localStorage.getItem('datainsight_token');
      if (token) {
        const usageRes = await fetch('/api/ai-usage', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const usageData = await usageRes.json();
        if (usageData.success && usageData.quota) {
          setCurrentPlan(usageData.quota.plan);
        }
      }
    } catch (err) {
      console.error('Failed to fetch pricing:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const getName = (plan: PricingPlan) => locale === 'en-US' ? (plan.name_en || plan.name) : plan.name;
  const getDesc = (plan: PricingPlan) => locale === 'en-US' ? (plan.description_en || plan.description) : plan.description;

  const formatPrice = (cents: number, currency: string) => {
    if (cents === 0) return t('pricing.free');
    const amount = cents / 100;
    if (currency === 'CNY') return `¥${amount}`;
    return `$${amount}`;
  };

  const featureLabels: Record<string, string> = {
    maxProjects: t('pricing.maxProjects'),
    maxFileSize: t('pricing.maxFileSize'),
    aiCallLimit: t('pricing.aiCallLimit'),
    chartTypes: t('pricing.chartTypes'),
    exportFormats: t('pricing.exportFormats'),
    support: t('pricing.support'),
    customMetrics: t('pricing.customMetrics'),
    dataStory: t('pricing.dataStory'),
    nl2dashboard: t('pricing.nl2dashboard'),
    apiAccess: t('pricing.apiAccess'),
    sso: t('pricing.sso'),
  };

  const renderFeatureValue = (key: string, value: unknown) => {
    if (typeof value === 'number') {
      if (value === -1) return '∞';
      if (key === 'maxFileSize') return `${value}MB`;
      if (key === 'aiCallLimit') return `${value}${t('pricing.times')}`;
      return String(value);
    }
    if (typeof value === 'boolean') return value ? '✓' : '✗';
    return String(value);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-xl font-semibold text-foreground">{t('pricing.title')}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t('pricing.subtitle')}</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3 py-4 border-b border-border">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${billing === 'monthly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >{t('pricing.monthly')}</button>
          <button
            onClick={() => setBilling('yearly')}
            className={`px-4 py-1.5 text-xs rounded-md transition-colors ${billing === 'yearly' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >{t('pricing.yearly')}</button>
          {billing === 'yearly' && <span className="text-xs text-success">{t('pricing.saveYearly')}</span>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">{t('common.loading')}</div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {plans.map(plan => {
                const isCurrent = plan.plan_key === currentPlan;
                const price = billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
                const features = plan.features as Record<string, unknown> || {};

                return (
                  <div
                    key={plan.plan_key}
                    className={`relative bg-card border rounded-md p-5 flex flex-col ${
                      plan.is_popular ? 'border-primary shadow-float' : 'border-border'
                    } ${isCurrent ? 'ring-2 ring-primary/30' : ''}`}
                  >
                    {plan.is_popular && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-[10px] font-medium rounded-md">
                        {t('pricing.popular')}
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-2.5 right-3 px-2 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-md">
                        {t('pricing.currentPlan')}
                      </div>
                    )}

                    <h3 className="text-base font-semibold text-foreground">{getName(plan)}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{getDesc(plan)}</p>

                    <div className="mt-4 mb-4">
                      <span className="text-2xl font-bold text-foreground">{formatPrice(price, plan.currency)}</span>
                      {price > 0 && <span className="text-xs text-muted-foreground">/{billing === 'monthly' ? t('pricing.month') : t('pricing.year')}</span>}
                    </div>

                    <div className="flex-1 space-y-2">
                      {Object.entries(features).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{featureLabels[key] || key}</span>
                          <span className={`font-medium ${value === false ? 'text-muted-foreground/50' : 'text-foreground'}`}>
                            {renderFeatureValue(key, value)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      className={`mt-4 w-full py-2 text-sm rounded-md transition-colors ${
                        isCurrent
                          ? 'bg-muted text-muted-foreground cursor-default'
                          : plan.is_popular
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                      disabled={isCurrent}
                    >
                      {isCurrent ? t('pricing.currentPlan') : t('pricing.upgrade')}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* FAQ */}
            <div className="mt-8 border-t border-border pt-6">
              <h3 className="text-sm font-medium text-foreground mb-4">{t('pricing.faq')}</h3>
              <div className="space-y-3">
                {([1, 2, 3] as const).map(i => (
                  <div key={i} className="bg-muted/30 rounded-md p-3">
                    <div className="text-xs font-medium text-foreground">{t(`pricing.faqQ${i}`)}</div>
                    <div className="text-xs text-muted-foreground mt-1">{t(`pricing.faqA${i}`)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
