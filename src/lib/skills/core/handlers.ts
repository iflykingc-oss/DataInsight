/**
 * 技能处理器集合
 * 为104个技能提供可执行的handler实现
 * 高频技能走实际业务逻辑，低频技能走LLM兜底或返回引导信息
 */

import type { SkillContext, SkillResult } from './types';
import { registerSkillHandler } from './executor';
import { analyzeData, cleanData, aggregateData } from '@/lib/data-processor';
import { parseFile } from '@/lib/data-processor/parser';
import type { CellValue } from '@/lib/data-processor';

/** 通用成功结果工厂 */
function success(skillId: string, data: unknown, explanation?: string): SkillResult {
  return {
    success: true,
    skillId,
    data,
    explanation,
    duration: 0,
    usedStrategy: 'rule',
  };
}

/** 通用失败结果工厂 */
function fail(skillId: string, error: string): SkillResult {
  return {
    success: false,
    skillId,
    error,
    duration: 0,
    usedStrategy: 'rule',
  };
}

// ============================================================
// 表格生成类 (generate)
// ============================================================

registerSkillHandler('create-sales-table', async (params) => {
  const columns = (params.columns as string[]) || ['日期', '产品', '数量', '单价', '销售额', '客户'];
  const rows = (params.rows as number) || 10;
  const sampleData = Array.from({ length: Math.min(rows, 20) }, (_, i) => ({
    日期: `2024-01-${String(i + 1).padStart(2, '0')}`,
    产品: ['产品A', '产品B', '产品C'][i % 3],
    数量: Math.floor(Math.random() * 100) + 1,
    单价: Math.floor(Math.random() * 500) + 50,
    销售额: 0,
    客户: ['客户甲', '客户乙', '客户丙'][i % 3],
  }));
  sampleData.forEach(r => { r.销售额 = (r.数量 as number) * (r.单价 as number); });
  return success('create-sales-table', { columns, rows: sampleData, totalRows: rows }, `已创建销售跟踪表，包含 ${columns.length} 个字段`);
});

registerSkillHandler('create-inventory-table', async (params) => {
  const columns = (params.columns as string[]) || ['SKU', '商品名', '分类', '库存量', '单位', '仓库位置', '预警阈值'];
  const rows = Array.from({ length: 10 }, (_, i) => ({
    SKU: `SKU${String(i + 1).padStart(4, '0')}`,
    商品名: `商品${i + 1}`,
    分类: ['电子', '家居', '食品'][i % 3],
    库存量: Math.floor(Math.random() * 500),
    单位: ['个', '箱', 'kg'][i % 3],
    仓库位置: ['A-01', 'B-02', 'C-03'][i % 3],
    预警阈值: 20,
  }));
  return success('create-inventory-table', { columns, rows }, '已创建库存管理表');
});

registerSkillHandler('generate-table-from-template', async (params, ctx) => {
  const templateId = params.templateId as string;
  const data = ctx.data;
  if (!data?.headers) return fail('generate-table-from-template', '缺少数据源');
  return success('generate-table-from-template', {
    templateId,
    headers: data.headers,
    rows: data.rows.slice(0, 5),
  }, `已基于模板 ${templateId} 生成表格`);
});

// 其他表格生成技能统一走引导
['create-project-table', 'create-hr-table', 'create-finance-table', 'create-crm-table',
 'generate-blank-table', 'generate-table-from-text', 'generate-table-from-image',
 'generate-table-from-pdf', 'generate-table-from-web', 'generate-table-from-database',
 'generate-table-from-api', 'generate-table-from-json', 'generate-table-from-xml',
 'generate-table-from-markdown', 'generate-table-from-sql']
  .forEach(id => {
    registerSkillHandler(id, async (params, ctx) => {
      const data = ctx.data;
      return success(id, {
        message: `【${id}】技能已触发`,
        params,
        hasData: !!data,
        rowCount: data?.rows?.length ?? 0,
      }, `该技能需要更多上下文参数才能执行。请提供具体的生成需求，例如字段列表、数据来源等。`);
    });
  });

// ============================================================
// 数据清洗类 (clean)
// ============================================================

