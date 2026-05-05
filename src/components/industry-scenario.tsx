'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAuthHeaders } from '@/lib/request';
import {
  Building2, Sparkles, Loader2, Store, GraduationCap, Wallet, Stethoscope,
  Factory, Plane, ShoppingCart, TrendingUp, Target, LayoutGrid, Check,
  ArrowRight,
} from 'lucide-react';
import { ParsedData } from '@/lib/data-processor/types';
import { request } from '@/lib/request';

interface IndustryScenarioProps {
  data: ParsedData;
  fieldStats: Array<{ field: string; type: string; stats?: Record<string, number> }>;
  modelConfig?: Record<string, string>;
  onNavigate?: (view: string) => void;
}

// 行业定义
const INDUSTRIES = [
  {
    id: 'retail',
    name: '零售电商',
    icon: Store,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    description: '销售分析、商品管理、客户运营',
    metrics: ['销售额', '客单价', '复购率', '转化率', 'GMV', '动销率'],
    dashboardWidgets: ['销售趋势', '品类占比', 'TOP商品', '渠道对比', '客户画像'],
    keywords: ['销售', '商品', '订单', '客户', '店铺', 'SKU', 'GMV', '客单价', '复购', '库存'],
  },
  {
    id: 'finance',
    name: '金融财务',
    icon: Wallet,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    description: '财务报表、预算管理、风控分析',
    metrics: ['营收', '净利润', '毛利率', '费用率', '资产负债率', 'ROE'],
    dashboardWidgets: ['三表联动', '预算执行', '费用结构', '现金流', '异常凭证'],
    keywords: ['收入', '支出', '利润', '资产', '负债', '预算', '费用', '凭证', '现金流', '毛利率'],
  },
  {
    id: 'education',
    name: '教育培训',
    icon: GraduationCap,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    description: '学情分析、成绩追踪、课程评估',
    metrics: ['及格率', '优秀率', '平均分', '出勤率', '完成率', '满意度'],
    dashboardWidgets: ['成绩分布', '学情趋势', '课程评估', '出勤统计', '教师对比'],
    keywords: ['成绩', '学生', '课程', '班级', '考试', '分数', '出勤', '教师', '学期', '科目'],
  },
  {
    id: 'healthcare',
    name: '医疗健康',
    icon: Stethoscope,
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    description: '患者分析、诊疗统计、资源管理',
    metrics: ['门诊量', '床位使用率', '平均住院日', '治愈率', '满意度', '药占比'],
    dashboardWidgets: ['门诊趋势', '科室对比', '病种分析', '资源使用', '患者画像'],
    keywords: ['患者', '门诊', '住院', '科室', '医生', '药品', '诊断', '治疗', '床位', '手术'],
  },
  {
    id: 'manufacturing',
    name: '生产制造',
    icon: Factory,
    color: 'text-amber-600',
    bg: 'bg-amber-600/10',
    description: '产能分析、质量管理、供应链优化',
    metrics: ['良品率', 'OEE', '产能利用率', '库存周转率', '交付及时率', '单件成本'],
    dashboardWidgets: ['产能趋势', '质量分析', '产线对比', '库存水位', '供应链'],
    keywords: ['产量', '良品', '产线', '设备', '工艺', '物料', '库存', '订单', '交付', '供应商'],
  },
  {
    id: 'logistics',
    name: '物流运输',
    icon: Plane,
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
    description: '运力分析、时效监控、成本优化',
    metrics: ['准时率', '破损率', '单票成本', '车辆利用率', '周转率', '客户满意度'],
    dashboardWidgets: ['运力分布', '时效趋势', '成本结构', '线路对比', '异常监控'],
    keywords: ['运单', '仓库', '车辆', '线路', '时效', '配送', '签收', '揽收', '中转', '分拣'],
  },
];

function matchIndustry(data: ParsedData, fieldStats: Array<{ field: string; type: string }>): string[] {
  const headers = data.headers.map(h => h.toLowerCase());
  const sampleValues = data.rows.slice(0, 5);

  const scores: Record<string, number> = {};
  for (const industry of INDUSTRIES) {
    let score = 0;
    for (const kw of industry.keywords) {
      for (const h of headers) {
        if (h.includes(kw) || kw.includes(h)) {
          score += 2;
        }
      }
      // 检查样本值
      for (const row of sampleValues) {
        for (const h of data.headers) {
          const val = String(row[h] || '').toLowerCase();
          if (val.includes(kw)) score += 1;
        }
      }
    }
    scores[industry.id] = score;
  }

  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a);
  return sorted.filter(([, s]) => s > 0).map(([id]) => id);
}

