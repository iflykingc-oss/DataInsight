/**
 * 数据画像引擎
 * 自动分析数据结构、质量、特征，为后续分析提供基础
 */

import type {
  DataLayer,
  DataSchema,
  FieldSchema,
  FieldStats,
  DataQualityReport,
  DataQualityIssue,
  SemanticType,
} from './types';

export class DataProfiler {
  /**
   * 完整数据画像
   */
  async profile(data: Record<string, unknown>[]): Promise<DataLayer> {
    if (data.length === 0) {
      throw new Error('Empty dataset');
    }

    const schema = this.inferSchema(data);
    const quality = this.assessQuality(data, schema);

    return {
      raw: data,
      schema,
      profile: {
        rowCount: data.length,
        colCount: schema.fields.length,
        sizeBytes: JSON.stringify(data).length,
        updateTime: Date.now(),
        sourceType: 'upload',
      },
      quality,
    };
  }

  /**
   * 推断数据Schema
   */
  private inferSchema(data: Record<string, unknown>[]): DataSchema {
    const headers = Object.keys(data[0]);
    const fields: FieldSchema[] = [];

    for (const header of headers) {
      const values = data.map(d => d[header]).filter(v => v !== null && v !== undefined && v !== '');
      const allValues = data.map(d => d[header]);

      const type = this.inferType(values);
      const stats = this.computeStats(values, type);
      const semanticType = this.inferSemanticType(header, values, type);

      fields.push({
        name: header,
        type,
        nullable: allValues.some(v => v === null || v === undefined || v === ''),
        unique: new Set(values.map(String)).size === values.length,
        stats,
        semanticType,
      });
    }

    return { fields };
  }

  /**
   * 推断字段类型
   */
  private inferType(values: unknown[]): FieldSchema['type'] {
    if (values.length === 0) return 'string';

    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNullValues.length === 0) return 'string';

    // 检查是否为布尔值
    const boolValues = nonNullValues.filter(v => typeof v === 'boolean' || ['true', 'false', '是', '否', '1', '0'].includes(String(v).toLowerCase()));
    if (boolValues.length / nonNullValues.length > 0.9) return 'boolean';

    // 检查是否为日期
    const dateValues = nonNullValues.filter(v => this.isDate(String(v)));
    if (dateValues.length / nonNullValues.length > 0.8) return 'date';

    // 检查是否为数值
    const numValues = nonNullValues.filter(v => !isNaN(parseFloat(String(v))) && isFinite(Number(v)));
    if (numValues.length / nonNullValues.length > 0.9) return 'number';

    // 检查是否为类别（唯一值较少）
    const uniqueCount = new Set(nonNullValues.map(String)).size;
    if (uniqueCount <= 20 && uniqueCount / nonNullValues.length < 0.5) return 'category';

