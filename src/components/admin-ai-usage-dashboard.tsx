'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { RefreshCw, Cpu, Filter, TrendingUp, Zap, AlertTriangle, DollarSign, Clock, Users, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

const CHART_COLORS = ['var(--color-primary)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-chart-5)', 'var(--color-destructive)'];

const FUNCTION_LABELS: Record<string, string> = {
  'llm-insight': 'AI 智能洞察',
  'ai-field': 'AI 字段',
  'ai-formula': 'AI 公式',
  'ai-table-builder': 'AI 建表',
  'metric-ai': 'AI 指标',
  'nl2-dashboard': 'NL2仪表盘',
  'data-story': '数据故事',
  'analysis-planner': '分析规划',
  'industry-detect': '行业识别',
};

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
  const [functionFilter, setFunctionFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableFunctions, setAvailableFunctions] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('datainsight_token');
      const params = new URLSearchParams({ range });
      if (functionFilter) params.set('functionType', functionFilter);
      if (modelFilter) params.set('modelName', modelFilter);
      const res = await fetch(`/api/admin/ai-usage?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSummary(data.summary as AiUsageSummary);
        setByFunction(data.byFunction as Record<string, { count: number; tokens: number; errors: number; avgLatency: number }>);
        setByModel(data.byModel as Record<string, { count: number; tokens: number }>);
        setDailyTrend(data.dailyTrend as Record<string, { calls: number; tokens: number; errors: number }>);
        setTopUsers(data.topUsers as Array<{ userId: number; count: number; tokens: number }>);
        setAvailableFunctions(Object.keys(data.byFunction || {}));
        setAvailableModels(Object.keys(data.byModel || {}));
      }
    } catch (err) {
      console.error('Failed to fetch AI usage:', err);
    } finally {
      setLoading(false);
    }
  }, [range, functionFilter, modelFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const functionData = Object.entries(byFunction).map(([name, data]) => ({
    name: FUNCTION_LABELS[name] || name,
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

  const hasData = summary && summary.totalCalls > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-medium flex items-center gap-1.5">
            <Cpu className="w-4 h-4 text-primary" />
            AI 使用量看板
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">监控 AI 功能调用量、Token 消耗与成本估算</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">时间范围:</span>
        </div>
        {(['1d', '7d', '30d', '90d'] as const).map(r => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
              range === r ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {r === '1d' ? '24h' : r}
          </button>
        ))}
        <div className="w-px h-5 bg-border mx-1" />
        <select
          className="h-7 rounded-md border bg-background px-2 text-xs"
          value={functionFilter}
          onChange={(e) => setFunctionFilter(e.target.value)}
        >
          <option value="">全部功能</option>
          {availableFunctions.map(f => (
            <option key={f} value={f}>{FUNCTION_LABELS[f] || f}</option>
          ))}
        </select>
        <select
          className="h-7 rounded-md border bg-background px-2 text-xs"
          value={modelFilter}
          onChange={(e) => setModelFilter(e.target.value)}
        >
          <option value="">全部模型</option>
          {availableModels.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {(functionFilter || modelFilter) && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setFunctionFilter(''); setModelFilter(''); }}>
            清除筛选
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          加载中...
        </div>
      ) : hasData ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border rounded-md p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <Zap className="w-3.5 h-3.5" />
                总调用量
              </div>
              <div className="text-xl font-semibold">{summary.totalCalls.toLocaleString()}</div>
              <div className="text-xs text-success mt-0.5">{summary.successCalls} 成功</div>
            </div>
            <div className="bg-card border rounded-md p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                错误率
              </div>
              <div className="text-xl font-semibold">{summary.errorRate}%</div>
              <div className="text-xs text-destructive mt-0.5">{summary.errorCalls + summary.timeoutCalls} 失败</div>
            </div>
            <div className="bg-card border rounded-md p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <BarChart3 className="w-3.5 h-3.5" />
                Token 消耗
              </div>
              <div className="text-xl font-semibold">{(summary.totalTokens / 1000).toFixed(1)}K</div>
              <div className="text-xs text-muted-foreground mt-0.5">平均延迟 {summary.avgLatency}ms</div>
            </div>
            <div className="bg-card border rounded-md p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <DollarSign className="w-3.5 h-3.5" />
                估算成本
              </div>
              <div className="text-xl font-semibold">{formatCost(summary.estimatedCostCents)}</div>
              <div className="text-xs text-muted-foreground mt-0.5">近 {summary.days} 天</div>
            </div>
          </div>

          {/* Daily Trend */}
          {trendData.length > 0 && (
            <div className="bg-card border rounded-md p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                每日趋势
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="calls" stroke="var(--color-primary)" strokeWidth={2} dot={false} name="调用量" />
                  <Line type="monotone" dataKey="errors" stroke="var(--color-destructive)" strokeWidth={2} dot={false} name="失败" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By Function Type */}
            {functionData.length > 0 && (
              <div className="bg-card border rounded-md p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  功能调用分布
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={functionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 6, fontSize: 12 }} />
                    <Bar dataKey="calls" fill="var(--color-primary)" radius={[0, 4, 4, 0]} name="调用量" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* By Model */}
            {modelData.length > 0 && (
              <div className="bg-card border rounded-md p-4">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  模型使用分布
                </h3>
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
            <div className="bg-card border rounded-md p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                用户调用排行
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-xs text-muted-foreground font-medium">用户 ID</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">调用次数</th>
                      <th className="text-right py-2 text-xs text-muted-foreground font-medium">Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topUsers.map((u) => (
                      <tr key={u.userId} className="border-b border-border/50">
                        <td className="py-2">#{u.userId}</td>
                        <td className="py-2 text-right">{u.count.toLocaleString()}</td>
                        <td className="py-2 text-right text-muted-foreground">{(u.tokens / 1000).toFixed(1)}K</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border rounded-md p-12 text-center">
          <Cpu className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">暂无 AI 使用数据</p>
          <p className="text-xs text-muted-foreground/60 mt-1">当用户开始使用 AI 功能后，这里将显示调用量统计</p>
        </div>
      )}
    </div>
  );
}
