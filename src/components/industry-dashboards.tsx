'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import type { CellValue } from '@/lib/data-processor';

// 行业仪表盘模板 — 参考 dataVIS 行业大屏设计
// 每个行业提供一套完整的大屏配置

const THEME_COLORS = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f',
];

// 大屏通用暗色背景
const DARK_BG = '#0d1b2a';
const DARK_CARD = '#1b2838';
const DARK_TEXT = '#e0e6ed';
const DARK_SUBTEXT = '#8aa4bf';

interface IndustryDashboardProps {
  data: {
    headers: string[];
    rows: Record<string, CellValue>[];
  };
  industryId: string;
  fieldMapping?: Record<string, string>;
  height?: number;
}

// 获取行业的ECharts暗色主题
function getDarkTheme(): Record<string, unknown> {
  return {
    color: THEME_COLORS,
    backgroundColor: 'transparent',
    title: { textStyle: { color: DARK_TEXT }, subtextStyle: { color: DARK_SUBTEXT } },
    legend: { textStyle: { color: DARK_SUBTEXT } },
    tooltip: { backgroundColor: 'rgba(0,0,0,0.7)', textStyle: { color: DARK_TEXT } },
    xAxis: { axisLine: { lineStyle: { color: '#2a3a4a' } }, axisLabel: { color: DARK_SUBTEXT }, splitLine: { lineStyle: { color: '#1a2a3a' } } },
    yAxis: { axisLine: { lineStyle: { color: '#2a3a4a' } }, axisLabel: { color: DARK_SUBTEXT }, splitLine: { lineStyle: { color: '#1a2a3a' } } },
  };
}

// 零售大屏
function RetailDashboard({ data, height = 600 }: { data: IndustryDashboardProps['data']; height?: number }) {
  const headers = data.headers.map(h => h.toLowerCase());
  
  // 智能查找字段
  const findField = (keywords: string[]) => headers.find(h => keywords.some(k => h.includes(k)));
  const dateField = findField(['日期', 'date', '时间', 'time', '月', 'month', '周', 'week']) || data.headers[0];
  const salesField = findField(['销售', 'sales', '金额', 'amount', '营收', 'revenue', '收入', 'income']) || 
    data.headers.find(h => typeof data.rows[0]?.[h] === 'number') || data.headers[1];
  const categoryField = findField(['品类', 'category', '分类', 'type', '类型', '商品', 'product']);

  // 月度趋势
  const trendOption: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: '销售趋势', left: 'center', textStyle: { color: DARK_TEXT, fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.rows.slice(0, 12).map(r => String(r[dateField] || '')) },
    yAxis: { type: 'value' },
    series: [{
      type: 'line', smooth: true,
      data: data.rows.slice(0, 12).map(r => Number(r[salesField]) || 0),
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(84,112,198,0.5)' }, { offset: 1, color: 'rgba(84,112,198,0.05)' }] } },
      lineStyle: { color: '#5470c6', width: 2 },
      itemStyle: { color: '#5470c6' },
    }],
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
  };

  // 品类占比
  const pieOption: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: '品类占比', left: 'center', textStyle: { color: DARK_TEXT, fontSize: 14 } },
    tooltip: { trigger: 'item' },
    series: [{
      type: 'pie', radius: ['40%', '65%'], center: ['50%', '55%'],
      data: categoryField ? (() => {
        const catMap: Record<string, number> = {};
        data.rows.forEach(r => {
          const cat = String(r[categoryField] || '其他');
          catMap[cat] = (catMap[cat] || 0) + (Number(r[salesField]) || 1);
        });
        return Object.entries(catMap).slice(0, 8).map(([name, value]) => ({ name, value }));
      })() : [{ name: '暂无', value: 1 }],
      label: { color: DARK_SUBTEXT },
    }],
  };

  // 渠道对比
  const barOption: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: 'TOP10 对比', left: 'center', textStyle: { color: DARK_TEXT, fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.rows.slice(0, 10).map(r => String(r[dateField] || '').substring(0, 6)) },
    yAxis: { type: 'value' },
    series: [{
      type: 'bar',
      data: data.rows.slice(0, 10).map(r => Number(r[salesField]) || 0),
      itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#91cc75' }, { offset: 1, color: '#3ba272' }] },
        borderRadius: [4, 4, 0, 0],
      },
    }],
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
  };

  return (
    <div style={{ background: DARK_BG, borderRadius: 8, padding: 16, height }} className="grid grid-cols-2 gap-4">
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }} className="col-span-2">
        <ReactECharts option={trendOption} theme={getDarkTheme() as never} style={{ height: height * 0.45 }} />
      </div>
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }}>
        <ReactECharts option={pieOption} theme={getDarkTheme() as never} style={{ height: height * 0.4 }} />
      </div>
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }}>
        <ReactECharts option={barOption} theme={getDarkTheme() as never} style={{ height: height * 0.4 }} />
      </div>
    </div>
  );
}

