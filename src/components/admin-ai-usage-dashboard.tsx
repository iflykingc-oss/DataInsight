'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useI18n } from '@/lib/i18n';

const CHART_COLORS = ['#4080FF', '#00B42A', '#FF7D00', '#722ED1', '#F53F3F', '#0FC6C2'];

interface AiUsageSummary {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  timeoutCalls: number;
  errorRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgLatency: number;
  estimatedCostCents: number;
  period: string;
  days: number;
}

export default function AdminAiUsageDashboard() {
  const { t } = useI18n();
  const [summary, setSummary] = useState<AiUsageSummary | null>(null);
  const [byFunction, setByFunction] = useState<Record<string, { count: number; tokens: number; errors: number; avgLatency: number }>>({});
  const [byModel, setByModel] = useState<Record<string, { count: number; tokens: number }>>({});
  const [dailyTrend, setDailyTrend] = useState<Record<string, { calls: number; tokens: number; errors: number }>>({});
  const [topUsers, setTopUsers] = useState<Array<{ userId: number; count: number; tokens: number }>>([]);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/admin/ai-usage?range=${range}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary as AiUsageSummary);
        setByFunction(data.byFunction as Record<string, { count: number; tokens: number; errors: number; avgLatency: number }>);
        setByModel(data.byModel as Record<string, { count: number; tokens: number }>);
        setDailyTrend(data.dailyTrend as Record<string, { calls: number; tokens: number; errors: number }>);
        setTopUsers(data.topUsers as Array<{ userId: number; count: number; tokens: number }>);
      }
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const functionData = Object.entries(byFunction).map(([name, data]) => ({
    name,
    calls: data.count,
    tokens: Math.round(data.tokens / 1000),
    errors: data.errors,
    avgLatency: data.avgLatency
  }));

  const modelData = Object.entries(byModel).map(([name, data], i) => ({
    name,
    value: data.count,
    color: CHART_COLORS[i % CHART_COLORS.length]
  }));

  const trendData = Object.entries(dailyTrend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: date.substring(5),
      calls: data.calls,
      tokens: Math.round(data.tokens / 1000),
      errors: data.errors
    }));

  const formatCost = (cents: number) => {
    if (cents < 100) return `¥${cents}`;
    return `¥${(cents / 100).toFixed(2)}`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-medium text-foreground">{t('admin.aiUsageTitle')}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t('admin.aiUsageDesc')}</p>
        </div>
        <div className="flex items-center gap-2">
          {(['1d', '7d', '30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                range === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {r === '1d' ? '24h' : r}
            </button>
          ))}
        </div>
      </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">{t('common.loading')}</div>
        ) : summary ? (
          <div className="p-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-md p-4">
                <div className="text-xs text-muted-foreground mb-1">{t('admin.totalCalls')}</div>
                <div className="text-2xl font-semibold text-foreground">{summary.totalCalls.toLocaleString()}</div>
                <div className="text-xs text-success mt-1">{summary.successCalls} {t('admin.success')}</div>
              </div>
              <div className="bg-card border border-border rounded-md p-4">
                <div className="text-xs text-muted-foreground mb-1">{t('admin.errorRate')}</div>
                <div className="text-2xl font-semibold text-foreground">{summary.errorRate}%</div>
                <div className="text-xs text-destructive mt-1">{summary.errorCalls + summary.timeoutCalls} {t('admin.failed')}</div>
              </div>
              <div className="bg-card border border-border rounded-md p-4">
                <div className="text-xs text-muted-foreground mb-1">{t('admin.totalTokens')}</div>
                <div className="text-2xl font-semibold text-foreground">{(summary.totalTokens / 1000).toFixed(1)}K</div>
                <div className="text-xs text-muted-foreground mt-1">{t('admin.avgLatency')} {summary.avgLatency}ms</div>
              </div>
              <div className="bg-card border border-border rounded-md p-4">
                <div className="text-xs text-muted-foreground mb-1">{t('admin.estimatedCost')}</div>
                <div className="text-2xl font-semibold text-foreground">{formatCost(summary.estimatedCostCents)}</div>
                <div className="text-xs text-muted-foreground mt-1">{summary.days}d {t('admin.period')}</div>
              </div>
            </div>

            {/* Daily Trend */}
            {trendData.length > 0 && (
              <div className="bg-card border border-border rounded-md p-4">
                <h3 className="text-sm font-medium text-foreground mb-4">{t('admin.dailyTrend')}</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="calls" stroke="#4080FF" strokeWidth={2} dot={false} name={t('admin.calls')} />
                    <Line type="monotone" dataKey="errors" stroke="#F53F3F" strokeWidth={2} dot={false} name={t('admin.failed')} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* By Function Type */}
              {functionData.length > 0 && (
                <div className="bg-card border border-border rounded-md p-4">
                  <h3 className="text-sm font-medium text-foreground mb-4">{t('admin.byFunction')}</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={functionData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }} />
                      <Bar dataKey="calls" fill="#4080FF" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* By Model */}
              {modelData.length > 0 && (
                <div className="bg-card border border-border rounded-md p-4">
                  <h3 className="text-sm font-medium text-foreground mb-4">{t('admin.byModel')}</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={modelData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {modelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Top Users Table */}
            {topUsers.length > 0 && (
              <div className="bg-card border border-border rounded-md p-4">
                <h3 className="text-sm font-medium text-foreground mb-3">{t('admin.topUsers')}</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium">User ID</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">{t('admin.calls')}</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u) => (
                      <tr key={u.userId} className="border-b border-border/50">
                        <td className="py-2 text-foreground">{u.userId}</td>
                        <td className="py-2 text-right text-foreground">{u.count.toLocaleString()}</td>
                        <td className="py-2 text-right text-muted-foreground">{(u.tokens / 1000).toFixed(1)}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">{t('admin.noData')}</div>
        )}
    </div>
  );
}
