/**
 * 核心分析流水线
 * 数据层 -> 分析层 -> 洞察层 -> 呈现层
 * 模型只是执行器，底层能力才是核心
 */

import type {
  DataLayer,
  AnalysisLayer,
  InsightLayer,
  PresentationLayer,
  ModelExecutor,
  ExecutionContext,
} from './types';
import { dataProfiler } from './data-profiler';
import { promptEngine } from './prompt-engine';
import { logger } from '@/lib/monitoring/logger';

export interface PipelineConfig {
  maxRowsForAnalysis: number;
  enableDeepAnalysis: boolean;
  enablePrediction: boolean;
  enableCausalAnalysis: boolean;
  responseStyle: 'detailed' | 'concise' | 'executive';
}

const DEFAULT_CONFIG: PipelineConfig = {
  maxRowsForAnalysis: 10000,
  enableDeepAnalysis: true,
  enablePrediction: true,
  enableCausalAnalysis: false,
  responseStyle: 'detailed',
};

export class AnalysisPipeline {
  private config: PipelineConfig;
  private modelExecutor: ModelExecutor;

  constructor(modelExecutor: ModelExecutor, config: Partial<PipelineConfig> = {}) {
    this.modelExecutor = modelExecutor;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行完整分析流水线
   */
  async execute(
    data: Record<string, unknown>[],
    userRequest: string,
    history: string[] = []
  ): Promise<PresentationLayer> {
    const timer = logger.createTimer('AnalysisPipeline', 'execute');

    try {
      // 1. 数据层：数据画像
      logger.info('AnalysisPipeline', 'Step 1: Data profiling');
      const dataLayer = await dataProfiler.profile(data.slice(0, this.config.maxRowsForAnalysis));

      // 2. 分析层：计算指标和维度
      logger.info('AnalysisPipeline', 'Step 2: Computing metrics and dimensions');
      const analysisLayer = this.computeAnalysisLayer(dataLayer);

      // 3. 洞察层：模型生成洞察（模型只是执行器）
      logger.info('AnalysisPipeline', 'Step 3: Generating insights');
      const insightLayer = await this.generateInsights(dataLayer, analysisLayer, userRequest, history);

      // 4. 呈现层：组装最终输出
      logger.info('AnalysisPipeline', 'Step 4: Assembling presentation');
      const presentationLayer = this.assemblePresentation(dataLayer, analysisLayer, insightLayer);

      timer();
      return presentationLayer;
    } catch (error) {
      logger.error('AnalysisPipeline', 'Pipeline execution failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 计算分析层
   */
  private computeAnalysisLayer(dataLayer: DataLayer): AnalysisLayer {
    const metrics: AnalysisLayer['metrics'] = [];
    const dimensions: AnalysisLayer['dimensions'] = [];
    const segments: AnalysisLayer['segments'] = [];
    const comparisons: AnalysisLayer['comparisons'] = [];

    const data = dataLayer.raw;

    // 计算数值指标
    for (const field of dataLayer.schema.fields) {
      if (field.type === 'number' && field.stats.mean !== undefined) {
        metrics.push({
          name: field.name,
          formula: `SUM(${field.name})`,
          value: field.stats.mean,
          unit: this.inferUnit(field.semanticType),
        });

        // 计算同比/环比（如果有日期字段）
        const dateField = dataLayer.schema.fields.find(f => f.type === 'date');
        if (dateField) {
          const change = this.calculateChange(data, field.name, dateField.name);
          if (change) {
            metrics[metrics.length - 1].change = change;
          }
        }
      }
    }

    // 计算维度分布
    for (const field of dataLayer.schema.fields) {
      if (field.type === 'category' || (field.type === 'string' && field.stats.uniqueCount <= 20)) {
        const breakdowns = this.computeBreakdowns(data, field.name);
        dimensions.push({
          field: field.name,
          type: 'categorical',
          distribution: {
            type: 'unknown',
            histogram: breakdowns.map(b => ({ bin: b.value, count: b.count })),
            percentiles: {},
          },
          breakdowns,
        });
      }
    }

    // 计算细分
    const categoryFields = dataLayer.schema.fields.filter(f => f.type === 'category' || f.type === 'string');
    if (categoryFields.length > 0) {
      const topField = categoryFields[0];
      const groups = this.groupBy(data, topField.name);

      for (const [groupName, groupData] of groups.entries()) {
        if (groupData.length < data.length * 0.05) continue; // 过滤太小的组

        segments.push({
          name: groupName,
          filter: { [topField.name]: groupName },
          size: groupData.length,
          characteristics: this.extractCharacteristics(groupData, dataLayer.schema),
          metrics: this.computeSegmentMetrics(groupData, dataLayer.schema),
        });
      }
    }

    return { metrics, dimensions, segments, comparisons };
  }

  /**
   * 生成洞察层（调用模型）
   */
  private async generateInsights(
    dataLayer: DataLayer,
    analysisLayer: AnalysisLayer,
    userRequest: string,
    history: string[]
  ): Promise<InsightLayer> {
    // 构建Prompt
    const prompt = promptEngine.buildPrompt('data-analysis', {
      data_profile: this.formatDataProfile(dataLayer),
      analysis_goal: userRequest,
    });

    // 执行模型（模型只是执行器）
    const context: ExecutionContext = {
      task: 'data-analysis',
      data: dataLayer,
      history,
      constraints: ['结构化输出', '可验证'],
    };

    const modelOutput = await this.modelExecutor.execute(prompt, context);

    // 验证输出
    const validation = promptEngine.validateOutput('data-analysis', modelOutput.structured || JSON.parse(modelOutput.content));

    if (!validation.valid) {
      logger.warn('AnalysisPipeline', 'Model output validation failed', { errors: validation.errors });
      // 尝试修复或重试
      const retryOutput = await this.modelExecutor.retry(prompt, context, new Error(validation.errors.join(', ')));
      const retryValidation = promptEngine.validateOutput('data-analysis', retryOutput.structured || JSON.parse(retryOutput.content));

      if (!retryValidation.valid) {
        throw new Error(`Failed to generate valid insights: ${retryValidation.errors.join(', ')}`);
      }

      return this.parseInsightLayer(retryValidation.data!);
    }

    return this.parseInsightLayer(validation.data!);
  }

  /**
   * 组装呈现层
   */
  private assemblePresentation(
    dataLayer: DataLayer,
    analysisLayer: AnalysisLayer,
    insightLayer: InsightLayer
  ): PresentationLayer {
    const summary: PresentationLayer['summary'] = {
      headline: insightLayer.findings[0]?.title || '数据分析完成',
      keyPoints: insightLayer.findings.map(f => f.description).slice(0, 3),
      metrics: analysisLayer.metrics.map(m => ({
        label: m.name,
        value: this.formatValue(m.value, m.unit),
        trend: m.change ? (m.change.direction === 'up' ? 'up' : 'down') : 'neutral',
      })),
    };

    // 如果有严重问题，添加告警
    const criticalFindings = insightLayer.findings.filter(f => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      summary.alert = `发现 ${criticalFindings.length} 个严重问题需要关注`;
    }

    const visualizations: PresentationLayer['visualizations'] = [];

    // 添加关键指标卡片
    for (const metric of analysisLayer.metrics.slice(0, 4)) {
      visualizations.push({
        id: `metric-${metric.name}`,
        type: 'metric',
        config: {
          value: metric.value,
          label: metric.name,
          unit: metric.unit,
          benchmark: metric.benchmark,
          trend: metric.change ? {
            direction: metric.change.direction,
            value: metric.change.percentage,
          } : undefined,
        },
        insights: metric.change ? [`较上期${metric.change.direction === 'up' ? '增长' : '下降'} ${Math.abs(metric.change.percentage).toFixed(1)}%`] : [],
      });
    }

    // 添加维度分布图表
    for (const dim of analysisLayer.dimensions.slice(0, 2)) {
      visualizations.push({
        id: `chart-${dim.field}`,
        type: 'chart',
        config: {
          chartType: 'bar',
          data: dim.breakdowns.map(b => ({ name: b.value, value: b.count })),
          mapping: { x: 'name', y: 'value' },
          options: { title: `${dim.field}分布` },
        },
        insights: [`${dim.breakdowns[0]?.value} 占比最高，为 ${dim.breakdowns[0]?.percentage.toFixed(1)}%`],
      });
    }

    // 添加发现详情
    for (const finding of insightLayer.findings.slice(0, 3)) {
      visualizations.push({
        id: `finding-${finding.id}`,
        type: 'text',
        config: {
          content: `${finding.title}\n${finding.description}`,
          style: 'bullet',
        },
        insights: [finding.description],
      });
    }

    const narrative: PresentationLayer['narrative'] = {
      sections: [
        {
          title: '执行摘要',
          content: summary.headline,
          visualizations: visualizations.filter(v => v.type === 'metric').map(v => v.id),
        },
        {
          title: '关键发现',
          content: insightLayer.findings.map(f => f.title).join('\n'),
          visualizations: visualizations.filter(v => v.type === 'text').map(v => v.id),
        },
        {
          title: '数据概览',
          content: `分析了 ${dataLayer.profile.rowCount} 条记录，${dataLayer.profile.colCount} 个字段`,
          visualizations: visualizations.filter(v => v.type === 'chart').map(v => v.id),
        },
      ],
    };

    const actions: PresentationLayer['actions'] = [
      {
        id: 'drill-down',
        label: '深入分析',
        action: 'drill_down',
        params: { finding: insightLayer.findings[0]?.id },
        priority: 'high',
      },
      {
        id: 'export',
        label: '导出报告',
        action: 'export_report',
        params: { format: 'pdf' },
        priority: 'medium',
      },
      {
        id: 'share',
        label: '分享洞察',
        action: 'share_insights',
        params: {},
        priority: 'low',
      },
    ];

    return { summary, visualizations, narrative, actions };
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private inferUnit(semanticType: string | undefined): string | undefined {
    const units: Record<string, string> = {
      amount: '元',
      quantity: '件',
      price: '元',
      rate: '%',
      percentage: '%',
      score: '分',
    };
    return semanticType ? units[semanticType] : undefined;
  }

  private calculateChange(
    data: Record<string, unknown>[],
    valueField: string,
    dateField: string
  ): { value: number; percentage: number; direction: 'up' | 'down' | 'stable' } | undefined {
    // 简化实现：按日期排序，比较前半段和后半段
    const sorted = [...data].sort((a, b) => String(a[dateField]).localeCompare(String(b[dateField])));
    const mid = Math.floor(sorted.length / 2);

    const firstHalf = sorted.slice(0, mid).map(d => Number(d[valueField])).filter(n => !isNaN(n));
    const secondHalf = sorted.slice(mid).map(d => Number(d[valueField])).filter(n => !isNaN(n));

    if (firstHalf.length === 0 || secondHalf.length === 0) return undefined;

    const firstMean = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondMean = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const change = secondMean - firstMean;
    const percentage = firstMean !== 0 ? (change / firstMean) * 100 : 0;

    return {
      value: change,
      percentage: Math.abs(percentage),
      direction: change > 0.01 ? 'up' : change < -0.01 ? 'down' : 'stable',
    };
  }

  private computeBreakdowns(data: Record<string, unknown>[], field: string): Array<{ value: string; count: number; percentage: number; metrics: Record<string, number> }> {
    const groups = this.groupBy(data, field);
    const total = data.length;

    return Array.from(groups.entries())
      .map(([value, rows]) => ({
        value,
        count: rows.length,
        percentage: (rows.length / total) * 100,
        metrics: {},
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private groupBy(data: Record<string, unknown>[], field: string): Map<string, Record<string, unknown>[]> {
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of data) {
      const key = String(row[field] || '未知');
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(row);
    }
    return groups;
  }

  private extractCharacteristics(data: Record<string, unknown>[], schema: DataLayer['schema']): string[] {
    const characteristics: string[] = [];

    for (const field of schema.fields) {
      if (field.type === 'number' && field.stats.mean !== undefined) {
        const values = data.map(d => Number(d[field.name])).filter(n => !isNaN(n));
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        characteristics.push(`${field.name}平均${mean.toFixed(2)}`);
      }
    }

    return characteristics.slice(0, 3);
  }

  private computeSegmentMetrics(data: Record<string, unknown>[], schema: DataLayer['schema']): Record<string, number> {
    const metrics: Record<string, number> = {};

    for (const field of schema.fields) {
      if (field.type === 'number') {
        const values = data.map(d => Number(d[field.name])).filter(n => !isNaN(n));
        if (values.length > 0) {
          metrics[field.name] = values.reduce((a, b) => a + b, 0) / values.length;
        }
      }
    }

    return metrics;
  }

  private formatDataProfile(dataLayer: DataLayer): string {
    const parts: string[] = [];
    parts.push(`数据规模: ${dataLayer.profile.rowCount} 行 × ${dataLayer.profile.colCount} 列`);
    parts.push(`数据质量评分: ${dataLayer.quality.overallScore}/100`);
    parts.push('字段信息:');

    for (const field of dataLayer.schema.fields) {
      const stats = field.stats;
      parts.push(`  - ${field.name} (${field.type}${field.semanticType ? `, ${field.semanticType}` : ''})`);
      if (stats.mean !== undefined) {
        parts.push(`    均值: ${stats.mean.toFixed(2)}, 范围: [${stats.min?.toFixed(2)}, ${stats.max?.toFixed(2)}]`);
      }
      parts.push(`    缺失率: ${((stats.nullCount / dataLayer.profile.rowCount) * 100).toFixed(1)}%`);
    }

    if (dataLayer.quality.issues.length > 0) {
      parts.push('数据质量问题:');
      for (const issue of dataLayer.quality.issues.slice(0, 5)) {
        parts.push(`  - [${issue.severity}] ${issue.description}`);
      }
    }

    return parts.join('\n');
  }

  private parseInsightLayer(data: Record<string, unknown>): InsightLayer {
    return {
      findings: (data.findings as InsightLayer['findings']) || [],
      rootCauses: (data.root_causes as InsightLayer['rootCauses']) || [],
      predictions: (data.predictions as InsightLayer['predictions']) || [],
      recommendations: (data.recommendations as InsightLayer['recommendations']) || [],
    };
  }

  private formatValue(value: number, unit?: string): string {
    if (unit === '元') {
      if (value >= 10000) return `${(value / 10000).toFixed(2)}万${unit}`;
      return `${value.toFixed(2)}${unit}`;
    }
    if (unit === '%') return `${value.toFixed(1)}${unit}`;
    return `${value.toFixed(2)}${unit || ''}`;
  }
}

// AnalysisPipeline already exported as class above