// 金融大屏
function FinanceDashboard({ data, height = 600 }: { data: IndustryDashboardProps['data']; height?: number }) {
  const headers = data.headers.map(h => h.toLowerCase());
  const findField = (keywords: string[]) => headers.find(h => keywords.some(k => h.includes(k)));
  const dateField = findField(['日期', 'date', '月份', '月']) || data.headers[0];
  const incomeField = findField(['收入', 'income', '营收', 'revenue']) || data.headers[1];
  const expenseField = findField(['支出', 'expense', '费用', 'cost', '成本']) || data.headers[2];
  const profitField = findField(['利润', 'profit', '净利润']) || data.headers[3];

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: '财务三表概览', left: 'center', textStyle: { color: DARK_TEXT, fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出', '利润'], textStyle: { color: DARK_SUBTEXT }, top: 30 },
    xAxis: { type: 'category', data: data.rows.slice(0, 12).map(r => String(r[dateField] || '')) },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'bar', data: data.rows.slice(0, 12).map(r => Number(r[incomeField]) || 0), itemStyle: { color: '#5470c6', borderRadius: [3, 3, 0, 0] } },
      { name: '支出', type: 'bar', data: data.rows.slice(0, 12).map(r => Number(r[expenseField]) || 0), itemStyle: { color: '#ee6666', borderRadius: [3, 3, 0, 0] } },
      { name: '利润', type: 'line', data: data.rows.slice(0, 12).map(r => Number(r[profitField]) || 0), lineStyle: { color: '#91cc75', width: 2 }, itemStyle: { color: '#91cc75' } },
    ],
    grid: { left: 50, right: 20, top: 60, bottom: 30 },
  };

  return (
    <div style={{ background: DARK_BG, borderRadius: 8, padding: 16, height }}>
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }}>
        <ReactECharts option={option} theme={getDarkTheme() as never} style={{ height: height - 40 }} />
      </div>
    </div>
  );
}

// 教育大屏
function EducationDashboard({ data, height = 600 }: { data: IndustryDashboardProps['data']; height?: number }) {
  const headers = data.headers.map(h => h.toLowerCase());
  const findField = (keywords: string[]) => headers.find(h => keywords.some(k => h.includes(k)));
  const nameField = findField(['姓名', 'name', '学生', 'student', '班级', 'class']) || data.headers[0];
  const scoreField = findField(['成绩', 'score', '分数', 'grade', '总分', '平均']) || 
    data.headers.find(h => typeof data.rows[0]?.[h] === 'number') || data.headers[1];

  // 成绩分布
  const scores = data.rows.map(r => Number(r[scoreField]) || 0);
  const ranges = ['0-59', '60-69', '70-79', '80-89', '90-100'];
  const dist = [0, 0, 0, 0, 0];
  scores.forEach(s => {
    if (s < 60) dist[0]++;
    else if (s < 70) dist[1]++;
    else if (s < 80) dist[2]++;
    else if (s < 90) dist[3]++;
    else dist[4]++;
  });

  const option: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: '成绩分布', left: 'center', textStyle: { color: DARK_TEXT, fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: ranges },
    yAxis: { type: 'value', name: '人数' },
    series: [{
      type: 'bar',
      data: dist.map((v, i) => ({
        value: v,
        itemStyle: { color: ['#ee6666', '#fac858', '#91cc75', '#5470c6', '#3ba272'][i], borderRadius: [4, 4, 0, 0] },
      })),
    }],
    grid: { left: 50, right: 20, top: 50, bottom: 30 },
  };

  // TOP10
  const top10 = [...data.rows].sort((a, b) => (Number(b[scoreField]) || 0) - (Number(a[scoreField]) || 0)).slice(0, 10);
  const topOption: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: 'TOP 10', left: 'center', textStyle: { color: DARK_TEXT, fontSize: 14 } },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'value' },
    yAxis: { type: 'category', data: top10.map(r => String(r[nameField] || '')).reverse() },
    series: [{
      type: 'bar',
      data: top10.map(r => Number(r[scoreField]) || 0).reverse(),
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#5470c6' }, { offset: 1, color: '#73c0de' }] }, borderRadius: [0, 4, 4, 0] },
    }],
    grid: { left: 80, right: 20, top: 40, bottom: 20 },
  };

  return (
    <div style={{ background: DARK_BG, borderRadius: 8, padding: 16, height }} className="grid grid-cols-2 gap-4">
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }}>
        <ReactECharts option={option} theme={getDarkTheme() as never} style={{ height: height - 40 }} />
      </div>
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }}>
        <ReactECharts option={topOption} theme={getDarkTheme() as never} style={{ height: height - 40 }} />
      </div>
    </div>
  );
}