export function IndustryScenario({ data, fieldStats, modelConfig, onNavigate }: IndustryScenarioProps) {
  const [detectedIndustries, setDetectedIndustries] = useState<string[]>(() => matchIndustry(data, fieldStats));
  const [selectedIndustry, setSelectedIndustry] = useState<string>(detectedIndustries[0] || 'retail');
  const [isDetecting, setIsDetecting] = useState(false);
  const [aiDetected, setAiDetected] = useState(false);

  const hasData = data?.headers?.length > 0;

  // AI深度识别行业
  const handleAIDetect = useCallback(async () => {
    setIsDetecting(true);
    try {
      const res = await fetch('/api/industry-detect', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          data: { headers: data.headers, rows: data.rows.slice(0, 10) },
          modelConfig,
        }),
      });
      const result = await res.json();
      if (result.industries?.length > 0) {
        setDetectedIndustries(result.industries);
        setSelectedIndustry(result.industries[0]);
        setAiDetected(true);
      }
    } catch {
      // 降级使用关键词匹配
    }
    setIsDetecting(false);
  }, [data, modelConfig]);

  const currentIndustry = INDUSTRIES.find(i => i.id === selectedIndustry) || INDUSTRIES[0];

  if (!hasData) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
          <Building2 className="w-12 h-12 mb-3 opacity-50" />
          <p>请先上传数据文件</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 行业识别头部 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                行业场景包
              </CardTitle>
              <CardDescription className="mt-1">
                AI 自动识别数据所属行业，加载对应的分析指标和仪表盘模板
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleAIDetect} disabled={isDetecting}>
              {isDetecting ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />AI识别中...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 mr-1" />AI深度识别</>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {detectedIndustries.length > 0 ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">识别结果:</span>
              {detectedIndustries.slice(0, 3).map(id => {
                const ind = INDUSTRIES.find(i => i.id === id);
                if (!ind) return null;
                const Icon = ind.icon;
                return (
                  <Badge
                    key={id}
                    variant={id === selectedIndustry ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setSelectedIndustry(id)}
                  >
                    <Icon className="w-3 h-3 mr-1" />{ind.name}
                    {id === detectedIndustries[0] && <Check className="w-3 h-3 ml-1" />}
                  </Badge>
                );
              })}
              {aiDetected && <Badge variant="secondary" className="text-[10px]">AI识别</Badge>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">未自动识别，请手动选择:</span>
              <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map(i => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 行业详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 行业概览 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {React.createElement(currentIndustry.icon, { className: `w-5 h-5 ${currentIndustry.color}` })}
              {currentIndustry.name}
            </CardTitle>
            <CardDescription>{currentIndustry.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">预置指标</p>
                <div className="flex flex-wrap gap-1">
                  {currentIndustry.metrics.map(m => (
                    <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">仪表盘组件</p>
                <div className="flex flex-wrap gap-1">
                  {currentIndustry.dashboardWidgets.map(w => (
                    <Badge key={w} variant="outline" className="text-xs">{w}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 字段映射 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">字段与指标映射</CardTitle>
              <Button variant="outline" size="sm" onClick={() => onNavigate?.('metrics')}>
                查看指标中心 <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
            <CardDescription>当前数据字段与行业指标的自动映射关系</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentIndustry.metrics.map(metric => {
                // 简单的字段映射：基于关键词匹配
                const matchedFields = data.headers.filter(h => {
                  const hLower = h.toLowerCase();
                  return currentIndustry.keywords.some(kw => hLower.includes(kw) || kw.includes(hLower));
                });
                return (
                  <div key={metric} className="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                    <Badge variant="secondary" className="min-w-[80px] justify-center text-xs">{metric}</Badge>
                    <span className="text-muted-foreground text-xs">←</span>
                    <div className="flex flex-wrap gap-1">
                      {matchedFields.length > 0 ? (
                        matchedFields.slice(0, 3).map(f => (
                          <Badge key={f} variant="outline" className="text-xs bg-primary/5">{f}</Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground/50">未匹配</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate?.('insights')}>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">行业分析</p>
              <p className="text-xs text-muted-foreground">一键生成行业报告</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate?.('visualization')}>
          <CardContent className="flex items-center gap-3 p-4">
            <LayoutGrid className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">行业看板</p>
              <p className="text-xs text-muted-foreground">加载行业仪表盘模板</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate?.('data-story')}>
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">行业故事</p>
              <p className="text-xs text-muted-foreground">生成行业数据叙事</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => onNavigate?.('chat')}>
          <CardContent className="flex items-center gap-3 p-4">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">行业问答</p>
              <p className="text-xs text-muted-foreground">对话式行业洞察</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 其他行业选择 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">切换行业</CardTitle>
          <CardDescription>手动选择其他行业查看对应场景包</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {INDUSTRIES.map(ind => {
              const Icon = ind.icon;
              const isActive = ind.id === selectedIndustry;
              return (
                <button
                  key={ind.id}
                  onClick={() => setSelectedIndustry(ind.id)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    isActive
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/30 hover:bg-muted/50'
                  }`}
                >
                  <Icon className={`w-6 h-6 mx-auto mb-1.5 ${isActive ? 'text-primary' : ind.color}`} />
                  <p className="text-xs font-medium">{ind.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{ind.metrics.length}个指标</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
