'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n';

interface LegalDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'privacy' | 'terms' | 'refund';
}

export function LegalDocumentDialog({ open, onOpenChange, type }: LegalDocumentDialogProps) {
  const { t } = useI18n();

  const titles: Record<string, string> = {
    privacy: t('legal.privacyTitle'),
    terms: t('legal.termsTitle'),
    refund: t('legal.refundTitle'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{titles[type] || t('legal.termsTitle')}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto text-sm text-muted-foreground leading-relaxed space-y-4 min-w-0 pr-1">
          {type === 'privacy' && <PrivacyContent />}
          {type === 'terms' && <TermsContent />}
          {type === 'refund' && <RefundContent />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PrivacyContent() {
  const { t } = useI18n();
  return (
    <>
      <p className="text-xs text-muted-foreground/60">{t('legal.lastUpdated')}</p>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s1Title')}</h3>
        <p>{t('legal.privacy.s1Desc')}</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li><strong>{t('legal.privacy.s1Account')}</strong>{t('legal.privacy.s1AccountDesc')}</li>
          <li><strong>{t('legal.privacy.s1Security')}</strong>{t('legal.privacy.s1SecurityDesc')}</li>
          <li><strong>{t('legal.privacy.s1Logs')}</strong>{t('legal.privacy.s1LogsDesc')}</li>
          <li><strong>{t('legal.privacy.s1Config')}</strong>{t('legal.privacy.s1ConfigDesc')}</li>
          <li><strong>{t('legal.privacy.s1Payment')}</strong>{t('legal.privacy.s1PaymentDesc')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s2Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.privacy.s2Ip')}</li>
          <li>{t('legal.privacy.s2Fingerprint')}</li>
          <li>{t('legal.privacy.s2Device')}</li>
          <li>{t('legal.privacy.s2Tracker')}</li>
          <li>{t('legal.privacy.s2BusinessData')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s3Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.privacy.s3Client')}</li>
          <li>{t('legal.privacy.s3Database')}</li>
          <li>{t('legal.privacy.s3Bcrypt')}</li>
          <li>{t('legal.privacy.s3Payment')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s4Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.privacy.s4Logs')}</li>
          <li>{t('legal.privacy.s4Account')}</li>
          <li>{t('legal.privacy.s4Preference')}</li>
          <li>{t('legal.privacy.s4Payment')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s5Title')}</h3>
        <p>{t('legal.privacy.s5Desc')}</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li><strong>{t('legal.privacy.s5Access')}</strong>{t('legal.privacy.s5AccessDesc')}</li>
          <li><strong>{t('legal.privacy.s5Delete')}</strong>{t('legal.privacy.s5DeleteDesc')}</li>
          <li><strong>{t('legal.privacy.s5Portability')}</strong>{t('legal.privacy.s5PortabilityDesc')}</li>
          <li><strong>{t('legal.privacy.s5Correct')}</strong>{t('legal.privacy.s5CorrectDesc')}</li>
          <li><strong>{t('legal.privacy.s5Restrict')}</strong>{t('legal.privacy.s5RestrictDesc')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s6Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.privacy.s6Tls')}</li>
          <li>{t('legal.privacy.s6Rls')}</li>
          <li>{t('legal.privacy.s6Bearer')}</li>
          <li>{t('legal.privacy.s6Audit')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s7Title')}</h3>
        <p>{t('legal.privacy.s7Desc')}</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s8Title')}</h3>
        <p>{t('legal.privacy.s8Desc')}</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.privacy.s8Func')}</li>
          <li>{t('legal.privacy.s8NoPii')}</li>
          <li>{t('legal.privacy.s8Clear')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s9Title')}</h3>
        <p>{t('legal.privacy.s9Desc')}</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s10Title')}</h3>
        <p>{t('legal.privacy.s10Desc')}</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.privacy.s11Title')}</h3>
        <p>{t('legal.privacy.s11Desc')}</p>
      </section>
    </>
  );
}

function TermsContent() {
  const { t } = useI18n();
  return (
    <>
      <p className="text-xs text-muted-foreground/60">{t('legal.lastUpdated')}</p>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s1Title')}</h3>
        <p>{t('legal.terms.s1Desc')}</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s2Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.terms.s2Real')}</li>
          <li>{t('legal.terms.s2Protect')}</li>
          <li>{t('legal.terms.s2NoTransfer')}</li>
          <li>{t('legal.terms.s2Notify')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s3Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.terms.s3Client')}</li>
          <li>{t('legal.terms.s3Own')}</li>
          <li>{t('legal.terms.s3NoAccess')}</li>
          <li>{t('legal.terms.s3Backup')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s4Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.terms.s4Reference')}</li>
          <li>{t('legal.terms.s4Inaccurate')}</li>
          <li>{t('legal.terms.s4Decision')}</li>
          <li>{t('legal.terms.s4Availability')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s5Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.terms.s5Subscription')}</li>
          <li>{t('legal.terms.s5Billing')}</li>
          <li>{t('legal.terms.s5Cancellation')}</li>
          <li>{t('legal.terms.s5Change')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s6Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.terms.s6Illegal')}</li>
          <li>{t('legal.terms.s6Attack')}</li>
          <li>{t('legal.terms.s6Malware')}</li>
          <li>{t('legal.terms.s6Abuse')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s7Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.terms.s7Modify')}</li>
          <li>{t('legal.terms.s7Notice')}</li>
          <li>{t('legal.terms.s7Violation')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s8Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.terms.s8AsIs')}</li>
          <li>{t('legal.terms.s8Indirect')}</li>
          <li>{t('legal.terms.s8ThirdParty')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.terms.s9Title')}</h3>
        <p>{t('legal.terms.s9Desc')}</p>
      </section>
    </>
  );
}

function RefundContent() {
  const { t } = useI18n();
  return (
    <>
      <p className="text-xs text-muted-foreground/60">{t('legal.lastUpdated')}</p>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.refund.s1Title')}</h3>
        <p>{t('legal.refund.s1Desc')}</p>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.refund.s2Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.refund.s2New')}</li>
          <li>{t('legal.refund.s2Renewal')}</li>
          <li>{t('legal.refund.s2Upgrade')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.refund.s3Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.refund.s3AutoRenew')}</li>
          <li>{t('legal.refund.s3CancelKeep')}</li>
          <li>{t('legal.refund.s3NoPartial')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.refund.s4Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.refund.s4Used')}</li>
          <li>{t('legal.refund.s4Violation')}</li>
          <li>{t('legal.refund.s4Promo')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.refund.s5Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.refund.s5Original')}</li>
          <li>{t('legal.refund.s5Timeline')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.refund.s6Title')}</h3>
        <p>{t('legal.refund.s6Desc')}</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>{t('legal.refund.s6Settings')}</li>
          <li>{t('legal.refund.s6Email')}</li>
          <li>{t('legal.refund.s6Portal')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.refund.s7Title')}</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>{t('legal.refund.s7Downgrade')}</li>
          <li>{t('legal.refund.s7Pause')}</li>
          <li>{t('legal.refund.s7Free')}</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-foreground mb-2">{t('legal.refund.s8Title')}</h3>
        <p>{t('legal.refund.s8Desc')}</p>
      </section>
    </>
  );
}