// 通用大屏（非匹配行业时使用）
function GenericDashboard({ data, height = 600 }: { data: IndustryDashboardProps['data']; height?: number }) {
  const numericHeaders = data.headers.filter(h => typeof data.rows[0]?.[h] === 'number').slice(0, 4);
  const categoryHeader = data.headers[0];

  const overviewOption: EChartsOption = {
    backgroundColor: 'transparent',
    title: { text: '数据概览', left: 'center', textStyle: { color: DARK_TEXT, fontSize: 16 } },
    tooltip: { trigger: 'axis' },
    legend: { data: numericHeaders, textStyle: { color: DARK_SUBTEXT }, top: 30 },
    xAxis: { type: 'category', data: data.rows.slice(0, 20).map(r => String(r[categoryHeader] || '')) },
    yAxis: { type: 'value' },
    series: numericHeaders.map((h, i) => ({
      name: h, type: i === 0 ? 'bar' : 'line',
      data: data.rows.slice(0, 20).map(r => Number(r[h]) || 0),
      ...(i === 0 ? { itemStyle: { color: THEME_COLORS[i], borderRadius: [3, 3, 0, 0] } } : { lineStyle: { color: THEME_COLORS[i] }, itemStyle: { color: THEME_COLORS[i] } }),
    })),
    grid: { left: 50, right: 20, top: 60, bottom: 30 },
  };

  return (
    <div style={{ background: DARK_BG, borderRadius: 8, padding: 16, height }}>
      <div style={{ background: DARK_CARD, borderRadius: 6, padding: 8 }}>
        <ReactECharts option={overviewOption} theme={getDarkTheme() as never} style={{ height: height - 40 }} />
      </div>
    </div>
  );
}

// 主入口组件
export function IndustryDashboard({ data, industryId, height = 600 }: IndustryDashboardProps) {
  const commonProps = { data, height };

  switch (industryId) {
    case 'retail':
      return <RetailDashboard {...commonProps} />;
    case 'finance':
      return <FinanceDashboard {...commonProps} />;
    case 'education':
      return <EducationDashboard {...commonProps} />;
    default:
      return <GenericDashboard {...commonProps} />;
  }
}

// 导出行业大屏模板列表（供行业场景组件使用）
export const INDUSTRY_DASHBOARD_TEMPLATES = [
  { id: 'retail', name: '零售大屏', description: '销售趋势+品类占比+TOP10' },
  { id: 'finance', name: '财务大屏', description: '三表联动+利润趋势' },
  { id: 'education', name: '教育大屏', description: '成绩分布+TOP10排行' },
  { id: 'healthcare', name: '医疗大屏', description: '门诊趋势+科室对比' },
  { id: 'manufacturing', name: '生产大屏', description: '产能监控+良品率' },
  { id: 'logistics', name: '物流大屏', description: '运力分布+时效监控' },
];
