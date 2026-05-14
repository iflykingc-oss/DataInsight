'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

export default function TermsPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-8">
          ← {t('backToHome') || 'Back to DataInsight'}
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">{t('legal.termsTitle')}</h1>
        <p className="text-xs text-muted-foreground/60 mb-8">{t('legal.lastUpdated')}</p>

        <div className="text-sm text-muted-foreground leading-relaxed space-y-8 min-w-0">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s1Title')}</h2>
            <p>{t('legal.terms.s1Desc')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s2Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.terms.s2Real')}</li>
              <li>{t('legal.terms.s2Protect')}</li>
              <li>{t('legal.terms.s2NoTransfer')}</li>
              <li>{t('legal.terms.s2Notify')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s3Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.terms.s3Client')}</li>
              <li>{t('legal.terms.s3Own')}</li>
              <li>{t('legal.terms.s3NoAccess')}</li>
              <li>{t('legal.terms.s3Backup')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s4Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.terms.s4Reference')}</li>
              <li>{t('legal.terms.s4Inaccurate')}</li>
              <li>{t('legal.terms.s4Decision')}</li>
              <li>{t('legal.terms.s4Availability')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s5Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.terms.s5Subscription')}</li>
              <li>{t('legal.terms.s5Billing')}</li>
              <li>{t('legal.terms.s5Cancellation')}</li>
              <li>{t('legal.terms.s5Change')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s6Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.terms.s6Illegal')}</li>
              <li>{t('legal.terms.s6Attack')}</li>
              <li>{t('legal.terms.s6Malware')}</li>
              <li>{t('legal.terms.s6Abuse')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s7Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.terms.s7Modify')}</li>
              <li>{t('legal.terms.s7Notice')}</li>
              <li>{t('legal.terms.s7Violation')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s8Title')}</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>{t('legal.terms.s8AsIs')}</li>
              <li>{t('legal.terms.s8Indirect')}</li>
              <li>{t('legal.terms.s8ThirdParty')}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">{t('legal.terms.s9Title')}</h2>
            <p>{t('legal.terms.s9Desc')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
