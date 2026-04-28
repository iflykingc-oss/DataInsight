'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  BarChart3, LayoutGrid, Download,
  TrendingUp, LineChart, Activity, Layers,
  Table2, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Search, Save, FolderOpen, RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData, DataAnalysis } from '@/lib/data-processor';
import {
  BarChart, Bar, LineChart as RechartsLineChart, Line, PieChart as RechartsPieChart, Pie, Cell,
  AreaChart as RechartsArea, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// ============================================
// 类型定义
// ============================================
interface DashboardProps {
  data: ParsedData;
  analysis: DataAnalysis | null;
}

const COLORS = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911'];

type WidgetType = 'kpi' | 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'pivot' | 'detail' | 'filter';

interface ChartWidget {
  id: string;
  type: WidgetType;
  title: string;
  xField: string;
  yField: string;
  data: Record<string, string | number>[];
  priority: number;
  // 透视表专用
  pivotConfig?: { rowField: string; colField: string; valField: string; aggFunc: string };
  // 筛选器专用
  filterField?: string;
}

// ============================================
// 主组件
// ============================================
export function Dashboard({ data, analysis }: DashboardProps) {
  const [chartType, setChartType] = useState<string>('auto');
  const [filterValues, setFilterValues] = useState<Record<string, string[]>>({});
  const [detailSortField, setDetailSortField] = useState<string>('');
  const [detailSortDir, setDetailSortDir] = useState<'asc' | 'desc'>('desc');
  const [detailPage, setDetailPage] = useState(0);
  const [detailSearch, setDetailSearch] = useState('');
  const DETAIL_PAGE_SIZE = 20;

  // 图表联动筛选：点击图表数据点后设置筛选
  const [linkedFilter, setLinkedFilter] = useState<{ field: string; value: string } | null>(null);

  // 仪表盘持久化
  const [savedConfigs, setSavedConfigs] = useState<Array<{ id: string; name: string; chartType: string; filterValues: Record<string, string[]>; linkedFilter: { field: string; value: string } | null; savedAt: string }>>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showLoadDialog, setShowLoadDialog] = useState(false);

  // 加载已保存配置
  useEffect(() => {
    try {
      const saved = localStorage.getItem('datainsight-dashboard-configs');
      if (saved) setSavedConfigs(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // 保存配置
  const handleSaveConfig = useCallback(() => {
    const name = saveName.trim() || `仪表盘 ${savedConfigs.length + 1}`;
    const newConfig = {
      id: `config-${Date.now()}`,
      name,
      chartType,
      filterValues,
      linkedFilter,
      savedAt: new Date().toLocaleString(),
    };
    const updated = [...savedConfigs, newConfig];
    setSavedConfigs(updated);
    setActiveConfigId(newConfig.id);
    localStorage.setItem('datainsight-dashboard-configs', JSON.stringify(updated));
    setShowSaveDialog(false);
    setSaveName('');
  }, [saveName, savedConfigs, chartType, filterValues, linkedFilter]);

  // 加载配置
  const handleLoadConfig = useCallback((configId: string) => {
    const config = savedConfigs.find(c => c.id === configId);
    if (config) {
      setChartType(config.chartType);
      setFilterValues(config.filterValues);
      setLinkedFilter(config.linkedFilter || null);
      setActiveConfigId(config.id);
      setShowLoadDialog(false);
    }
  }, [savedConfigs]);

  // 删除配置
  const handleDeleteConfig = useCallback((configId: string) => {
    const updated = savedConfigs.filter(c => c.id !== configId);
    setSavedConfigs(updated);
    if (activeConfigId === configId) setActiveConfigId(null);
    localStorage.setItem('datainsight-dashboard-configs', JSON.stringify(updated));
  }, [savedConfigs, activeConfigId]);

  // 重置
  const handleResetConfig = useCallback(() => {
    setChartType('auto');
    setFilterValues({});
    setLinkedFilter(null);
    setActiveConfigId(null);
  }, []);

  // 应用筛选器过滤数据
  const filteredData = useMemo(() => {
    let rows = data.rows;
    Object.entries(filterValues).forEach(([field, values]) => {
      if (values.length > 0) {
        rows = rows.filter(r => values.includes(String(r[field])));
      }
    });
    // 图表联动筛选
    if (linkedFilter) {
      rows = rows.filter(r => String(r[linkedFilter.field]) === linkedFilter.value);
    }
    return rows;
  }, [data.rows, filterValues, linkedFilter]);

  // 自动生成仪表盘图表
  const allWidgets = useMemo(() => generateDashboard(data, analysis), [data, analysis]);

  // 基于筛选后数据（含联动筛选）的图表数据
  const filteredWidgets = useMemo(() => generateDashboard({ ...data, rows: filteredData }, analysis), [data, filteredData, analysis]);

  // KPI 卡片
  const kpiWidgets = allWidgets.filter(w => w.type === 'kpi');
  // 筛选器（始终基于全量数据）
  const filterWidgets = allWidgets.filter(w => w.type === 'filter');
  // 图表（基于筛选后数据）
  const chartWidgets = chartType === 'auto'
    ? filteredWidgets.filter(w => w.type !== 'kpi' && w.type !== 'filter')
    : filteredWidgets.filter(w => w.type !== 'kpi' && w.type !== 'filter' && w.type === chartType);

  // 筛选器切换
  const toggleFilterValue = useCallback((field: string, value: string) => {
    setFilterValues(prev => {
      const current = prev[field] || [];
      const next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  }, []);

  // 清除某筛选器
  const clearFilter = useCallback((field: string) => {
    setFilterValues(prev => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // 图表联动点击处理
  const handleChartClick = useCallback((field: string, value: string) => {
    setLinkedFilter(prev => {
      // 点击相同数据点则取消筛选
      if (prev && prev.field === field && prev.value === value) return null;
      return { field, value };
    });
  }, []);

  // 清除联动筛选
  const clearLinkedFilter = useCallback(() => {
    setLinkedFilter(null);
  }, []);

  // 明细表排序数据
  const sortedDetailRows = useMemo(() => {
    if (!detailSortField) return filteredData;
    const dir = detailSortDir === 'asc' ? 1 : -1;
    return [...filteredData].sort((a, b) => {
      const va = a[detailSortField];
      const vb = b[detailSortField];
      const na = Number(va);
      const nb = Number(vb);
      if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }, [filteredData, detailSortField, detailSortDir]);

  // 明细表搜索过滤
  const searchedDetailRows = useMemo(() => {
    if (!detailSearch) return sortedDetailRows;
    const lower = detailSearch.toLowerCase();
    return sortedDetailRows.filter(r =>
      Object.values(r).some(v => String(v).toLowerCase().includes(lower))
    );
  }, [sortedDetailRows, detailSearch]);

  // 明细表分页
  const detailTotalPages = Math.ceil(searchedDetailRows.length / DETAIL_PAGE_SIZE);
  const detailPagedRows = searchedDetailRows.slice(detailPage * DETAIL_PAGE_SIZE, (detailPage + 1) * DETAIL_PAGE_SIZE);

  if (allWidgets.length === 0) {
    return (
      <Card className="text-center py-12">
        <CardContent>
          <LayoutGrid className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">需要至少1个数值字段才能生成仪表盘</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI 指标卡片 */}
      {kpiWidgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiWidgets.map(widget => (
            <Card key={widget.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{widget.title}</span>
                  <Activity className="w-4 h-4 text-[#1890ff]" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{widget.data[0]?.value as string || '-'}</div>
                <p className="text-xs text-gray-400 mt-1">{widget.data[0]?.sub as string || ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 筛选器栏 */}
      {filterWidgets.length > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">数据筛选</span>
              {filterWidgets.map(fw => {
                const values = fw.data.map(d => String(d.value));
                const selected = filterValues[fw.filterField || ''] || [];
                return (
                  <div key={fw.id} className="flex items-center gap-1 flex-wrap">
                    <span className="text-xs text-gray-600 font-medium">{fw.filterField}:</span>
                    {values.slice(0, 8).map(v => (
                      <button
                        key={v}
                        onClick={() => toggleFilterValue(fw.filterField || '', v)}
                        className={cn(
                          'px-2 py-0.5 rounded text-[11px] border transition-colors',
                          selected.includes(v)
                            ? 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                        )}
                      >
                        {v}
                      </button>
                    ))}
                    {values.length > 8 && <span className="text-[10px] text-gray-400">+{values.length - 8}</span>}
                    {selected.length > 0 && (
                      <button onClick={() => clearFilter(fw.filterField || '')} className="text-[10px] text-red-400 hover:text-red-600 ml-1">
                        清除
                      </button>
                    )}
                  </div>
                );
              })}
              {Object.keys(filterValues).some(k => filterValues[k].length > 0) && (
                <Badge variant="secondary" className="text-[10px]">
                  {filteredData.length}/{data.rows.length} 行
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={chartType} onValueChange={setChartType}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="图表类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">全部类型</SelectItem>
              <SelectItem value="bar">柱状图</SelectItem>
              <SelectItem value="line">折线图</SelectItem>
              <SelectItem value="pie">饼图</SelectItem>
              <SelectItem value="area">面积图</SelectItem>
              <SelectItem value="radar">雷达图</SelectItem>
              <SelectItem value="pivot">透视表</SelectItem>
              <SelectItem value="detail">明细表</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {chartWidgets.length} 个组件
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => {
              const el = document.getElementById('dashboard-chart-area');
              if (el) {
                import('html2canvas').then(mod => {
                  mod.default(el).then((canvas: HTMLCanvasElement) => {
                    const link = document.createElement('a');
                    link.download = 'dashboard.png';
                    link.href = canvas.toDataURL();
                    link.click();
                  });
                }).catch(() => { /* html2canvas not available */ });
              }
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            导出图片
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="w-3.5 h-3.5" />
            保存配置
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs"
            onClick={() => setShowLoadDialog(true)}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            加载配置
            {savedConfigs.length > 0 && (
              <span className="ml-0.5 text-xs text-muted-foreground">({savedConfigs.length})</span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs"
            onClick={handleResetConfig}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </Button>
        </div>
      </div>

      {/* 图表联动筛选提示 */}
      {linkedFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span className="text-xs text-blue-700">
            联动筛选: <strong>{linkedFilter.field}</strong> = <strong>{linkedFilter.value}</strong>
          </span>
          <span className="text-xs text-blue-500">（点击图表数据点触发，所有图表同步更新）</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs ml-auto text-blue-600 hover:text-blue-800"
            onClick={clearLinkedFilter}
          >
            清除联动
          </Button>
        </div>
      )}

      {/* 保存对话框 */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowSaveDialog(false)}>
          <Card className="w-96" onClick={e => e.stopPropagation()}>
            <CardHeader><CardTitle className="text-base">保存仪表盘配置</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="配置名称（如：月度销售看板）"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveConfig(); }}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowSaveDialog(false)}>取消</Button>
                <Button size="sm" onClick={handleSaveConfig}>保存</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 加载对话框 */}
      {showLoadDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowLoadDialog(false)}>
          <Card className="w-96 max-h-96 overflow-auto" onClick={e => e.stopPropagation()}>
            <CardHeader><CardTitle className="text-base">加载仪表盘配置</CardTitle></CardHeader>
            <CardContent>
              {savedConfigs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">暂无已保存的配置</p>
              ) : (
                <div className="space-y-2">
                  {savedConfigs.map(config => (
                    <div
                      key={config.id}
                      className={`flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50 ${activeConfigId === config.id ? 'border-primary bg-primary/5' : ''}`}
                      onClick={() => handleLoadConfig(config.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{config.name}</p>
                        <p className="text-xs text-muted-foreground">{config.savedAt}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={e => { e.stopPropagation(); handleDeleteConfig(config.id); }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 图表/表格网格 */}
      <div id="dashboard-chart-area" className="grid md:grid-cols-2 gap-4">
        {chartWidgets.map(widget => {
          // 透视表渲染
          if (widget.type === 'pivot' && widget.pivotConfig) {
            return (
              <Card key={widget.id} className="hover:shadow-md transition-shadow md:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">透视表</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {widget.pivotConfig.rowField} &times; {widget.pivotConfig.colField} &rarr; {widget.pivotConfig.aggFunc}({widget.pivotConfig.valField})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PivotTableView
                    rows={filteredData}
                    rowField={widget.pivotConfig.rowField}
                    colField={widget.pivotConfig.colField}
                    valField={widget.pivotConfig.valField}
                    aggFunc={widget.pivotConfig.aggFunc}
                  />
                </CardContent>
              </Card>
            );
          }

          // 明细表渲染
          if (widget.type === 'detail') {
            return (
              <Card key={widget.id} className="hover:shadow-md transition-shadow md:col-span-2">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">明细表</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    共 {searchedDetailRows.length} 条记录{Object.keys(filterValues).some(k => filterValues[k].length > 0) ? ` (已筛选)` : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* 搜索栏 */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input
                        placeholder="搜索数据..."
                        value={detailSearch}
                        onChange={(e) => { setDetailSearch(e.target.value); setDetailPage(0); }}
                        className="h-8 text-xs pl-8"
                      />
                    </div>
                  </div>
                  {/* 表格 */}
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          {data.headers.map(h => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap cursor-pointer hover:bg-gray-100"
                              onClick={() => {
                                if (detailSortField === h) {
                                  setDetailSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                } else {
                                  setDetailSortField(h);
                                  setDetailSortDir('desc');
                                }
                              }}
                            >
                              <span className="flex items-center gap-1">
                                {h}
                                {detailSortField === h ? (
                                  detailSortDir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                ) : (
                                  <ArrowUpDown className="w-3 h-3 text-gray-300" />
                                )}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detailPagedRows.map((row, i) => (
                          <tr key={i} className="border-t hover:bg-blue-50/50">
                            {data.headers.map(h => (
                              <td key={h} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">
                                {String(row[h] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* 分页 */}
                  {detailTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-500">
                        第 {detailPage + 1}/{detailTotalPages} 页，共 {searchedDetailRows.length} 条
                      </span>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={detailPage === 0} onClick={() => setDetailPage(p => p - 1)}>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={detailPage >= detailTotalPages - 1} onClick={() => setDetailPage(p => p + 1)}>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          }

          // 图表渲染
          return (
            <Card key={widget.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {widget.type === 'bar' ? '柱状图' :
                     widget.type === 'line' ? '折线图' :
                     widget.type === 'pie' ? '饼图' :
                     widget.type === 'area' ? '面积图' :
                     widget.type === 'radar' ? '雷达图' : widget.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  {renderChart(widget, handleChartClick)}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================
// 透视表组件
// ============================================
function PivotTableView({
  rows,
  rowField,
  colField,
  valField,
  aggFunc,
}: {
  rows: Record<string, string | number>[];
  rowField: string;
  colField: string;
  valField: string;
  aggFunc: string;
}) {
  const pivotData = useMemo(() => {
    // 获取行和列的唯一值
    const rowValues = [...new Set(rows.map(r => String(r[rowField])))].sort();
    const colValues = [...new Set(rows.map(r => String(r[colField])))].sort();

    // 构建透视数据
    const matrix: Record<string, Record<string, number[]>> = {};
    rows.forEach(r => {
      const rv = String(r[rowField]);
      const cv = String(r[colField]);
      const val = Number(r[valField]);
      if (!matrix[rv]) matrix[rv] = {};
      if (!matrix[rv][cv]) matrix[rv][cv] = [];
      if (!isNaN(val)) matrix[rv][cv].push(val);
    });

    // 聚合
    const aggregate = (vals: number[]): string => {
      if (vals.length === 0) return '-';
      switch (aggFunc) {
        case 'sum': return vals.reduce((a, b) => a + b, 0).toLocaleString();
        case 'avg': return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
        case 'count': return vals.length.toString();
        case 'max': return Math.max(...vals).toLocaleString();
        case 'min': return Math.min(...vals).toLocaleString();
        default: return vals.reduce((a, b) => a + b, 0).toLocaleString();
      }
    };

    // 计算行合计
    const rowTotals: Record<string, string> = {};
    rowValues.forEach(rv => {
      const allVals = colValues.flatMap(cv => matrix[rv]?.[cv] || []);
      rowTotals[rv] = aggregate(allVals);
    });

    // 计算列合计
    const colTotals: Record<string, string> = {};
    colValues.forEach(cv => {
      const allVals = rowValues.flatMap(rv => matrix[rv]?.[cv] || []);
      colTotals[cv] = aggregate(allVals);
    });

    return { rowValues, colValues, matrix, aggregate, rowTotals, colTotals };
  }, [rows, rowField, colField, valField, aggFunc]);

  const { rowValues, colValues, matrix, aggregate, rowTotals, colTotals } = pivotData;

  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left font-medium text-gray-600 border-r">{rowField}</th>
            {colValues.map(cv => (
              <th key={cv} className="px-3 py-2 text-right font-medium text-gray-600 whitespace-nowrap">{cv}</th>
            ))}
            <th className="px-3 py-2 text-right font-medium text-blue-600 whitespace-nowrap border-l">合计</th>
          </tr>
        </thead>
        <tbody>
          {rowValues.map(rv => (
            <tr key={rv} className="border-t hover:bg-blue-50/30">
              <td className="px-3 py-1.5 font-medium text-gray-700 border-r whitespace-nowrap">{rv}</td>
              {colValues.map(cv => (
                <td key={cv} className="px-3 py-1.5 text-right text-gray-600">
                  {aggregate(matrix[rv]?.[cv] || [])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-medium text-blue-600 border-l">{rowTotals[rv]}</td>
            </tr>
          ))}
          {/* 合计行 */}
          <tr className="border-t bg-gray-50 font-medium">
            <td className="px-3 py-1.5 text-blue-600 border-r">合计</td>
            {colValues.map(cv => (
              <td key={cv} className="px-3 py-1.5 text-right text-blue-600">{colTotals[cv]}</td>
            ))}
            <td className="px-3 py-1.5 text-right text-blue-600 border-l">
              {aggregate(Object.values(matrix).flatMap(rv => Object.values(rv).flat()))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================
// 图表渲染
// ============================================
function renderChart(widget: ChartWidget, onDataPointClick?: (field: string, value: string) => void) {
  const { type, xField, yField, data: chartData } = widget;

  // 点击处理：根据图表类型提取对应维度值
  const handleClick = (payload: Record<string, unknown> | null) => {
    if (!payload || !onDataPointClick) return;
    const xValue = payload[xField] ?? payload.name;
    if (xValue != null) {
      onDataPointClick(xField, String(xValue));
    }
  };

  switch (type) {
    case 'bar':
      return (
        <BarChart data={chartData.slice(0, 20)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Bar dataKey={yField} fill="#1890ff" radius={[4, 4, 0, 0]} onClick={(data: Record<string, unknown>) => handleClick(data)} cursor="pointer" />
        </BarChart>
      );
    case 'line':
      return (
        <RechartsLineChart data={chartData.slice(0, 30)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} onClick={(e: { activePayload?: Array<{ payload: Record<string, unknown> }> }) => {
          if (e?.activePayload?.[0]?.payload) handleClick(e.activePayload[0].payload);
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Line type="monotone" dataKey={yField} stroke="#1890ff" strokeWidth={2} dot={{ r: 3, cursor: 'pointer' }} activeDot={{ r: 5, cursor: 'pointer' }} />
        </RechartsLineChart>
      );
    case 'pie':
      return (
        <RechartsPieChart>
          <Pie
            data={chartData.slice(0, 10)}
            dataKey={yField}
            nameKey={xField}
            cx="50%"
            cy="50%"
            outerRadius={100}
            label={({ name, percent }: { name: string; percent: number }) =>
              `${name} ${(percent * 100).toFixed(0)}%`
            }
            labelLine={{ strokeWidth: 1 }}
            onClick={(data: Record<string, unknown>) => handleClick(data)}
            cursor="pointer"
          >
            {chartData.slice(0, 10).map((_, idx) => (
              <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Legend />
        </RechartsPieChart>
      );
    case 'area':
      return (
        <RechartsArea data={chartData.slice(0, 30)} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} onClick={(e: { activePayload?: Array<{ payload: Record<string, unknown> }> }) => {
          if (e?.activePayload?.[0]?.payload) handleClick(e.activePayload[0].payload);
        }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xField} tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip formatter={(v: number) => typeof v === 'number' ? v.toLocaleString() : v} />
          <Area type="monotone" dataKey={yField} stroke="#1890ff" fill="#1890ff" fillOpacity={0.2} strokeWidth={2} cursor="pointer" />
        </RechartsArea>
      );
    case 'radar':
      return (
        <RadarChart cx="50%" cy="50%" outerRadius={100} data={chartData.slice(0, 8)}>
          <PolarGrid />
          <PolarAngleAxis dataKey={xField} tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          <Radar name={yField} dataKey={yField} stroke="#1890ff" fill="#1890ff" fillOpacity={0.3} cursor="pointer" />
          <Tooltip />
        </RadarChart>
      );
    default:
      return <div className="flex items-center justify-center h-full text-gray-400">不支持的图表类型</div>;
  }
}

// ============================================
// 仪表盘生成逻辑
// ============================================
function generateDashboard(data: ParsedData, analysis: DataAnalysis | null): ChartWidget[] {
  const widgets: ChartWidget[] = [];
  if (!data || !data.rows || data.rows.length === 0) return widgets;

  const headers = data.headers;
  const rows = data.rows;

  // 识别字段类型
  const numericCols: Array<{ name: string; idx: number }> = [];
  const textCols: Array<{ name: string; idx: number; uniqueCount: number }> = [];
  const dateCols: Array<{ name: string; idx: number }> = [];

  headers.forEach((h, idx) => {
    const sampleValues = rows.slice(0, 10).map(r => r[h]);
    const numericCount = sampleValues.filter(v => !isNaN(Number(v)) && v !== '' && v !== null).length;

    if (numericCount >= sampleValues.length * 0.7) {
      numericCols.push({ name: h, idx });
    } else {
      const datePatterns = /\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/;
      const dateCount = sampleValues.filter(v => datePatterns.test(String(v))).length;
      if (dateCount >= sampleValues.length * 0.5) {
        dateCols.push({ name: h, idx });
      } else {
        const uniqueValues = new Set(rows.map(r => String(r[h])));
        textCols.push({ name: h, idx, uniqueCount: uniqueValues.size });
      }
    }
  });

  // ===== 1. KPI 卡片 =====
  numericCols.slice(0, 4).forEach((col, i) => {
    const values = rows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = values.length > 0 ? sum / values.length : 0;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const variance = calculateVariance(values);

    const metrics = [
      { label: `总 ${col.name}`, value: sum.toLocaleString(), sub: `共 ${values.length} 条数据` },
      { label: `平均 ${col.name}`, value: avg.toLocaleString(undefined, { maximumFractionDigits: 2 }), sub: `范围: ${min.toLocaleString()} ~ ${max.toLocaleString()}` },
      { label: `最大 ${col.name}`, value: max.toLocaleString(), sub: `最小: ${min.toLocaleString()}` },
      { label: `${col.name} 方差`, value: variance.toLocaleString(undefined, { maximumFractionDigits: 2 }), sub: `标准差: ${Math.sqrt(variance).toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
    ];

    const metric = metrics[i % metrics.length];
    widgets.push({
      id: `kpi-${col.name}`,
      type: 'kpi',
      title: metric.label,
      xField: '',
      yField: col.name,
      data: [{ value: metric.value, sub: metric.sub }],
      priority: 10,
    });
  });

  // ===== 2. 筛选器 =====
  const goodTextCols = textCols.filter(c => c.uniqueCount >= 2 && c.uniqueCount <= 20);
  goodTextCols.slice(0, 3).forEach(col => {
    const uniqueValues = [...new Set(rows.map(r => String(r[col.name])))];
    widgets.push({
      id: `filter-${col.name}`,
      type: 'filter',
      title: `筛选: ${col.name}`,
      xField: '',
      yField: '',
      filterField: col.name,
      data: uniqueValues.map(v => ({ value: v })),
      priority: 10,
    });
  });

  // ===== 3. 透视表 =====
  if (textCols.length >= 2 && numericCols.length >= 1) {
    const rowField = textCols[0].name;
    const colField = textCols[1].name;
    const valField = numericCols[0].name;
    const rowUnique = new Set(rows.map(r => String(r[rowField]))).size;
    const colUnique = new Set(rows.map(r => String(r[colField]))).size;

    if (rowUnique <= 15 && colUnique <= 10) {
      widgets.push({
        id: `pivot-${rowField}-${colField}`,
        type: 'pivot',
        title: `${rowField} × ${colField} 交叉分析`,
        xField: rowField,
        yField: valField,
        data: [],
        priority: 9,
        pivotConfig: { rowField, colField, valField, aggFunc: 'sum' },
      });
    }
  }

  // ===== 4. 明细表 =====
  widgets.push({
    id: 'detail-table',
    type: 'detail',
    title: '数据明细表',
    xField: '',
    yField: '',
    data: [],
    priority: 8,
  });

  // ===== 5. 分类字段+数值字段 → 柱状图 =====
  if (goodTextCols.length > 0 && numericCols.length > 0) {
    const xCol = goodTextCols[0];
    const yCol = numericCols[0];
    const grouped = groupByField(rows, xCol.name, yCol.name);
    const chartData = Object.entries(grouped)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 15)
      .map(([key, val]) => ({ [xCol.name]: key, [yCol.name]: val }));

    widgets.push({
      id: `bar-${xCol.name}-${yCol.name}`,
      type: 'bar',
      title: `${yCol.name} 按 ${xCol.name} 分布`,
      xField: xCol.name,
      yField: yCol.name,
      data: chartData,
      priority: 9,
    });
  }

  // ===== 6. 饼图 - 分类占比 =====
  if (goodTextCols.length > 0) {
    const col = goodTextCols[0];
    const counts: Record<string, number> = {};
    rows.forEach(r => {
      const key = String(r[col.name]);
      counts[key] = (counts[key] || 0) + 1;
    });
    const chartData = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([key, val]) => ({ [col.name]: key, count: val }));

    if (chartData.length >= 2) {
      widgets.push({
        id: `pie-${col.name}`,
        type: 'pie',
        title: `${col.name} 占比分布`,
        xField: col.name,
        yField: 'count',
        data: chartData,
        priority: 8,
      });
    }
  }

  // ===== 7. 日期字段+数值字段 → 折线图 =====
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    const numCol = numericCols[0];
    const chartData = rows.slice(0, 30).map(r => ({
      [dateCol.name]: String(r[dateCol.name]),
      [numCol.name]: Number(r[numCol.name]) || 0,
    }));

    widgets.push({
      id: `line-${dateCol.name}-${numCol.name}`,
      type: 'line',
      title: `${numCol.name} 趋势`,
      xField: dateCol.name,
      yField: numCol.name,
      data: chartData,
      priority: 9,
    });
  }

  // ===== 8. 面积图 =====
  if (numericCols.length > 0) {
    const xAxisField = dateCols.length > 0 ? dateCols[0].name : (goodTextCols.length > 0 ? goodTextCols[0].name : '');
    const yCol = numericCols[0];
    if (xAxisField) {
      const chartData = rows.slice(0, 25).map(r => ({
        [xAxisField]: String(r[xAxisField]),
        [yCol.name]: Number(r[yCol.name]) || 0,
      }));
      widgets.push({
        id: `area-${xAxisField}-${yCol.name}`,
        type: 'area',
        title: `${yCol.name} 累积趋势`,
        xField: xAxisField,
        yField: yCol.name,
        data: chartData,
        priority: 7,
      });
    }
  }

  // ===== 9. 多数值字段对比柱状图 =====
  if (goodTextCols.length > 0 && numericCols.length >= 2) {
    const xCol = goodTextCols[0];
    const grouped: Record<string, Record<string, number>> = {};
    rows.forEach(r => {
      const key = String(r[xCol.name]);
      if (!grouped[key]) grouped[key] = {};
      numericCols.slice(0, 3).forEach(nc => {
        grouped[key][nc.name] = (grouped[key][nc.name] || 0) + (Number(r[nc.name]) || 0);
      });
    });
    const chartData = Object.entries(grouped)
      .slice(0, 10)
      .map(([key, vals]) => ({ [xCol.name]: key, ...vals }));

    widgets.push({
      id: `multi-bar-${xCol.name}`,
      type: 'bar',
      title: `多维对比 by ${xCol.name}`,
      xField: xCol.name,
      yField: numericCols[1].name,
      data: chartData,
      priority: 6,
    });
  }

  // ===== 10. 雷达图 =====
  if (goodTextCols.length > 0 && numericCols.length >= 2) {
    const xCol = goodTextCols[0];
    const categories = [...new Set(rows.map(r => String(r[xCol.name])))].slice(0, 6);
    const chartData = categories.map(cat => {
      const catRows = rows.filter(r => String(r[xCol.name]) === cat);
      const entry: Record<string, string | number> = { [xCol.name]: cat };
      numericCols.slice(0, 4).forEach(nc => {
        const vals = catRows.map(r => Number(r[nc.name])).filter(v => !isNaN(v));
        entry[nc.name] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });
      return entry;
    });

    widgets.push({
      id: `radar-${xCol.name}`,
      type: 'radar',
      title: `${xCol.name} 多维雷达图`,
      xField: xCol.name,
      yField: numericCols[0].name,
      data: chartData,
      priority: 5,
    });
  }

  return widgets.sort((a, b) => b.priority - a.priority);
}

// ============================================
// 工具函数
// ============================================
function groupByField(rows: Record<string, string | number>[], groupField: string, valueField: string): Record<string, number> {
  const grouped: Record<string, number> = {};
  rows.forEach(r => {
    const key = String(r[groupField]);
    const val = Number(r[valueField]) || 1;
    grouped[key] = (grouped[key] || 0) + val;
  });
  return grouped;
}

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
}
