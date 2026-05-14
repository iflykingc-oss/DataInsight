'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function RefundPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8">
          ← {t('backToHome') || 'Back to DataInsight'}
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">{t('legal.refundTitle')}</h1>
        <p className="text-xs text-muted-foreground/60 mb-8">{t('legal.lastUpdated')}</p>

        <div className="text-sm text-muted-foreground leading-relaxed space-y-8 min-w-0">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.refund.s1Title')}</h2>
            <p>{t('legal.refund.s1Desc')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.refund.s2Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.refund.s2New')}</li>
              <li>{t('legal.refund.s2Renewal')}</li>
              <li>{t('legal.refund.s2Upgrade')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.refund.s3Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.refund.s3AutoRenew')}</li>
              <li>{t('legal.refund.s3CancelKeep')}</li>
              <li>{t('legal.refund.s3NoPartial')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.refund.s4Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.refund.s4Used')}</li>
              <li>{t('legal.refund.s4Violation')}</li>
              <li>{t('legal.refund.s4Promo')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.refund.s5Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.refund.s5Original')}</li>
              <li>{t('legal.refund.s5Timeline')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.refund.s6Title')}</h2>
            <p>{t('legal.refund.s6Desc')}</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>{t('legal.refund.s6Settings')}</li>
              <li>{t('legal.refund.s6Email')}</li>
              <li>{t('legal.refund.s6Portal')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.refund.s7Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.refund.s7Downgrade')}</li>
              <li>{t('legal.refund.s7Pause')}</li>
              <li>{t('legal.refund.s7Free')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.refund.s8Title')}</h2>
            <p>{t('legal.refund.s8Desc')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
