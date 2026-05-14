'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useI18n } from '@/lib/i18n';
import { Gift, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface LicenseRedeemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRedeemed?: () => void;
}

export default function LicenseRedeemDialog({
  open,
  onOpenChange,
  onRedeemed,
}: LicenseRedeemDialogProps) {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    planKey?: string;
  } | null>(null);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', code: code.trim() }),
      });
      const data = await res.json();

      if (data.success) {
        setResult({
          success: true,
          message: t('license.redeemSuccess') || '激活成功！您的订阅已激活。',
          planKey: data.data?.planKey,
        });
        onRedeemed?.();
      } else {
        const errorMap: Record<string, string> = {
          invalid_code: t('license.invalidCode') || '激活码无效，请检查输入',
          already_redeemed: t('license.alreadyRedeemed') || '该激活码已被使用',
          expired: t('license.expired') || '该激活码已过期',
        };
        setResult({
          success: false,
          message: errorMap[data.code] || data.error || '激活失败',
        });
      }
    } catch {
      setResult({
        success: false,
        message: t('license.networkError') || '网络错误，请稍后重试',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            {t('license.redeemTitle') || '激活码兑换'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            {t('license.redeemDesc') || '请输入您的激活码以兑换订阅'}
          </p>

          <div className="flex gap-2">
            <Input
              placeholder={t('license.codePlaceholder') || 'XXXX-XXXX-XXXX-XXXX'}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleRedeem()}
              disabled={loading}
              className="font-mono tracking-wider uppercase"
            />
            <Button onClick={handleRedeem} disabled={loading || !code.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('license.redeem') || '兑换'}
            </Button>
          </div>

          {result && (
            <div
              className={`flex items-start gap-2 p-3 rounded-lg text-sm ${
                result.success
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}
            >
              {result.success ? (
                <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t pt-3">
            {t('license.noCode') || '没有激活码？'}{' '}
            <button
              onClick={() => {
                onOpenChange(false);
                window.dispatchEvent(new CustomEvent('show-upgrade'));
              }}
              className="text-primary hover:underline"
            >
              {t('license.goPurchase') || '前往购买'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
