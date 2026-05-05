import type { DataPoint, DataQualityAssessment } from './types';

class DataQualityAssessor {
  private static instance: DataQualityAssessor;

  static getInstance(): DataQualityAssessor {
    if (!DataQualityAssessor.instance) {
      DataQualityAssessor.instance = new DataQualityAssessor();
    }
    return DataQualityAssessor.instance;
  }

  assessDataQuality(data: DataPoint[], fields: string[]): DataQualityAssessment {
    const issues: DataQualityAssessment['issues'] = [];
    let score = 100;

    if (data.length < 30) {
      score -= 20;
      issues.push({
        type: 'completeness',
        field: 'global',
        description: `数据量仅 ${data.length} 条，建议至少 30 条以上以保证分析可靠性`,
        severity: 'medium',
      });
    }

    for (const field of fields) {
      const nullCount = data.filter(row => row[field] === null || row[field] === undefined || row[field] === '').length;
      const nullRate = data.length > 0 ? nullCount / data.length : 0;

      if (nullRate > 0.1) {
        score -= 10;
        issues.push({
          type: 'completeness',
          field,
          description: `字段 "${field}" 缺失值比例 ${(nullRate * 100).toFixed(1)}%，超过 10% 阈值`,
          severity: nullRate > 0.3 ? 'high' : 'medium',
        });
      }

      const values = data.map(row => row[field]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueValues = new Set(values.map(v => String(v)));
      if (values.length > 0 && uniqueValues.size / values.length < 0.01) {
        score -= 15;
        issues.push({
          type: 'uniqueness',
          field,
          description: `字段 "${field}" 唯一值比例过低，可能存在重复数据`,
          severity: 'high',
        });
      }

      const datePattern = /\d{4}[-/]\d{2}[-/]\d{2}/;
      if (field.toLowerCase().includes('date') || field.toLowerCase().includes('time')) {
        const invalidDates = values.filter(v => !datePattern.test(String(v))).length;
        if (invalidDates > 0 && invalidDates / values.length > 0.1) {
          score -= 10;
          issues.push({
            type: 'validity',
            field,
            description: `字段 "${field}" 包含 ${invalidDates} 个无效日期格式`,
            severity: 'medium',
          });
        }
      }

      if (typeof values[0] === 'number' || !isNaN(parseFloat(String(values[0])))) {
        const numericValues = values.map(v => parseFloat(String(v))).filter(v => !isNaN(v));
        const outliers = this.detectOutliers(numericValues);
        if (outliers.length > 0 && outliers.length / numericValues.length > 0.05) {
          score -= 5;
          issues.push({
            type: 'validity',
            field,
            description: `字段 "${field}" 检测到 ${outliers.length} 个异常值`,
            severity: 'low',
          });
        }
      }

      const typeConsistency = this.checkTypeConsistency(values);
      if (!typeConsistency.consistent) {
        score -= 5;
        issues.push({
          type: 'consistency',
          field,
          description: `字段 "${field}" 数据类型不一致，包含 ${typeConsistency.types.join(', ')}`,
          severity: 'low',
        });
      }
    }

    const dateFields = fields.filter(f => f.toLowerCase().includes('date') || f.toLowerCase().includes('time'));
    if (dateFields.length > 0) {
      const dates = data
        .map(row => new Date(String(row[dateFields[0]])))
        .filter(d => !isNaN(d.getTime()));
      if (dates.length > 1) {
        const range = Math.max(...dates.map(d => d.getTime())) - Math.min(...dates.map(d => d.getTime()));
        const days = range / (1000 * 60 * 60 * 24);
        if (days < 30) {
          score -= 10;
          issues.push({
            type: 'timeliness',
            field: dateFields[0],
            description: `数据时间跨度仅 ${Math.round(days)} 天，建议至少 30 天以上`,
            severity: 'medium',
          });
        }
      }
    }

    score = Math.max(0, Math.min(100, score));

    const recommendations = this.generateRecommendations(issues);

    return {
      score: Math.round(score),
      issues,
      recommendations,
    };
  }

  private detectOutliers(values: number[]): number[] {
    if (values.length < 4) return [];
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(values.length * 0.25)];
    const q3 = sorted[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    return values.filter(v => v < lower || v > upper);
  }

  private checkTypeConsistency(values: unknown[]): { consistent: boolean; types: string[] } {
    const types = new Set(values.map(v => {
      if (v === null || v === undefined) return 'null';
      if (typeof v === 'number') return 'number';
      if (!isNaN(Date.parse(String(v))) && String(v).includes('-')) return 'date';
      return 'string';
    }));
    return { consistent: types.size <= 2, types: Array.from(types) };
  }

  private generateRecommendations(issues: DataQualityAssessment['issues']): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.type === 'completeness')) {
      recommendations.push('补充缺失数据，或使用插值法填充缺失值');
    }
    if (issues.some(i => i.type === 'uniqueness')) {
      recommendations.push('检查并去重数据，确保关键字段的唯一性');
    }
    if (issues.some(i => i.type === 'validity')) {
      recommendations.push('校验数据格式，修正无效值');
    }
    if (issues.some(i => i.type === 'consistency')) {
      recommendations.push('统一数据格式和类型');
    }
    if (issues.some(i => i.type === 'timeliness')) {
      recommendations.push('收集更长时间跨度的数据以提高分析可靠性');
    }

    if (recommendations.length === 0) {
      recommendations.push('数据质量良好，可直接进行分析');
    }

    return recommendations;
  }

  generateQualityReport(assessment: DataQualityAssessment): string {
    const parts: string[] = [];
    parts.push(`# 数据质量报告`);
    parts.push(`## 综合评分: ${assessment.score}/100`);

    if (assessment.score >= 90) {
      parts.push('✅ 数据质量优秀');
    } else if (assessment.score >= 70) {
      parts.push('⚠️ 数据质量良好，存在少量问题');
    } else if (assessment.score >= 50) {
      parts.push('❗ 数据质量一般，建议优化后再分析');
    } else {
      parts.push('❌ 数据质量较差，强烈建议先进行数据清洗');
    }

    if (assessment.issues.length > 0) {
      parts.push(`## 发现问题 (${assessment.issues.length} 项)`);
      assessment.issues.forEach((issue, i) => {
        const severityEmoji = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        parts.push(`${severityEmoji} ${i + 1}. [${issue.type}] ${issue.description}`);
      });
    }

    if (assessment.recommendations.length > 0) {
      parts.push(`## 改进建议`);
      assessment.recommendations.forEach((rec, i) => {
        parts.push(`${i + 1}. ${rec}`);
      });
    }

    return parts.join('\n\n');
  }
}

export const dataQualityAssessor = DataQualityAssessor.getInstance();