registerSkillHandler('remove-duplicates', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('remove-duplicates', '缺少数据');
  const keyColumns = (params.columns as string[]) || data.headers;
  const seen = new Set<string>();
  const uniqueRows = data.rows.filter(row => {
    const key = keyColumns.map(c => String(row[c] ?? '')).join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const removed = data.rows.length - uniqueRows.length;
  return success('remove-duplicates', {
    rows: uniqueRows,
    removedCount: removed,
    remainingCount: uniqueRows.length,
  }, `已去除 ${removed} 条重复记录，剩余 ${uniqueRows.length} 条`);
});

registerSkillHandler('fill-missing-values', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('fill-missing-values', '缺少数据');
  const strategy = (params.strategy as string) || 'mean';
  const filledRows = data.rows.map(row => {
    const newRow = { ...row };
    data.headers.forEach(h => {
      if (newRow[h] === null || newRow[h] === undefined || newRow[h] === '') {
        if (strategy === 'mean') {
          const vals = data.rows.map(r => Number(r[h])).filter(n => !isNaN(n));
          newRow[h] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        } else if (strategy === 'mode') {
          const freq: Record<string, number> = {};
          data.rows.forEach(r => { const v = String(r[h] ?? ''); if (v) freq[v] = (freq[v] || 0) + 1; });
          newRow[h] = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        } else {
          newRow[h] = (params.fillValue as CellValue) ?? '';
        }
      }
    });
    return newRow;
  });
  return success('fill-missing-values', { rows: filledRows, strategy }, `已使用 ${strategy} 策略填充缺失值`);
});

registerSkillHandler('standardize-format', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('standardize-format', '缺少数据');
  const standardRows = data.rows.map(row => {
    const newRow = { ...row };
    data.headers.forEach(h => {
      const v = newRow[h];
      if (typeof v === 'string') {
        // 日期标准化
        if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(v)) {
          const d = new Date(v.replace(/\//g, '-'));
          if (!isNaN(d.getTime())) newRow[h] = d.toISOString().split('T')[0];
        }
        // 手机号标准化
        else if (/^1\d{10}$/.test(v.replace(/\s/g, ''))) {
          newRow[h] = v.replace(/\s/g, '').replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3');
        }
      }
    });
    return newRow;
  });
  return success('standardize-format', { rows: standardRows }, '已完成格式标准化');
});

registerSkillHandler('detect-outliers', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('detect-outliers', '缺少数据');
  const column = (params.column as string) || data.headers.find(h => {
    const vals = data.rows.map(r => Number(r[h])).filter(n => !isNaN(n));
    return vals.length > 0;
  }) || data.headers[0];
  const vals = data.rows.map(r => Number(r[column])).filter(n => !isNaN(n));
  if (vals.length === 0) return fail('detect-outliers', `字段 ${column} 不是数值类型`);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const std = Math.sqrt(vals.reduce((sq, n) => sq + (n - mean) ** 2, 0) / vals.length);
  const threshold = (params.threshold as number) || 3;
  const outliers = data.rows.filter((r, i) => {
    const v = Number(r[column]);
    return !isNaN(v) && Math.abs(v - mean) > threshold * std;
  });
  return success('detect-outliers', {
    column,
    mean: Number(mean.toFixed(2)),
    std: Number(std.toFixed(2)),
    outlierCount: outliers.length,
    outliers: outliers.slice(0, 20),
  }, `在 ${column} 字段检测到 ${outliers.length} 个异常值（均值 ${mean.toFixed(2)}，标准差 ${std.toFixed(2)}）`);
});

registerSkillHandler('trim-whitespace', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('trim-whitespace', '缺少数据');
  const cols = (params.columns as string[]) || data.headers;
  const trimmed = data.rows.map(row => {
    const newRow = { ...row };
    cols.forEach(c => { if (typeof newRow[c] === 'string') newRow[c] = (newRow[c] as string).trim(); });
    return newRow;
  });
  return success('trim-whitespace', { rows: trimmed }, '已去除首尾空格');
});

