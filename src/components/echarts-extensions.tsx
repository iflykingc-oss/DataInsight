'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import { CellValue } from '@/types';

interface ChartProps {
  data: {
    headers: string[];
    rows: Record<string, CellValue>[];
  };
  xField?: string;
  yField?: string;
  title?: string;
  height?: number;
}

// 通用图表主题色
const THEME_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f',
];

// ============================================
// 1. 散点图 - 相关性分析
// ============================================
export function ScatterChart({ data, xField, yField, title, height = 400 }: ChartProps) {
  if (!xField || !yField) return null;

  const seriesData = data.rows
    .map(row => {
      const x = Number(row[xField]);
      const y = Number(row[yField]);
      return !isNaN(x) && !isNaN(y) ? [x, y] : null;
    })
    .filter((d): d is number[] => d !== null);

  const option: EChartsOption = {
    color: THEME_COLORS,
    title: { text: title || `${xField} vs ${yField}`, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { value: number[] };
        return `${xField}: ${p.value[0]}<br/>${yField}: ${p.value[1]}`;
      },
    },
    xAxis: { name: xField, type: 'value', scale: true },
    yAxis: { name: yField, type: 'value', scale: true },
    series: [{
      type: 'scatter',
      data: seriesData,
      symbolSize: 12,
      itemStyle: { opacity: 0.7 },
    }],
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 2. 箱线图 - 分布分析
// ============================================
export function BoxPlotChart({ data, yField, title, height = 400 }: ChartProps) {
  if (!yField) return null;

  // 按分类字段分组（如果有第二个字段）
  const categoryField = data.headers.find(h => h !== yField && data.rows[0]?.[h] !== undefined);
  
  let boxData: number[][] = [];
  let categories: string[] = [];

  if (categoryField) {
    const groups: Record<string, number[]> = {};
    data.rows.forEach(row => {
      const cat = String(row[categoryField] ?? '未分类');
      const val = Number(row[yField]);
      if (!isNaN(val)) {
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(val);
      }
    });
    categories = Object.keys(groups);
    boxData = Object.values(groups);
  } else {
    const values = data.rows
      .map(row => Number(row[yField]))
      .filter(v => !isNaN(v));
    categories = [yField];
    boxData = [values];
  }

  const option: EChartsOption = {
    color: THEME_COLORS,
    title: { text: title || `${yField} 分布分析`, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    xAxis: { type: 'category', data: categories },
    yAxis: { type: 'value', name: yField },
    series: [{
      type: 'boxplot',
      data: boxData,
      itemStyle: { color: THEME_COLORS[0], borderColor: '#333' },
    }],
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 3. 热力图 - 矩阵相关性
// ============================================
export function HeatmapChart({ data, title, height = 400 }: ChartProps) {
  // 获取数值字段
  const numericFields = data.headers.filter(h => {
    const sample = data.rows.slice(0, 10).map(r => r[h]);
    return sample.some(v => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v))));
  });

  if (numericFields.length < 2) return null;

  // 计算相关系数矩阵
  const fields = numericFields.slice(0, 8); // 最多8个字段
  const matrix: number[][] = [];

  for (let i = 0; i < fields.length; i++) {
    matrix[i] = [];
    for (let j = 0; j < fields.length; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const values1 = data.rows.map(r => Number(r[fields[i]])).filter(v => !isNaN(v));
        const values2 = data.rows.map(r => Number(r[fields[j]])).filter(v => !isNaN(v));
        const minLen = Math.min(values1.length, values2.length);
        if (minLen > 1) {
          const mean1 = values1.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
          const mean2 = values2.slice(0, minLen).reduce((a, b) => a + b, 0) / minLen;
          let num = 0, den1 = 0, den2 = 0;
          for (let k = 0; k < minLen; k++) {
            const d1 = values1[k] - mean1;
            const d2 = values2[k] - mean2;
            num += d1 * d2;
            den1 += d1 * d1;
            den2 += d2 * d2;
          }
          matrix[i][j] = den1 > 0 && den2 > 0 ? num / Math.sqrt(den1 * den2) : 0;
        } else {
          matrix[i][j] = 0;
        }
      }
    }
  }

  const heatmapData: [number, number, number][] = [];
  for (let i = 0; i < fields.length; i++) {
    for (let j = 0; j < fields.length; j++) {
      heatmapData.push([i, j, parseFloat(matrix[i][j].toFixed(2))]);
    }
  }

  const option: EChartsOption = {
    title: { text: title || '字段相关性热力图', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {
      position: 'top',
      formatter: (params: unknown) => {
        const p = params as { value: [number, number, number] };
        return `${fields[p.value[0]]} × ${fields[p.value[1]]}<br/>相关系数: ${p.value[2]}`;
      },
    },
    xAxis: { type: 'category', data: fields, splitArea: { show: true } },
    yAxis: { type: 'category', data: fields, splitArea: { show: true } },
    visualMap: {
      min: -1,
      max: 1,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '0%',
      inRange: { color: ['#d73027', '#f7f7f7', '#1a9850'] },
    },
    series: [{
      type: 'heatmap',
      data: heatmapData,
      label: { show: true, fontSize: 10 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
    grid: { left: '15%', right: '10%', bottom: '20%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 4. 漏斗图 - 转化分析
// ============================================
export function FunnelChart({ data, xField, yField, title, height = 400 }: ChartProps) {
  if (!xField || !yField) return null;

  const funnelData = data.rows
    .map(row => ({
      name: String(row[xField] ?? ''),
      value: Number(row[yField]) || 0,
    }))
    .filter(d => d.name && d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const option: EChartsOption = {
    color: THEME_COLORS,
    title: { text: title || '转化漏斗', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item', formatter: '{b}: {c}' },
    series: [{
      type: 'funnel',
      data: funnelData,
      label: { show: true, position: 'inside' },
      itemStyle: { borderColor: '#fff', borderWidth: 1 },
      emphasis: { label: { fontSize: 14 } },
    }],
    grid: { left: '10%', right: '10%', bottom: '10%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 5. 桑基图 - 流向分析
// ============================================
export function SankeyChart({ data, xField, yField, title, height = 400 }: ChartProps) {
  if (!xField || !yField) return null;

  // 构建source-target关系
  const links: { source: string; target: string; value: number }[] = [];
  const nodeSet = new Set<string>();

  data.rows.forEach(row => {
    const source = String(row[xField] ?? '');
    const target = String(row[yField] ?? '');
    const value = Number(row[Object.keys(row).find(k => k !== xField && k !== yField) || '']) || 1;
    if (source && target) {
      links.push({ source, target, value });
      nodeSet.add(source);
      nodeSet.add(target);
    }
  });

  // 合并相同链接
  const mergedLinks: Record<string, number> = {};
  links.forEach(link => {
    const key = `${link.source}|${link.target}`;
    mergedLinks[key] = (mergedLinks[key] || 0) + link.value;
  });

  const finalLinks = Object.entries(mergedLinks).map(([key, value]) => {
    const [source, target] = key.split('|');
    return { source, target, value };
  });

  const option: EChartsOption = {
    color: THEME_COLORS,
    title: { text: title || '流向分析', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'sankey',
      data: Array.from(nodeSet).map(name => ({ name })),
      links: finalLinks,
      emphasis: { focus: 'adjacency' },
      lineStyle: { color: 'gradient', curveness: 0.5 },
    }],
    grid: { left: '5%', right: '5%', bottom: '5%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 6. 瀑布图 - 增减分析
// ============================================
export function WaterfallChart({ data, xField, yField, title, height = 400 }: ChartProps) {
  if (!xField || !yField) return null;

  const sortedData = data.rows
    .map(row => ({
      name: String(row[xField] ?? ''),
      value: Number(row[yField]) || 0,
    }))
    .filter(d => d.name)
    .slice(0, 15);

  // 计算瀑布图数据
  const waterfallData = sortedData.reduce(
    (acc, d) => {
      const prev = acc.cumulative;
      const nextCumulative = acc.cumulative + d.value;
      acc.items.push({
        name: d.name,
        value: d.value,
        base: d.value >= 0 ? prev : nextCumulative,
        helper: d.value >= 0 ? nextCumulative : prev,
      });
      acc.cumulative = nextCumulative;
      return acc;
    },
    { cumulative: 0, items: [] as Array<{ name: string; value: number; base: number; helper: number }> }
  ).items;

  const option: EChartsOption = {
    color: THEME_COLORS,
    title: { text: title || '增减分析', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const p = params as Array<{ name: string; value: number; seriesName: string }>;
        const item = p.find(x => x.seriesName === '数值');
        return `${item?.name}<br/>变化: ${item?.value}`;
      },
    },
    xAxis: { type: 'category', data: waterfallData.map(d => d.name) },
    yAxis: { type: 'value' },
    series: [
      {
        name: '辅助',
        type: 'bar',
        stack: 'total',
        itemStyle: { borderColor: 'transparent', color: 'transparent' },
        data: waterfallData.map(d => d.base),
      },
      {
        name: '数值',
        type: 'bar',
        stack: 'total',
        data: waterfallData.map(d => ({
          value: Math.abs(d.value),
          itemStyle: { color: d.value >= 0 ? '#91cc75' : '#ee6666' },
        })),
        label: { show: true, position: 'top', formatter: (p: unknown) => String((p as { value: number }).value) },
      },
    ],
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 7. 仪表盘 - KPI展示
// ============================================
export function GaugeChart({ value, title, min = 0, max = 100, unit = '', height = 300 }: {
  value: number;
  title?: string;
  min?: number;
  max?: number;
  unit?: string;
  height?: number;
}) {
  const option: EChartsOption = {
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    series: [{
      type: 'gauge',
      min,
      max,
      progress: { show: true, width: 18 },
      axisLine: { lineStyle: { width: 18 } },
      axisTick: { show: false },
      splitLine: { length: 15, lineStyle: { width: 2, color: '#999' } },
      axisLabel: { distance: 25, color: '#999', fontSize: 12 },
      anchor: { show: true, showAbove: true, size: 20, itemStyle: { borderWidth: 5 } },
      title: { show: true },
      detail: {
        valueAnimation: true,
        fontSize: 30,
        offsetCenter: [0, '70%'],
        formatter: `{value}${unit}`,
      },
      data: [{ value, name: title }],
    }],
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 8. 词云 - 文本频率
// ============================================
export function WordCloudChart({ data, field, title, height = 400 }: {
  data: { headers: string[]; rows: Record<string, CellValue>[] };
  field?: string;
  title?: string;
  height?: number;
}) {
  if (!field) return null;

  // 统计词频
  const wordCount: Record<string, number> = {};
  data.rows.forEach(row => {
    const text = String(row[field] ?? '');
    if (text) {
      wordCount[text] = (wordCount[text] || 0) + 1;
    }
  });

  const wordData = Object.entries(wordCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 50);

  // 使用简单的散点图模拟词云
  const option: EChartsOption = {
    title: { text: title || `${field} 词频统计`, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { show: true },
    series: [{
      type: 'scatter',
      data: wordData.map((d, i) => ({
        name: d.name,
        value: [i % 10, Math.floor(i / 10), d.value],
        symbolSize: Math.max(20, Math.min(80, d.value * 5)),
        label: {
          show: true,
          formatter: '{b}',
          fontSize: Math.max(10, Math.min(20, d.value * 2)),
        },
      })),
      itemStyle: {
        color: (params: unknown) => {
          const p = params as { dataIndex: number };
          return THEME_COLORS[p.dataIndex % THEME_COLORS.length];
        },
        opacity: 0.7,
      },
    }],
    xAxis: { show: false, min: -1, max: 10 },
    yAxis: { show: false, min: -1, max: Math.ceil(wordData.length / 10) },
    grid: { left: '5%', right: '5%', bottom: '5%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 9. 树图 - 层级分析
// ============================================
export function TreemapChart({ data, xField, yField, title, height = 400 }: ChartProps) {
  if (!xField || !yField) return null;

  const treeData = data.rows
    .map(row => ({
      name: String(row[xField] ?? ''),
      value: Number(row[yField]) || 0,
    }))
    .filter(d => d.name && d.value > 0)
    .slice(0, 30);

  const option: EChartsOption = {
    color: THEME_COLORS,
    title: { text: title || '层级占比分析', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { formatter: '{b}: {c}' },
    series: [{
      type: 'treemap',
      data: treeData,
      breadcrumb: { show: false },
      label: { show: true, formatter: '{b}\n{c}' },
      itemStyle: { borderColor: '#fff' },
    }],
    grid: { left: '5%', right: '5%', bottom: '5%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// ============================================
// 10. 组合图 - 双轴分析
// ============================================
export function ComboChart({ data, xField, yFields, title, height = 400 }: {
  data: { headers: string[]; rows: Record<string, CellValue>[] };
  xField?: string;
  yFields?: string[];
  title?: string;
  height?: number;
}) {
  if (!xField || !yFields || yFields.length < 2) return null;

  const categories = data.rows.map(row => String(row[xField] ?? '')).slice(0, 20);
  const series = yFields.map((field, index) => ({
    name: field,
    type: index === 0 ? 'bar' as const : 'line' as const,
    yAxisIndex: index === 0 ? 0 : 1,
    data: data.rows.slice(0, 20).map(row => Number(row[field]) || 0),
  }));

  const option: EChartsOption = {
    color: THEME_COLORS,
    title: { text: title || '组合分析', left: 'center', textStyle: { fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    legend: { data: yFields, bottom: 0 },
    xAxis: { type: 'category', data: categories },
    yAxis: [
      { type: 'value', name: yFields[0] },
      { type: 'value', name: yFields[1] },
    ],
    series,
    grid: { left: '10%', right: '10%', bottom: '15%', top: '15%' },
  };

  return <ReactECharts option={option} style={{ height }} />;
}

// 图表类型定义
export const EXTENDED_CHART_TYPES = [
  { id: 'scatter', name: '散点图', icon: '○', description: '双变量相关性分析' },
  { id: 'boxplot', name: '箱线图', icon: '▬', description: '数据分布与异常值' },
  { id: 'heatmap', name: '热力图', icon: '▦', description: '矩阵相关性展示' },
  { id: 'funnel', name: '漏斗图', icon: '▽', description: '转化流程分析' },
  { id: 'sankey', name: '桑基图', icon: '⇝', description: '流向与路径分析' },
  { id: 'waterfall', name: '瀑布图', icon: '▮', description: '增减变化分析' },
  { id: 'treemap', name: '树图', icon: '▣', description: '层级占比分析' },
  { id: 'gauge', name: '仪表盘', icon: '◐', description: 'KPI完成度展示' },
  { id: 'wordcloud', name: '词云', icon: '☁', description: '文本频率可视化' },
  { id: 'combo', name: '组合图', icon: '◫', description: '双轴混合展示' },
] as const;

export type ExtendedChartType = (typeof EXTENDED_CHART_TYPES)[number]['id'];
