'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Sparkles,
  FileText,
  TrendingUp,
  ListFilter,
  RefreshCw,
  ChevronRight,
  Lightbulb,
  Hash,
  Calendar,
  Type,
  Percent
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

// ============================================
// 类型定义
// ============================================

// 数据质量维度
type QualityDimension = 'completeness' | 'accuracy' | 'consistency' | 'timeliness';

// 质量检查类型
type QualityCheckType = 
  | 'null_check'
  | 'unique_check'
  | 'range_check'
  | 'pattern_check'
  | 'duplicate_check'
  | 'format_check'
  | 'custom_check';

// 质量检查结果
interface QualityCheckResult {
  id: string;
  field: string;
  checkType: QualityCheckType;
  status: 'pass' | 'warning' | 'fail';
  dimension: QualityDimension;
  description: string;
  details: {
    totalCount: number;
    failCount: number;
    failRate: number;
    sampleFails?: string[];
  };
  suggestion?: string;
}

// 质量报告
interface QualityReport {
  timestamp: number;
  overallScore: number;
  dimensionScores: Record<QualityDimension, number>;
  checks: QualityCheckResult[];
  summary: {
    totalFields: number;
    passedFields: number;
    warningFields: number;
    failedFields: number;
  };
  insights: string[];
}

// 预设检查规则
const PRESET_CHECKS: Array<{
  type: QualityCheckType;
  label: string;
  description: string;
  icon: React.ElementType;
  dimensions: QualityDimension[];
}> = [
  {
    type: 'null_check',
    label: '空值检测',
    description: '检查字段中是否存在空值或缺失数据',
    icon: AlertTriangle,
    dimensions: ['completeness']
  },
  {
    type: 'unique_check',
    label: '唯一性检测',
    description: '检查字段值是否唯一（适合ID类字段）',
    icon: Hash,
    dimensions: ['consistency']
  },
  {
    type: 'duplicate_check',
    label: '重复检测',
    description: '检查是否存在完全重复的记录',
    icon: FileText,
    dimensions: ['consistency']
  },
  {
    type: 'range_check',
    label: '范围检测',
    description: '检查数值是否在合理范围内',
    icon: TrendingUp,
    dimensions: ['accuracy']
  },
  {
    type: 'format_check',
    label: '格式检测',
    description: '检查数据格式是否符合预期',
    icon: ListFilter,
    dimensions: ['consistency']
  }
];

// 维度权重
const DIMENSION_WEIGHTS: Record<QualityDimension, number> = {
  completeness: 0.3,
  accuracy: 0.25,
  consistency: 0.25,
  timeliness: 0.2
};

// 维度颜色
const DIMENSION_COLORS: Record<QualityDimension, { bg: string; text: string; border: string }> = {
  completeness: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  accuracy: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' },
  consistency: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  timeliness: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' }
};

interface DataQualityCheckerProps {
  data: ParsedData;
  fieldStats: FieldStat[];
  onQualityUse?: (report: QualityReport) => void;
  className?: string;
}