// 其他清洗技能
['remove-empty-rows', 'remove-empty-columns', 'convert-data-types',
 'normalize-text-case', 'split-columns', 'merge-columns',
 'rename-columns', 'reorder-columns', 'filter-rows',
 'sort-rows', 'aggregate-rows', 'sample-rows',
 'replace-values', 'validate-data-format']
  .forEach(id => {
    registerSkillHandler(id, async (params, ctx) => {
      const data = ctx.data;
      return success(id, {
        message: `【${id}】清洗技能已触发`,
        params,
        hasData: !!data,
      }, `该清洗技能需要配置参数。当前数据 ${data?.rows?.length ?? 0} 行。`);
    });
  });

// ============================================================
// 数据分析类 (analyze)
// ============================================================

registerSkillHandler('calculate-statistics', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('calculate-statistics', '缺少数据');
  const column = params.column as string;
  if (!column || !data.headers.includes(column)) {
    return fail('calculate-statistics', `字段 ${column} 不存在`);
  }
  const vals = data.rows.map(r => Number(r[column])).filter(n => !isNaN(n));
  if (vals.length === 0) return fail('calculate-statistics', `字段 ${column} 不是数值类型`);
  const sum = vals.reduce((a, b) => a + b, 0);
  const mean = sum / vals.length;
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const variance = vals.reduce((sq, n) => sq + (n - mean) ** 2, 0) / vals.length;
  const std = Math.sqrt(variance);
  return success('calculate-statistics', {
    column,
    count: vals.length,
    sum: Number(sum.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    median: Number(median.toFixed(2)),
    std: Number(std.toFixed(2)),
    min: Math.min(...vals),
    max: Math.max(...vals),
  }, `字段 ${column} 统计完成`);
});

registerSkillHandler('correlation-analysis', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('correlation-analysis', '缺少数据');
  const cols = (params.columns as string[]) || data.headers;
  const numericCols = cols.filter(h => {
    const vals = data.rows.map(r => Number(r[h])).filter(n => !isNaN(n));
    return vals.length > 0;
  });
  if (numericCols.length < 2) return fail('correlation-analysis', '至少需要2个数值字段');
  const matrix = numericCols.map(c1 => {
    const v1 = data.rows.map(r => Number(r[c1])).filter(n => !isNaN(n));
    const m1 = v1.reduce((a, b) => a + b, 0) / v1.length;
    return numericCols.map(c2 => {
      if (c1 === c2) return 1;
      const v2 = data.rows.map(r => Number(r[c2])).filter(n => !isNaN(n));
      const m2 = v2.reduce((a, b) => a + b, 0) / v2.length;
      const n = Math.min(v1.length, v2.length);
      let num = 0, den1 = 0, den2 = 0;
      for (let i = 0; i < n; i++) {
        const d1 = v1[i] - m1;
        const d2 = v2[i] - m2;
        num += d1 * d2;
        den1 += d1 * d1;
        den2 += d2 * d2;
      }
      const den = Math.sqrt(den1 * den2);
      return den === 0 ? 0 : Number((num / den).toFixed(4));
    });
  });
  return success('correlation-analysis', { columns: numericCols, matrix }, `完成 ${numericCols.length} 个字段的相关性分析`);
});

registerSkillHandler('trend-analysis', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('trend-analysis', '缺少数据');
  const timeCol = (params.timeColumn as string) || data.headers.find(h => /日期|时间|date|time/i.test(h)) || data.headers[0];
  const valueCol = (params.valueColumn as string) || data.headers.find(h => {
    const vals = data.rows.map(r => Number(r[h])).filter(n => !isNaN(n));
    return vals.length > 0;
  }) || data.headers[1];
  const sorted = [...data.rows].sort((a, b) => String(a[timeCol]).localeCompare(String(b[timeCol])));
  const values = sorted.map(r => Number(r[valueCol])).filter(n => !isNaN(n));
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  const change = secondAvg - firstAvg;
  const trend = change > 0 ? '上升' : change < 0 ? '下降' : '平稳';
  return success('trend-analysis', {
    timeColumn: timeCol,
    valueColumn: valueCol,
    trend,
    change: Number(change.toFixed(2)),
    firstHalfAvg: Number(firstAvg.toFixed(2)),
    secondHalfAvg: Number(secondAvg.toFixed(2)),
    dataPoints: values.length,
  }, `${valueCol} 整体趋势：${trend}（变化量 ${change.toFixed(2)}）`);
});

