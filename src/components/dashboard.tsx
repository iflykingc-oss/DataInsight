'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { safeSetItem } from '@/lib/safe-storage';
import {
  BarChart3, LayoutGrid, Download,
  TrendingUp, LineChart, Activity, Layers,
  Table2, Filter, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  Search, Save, FolderOpen, RotateCcw,
  Trophy, Timer, Target, Star, Award, Crown, Medal, TrendingDown, Minus
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

type WidgetType = 'kpi' | 'bar' | 'line' | 'pie' | 'area' | 'radar' | 'pivot' | 'detail' | 'filter' | 'leaderboard' | 'countdown' | 'progress' | 'nps' | 'forecast' | 'text';

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
  // 排行榜专用
  rankField?: string;
  // 倒计时专用
  countdownTarget?: string;
  // 进度图专用
  progressValue?: number;
  progressMax?: number;
  // NPS专用
  promoterCount?: number;
  passiveCount?: number;
  detractorCount?: number;
  npsScore?: number;
  npsTotal?: number;
  // 预测专用
  forecastValue?: number;
  forecastTrend?: 'up' | 'down' | 'stable';
  forecastGrowth?: number;
  // 文本组件专用
  textContent?: string;
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
    safeSetItem('datainsight-dashboard-configs', JSON.stringify(updated));
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
    safeSetItem('datainsight-dashboard-configs', JSON.stringify(updated));
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
          <LayoutGrid className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">需要至少1个数值字段才能生成仪表盘</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI 指标卡片 */}
      {kpiWidgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiWidgets.map(widget => (
            <Card key={widget.id} className="hover:shadow-md transition-shadow border-l-4 border-l-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">{widget.title}</span>
                  <Activity className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-foreground">{widget.data[0]?.value as string || '-'}</div>
                <p className="text-xs text-muted-foreground mt-1">{widget.data[0]?.sub as string || ''}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 筛选器栏 */}
      {filterWidgets.length > 0 && (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-4">
              <div className="flex items-center gap-2 min-w-fit pt-1">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">数据筛选</span>
              </div>
              <div className="flex-1 flex flex-wrap gap-4">
                {filterWidgets.map(fw => {
                  const values = fw.data.map(d => String(d.value));
                  const selected = filterValues[fw.filterField || ''] || [];
                  return (
                    <div key={fw.id} className="space-y-2">
                      <span className="text-xs font-medium bg-background px-2 py-0.5 rounded border">{fw.filterField}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {values.slice(0, 6).map(v => (
                          <button
                            key={v}
                            onClick={() => toggleFilterValue(fw.filterField || '', v)}
                            className={cn(
                              'px-2.5 py-1 rounded-md text-xs border transition-all',
                              selected.includes(v)
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                            )}
                          >
                            {v}
                          </button>
                        ))}
                        {values.length > 6 && <span className="text-xs text-muted-foreground self-center">+{values.length - 6}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {Object.keys(filterValues).some(k => filterValues[k].length > 0) && (
                <div className="flex items-center gap-2 min-w-fit pt-1">
                  <Badge variant="secondary" className="text-xs">
                    筛选 {filteredData.length}/{data.rows.length} 行
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground" onClick={() => setFilterValues({})}>
                    清除全部
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 工具栏 */}
      <div className="flex items-center justify-between gap-4 py-3 px-4 -mx-4 bg-muted/30 border-y">
        <div className="flex items-center gap-3">
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
              <SelectItem value="forecast">趋势预测</SelectItem>
              <SelectItem value="pivot">透视表</SelectItem>
              <SelectItem value="detail">明细表</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {chartWidgets.length} 个组件
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
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
            <Download className="w-3.5 h-3.5" />
            导出
          </Button>
          <div className="h-4 w-px bg-border" />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowSaveDialog(true)}
          >
            <Save className="w-3.5 h-3.5" />
            保存
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => setShowLoadDialog(true)}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            加载{savedConfigs.length > 0 && <span className="text-muted-foreground">({savedConfigs.length})</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground"
            onClick={handleResetConfig}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </Button>
        </div>
      </div>

      {/* 图表联动筛选提示 */}
      {linkedFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-md">
          <Filter className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs text-primary">
            联动筛选: <strong>{linkedFilter.field}</strong> = <strong>{linkedFilter.value}</strong>
          </span>
          <span className="text-xs text-primary">（点击图表数据点触发，所有图表同步更新）</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-primary hover:text-primary/80"
            onClick={() => setChartType('detail')}
          >
            查看明细
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs ml-auto text-primary hover:text-primary/80"
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
      <div id="dashboard-chart-area" className="space-y-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wide">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>数据可视化</span>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
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
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        placeholder="搜索数据..."
                        value={detailSearch}
                        onChange={(e) => { setDetailSearch(e.target.value); setDetailPage(0); }}
                        className="h-8 text-xs pl-8"
                      />
                    </div>
                  </div>
                  {/* 表格 */}
                  <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30">
                          {data.headers.map(h => (
                            <th
                              key={h}
                              className="px-3 py-2 text-left font-medium text-foreground whitespace-nowrap cursor-pointer hover:bg-muted"
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
                                  <ArrowUpDown className="w-3 h-3 text-muted-foreground/50" />
                                )}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detailPagedRows.map((row, i) => (
                          <tr key={i} className="border-t hover:bg-primary/5/50">
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
                      <span className="text-xs text-muted-foreground">
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

          // ==================== 排行榜组件 ====================
          if (widget.type === 'leaderboard') {
            const topData = widget.data.slice(0, 10);
            return (
              <Card key={widget.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Trophy className="w-3 h-3" /> 排行榜
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {topData.map((item, idx) => {
                      const rank = idx + 1;
                      const name = String(item[widget.xField] || item.name || `项目${rank}`);
                      const value = Number(item[widget.yField] || item.value || 0);
                      const percent = topData[0] ? (value / Number(topData[0][widget.yField] || topData[0].value || 1)) * 100 : 0;
                      
                      const rankIcons = [
                        <Crown key="crown" className="w-4 h-4 text-warning" />,
                        <Medal key="medal" className="w-4 h-4 text-muted-foreground" />,
                        <Medal key="medal2" className="w-4 h-4 text-warning" />,
                      ];
                      
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-8 flex justify-center">
                            {rank <= 3 ? rankIcons[rank - 1] : (
                              <span className="text-sm font-medium text-muted-foreground">{rank}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm truncate font-medium">{name}</span>
                              <span className="text-sm font-bold ml-2">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${
                                  rank === 1 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                  rank === 2 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                                  rank === 3 ? 'bg-gradient-to-r from-amber-600 to-amber-700' :
                                  'bg-primary'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          }

          // ==================== 倒计时组件 ====================
          if (widget.type === 'countdown') {
            const targetDate = widget.countdownTarget ? new Date(widget.countdownTarget) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            const now = new Date();
            const diff = targetDate.getTime() - now.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            const timeBlocks = [
              { value: days, label: '天' },
              { value: hours, label: '时' },
              { value: minutes, label: '分' },
              { value: seconds, label: '秒' },
            ];
            
            return (
              <Card key={widget.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Timer className="w-3 h-3" /> 倒计时
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <div className="grid grid-cols-4 gap-2">
                      {timeBlocks.map((block, idx) => (
                        <div key={idx} className="bg-primary/5 rounded-md p-3">
                          <div className="text-3xl font-bold text-primary">
                            {String(block.value).padStart(2, '0')}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{block.label}</div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      目标日期: {targetDate.toLocaleDateString('zh-CN')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          }

          // ==================== 进度图组件 ====================
          if (widget.type === 'progress') {
            const currentValue = widget.progressValue || 0;
            const maxValue = widget.progressMax || 100;
            const percent = Math.min((currentValue / maxValue) * 100, 100);
            
            const getStatusColor = () => {
              if (percent >= 100) return 'text-success';
              if (percent >= 70) return 'text-primary';
              if (percent >= 30) return 'text-warning';
              return 'text-destructive';
            };
            
            return (
              <Card key={widget.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Target className="w-3 h-3" /> 进度
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-2xl font-bold">{currentValue.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">当前值</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">目标: {maxValue.toLocaleString()}</p>
                        <p className={`text-sm font-medium ${getStatusColor()}`}>{percent.toFixed(1)}%</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="h-4 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            percent >= 100 ? 'bg-success' :
                            percent >= 70 ? 'bg-primary' :
                            percent >= 30 ? 'bg-warning' :
                            'bg-destructive'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {/* 里程碑标记 */}
                      <div className="absolute top-0 left-1/3 w-0.5 h-4 bg-muted-foreground/30" />
                      <div className="absolute top-0 left-2/3 w-0.5 h-4 bg-muted-foreground/30" />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0%</span>
                      <span>33%</span>
                      <span>66%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          }

          // ==================== NPS组件 ====================
          if (widget.type === 'nps') {
            const promoter = widget.promoterCount || 0;
            const passive = widget.passiveCount || 0;
            const detractor = widget.detractorCount || 0;
            const total = promoter + passive + detractor || 1;
            const promoterPct = (promoter / total) * 100;
            const passivePct = (passive / total) * 100;
            const detractorPct = (detractor / total) * 100;
            const npsScore = Math.round(promoterPct - detractorPct);
            
            const getNpsLevel = () => {
              if (npsScore >= 70) return { label: '优秀', color: 'text-success', bg: 'bg-success' };
              if (npsScore >= 50) return { label: '良好', color: 'text-primary', bg: 'bg-primary' };
              if (npsScore >= 30) return { label: '一般', color: 'text-warning', bg: 'bg-warning' };
              return { label: '需改进', color: 'text-destructive', bg: 'bg-destructive' };
            };
            
            const level = getNpsLevel();
            
            return (
              <Card key={widget.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                      <Star className="w-3 h-3" /> NPS
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-4">
                    <p className={`text-4xl font-bold ${level.color}`}>{npsScore}</p>
                    <Badge className={`mt-2 ${level.bg} text-white`}>{level.label}</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-20 text-xs text-success flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> 推荐者
                      </div>
                      <div className="flex-1 h-4 bg-success/10 rounded-full overflow-hidden">
                        <div className="h-full bg-success" style={{ width: `${promoterPct}%` }} />
                      </div>
                      <span className="text-xs w-12 text-right">{promoterPct.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 text-xs text-foreground flex items-center gap-1">
                        <Minus className="w-3 h-3" /> 被动者
                      </div>
                      <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-muted-foreground/30" style={{ width: `${passivePct}%` }} />
                      </div>
                      <span className="text-xs w-12 text-right">{passivePct.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 text-xs text-destructive flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> 贬损者
                      </div>
                      <div className="flex-1 h-4 bg-destructive/10 rounded-full overflow-hidden">
                        <div className="h-full bg-destructive" style={{ width: `${detractorPct}%` }} />
                      </div>
                      <span className="text-xs w-12 text-right">{detractorPct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    基于 {total.toLocaleString()} 条反馈
                  </p>
                </CardContent>
              </Card>
            );
          }

          // ==================== 文本组件 ====================
          if (widget.type === 'text') {
            return (
              <Card key={widget.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="prose prose-sm max-w-none">
                    {widget.textContent || '点击编辑文本内容'}
                  </div>
                </CardContent>
              </Card>
            );
          }

          // ==================== 预测分析组件 ====================
          if (widget.type === 'forecast') {
            const { forecastValue, forecastTrend, forecastGrowth } = widget;
            const trendColor = forecastTrend === 'up' ? 'text-success' : forecastTrend === 'down' ? 'text-destructive' : 'text-foreground';
            const trendIcon = forecastTrend === 'up' ? <TrendingUp className="w-4 h-4" /> : forecastTrend === 'down' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />;
            const trendLabel = forecastTrend === 'up' ? '上升' : forecastTrend === 'down' ? '下降' : '平稳';

            return (
              <Card key={widget.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
                    <Badge variant="outline" className="text-xs">预测</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-muted/50 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">下一周期预测</p>
                      <p className="text-2xl font-bold">{forecastValue?.toLocaleString() || '-'}</p>
                    </div>
                    <div className="text-center p-3 bg-muted/50 rounded-md">
                      <p className="text-xs text-muted-foreground mb-1">趋势方向</p>
                      <div className={`flex items-center justify-center gap-1 ${trendColor}`}>
                        {trendIcon}
                        <span className="text-lg font-semibold">{trendLabel}</span>
                      </div>
                      {forecastGrowth !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">
                          平均变化 {forecastGrowth > 0 ? '+' : ''}{forecastGrowth}%
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    基于历史 {widget.data.length} 个数据点的线性趋势预测
                  </p>
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
  rows: Record<string, import('@/lib/data-processor').CellValue>[];
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
      // 过滤掉无效值，只保留有效数字
      const validVals = vals.filter(v => typeof v === 'number' && !isNaN(v));
      if (validVals.length === 0) return '-';
      switch (aggFunc) {
        case 'sum': return validVals.reduce((a, b) => a + b, 0).toLocaleString();
        case 'avg': return (validVals.reduce((a, b) => a + b, 0) / validVals.length).toFixed(2);
        case 'count': return validVals.length.toString();
        case 'max': return Math.max(...validVals).toLocaleString();
        case 'min': return Math.min(...validVals).toLocaleString();
        default: return validVals.reduce((a, b) => a + b, 0).toLocaleString();
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
    <div className="overflow-x-auto border rounded-md">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/30">
            <th className="px-3 py-2 text-left font-medium text-foreground border-r">{rowField}</th>
            {colValues.map(cv => (
              <th key={cv} className="px-3 py-2 text-right font-medium text-foreground whitespace-nowrap">{cv}</th>
            ))}
            <th className="px-3 py-2 text-right font-medium text-primary whitespace-nowrap border-l">合计</th>
          </tr>
        </thead>
        <tbody>
          {rowValues.map(rv => (
            <tr key={rv} className="border-t hover:bg-primary/5/30">
              <td className="px-3 py-1.5 font-medium text-foreground border-r whitespace-nowrap">{rv}</td>
              {colValues.map(cv => (
                <td key={cv} className="px-3 py-1.5 text-right text-foreground">
                  {aggregate(matrix[rv]?.[cv] || [])}
                </td>
              ))}
              <td className="px-3 py-1.5 text-right font-medium text-primary border-l">{rowTotals[rv]}</td>
            </tr>
          ))}
          {/* 合计行 */}
          <tr className="border-t bg-muted/30 font-medium">
            <td className="px-3 py-1.5 text-primary border-r">合计</td>
            {colValues.map(cv => (
              <td key={cv} className="px-3 py-1.5 text-right text-primary">{colTotals[cv]}</td>
            ))}
            <td className="px-3 py-1.5 text-right text-primary border-l">
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
      return <div className="flex items-center justify-center h-full text-muted-foreground">不支持的图表类型</div>;
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

  // 识别字段类型 - 优先使用 analysis 的字段类型信息（含ID/序号检测）
  const numericCols: Array<{ name: string; idx: number }> = [];
  const textCols: Array<{ name: string; idx: number; uniqueCount: number }> = [];
  const dateCols: Array<{ name: string; idx: number }> = [];

  // ID/序号字段检测：名称匹配
  const idNamePatterns = [
    /^id$/i, /^编号$/i, /序号/i, /^no\.?$/i, /^no$/i,
    /^serial$/i, /^序列$/i, /^index$/i, /^idx$/i,
    /^code$/i, /^编码$/i, /^num$/i, /^key$/i, /^pk$/i
  ];

  // ID/序号字段检测：连续递增序号检测算法
  function isAutoIncrement(fieldName: string, rows: Record<string, import('@/lib/data-processor').CellValue>[]): boolean {
    const nums = rows.map(r => Number(r[fieldName])).filter(n => !isNaN(n));
    if (nums.length < 5) return false;
    const sorted = [...nums].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    if (max - min > nums.length * 2) return false;
    let consecutiveCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] - sorted[i - 1] <= 2) consecutiveCount++;
    }
    const consecutiveRatio = consecutiveCount / (sorted.length - 1);
    return consecutiveRatio > 0.9 && Math.abs(max - min - nums.length) < nums.length * 0.3;
  }

  // 综合判断是否为ID/序号字段
  function isIdOrSequenceField(fieldName: string): boolean {
    // 1. 从 analysis 的 fieldStats 中获取类型
    const fieldStat = analysis?.fieldStats?.find(f => f.field === fieldName);
    if (fieldStat?.type === 'id') return true;
    // 2. 名称匹配
    if (idNamePatterns.some(p => p.test(fieldName))) return true;
    // 3. 连续递增检测
    if (isAutoIncrement(fieldName, rows)) return true;
    return false;
  }

  headers.forEach((h, idx) => {
    // 先检查是否为ID/序号字段
    if (isIdOrSequenceField(h)) return; // 跳过ID/序号字段

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
    const sum = values.length > 0 ? values.reduce((a, b) => a + b, 0) : 0;
    const avg = values.length > 0 ? sum / values.length : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const variance = values.length > 0 ? calculateVariance(values) : 0;

    const safeToLocale = (num: number) => typeof num === 'number' && !isNaN(num) ? num.toLocaleString() : '0';

    const metrics = [
      { label: `总 ${col.name}`, value: safeToLocale(sum), sub: `共 ${values.length} 条数据` },
      { label: `平均 ${col.name}`, value: safeToLocale(avg), sub: `范围: ${safeToLocale(min)} ~ ${safeToLocale(max)}` },
      { label: `最大 ${col.name}`, value: safeToLocale(max), sub: `最小: ${safeToLocale(min)}` },
      { label: `${col.name} 方差`, value: safeToLocale(variance), sub: `标准差: ${safeToLocale(Math.sqrt(variance))}` },
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
    let uniqueValues = [...new Set(rows.map(r => String(r[col.name])))];
    // 过滤掉无效筛选选项：空值、乱码、纯数字序号、过长值
    uniqueValues = uniqueValues.filter(v => {
      if (!v || v.trim() === '' || v === 'null' || v === 'undefined') return false;
      // 过滤乱码：包含大量特殊字符或不可打印字符
      const printableRatio = v.replace(/[^\u0020-\u007E\u4E00-\u9FFF\u3000-\u303F\uFF00-\uFFEF]/g, '').length / v.length;
      if (printableRatio < 0.5) return false;
      // 过滤纯数字递增（如1,2,3...），这些是序号不是分类
      if (/^\d+$/.test(v.trim())) return false;
      // 过滤过长的值（>30字符通常是描述文本，不适合筛选）
      if (v.length > 30) return false;
      return true;
    });
    if (uniqueValues.length < 2) return; // 过滤后不足2个选项，不生成筛选器
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

  // ===== 9. 排行榜 =====
  if (goodTextCols.length > 0 && numericCols.length > 0) {
    const xCol = goodTextCols[0];
    const yCol = numericCols[0];
    const grouped = groupByField(rows, xCol.name, yCol.name);
    const chartData = Object.entries(grouped)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([key, val]) => ({ [xCol.name]: key, [yCol.name]: val, name: key, value: val }));

    if (chartData.length >= 3) {
      widgets.push({
        id: `leaderboard-${xCol.name}`,
        type: 'leaderboard',
        title: `${yCol.name} Top 10 排行榜`,
        xField: xCol.name,
        yField: yCol.name,
        data: chartData,
        priority: 8,
      });
    }
  }

  // ===== 10. 倒计时（基于最大日期字段） =====
  if (dateCols.length > 0) {
    const dateCol = dateCols[0];
    const dates = rows.map(r => new Date(String(r[dateCol.name])).getTime()).filter(d => !isNaN(d));
    if (dates.length > 0) {
      const futureDates = dates.filter(d => d > Date.now());
      const targetDate = futureDates.length > 0 
        ? Math.min(...futureDates) 
        : Math.max(...dates);
      
      widgets.push({
        id: `countdown-${dateCol.name}`,
        type: 'countdown',
        title: `距 ${dateCol.name} 倒计时`,
        countdownTarget: new Date(targetDate).toISOString(),
        xField: '',
        yField: '',
        data: [] as Record<string, string | number>[],
        priority: 6,
      });
    }
  }

  // ===== 11. 进度图（基于第一个数值字段） =====
  if (numericCols.length > 0) {
    const col = numericCols[0];
    const values = rows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    if (values.length > 0) {
      const currentSum = values.reduce((a, b) => a + b, 0);
      // 假设目标为当前最大值的1.5倍（预留50%增长空间）
      const maxVal = Math.max(...values);
      const targetValue = maxVal * 1.5;
      
      widgets.push({
        id: `progress-${col.name}`,
        type: 'progress',
        title: `${col.name} 目标进度`,
        xField: '',
        yField: '',
        progressValue: currentSum,
        progressMax: targetValue,
        data: [] as Record<string, string | number>[],
        priority: 7,
      });
    }
  }

  // ===== 12. 预测分析组件（基于日期+数值字段） =====
  if (dateCols.length > 0 && numericCols.length > 0) {
    const dateCol = dateCols[0];
    const numCol = numericCols[0];
    const timeSeriesData = rows
      .map(r => ({
        date: String(r[dateCol.name]),
        value: Number(r[numCol.name]) || 0,
      }))
      .filter(d => !isNaN(new Date(d.date).getTime()) && d.value !== 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 30);

    if (timeSeriesData.length >= 5) {
      // 简单线性预测
      const n = timeSeriesData.length;
      const sumX = timeSeriesData.reduce((s, _, i) => s + i, 0);
      const sumY = timeSeriesData.reduce((s, d) => s + d.value, 0);
      const sumXY = timeSeriesData.reduce((s, d, i) => s + i * d.value, 0);
      const sumXX = timeSeriesData.reduce((s, _, i) => s + i * i, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      const nextValue = intercept + slope * n;
      const trend = slope > 0 ? 'up' : slope < 0 ? 'down' : 'stable';
      const avgGrowth = n > 1 ? (slope / (sumY / n)) * 100 : 0;

      widgets.push({
        id: `forecast-${dateCol.name}-${numCol.name}`,
        type: 'forecast',
        title: `${numCol.name} 趋势预测`,
        xField: dateCol.name,
        yField: numCol.name,
        data: timeSeriesData.map(d => ({
          [dateCol.name]: d.date,
          [numCol.name]: d.value,
        })),
        forecastValue: Math.round(nextValue),
        forecastTrend: trend,
        forecastGrowth: Number(avgGrowth.toFixed(2)),
        priority: 8,
      });
    }
  }

  // ===== 13. NPS组件（检测评分字段） =====
  const scoreField = headers.find(h => /评分|满意度|score|rating|nps/i.test(h));
  if (scoreField) {
    const scores = rows
      .map(r => Number(r[scoreField]))
      .filter(v => !isNaN(v) && v >= 0 && v <= 10);
    if (scores.length > 0) {
      const promoters = scores.filter(s => s >= 9).length;
      const passives = scores.filter(s => s >= 7 && s <= 8).length;
      const detractors = scores.filter(s => s <= 6).length;
      const total = scores.length;
      const npsScore = total > 0 ? Math.round(((promoters - detractors) / total) * 100) : 0;
      widgets.push({
        id: `nps-${scoreField}`,
        type: 'nps',
        title: '净推荐值 (NPS)',
        xField: '',
        yField: '',
        data: [
          { category: '推荐者', count: promoters },
          { category: '被动者', count: passives },
          { category: '贬损者', count: detractors },
        ],
        npsScore,
        npsTotal: total,
        priority: 7,
      });
    }
  }

  return widgets.sort((a, b) => b.priority - a.priority);
}

// ============================================
// 工具函数
// ============================================
function groupByField(rows: Record<string, import('@/lib/data-processor').CellValue>[], groupField: string, valueField: string): Record<string, number> {
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