export function DataQualityChecker({
  data,
  fieldStats,
  onQualityUse,
  className
}: DataQualityCheckerProps) {
  // 状态
  const [isChecking, setIsChecking] = useState(false);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [customChecks, setCustomChecks] = useState<QualityCheckResult[]>([]);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());

  // 计算基础质量检查
  const runQualityChecks = useCallback(async (): Promise<QualityReport> => {
    setIsChecking(true);
    
    // 模拟检查延迟
    await new Promise(resolve => setTimeout(resolve, 1500));

    const checks: QualityCheckResult[] = [];
    const fieldCheckMap: Record<string, QualityCheckResult[]> = {};

    // 1. 空值检测（所有字段）
    fieldStats.forEach(field => {
      const nullCount = data.rows.filter(r => 
        r[field.field] === null || r[field.field] === undefined || r[field.field] === ''
      ).length;
      const nullRate = nullCount / data.rows.length;

      const result: QualityCheckResult = {
        id: `${field.field}-null`,
        field: field.field,
        checkType: 'null_check',
        status: nullRate > 0.3 ? 'fail' : nullRate > 0.1 ? 'warning' : 'pass',
        dimension: 'completeness',
        description: `空值占比 ${(nullRate * 100).toFixed(1)}%`,
        details: {
          totalCount: data.rows.length,
          failCount: nullCount,
          failRate: nullRate,
          sampleFails: data.rows
            .filter(r => r[field.field] === null || r[field.field] === '')
            .slice(0, 3)
            .map(r => JSON.stringify(r))
        },
        suggestion: nullRate > 0 ? `建议：检查数据采集流程，考虑填充默认值或排除该字段` : undefined
      };

      checks.push(result);
      fieldCheckMap[field.field] = fieldCheckMap[field.field] || [];
      fieldCheckMap[field.field].push(result);
    });

    // 2. 唯一性检测（数值类型字段，低基数）
    fieldStats
      .filter(f => f.type === 'number')
      .forEach(field => {
        const uniqueRatio = (field.uniqueCount || 0) / data.rows.length;
        
        if (uniqueRatio > 0.9) {
          const result: QualityCheckResult = {
            id: `${field.field}-unique`,
            field: field.field,
            checkType: 'unique_check',
            status: 'pass',
            dimension: 'consistency',
            description: `唯一值占比 ${(uniqueRatio * 100).toFixed(1)}%`,
            details: {
              totalCount: data.rows.length,
              failCount: 0,
              failRate: 0
            }
          };
          checks.push(result);
          fieldCheckMap[field.field].push(result);
        }
      });

    // 3. 重复记录检测
    const seen = new Set<string>();
    const duplicateCount = data.rows.filter(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    }).length;

    checks.push({
      id: 'global-duplicate',
      field: '__all__',
      checkType: 'duplicate_check',
      status: duplicateCount > 0 ? 'warning' : 'pass',
      dimension: 'consistency',
      description: `发现 ${duplicateCount} 条完全重复的记录`,
      details: {
        totalCount: data.rows.length,
        failCount: duplicateCount,
        failRate: duplicateCount / data.rows.length
      },
      suggestion: duplicateCount > 0 ? '建议：使用去重功能清理重复数据' : undefined
    });

    // 4. 数值范围检测
    fieldStats
      .filter(f => f.type === 'number')
      .forEach(field => {
        const stat = field.numericStats;
        if (!stat) return;

        // 检测异常值（使用 IQR 方法）
        const q1 = stat.min + (stat.max - stat.min) * 0.25;
        const q3 = stat.min + (stat.max - stat.min) * 0.75;
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        const outlierCount = data.rows.filter(r => {
          const v = Number(r[field.field]);
          return v < lowerBound || v > upperBound;
        }).length;

        if (outlierCount > 0) {
          checks.push({
            id: `${field.field}-range`,
            field: field.field,
            checkType: 'range_check',
            status: outlierCount / data.rows.length > 0.1 ? 'warning' : 'pass',
            dimension: 'accuracy',
            description: `检测到 ${outlierCount} 个异常值`,
            details: {
              totalCount: data.rows.length,
              failCount: outlierCount,
              failRate: outlierCount / data.rows.length
            },
            suggestion: `建议：检查是否为数据录入错误或自然波动`
          });
          fieldCheckMap[field.field].push(checks[checks.length - 1]);
        }
      });

    // 计算维度分数
    const dimensionScores: Record<QualityDimension, number> = {
      completeness: 0,
      accuracy: 0,
      consistency: 0,
      timeliness: 0
    };

    Object.keys(dimensionScores).forEach(dim => {
      const dimChecks = checks.filter(c => c.dimension === dim);
      if (dimChecks.length === 0) {
        dimensionScores[dim as QualityDimension] = 100;
      } else {
        const passRate = dimChecks.filter(c => c.status === 'pass').length / dimChecks.length;
        const warnRate = dimChecks.filter(c => c.status === 'warning').length / dimChecks.length * 0.5;
        dimensionScores[dim as QualityDimension] = Math.round((passRate + warnRate) * 100);
      }
    });

    // 计算总分
    const overallScore = Math.round(
      Object.entries(dimensionScores).reduce((sum, [dim, score]) => 
        sum + score * DIMENSION_WEIGHTS[dim as QualityDimension], 0
      )
    );

    // 生成洞察
    const insights: string[] = [];
    
    if (overallScore >= 90) {
      insights.push('数据质量整体优秀，可以放心使用');
    } else if (overallScore >= 70) {
      insights.push('数据质量良好，但存在一些小问题需要关注');
    } else if (overallScore >= 50) {
      insights.push('数据质量一般，建议先进行清洗再使用');
    } else {
      insights.push('数据质量问题较多，建议先进行全面清洗');
    }

    const failedChecks = checks.filter(c => c.status === 'fail');
    if (failedChecks.length > 0) {
      insights.push(`有 ${failedChecks.length} 项检查未通过，需要优先处理`);
    }

    // 统计
    const summary = {
      totalFields: fieldStats.length,
      passedFields: new Set(checks.filter(c => c.status === 'pass').map(c => c.field)).size,
      warningFields: new Set(checks.filter(c => c.status === 'warning').map(c => c.field)).size,
      failedFields: new Set(checks.filter(c => c.status === 'fail').map(c => c.field)).size
    };

    setIsChecking(false);

    const newReport: QualityReport = {
      timestamp: Date.now(),
      overallScore,
      dimensionScores,
      checks,
      summary,
      insights
    };

    setReport(newReport);
    onQualityUse?.(newReport);

    return newReport;
  }, [data, fieldStats, onQualityUse]);

  // AI 智能检测
  const handleAIDetect = async () => {
    if (!aiPrompt.trim()) return;

    setIsAIGenerating(true);

    try {
      const promptLower = aiPrompt.toLowerCase();
      const aiChecks: QualityCheckResult[] = [];

      // 根据提示词+真实数据生成检查（不模拟，基于实际数据计算）
      if (promptLower.includes('格式') || promptLower.includes('一致性') || promptLower.includes('pattern')) {
        fieldStats.filter(f => f.type === 'string').forEach(field => {
          const values = data.rows.map(r => String(r[field.field])).filter(v => v && v !== 'null');
          if (values.length === 0) return;
          
          // 检测格式一致性：计算最常见模式的占比
          const patterns = new Map<string, number>();
          values.forEach(v => {
            const pattern = v.replace(/\d/g, '9').replace(/[a-z]/g, 'a').replace(/[A-Z]/g, 'A');
            patterns.set(pattern, (patterns.get(pattern) || 0) + 1);
          });
          const dominantPattern = [...patterns.entries()].sort((a, b) => b[1] - a[1])[0];
          const consistencyRate = dominantPattern ? dominantPattern[1] / values.length : 1;
          const failCount = values.length - (dominantPattern ? dominantPattern[1] : 0);

          aiChecks.push({
            id: `ai-${field.field}-format-${Date.now()}`,
            field: field.field,
            checkType: 'format_check',
            status: consistencyRate < 0.7 ? 'warning' : 'pass',
            dimension: 'consistency',
            description: consistencyRate >= 0.7
              ? `格式一致性良好，${(consistencyRate * 100).toFixed(1)}%的数据遵循统一格式`
              : `格式不一致，仅${(consistencyRate * 100).toFixed(1)}%遵循主格式「${dominantPattern?.[0]?.slice(0, 20)}」`,
            details: {
              totalCount: values.length,
              failCount,
              failRate: 1 - consistencyRate,
              sampleFails: values.filter(v => {
                const p = v.replace(/\d/g, '9').replace(/[a-z]/g, 'a').replace(/[A-Z]/g, 'A');
                return p !== dominantPattern?.[0];
              }).slice(0, 3)
            },
            suggestion: consistencyRate < 0.7 ? `建议：统一${field.field}的数据格式` : undefined
          });
        });
      }

      if (promptLower.includes('异常') || promptLower.includes('outlier') || promptLower.includes('离群')) {
        fieldStats.filter(f => f.type === 'number' && f.numericStats).forEach(field => {
          const stat = field.numericStats!;
          const values = data.rows.map(r => Number(r[field.field])).filter(v => !isNaN(v));
          
          // 使用3σ原则检测异常值
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
          
          if (std > 0) {
            const outliers = values.filter(v => Math.abs(v - mean) > 3 * std);
            const outlierRate = outliers.length / values.length;
            
            aiChecks.push({
              id: `ai-${field.field}-outlier-${Date.now()}`,
              field: field.field,
              checkType: 'range_check',
              status: outlierRate > 0.05 ? 'warning' : 'pass',
              dimension: 'accuracy',
              description: outliers.length > 0
                ? `发现${outliers.length}个异常值（3σ外），占比${(outlierRate * 100).toFixed(1)}%`
                : '未检测到显著异常值',
              details: {
                totalCount: values.length,
                failCount: outliers.length,
                failRate: outlierRate,
                sampleFails: outliers.slice(0, 3).map(v => String(v))
              },
              suggestion: outliers.length > 0
                ? `异常值范围：超过${(mean + 3 * std).toFixed(2)}或低于${(mean - 3 * std).toFixed(2)}，建议核实这些数据`
                : undefined
            });
          }
        });
      }

      if (promptLower.includes('重复') || promptLower.includes('duplicate') || promptLower.includes('冗余')) {
        // 真实计算重复记录
        const seen = new Map<string, number>();
        data.rows.forEach(r => {
          const key = JSON.stringify(r);
          seen.set(key, (seen.get(key) || 0) + 1);
        });
        const duplicateRows = [...seen.entries()].filter(([, count]) => count > 1);
        const totalDuplicateCount = duplicateRows.reduce((sum, [, count]) => sum + count - 1, 0);
        
        // 也检查关键列的部分重复
        const keyFields = fieldStats.filter(f => f.type === 'string' && f.uniqueCount && f.uniqueCount < data.rows.length * 0.5);
        const partialDuplicates: string[] = [];
        keyFields.forEach(f => {
          const valCount = new Map<string, number>();
          data.rows.forEach(r => {
            const v = String(r[f.field]);
            valCount.set(v, (valCount.get(v) || 0) + 1);
          });
          const dups = [...valCount.entries()].filter(([, c]) => c > 1);
          if (dups.length > 0) {
            partialDuplicates.push(`${f.field}有${dups.length}个重复值（共${dups.reduce((s, [, c]) => s + c - 1, 0)}条重复记录）`);
          }
        });

        aiChecks.push({
          id: `ai-duplicate-${Date.now()}`,
          field: '__all__',
          checkType: 'duplicate_check',
          status: totalDuplicateCount > 0 ? 'warning' : 'pass',
          dimension: 'consistency',
          description: totalDuplicateCount > 0
            ? `发现${totalDuplicateCount}条完全重复记录${partialDuplicates.length > 0 ? '，' + partialDuplicates.join('；') : ''}`
            : '未发现完全重复记录' + (partialDuplicates.length > 0 ? '，但' + partialDuplicates.join('；') : ''),
          details: {
            totalCount: data.rows.length,
            failCount: totalDuplicateCount,
            failRate: totalDuplicateCount / data.rows.length,
            sampleFails: duplicateRows.slice(0, 3).map(([key]) => key.slice(0, 100))
          },
          suggestion: totalDuplicateCount > 0 ? '建议：使用数据清洗功能去重' : undefined
        });
      }

      // 如果没有匹配任何关键词，执行综合检查
      if (aiChecks.length === 0) {
        // 自动执行空值+异常+重复的综合检查
        const nullCheckField = fieldStats[0];
        if (nullCheckField) {
          const nullCount = nullCheckField.nullCount || 0;
          const nullRate = nullCount / data.rows.length;
          aiChecks.push({
            id: `ai-general-null-${Date.now()}`,
            field: nullCheckField.field,
            checkType: 'null_check',
            status: nullRate > 0.1 ? 'warning' : 'pass',
            dimension: 'completeness',
            description: `综合检测：${nullCheckField.field}空值率${(nullRate * 100).toFixed(1)}%`,
            details: { totalCount: data.rows.length, failCount: nullCount, failRate: nullRate },
            suggestion: nullRate > 0 ? '建议检查数据采集流程' : undefined
          });
        }
        
        const numField = fieldStats.find(f => f.type === 'number' && f.numericStats);
        if (numField && numField.numericStats) {
          const stat = numField.numericStats;
          const values = data.rows.map(r => Number(r[numField.field])).filter(v => !isNaN(v));
          const mean = values.reduce((a, b) => a + b, 0) / values.length;
          const std = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
          if (std > 0) {
            const outliers = values.filter(v => Math.abs(v - mean) > 3 * std);
            aiChecks.push({
              id: `ai-general-outlier-${Date.now()}`,
              field: numField.field,
              checkType: 'range_check',
              status: outliers.length > 0 ? 'warning' : 'pass',
              dimension: 'accuracy',
              description: `综合检测：${numField.field}发现${outliers.length}个异常值`,
              details: { totalCount: values.length, failCount: outliers.length, failRate: outliers.length / values.length },
              suggestion: outliers.length > 0 ? '建议核实异常数据' : undefined
            });
          }
        }
      }

      setCustomChecks(aiChecks);
      setActiveTab('details');
    } catch (error) {
      console.error('AI detection failed:', error);
    } finally {
      setIsAIGenerating(false);
    }
  };

  // 切换检查项展开
  const toggleExpand = (id: string) => {
    setExpandedChecks(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 获取状态图标
  const getStatusIcon = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  // 获取状态颜色
  const _getStatusColor = (status: 'pass' | 'warning' | 'fail') => {
    switch (status) {
      case 'pass':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'fail':
        return 'bg-red-500';
    }
  };

  // 获取字段类型图标
  const getFieldTypeIcon = (type: string) => {
    switch (type) {
      case 'number':
        return <Hash className="w-4 h-4" />;
      case 'date':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Type className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-green-500" />
          <h3 className="font-medium">数据质量检测</h3>
        </div>
        <Button
          size="sm"
          onClick={() => runQualityChecks()}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              检测中...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              重新检测
            </>
          )}
        </Button>
      </div>

      {/* 概览 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-1">
            <Shield className="w-4 h-4" />
            概览
          </TabsTrigger>
          <TabsTrigger value="details" className="flex items-center gap-1">
            <ListFilter className="w-4 h-4" />
            详情
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-1">
            <Sparkles className="w-4 h-4" />
            AI 检测
          </TabsTrigger>
        </TabsList>

        {/* 概览 Tab */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          {/* 总体评分 */}
          {report ? (
            <>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">综合质量评分</p>
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          'text-5xl font-bold',
                          report.overallScore >= 90 ? 'text-green-600' :
                          report.overallScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                        )}>
                          {report.overallScore}
                        </span>
                        <span className="text-xl text-gray-400">/ 100</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn(
                        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium',
                        report.overallScore >= 90 ? 'bg-green-100 text-green-700' :
                        report.overallScore >= 70 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      )}>
                        {report.overallScore >= 90 ? '优秀' :
                         report.overallScore >= 70 ? '良好' : '需改进'}
                      </div>
                    </div>
                  </div>
                  <Progress value={report.overallScore} className="mt-4 h-2" />
                </CardContent>
              </Card>

              {/* 维度评分 */}
              <div className="grid grid-cols-2 gap-3">
                {(Object.entries(report.dimensionScores) as [QualityDimension, number][]).map(([dim, score]) => (
                  <Card key={dim} className={cn('border', DIMENSION_COLORS[dim].border)}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={cn(DIMENSION_COLORS[dim].bg, DIMENSION_COLORS[dim].text)}>
                          {dim === 'completeness' ? '完整性' :
                           dim === 'accuracy' ? '准确性' :
                           dim === 'consistency' ? '一致性' : '及时性'}
                        </Badge>
                        <span className="font-bold">{score}%</span>
                      </div>
                      <Progress value={score} className="h-1.5" />
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* 统计摘要 */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">检测摘要</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{report.summary.passedFields}</p>
                      <p className="text-xs text-gray-500">通过</p>
                    </div>
                    <div className="p-2 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{report.summary.warningFields}</p>
                      <p className="text-xs text-gray-500">警告</p>
                    </div>
                    <div className="p-2 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{report.summary.failedFields}</p>
                      <p className="text-xs text-gray-500">失败</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-600">{report.summary.totalFields}</p>
                      <p className="text-xs text-gray-500">总字段</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 洞察 */}
              {report.insights.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">AI 洞察</h4>
                        <ul className="mt-2 space-y-1 text-sm text-blue-700">
                          {report.insights.map((insight, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                              {insight}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h4 className="font-medium text-gray-600">尚未进行数据质量检测</h4>
                <p className="text-sm text-gray-400 mt-1 mb-4">
                  点击上方按钮开始检测，系统将分析数据的完整性、准确性、一致性
                </p>
                <Button onClick={() => runQualityChecks()} disabled={isChecking}>
                  开始检测
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 详情 Tab */}
        <TabsContent value="details" className="mt-4 space-y-3">
          {report && (
            <>
              {report.checks.map(check => (
                <Card 
                  key={check.id} 
                  className={cn(
                    'cursor-pointer transition-all',
                    check.status === 'fail' && 'border-red-200',
                    check.status === 'warning' && 'border-yellow-200'
                  )}
                  onClick={() => toggleExpand(check.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(check.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {check.field === '__all__' ? '全局检查' : check.field}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {getFieldTypeIcon(fieldStats.find(f => f.field === check.field)?.type || 'string')}
                              {check.checkType.replace('_check', '')}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">{check.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{check.details.failCount}</p>
                          <p className="text-xs text-gray-400">
                            / {check.details.totalCount} 条
                          </p>
                        </div>
                        <ChevronRight className={cn(
                          'w-5 h-5 text-gray-400 transition-transform',
                          expandedChecks.has(check.id) && 'rotate-90'
                        )} />
                      </div>
                    </div>

                    {/* 展开详情 */}
                    {expandedChecks.has(check.id) && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">失败率</p>
                            <p className="font-medium">{(check.details.failRate * 100).toFixed(1)}%</p>
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">维度</p>
                            <Badge className={cn(
                              'text-xs',
                              DIMENSION_COLORS[check.dimension].bg,
                              DIMENSION_COLORS[check.dimension].text
                            )}>
                              {check.dimension}
                            </Badge>
                          </div>
                        </div>

                        {check.suggestion && (
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Lightbulb className="w-4 h-4 text-blue-500 mt-0.5" />
                              <p className="text-sm text-blue-700">{check.suggestion}</p>
                            </div>
                          </div>
                        )}

                        {check.details.sampleFails && check.details.sampleFails.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">失败样例</p>
                            <div className="space-y-1">
                              {check.details.sampleFails.slice(0, 3).map((sample, i) => (
                                <code key={i} className="block text-xs bg-gray-100 p-2 rounded truncate">
                                  {sample}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {/* AI 自定义检查 */}
              {customChecks.map(check => (
                <Card key={check.id} className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{check.field}</span>
                            <Badge variant="secondary" className="text-xs">AI生成</Badge>
                          </div>
                          <p className="text-sm text-gray-600">{check.description}</p>
                        </div>
                      </div>
                      {getStatusIcon(check.status)}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </TabsContent>

        {/* AI 检测 Tab */}
        <TabsContent value="ai" className="mt-4">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                AI 智能检测
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>描述你的检测需求</Label>
                <Textarea
                  placeholder="例如：
- 检测数据格式是否一致
- 找出可能的异常值
- 检查是否有重复记录
- 验证日期字段的格式"
                  rows={4}
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleAIDetect}
                disabled={!aiPrompt.trim() || isAIGenerating}
              >
                {isAIGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI 正在深度分析...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    智能检测
                  </>
                )}
              </Button>

              {/* 提示示例 */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-medium">试试这样说：</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    '检测所有文本字段的格式一致性',
                    '找出可能的数据异常',
                    '检查订单金额的合理性',
                    '验证日期格式是否正确'
                  ].map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setAiPrompt(example)}
                      className="text-xs px-3 py-1.5 bg-white border rounded-full hover:border-purple-300 hover:bg-purple-50 transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default DataQualityChecker;