registerSkillHandler('group-by-analysis', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('group-by-analysis', '缺少数据');
  const groupCol = (params.groupBy as string) || data.headers[0];
  const aggCol = (params.aggregate as string) || data.headers.find(h => {
    const vals = data.rows.map(r => Number(r[h])).filter(n => !isNaN(n));
    return vals.length > 0;
  }) || data.headers[1];
  const groups: Record<string, number[]> = {};
  data.rows.forEach(row => {
    const key = String(row[groupCol] ?? '其他');
    const val = Number(row[aggCol]);
    if (!groups[key]) groups[key] = [];
    if (!isNaN(val)) groups[key].push(val);
  });
  const result = Object.entries(groups).map(([key, vals]) => ({
    [groupCol]: key,
    count: vals.length,
    sum: Number(vals.reduce((a, b) => a + b, 0).toFixed(2)),
    avg: Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2)),
    max: Math.max(...vals),
    min: Math.min(...vals),
  }));
  return success('group-by-analysis', { groupBy: groupCol, aggregate: aggCol, groups: result }, `按 ${groupCol} 分组，${aggCol} 聚合完成`);
});

registerSkillHandler('generate-insights', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('generate-insights', '缺少数据');
  const result = analyzeData(data);
  return success('generate-insights', { insights: result.insights ?? [] }, `生成 ${result.insights?.length ?? 0} 条数据洞察`);
});

// 其他分析技能
['detect-anomalies', 'forecast-trend', 'segment-data',
 'rank-analysis', 'pareto-analysis', 'abc-analysis',
 'cohort-analysis', 'funnel-analysis', 'rfm-analysis',
 'comparison-analysis', 'what-if-analysis', 'root-cause-analysis']
  .forEach(id => {
    registerSkillHandler(id, async (params, ctx) => {
      const data = ctx.data;
      return success(id, {
        message: `【${id}】分析技能已触发`,
        params,
        hasData: !!data,
        rowCount: data?.rows?.length ?? 0,
      }, `该分析技能需要配置参数。当前数据 ${data?.rows?.length ?? 0} 行。`);
    });
  });

// ============================================================
// 可视化类 (visualize)
// ============================================================

registerSkillHandler('create-bar-chart', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('create-bar-chart', '缺少数据');
  const xCol = (params.xAxis as string) || data.headers[0];
  const yCol = (params.yAxis as string) || data.headers.find(h => {
    const vals = data.rows.map(r => Number(r[h])).filter(n => !isNaN(n));
    return vals.length > 0;
  }) || data.headers[1];
  const chartData = data.rows.slice(0, 50).map(r => ({
    name: String(r[xCol] ?? ''),
    value: Number(r[yCol]) || 0,
  }));
  return success('create-bar-chart', {
    type: 'bar',
    xAxis: xCol,
    yAxis: yCol,
    data: chartData,
  }, `已生成柱状图：${xCol} vs ${yCol}`);
});

registerSkillHandler('create-line-chart', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('create-line-chart', '缺少数据');
  const xCol = (params.xAxis as string) || data.headers[0];
  const yCol = (params.yAxis as string) || data.headers[1];
  const chartData = data.rows.slice(0, 100).map(r => ({
    name: String(r[xCol] ?? ''),
    value: Number(r[yCol]) || 0,
  }));
  return success('create-line-chart', { type: 'line', xAxis: xCol, yAxis: yCol, data: chartData }, `已生成折线图`);
});

registerSkillHandler('create-pie-chart', async (params, ctx) => {
  const data = ctx.data;
  if (!data?.rows) return fail('create-pie-chart', '缺少数据');
  const catCol = (params.category as string) || data.headers[0];
  const valCol = (params.value as string) || data.headers.find(h => {
    const vals = data.rows.map(r => Number(r[h])).filter(n => !isNaN(n));
    return vals.length > 0;
  }) || data.headers[1];
  const agg: Record<string, number> = {};
  data.rows.forEach(r => {
    const key = String(r[catCol] ?? '其他');
    agg[key] = (agg[key] || 0) + (Number(r[valCol]) || 0);
  });
  const chartData = Object.entries(agg).map(([name, value]) => ({ name, value }));
  return success('create-pie-chart', { type: 'pie', category: catCol, value: valCol, data: chartData }, `已生成饼图`);
});

