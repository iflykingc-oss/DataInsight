'use client';

import { useI18n } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { request } from '@/lib/request';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, BarChart3, Clock, TrendingUp, AlertTriangle, ChevronRight } from 'lucide-react';

interface UsageQuota {
  plan: string;
  aiCallsUsed: number;
  aiCallsLimit: number;
  storageUsedMb: number;
  storageLimitMb: number;
  periodStart: string;
  periodEnd: string;
  remaining: number;
}

interface UsageData {
  success: boolean;
  quota: UsageQuota;
  byFunction: Record<string, { count: number; totalTokens: number; errors: number }>;
  totalCalls: number;
}

export function UsageStatsPanel({ onUpgrade }: { onUpgrade?: () => void }) {
  const { t } = useI18n();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const token = localStorage.getItem('datainsight_token');
        if (!token) {
          // Not logged in - show free tier defaults
          setUsage({
            success: true,
            quota: { plan: 'free', aiCallsUsed: 0, aiCallsLimit: 20, storageUsedMb: 0, storageLimitMb: 100, periodStart: '', periodEnd: '', remaining: 20 },
            byFunction: {},
            totalCalls: 0
          });
          setLoading(false);
          return;
        }
        const data = await request<UsageData>('/api/ai-usage', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUsage(data);
      } catch {
        // Default to free tier on error
        setUsage({
          success: true,
          quota: { plan: 'free', aiCallsUsed: 0, aiCallsLimit: 20, storageUsedMb: 0, storageLimitMb: 100, periodStart: '', periodEnd: '', remaining: 20 },
          byFunction: {},
          totalCalls: 0
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  if (loading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
        </CardContent>
      </Card>
    );
  }

  if (!usage) return null;

  const { quota, byFunction } = usage;
  const isUnlimited = quota.aiCallsLimit === -1 || quota.aiCallsLimit >= 9999;
  const usagePercent = isUnlimited ? 0 : Math.min(100, (quota.aiCallsUsed / quota.aiCallsLimit) * 100);
  const isNearLimit = !isUnlimited && usagePercent >= 80;
  const isOverLimit = !isUnlimited && usagePercent >= 100;

  const planName = quota.plan === 'free' ? t('pricing.free') :
    quota.plan === 'pro' ? t('pricing.pro') :
    quota.plan === 'business' ? t('pricing.business') : quota.plan;

  const functionLabels: Record<string, string> = {
    insight: t('sidebar.insights') || 'AI Insights',
    chat: 'AI Chat',
    'ai-field': t('pricing.aiField') || 'AI Fields',
    'ai-formula': t('pricing.aiFormula') || 'AI Formulas',
    'ai-table': 'AI Table Builder',
    nl2dashboard: 'NL2Dashboard',
    'data-story': t('pricing.hlDataStory') || 'Data Story',
    'metric-ai': 'Metric AI',
    'industry-detect': 'Industry Detect',
    'analysis-planner': 'Analysis Planner',
    'image-gen': 'Image Gen',
    speech: 'Speech',
  };

  return (
    <Card className={`border-border/50 ${isOverLimit ? 'border-destructive/30' : isNearLimit ? 'border-amber-500/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-primary" />
            {t('admin.aiUsage') || 'AI Usage'}
          </CardTitle>
          <Badge variant="outline" className="text-xs capitalize">
            {planName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Calls Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {t('pricing.aiCallLimit') || 'AI Calls'}
            </span>
            <span className={isOverLimit ? 'text-destructive font-medium' : isNearLimit ? 'text-amber-600 font-medium' : 'text-foreground'}>
              {quota.aiCallsUsed} / {isUnlimited ? '∞' : quota.aiCallsLimit}
            </span>
          </div>
          <Progress
            value={isUnlimited ? 5 : usagePercent}
            className={`h-2 ${isOverLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-amber-500' : ''}`}
          />
          {isNearLimit && !isOverLimit && (
            <div className="flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="w-3 h-3" />
              {t('pricing.upgradeCta') || 'Upgrade for more AI calls'}
            </div>
          )}
          {isOverLimit && (
            <div className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="w-3 h-3" />
              {t('admin.aiUsage') || 'AI quota exhausted'}
            </div>
          )}
        </div>

        {/* By Function Breakdown */}
        {Object.keys(byFunction).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {t('pricing.feature') || 'Features'} (30d)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(byFunction)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 6)
                .map(([func, data]) => (
                  <div key={func} className="flex items-center justify-between text-xs px-2 py-1 rounded-md bg-muted/50">
                    <span className="text-muted-foreground truncate">{functionLabels[func] || func}</span>
                    <span className="font-medium ml-1">{data.count}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Period Info */}
        {quota.periodEnd && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-3 h-3" />
            Resets: {new Date(quota.periodEnd).toLocaleDateString()}
          </div>
        )}

        {/* Upgrade Button */}
        {quota.plan === 'free' && onUpgrade && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={onUpgrade}
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            {t('pricing.upgrade') || 'Upgrade'}
            <ChevronRight className="w-3 h-3 ml-auto" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
