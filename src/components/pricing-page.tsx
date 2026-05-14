'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAuth } from '@/lib/use-auth';
import { Button } from '@/components/ui/button';
import { Check, X, Zap, Sparkles, ArrowRight, Clock, Shield, RotateCcw, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  highlight_features: string[];
  is_popular: boolean;
  sort_order: number;
  promotion_type: string | null;
  promotion_label: string | null;
  promotion_label_en: string | null;
  promotion_price_monthly: number | null;
  promotion_price_yearly: number | null;
  promotion_start_at: string | null;
  promotion_end_at: string | null;
  _promotion_active: boolean;
}

interface PricingPageProps {
  onBack?: () => void;
  onOpenLegal?: (type: 'terms' | 'privacy' | 'refund') => void;
}

export default function PricingPage({ onBack, onOpenLegal }: PricingPageProps) {
  const { t, locale } = useI18n();
  const { isLoggedIn } = useAuth();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const [currentPlan, setCurrentPlan] = useState('free');

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/pricing');
        const data = await res.json();
        if (data.success) setPlans(data.plans);

        const token = typeof window !== 'undefined' ? localStorage.getItem('datainsight_token') : null;
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
    };
    fetchPlans();
  }, []);

  const getName = (plan: PricingPlan) => locale === 'en-US' ? (plan.name_en || plan.name) : plan.name;
  const getDesc = (plan: PricingPlan) => locale === 'en-US' ? (plan.description_en || plan.description) : plan.description;
  const getPromoLabel = (plan: PricingPlan) => locale === 'en-US' ? (plan.promotion_label_en || plan.promotion_label) : plan.promotion_label;

  const formatPrice = (cents: number | null, currency: string) => {
    if (cents === null || cents === undefined) return '';
    if (cents === 0) return t('pricing.free');
    const amount = cents / 100;
    if (currency === 'CNY') return `¥${amount}`;
    return `$${amount}`;
  };

  const getPrice = (plan: PricingPlan) => {
    if (plan._promotion_active && plan.promotion_type) {
      if (billing === 'monthly') {
        return plan.promotion_price_monthly ?? plan.price_monthly;
      }
      return plan.promotion_price_yearly ?? plan.price_yearly;
    }
    return billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
  };

  const getOriginalPrice = (plan: PricingPlan) => {
    if (plan._promotion_active && plan.promotion_type && plan.promotion_price_monthly !== null) {
      return billing === 'monthly' ? plan.price_monthly : plan.price_yearly;
    }
    return null;
  };

  const featureIcon = (value: unknown) => {
    if (value === true) return <Check className="w-3.5 h-3.5 text-primary shrink-0" />;
    if (value === false) return <X className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />;
    return <Check className="w-3.5 h-3.5 text-primary shrink-0" />;
  };

  const renderFeatureValue = (key: string, value: unknown): string => {
    if (typeof value === 'number') {
      if (value >= 999999999) return '∞';
      if (value >= 999) return '∞';
      if (key === 'maxRows') {
        if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
        return String(value);
      }
      if (key === 'aiCallLimit') return `${value}${t('pricing.times')}`;
      if (key === 'maxTables' && value >= 999) return '∞';
      return String(value);
    }
    if (typeof value === 'boolean') return '';
    if (typeof value === 'string') {
      if (value === 'all') return t('pricing.allTypes');
      if (value === 'basic') return t('pricing.basicTypes');
    }
    return String(value);
  };

  const featureLabelMap: Record<string, string> = {
    maxRows: t('pricing.maxRows'),
    maxTables: t('pricing.maxTables'),
    aiCallLimit: t('pricing.aiCallLimit'),
    chartTypes: t('pricing.chartTypes'),
    exportFormats: t('pricing.exportFormats'),
    sqlLab: t('pricing.sqlLab'),
    nl2dashboard: t('pricing.nl2dashboard'),
    aiField: t('pricing.aiField'),
    aiFormula: t('pricing.aiFormula'),
    customMetrics: t('pricing.customMetrics'),
    industryTemplates: t('pricing.industryTemplates'),
    dataCleaning: t('pricing.dataCleaning'),
    dataStory: t('pricing.dataStory'),
  };

  const highlightFeatureMap: Record<string, string> = {
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

  const planIconMap: Record<string, React.ReactNode> = {
    free: <Zap className="w-5 h-5" />,
    pro: <Sparkles className="w-5 h-5" />,
    business: <Sparkles className="w-5 h-5" />,
  };

  const handleUpgrade = (planKey: string) => {
    if (!isLoggedIn) {
      window.dispatchEvent(new CustomEvent('show-login'));
      return;
    }
    if (planKey === 'free') return;
    window.dispatchEvent(new CustomEvent('show-upgrade', { detail: { planKey, billing } }));
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center h-64 text-muted-foreground">
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          {onBack && (
            <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground mb-3 inline-flex items-center gap-1">
              ← {t('common.back')}
            </button>
          )}
          <h2 className="text-2xl font-bold text-foreground whitespace-nowrap">{t('pricing.title')}</h2>
          <p className="text-sm text-muted-foreground mt-2">{t('pricing.subtitle')}</p>

          {/* Competitor comparison badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-medium whitespace-nowrap">
            <Zap className="w-3.5 h-3.5" />
            {t('pricing.competitorBadge')}
          </div>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => setBilling('monthly')}
            className={cn(
              'px-4 py-1.5 text-sm rounded-md transition-all',
              billing === 'monthly'
                ? 'bg-foreground text-background font-medium shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >{t('pricing.monthly')}</button>
          <button
            onClick={() => setBilling('yearly')}
            className={cn(
              'px-4 py-1.5 text-sm rounded-md transition-all relative',
              billing === 'yearly'
                ? 'bg-foreground text-background font-medium shadow-sm'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            )}
          >
            {t('pricing.yearly')}
            <span className="ml-1 text-[10px] px-1 py-0.5 bg-primary/20 text-primary rounded-sm font-medium">
              {t('pricing.saveYearly')}
            </span>
          </button>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map(plan => {
            const isCurrent = plan.plan_key === currentPlan;
            const price = getPrice(plan);
            const originalPrice = getOriginalPrice(plan);
            const isPromoActive = plan._promotion_active && plan.promotion_type;
            const features = plan.features as Record<string, unknown> || {};
            const highlights = plan.highlight_features as string[] || [];

            return (
              <div
                key={plan.plan_key}
                className={cn(
                  'relative bg-card border rounded-xl p-6 flex flex-col transition-all',
                  plan.is_popular
                    ? 'border-primary shadow-md ring-1 ring-primary/20'
                    : 'border-border',
                  isCurrent && 'ring-2 ring-primary/40'
                )}
              >
                {/* Popular badge - sits on top edge */}
                {plan.is_popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full whitespace-nowrap">
                    {t('pricing.popular')}
                  </div>
                )}

                {/* Promotion badge - sits on top edge left */}
                {isPromoActive && !plan.is_popular && (
                  <div className="absolute -top-3 left-4 px-2.5 py-0.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded-full flex items-center gap-1 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {getPromoLabel(plan)}
                  </div>
                )}

                {/* Plan header */}
                <div className="flex items-center gap-2.5 mb-3 mt-1">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                    plan.is_popular ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}>
                    {planIconMap[plan.plan_key] || <Zap className="w-5 h-5" />}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground whitespace-nowrap">{getName(plan)}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-4">{getDesc(plan)}</p>

                {/* Price */}
                <div className="mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-foreground">{formatPrice(price, plan.currency)}</span>
                    {price > 0 && (
                      <span className="text-sm text-muted-foreground">
                        /{billing === 'monthly' ? t('pricing.month') : t('pricing.year')}
                      </span>
                    )}
                  </div>
                  {originalPrice && originalPrice > 0 && (
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(originalPrice, plan.currency)}
                      </span>
                      {billing === 'yearly' && (
                        <span className="text-xs text-primary font-medium">
                          {t('pricing.saveYearly')}
                        </span>
                      )}
                    </div>
                  )}
                  {billing === 'yearly' && price > 0 && !originalPrice && (
                    <span className="text-xs text-primary font-medium mt-0.5 block whitespace-nowrap">
                      {t('pricing.yearlyNote', { amount: formatPrice(Math.round(price / 12), plan.currency) })}
                    </span>
                  )}
                </div>

                {/* Highlight features */}
                {highlights.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    {highlights.map(hl => (
                      <div key={hl} className="flex items-center gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-foreground font-medium">{highlightFeatureMap[hl] || hl}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feature list */}
                <div className="flex-1 space-y-2 border-t border-border/50 pt-4">
                  {Object.entries(features).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      {featureIcon(value)}
                      <span className="text-muted-foreground flex-1">{featureLabelMap[key] || key}</span>
                      <span className={cn(
                        'font-medium text-right whitespace-nowrap',
                        value === false ? 'text-muted-foreground/40' : 'text-foreground'
                      )}>
                        {renderFeatureValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  className={cn(
                    'mt-5 w-full',
                    isCurrent
                      ? 'bg-muted text-muted-foreground'
                      : plan.is_popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'bg-foreground text-background hover:bg-foreground/90'
                  )}
                  disabled={isCurrent}
                  onClick={() => handleUpgrade(plan.plan_key)}
                >
                  {isCurrent ? t('pricing.currentPlan') : t('pricing.upgrade')}
                  {!isCurrent && <ArrowRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        {plans.length > 0 && (
          <div className="mt-12">
            <h3 className="text-base font-semibold text-foreground mb-4">{t('pricing.featureComparison')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-muted-foreground font-medium">{t('pricing.feature')}</th>
                    {plans.map(plan => (
                      <th key={plan.plan_key} className="text-center py-3 px-3 font-medium text-foreground whitespace-nowrap">
                        {getName(plan)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(plans[0]?.features || {}).map(featureKey => (
                    <tr key={featureKey} className="border-b border-border/50">
                      <td className="py-2.5 px-3 text-muted-foreground">{featureLabelMap[featureKey] || featureKey}</td>
                      {plans.map(plan => {
                        const value = (plan.features as Record<string, unknown>)?.[featureKey];
                        return (
                          <td key={plan.plan_key} className="text-center py-2.5 px-3">
                            {typeof value === 'boolean' ? (
                              value ? <Check className="w-4 h-4 text-primary mx-auto" /> : <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                            ) : (
                              <span className="font-medium text-foreground">{renderFeatureValue(featureKey, value)}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12 border-t border-border pt-8">
          <h3 className="text-base font-semibold text-foreground mb-4">{t('pricing.faq')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([1, 2, 3, 4, 5, 6] as const).map(i => (
              <div key={i} className="bg-muted/30 rounded-lg p-4">
                <div className="text-xs font-medium text-foreground">{t(`pricing.faqQ${i}`)}</div>
                <div className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{t(`pricing.faqA${i}`)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground/60">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <Shield className="w-4 h-4" />
            {t('pricing.securePayment')}
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <RotateCcw className="w-4 h-4" />
            {t('pricing.cancelAnytime')}
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <CreditCard className="w-4 h-4" />
            {t('pricing.noCreditCard')}
          </div>
        </div>

        {/* Legal Links */}
        {onOpenLegal && (
          <div className="mt-6 pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
            {t('pricing.byPurchasing')}{' '}
            <button type="button" className="underline hover:text-foreground transition-colors" onClick={() => onOpenLegal('terms')}>{t('legal.termsTitle')}</button>
            {' · '}
            <button type="button" className="underline hover:text-foreground transition-colors" onClick={() => onOpenLegal('privacy')}>{t('legal.privacyTitle')}</button>
            {' · '}
            <button type="button" className="underline hover:text-foreground transition-colors" onClick={() => onOpenLegal('refund')}>{t('legal.refundTitle')}</button>
          </div>
        )}
      </div>
    </div>
  );
}