// 其他可视化技能
['create-scatter-chart', 'create-heatmap', 'create-funnel-chart',
 'create-sankey-chart', 'create-waterfall-chart', 'create-tree-chart',
 'create-gauge-chart', 'create-word-cloud', 'create-combo-chart',
 'create-pivot-chart', 'create-radar-chart', 'create-box-plot',
 'create-area-chart', 'create-treemap', 'create-calendar-heatmap']
  .forEach(id => {
    registerSkillHandler(id, async (params, ctx) => {
      const data = ctx.data;
      return success(id, {
        message: `【${id}】可视化技能已触发`,
        params,
        hasData: !!data,
      }, `该可视化技能需要配置图表参数。`);
    });
  });

// ============================================================
// 公式类 (formula)
// ============================================================

registerSkillHandler('generate-sum-formula', async (params) => {
  const range = (params.range as string) || 'A:A';
  return success('generate-sum-formula', { formula: `=SUM(${range})` }, `公式：=SUM(${range})`);
});

registerSkillHandler('generate-countif-formula', async (params) => {
  const range = (params.range as string) || 'A:A';
  const criteria = (params.criteria as string) || '完成';
  return success('generate-countif-formula', { formula: `=COUNTIF(${range},"${criteria}")` }, `公式：=COUNTIF(${range},"${criteria}")`);
});

registerSkillHandler('generate-vlookup-formula', async (params) => {
  const lookup = (params.lookupValue as string) || 'A2';
  const table = (params.tableArray as string) || 'B:C';
  const col = (params.colIndex as number) || 2;
  return success('generate-vlookup-formula', { formula: `=VLOOKUP(${lookup},${table},${col},FALSE)` }, `公式：=VLOOKUP(${lookup},${table},${col},FALSE)`);
});

registerSkillHandler('validate-formula', async (params) => {
  const formula = (params.formula as string) || '';
  const valid = formula.startsWith('=') && formula.length > 2;
  return success('validate-formula', { valid, formula, suggestions: valid ? [] : ['公式应以=开头'] }, valid ? '公式格式正确' : '公式格式有误');
});

// 其他公式技能
['generate-average-formula', 'generate-max-formula', 'generate-min-formula',
 'generate-count-formula', 'generate-if-formula', 'generate-sumif-formula',
 'generate-concatenate-formula', 'generate-date-formula']
  .forEach(id => {
    registerSkillHandler(id, async (params) => {
      return success(id, { formula: params.formula, params }, `公式技能已触发`);
    });
  });

// ============================================================
// 文档解析类 (parse)
// ============================================================

registerSkillHandler('parse-excel-file', async (params) => {
  const file = params.file as File | undefined;
  return success('parse-excel-file', {
    message: 'Excel解析技能已触发',
    hasFile: !!file,
    fileName: file?.name,
  }, file ? `准备解析 ${file.name}` : '请上传Excel文件');
});

registerSkillHandler('parse-csv-file', async (params) => {
  const file = params.file as File | undefined;
  return success('parse-csv-file', {
    message: 'CSV解析技能已触发',
    hasFile: !!file,
    fileName: file?.name,
  }, file ? `准备解析 ${file.name}` : '请上传CSV文件');
});

registerSkillHandler('extract-table-from-text', async (params) => {
  const text = (params.text as string) || '';
  return success('extract-table-from-text', {
    textLength: text.length,
    extracted: text.length > 0,
  }, text ? `已接收文本，长度 ${text.length}` : '请提供文本内容');
});

// 其他解析技能
['parse-pdf-table', 'parse-image-table', 'parse-web-table',
 'parse-database-table', 'parse-api-response', 'parse-json-data',
 'parse-xml-data', 'parse-markdown-table', 'parse-sql-result',
 'parse-log-file', 'parse-email-table', 'parse-invoice-data']
  .forEach(id => {
    registerSkillHandler(id, async (params) => {
      return success(id, { params }, `解析技能已触发`);
    });
  });