    return 'string';
  }

  /**
   * 计算字段统计量
   */
  private computeStats(values: unknown[], type: FieldSchema['type']): FieldStats {
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const count = nonNullValues.length;

    const topValues = this.computeTopValues(nonNullValues, 10);

    const stats: FieldStats = {
      count,
      nullCount: values.length - count,
      uniqueCount: new Set(nonNullValues.map(String)).size,
      topValues,
    };

    if (type === 'number') {
      const nums = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
      if (nums.length > 0) {
        stats.min = Math.min(...nums);
        stats.max = Math.max(...nums);
        stats.mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        stats.median = this.computeMedian(nums);
        stats.std = this.computeStd(nums);
      }
    }

    return stats;
  }

  /**
   * 推断语义类型
   */
  private inferSemanticType(name: string, values: unknown[], type: FieldSchema['type']): SemanticType | undefined {
    const lowerName = name.toLowerCase();

    // ID类
    if (/id$|编号|编码|code/.test(lowerName)) return 'id';

    // 名称类
    if (/name|名称|姓名|标题|title/.test(lowerName)) return 'name';

    // 金额类
    if (/amount|金额|价格|price|成本|cost|费用|fee|收入|revenue|销售额|gmv/.test(lowerName)) return 'amount';

    // 数量类
    if (/quantity|数量|count|计数|销量|件数/.test(lowerName)) return 'quantity';

    // 价格类
    if (/单价|unit.price|price/.test(lowerName)) return 'price';

    // 比率类
    if (/rate|比率|比例|rate|占比|percentage|percent/.test(lowerName)) return 'rate';

    // 日期类
    if (/date|日期|时间|time|day|month|year/.test(lowerName)) return 'date';

    // 地区类
    if (/region|地区|城市|city|省份|province|区域/.test(lowerName)) return 'region';

    // 状态类
    if (/status|状态|stage|阶段|type|类型/.test(lowerName)) return 'status';

    // 邮箱
    if (values.some(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))) return 'email';

    // 手机号
    if (values.some(v => /^1\d{10}$/.test(String(v)))) return 'phone';

    // URL
    if (values.some(v => /^https?:\/\//.test(String(v)))) return 'url';

    // 百分比
    if (type === 'number' && values.every(v => {
      const n = Number(v);
      return !isNaN(n) && n >= 0 && n <= 1;
    })) return 'percentage';

    // 评分
    if (/score|评分|分数|rating|等级/.test(lowerName)) return 'score';

    return undefined;
  }

  /**
   * 评估数据质量
   */
  private assessQuality(data: Record<string, unknown>[], schema: DataSchema): DataQualityReport {
    const issues: DataQualityIssue[] = [];

    // 完整性检查
    for (const field of schema.fields) {
      const nullRate = field.stats.nullCount / data.length;
      if (nullRate > 0.5) {
        issues.push({
          type: 'missing',
          field: field.name,
          severity: 'critical',
          description: `字段 "${field.name}" 缺失率 ${(nullRate * 100).toFixed(1)}%`,
          affectedRows: field.stats.nullCount,
          suggestion: '检查数据源或考虑删除该字段',
        });
      } else if (nullRate > 0.1) {
        issues.push({
          type: 'missing',
          field: field.name,
          severity: 'warning',
          description: `字段 "${field.name}" 缺失率 ${(nullRate * 100).toFixed(1)}%`,
          affectedRows: field.stats.nullCount,
          suggestion: '考虑填充缺失值',
        });
      }
    }

    // 重复性检查
    const seen = new Set<string>();
    let duplicateCount = 0;
    for (const row of data) {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicateCount++;
      }
      seen.add(key);
    }

    if (duplicateCount > 0) {
      issues.push({
        type: 'duplicate',
        field: 'all',
        severity: duplicateCount > data.length * 0.1 ? 'critical' : 'warning',
        description: `发现 ${duplicateCount} 条完全重复的记录`,
        affectedRows: duplicateCount,
        suggestion: '去重处理',
      });
    }

    // 异常值检查（数值字段）
    for (const field of schema.fields) {
      if (field.type !== 'number' || !field.stats.mean || !field.stats.std) continue;

      const values = data.map(d => Number(d[field.name])).filter(n => !isNaN(n));
      const outliers = values.filter(v => Math.abs(v - field.stats.mean!) > 3 * field.stats.std!);

      if (outliers.length > values.length * 0.05) {
        issues.push({
          type: 'outlier',
          field: field.name,
          severity: 'warning',
          description: `字段 "${field.name}" 发现 ${outliers.length} 个异常值`,
          affectedRows: outliers.length,
          suggestion: '检查异常值是否为数据错误',
        });
      }
    }

    // 计算质量分数
    const completeness = Math.max(0, 1 - issues.filter(i => i.type === 'missing').reduce((sum, i) => sum + i.affectedRows, 0) / (data.length * schema.fields.length));
    const consistency = issues.filter(i => i.type === 'duplicate').length === 0 ? 1 : 0.5;
    const accuracy = Math.max(0, 1 - issues.filter(i => i.type === 'outlier').reduce((sum, i) => sum + i.affectedRows, 0) / data.length);

    const overallScore = Math.round((completeness * 0.4 + consistency * 0.3 + accuracy * 0.3) * 100);

    return {
      overallScore,
      dimensions: {
        completeness: Math.round(completeness * 100),
        consistency: Math.round(consistency * 100),
        accuracy: Math.round(accuracy * 100),
        timeliness: 100, // 假设数据是新的
      },
      issues: issues.sort((a, b) => {
        const severityOrder = { critical: 3, warning: 2, info: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
    };
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  private isDate(value: string): boolean {
    if (!value) return false;
    const datePatterns = [
      /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/,
      /^\d{4}\d{2}\d{2}$/,
      /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/,
      /^\d{4}年\d{1,2}月\d{1,2}日$/,
    ];
    return datePatterns.some(p => p.test(value));
  }

  private computeMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    if (n % 2 === 0) {
      return (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
    }
    return sorted[Math.floor(n / 2)];
  }

  private computeStd(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private computeTopValues(values: unknown[], limit: number): Array<{ value: string; count: number }> {
    const freq: Record<string, number> = {};
    for (const v of values) {
      const key = String(v);
      freq[key] = (freq[key] || 0) + 1;
    }

    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value, count]) => ({ value, count }));
  }
}

export const dataProfiler = new DataProfiler();
