'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Plus,
  Grid3X3,
  Trash2,
  Move,
  Maximize2,
  Minimize2,
  Copy,
  Settings,
  Save,
  Share2,
  Download,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  LayoutGrid,
  Table2,
  Type,
  Hash,
  Eye
} from 'lucide-react';
import type { ParsedData, FieldStat } from '@/lib/data-processor';

interface DashboardWidget {
  id: string;
  type: 'bar' | 'line' | 'pie' | 'area' | 'kpi' | 'table';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  config: {
    xField?: string;
    yField?: string;
    color?: string;
  };
  data?: Record<string, string | number>[];
}

interface SortableWidgetProps {
  widget: DashboardWidget;
  onSelect: () => void;
  isSelected: boolean;
  onDelete: () => void;
}

function SortableWidget({ widget, onSelect, isSelected, onDelete }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const renderWidget = () => {
    switch (widget.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={widget.data?.slice(0, 10) || []}>
              <Bar dataKey="value" fill={widget.config.color || '#3b82f6'} />
              <Tooltip />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={widget.data?.slice(0, 10) || []}>
              <Line type="monotone" dataKey="value" stroke={widget.config.color || '#10b981'} strokeWidth={2} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={widget.data?.slice(0, 6) || []}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius="80%"
              >
                {widget.data?.slice(0, 6).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={widget.data?.slice(0, 10) || []}>
              <Area type="monotone" dataKey="value" fill={widget.config.color || '#8b5cf6'} fillOpacity={0.3} />
              <Tooltip />
            </AreaChart>
          </ResponsiveContainer>
        );
      case 'kpi':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-4xl font-bold" style={{ color: widget.config.color || '#3b82f6' }}>
              {widget.data?.[0]?.value?.toLocaleString() || '0'}
            </p>
            <p className="text-sm text-gray-500">{widget.title}</p>
          </div>
        );
      case 'table':
        return (
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">名称</th>
                  <th className="p-2 text-right">值</th>
                </tr>
              </thead>
              <tbody>
                {widget.data?.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2">{row.name}</td>
                    <td className="p-2 text-right">{Number(row.value).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
        isSelected ? 'border-blue-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium truncate">{widget.title}</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="p-1 cursor-grab"
            {...attributes}
            {...listeners}
          >
            <Move className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="p-1"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3 text-red-500" />
          </Button>
        </div>
      </div>
      <div className="h-32">{renderWidget()}</div>
    </div>
  );
}

interface DashboardDesignerProps {
  data: ParsedData;
  fieldStats: FieldStat[];
}

export function DashboardDesigner({ data, fieldStats }: DashboardDesignerProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [dashboardName, setDashboardName] = useState('我的仪表盘');
  
  const [newWidgetConfig, setNewWidgetConfig] = useState({
    type: 'bar' as DashboardWidget['type'],
    title: '',
    xField: data.headers[0] || '',
    yField: fieldStats.find(f => f.type === 'number')?.field || ''
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // 生成图表数据
  const generateWidgetData = useCallback((config: typeof newWidgetConfig) => {
    if (!config.xField) return [];
    const grouped = new Map<string, number>();
    data.rows.forEach(row => {
      const key = String(row[config.xField] || '未知');
      const value = Number(row[config.yField]);
      if (!isNaN(value)) {
        grouped.set(key, (grouped.get(key) || 0) + value);
      }
    });
    return Array.from(grouped.entries()).map(([name, value]) => ({
      name: name.length > 10 ? name.substring(0, 10) : name,
      value
    })).slice(0, 10);
  }, [data]);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const addWidget = () => {
    const widgetData = generateWidgetData(newWidgetConfig);
    const kpiValue = widgetData.reduce((sum, d) => sum + d.value, 0);
    
    const newWidget: DashboardWidget = {
      id: `widget-${Date.now()}`,
      type: newWidgetConfig.type,
      title: newWidgetConfig.title || `${newWidgetConfig.type}图表`,
      x: 0,
      y: widgets.length,
      w: newWidgetConfig.type === 'kpi' ? 1 : 2,
      h: newWidgetConfig.type === 'kpi' ? 1 : 2,
      config: {
        xField: newWidgetConfig.xField,
        yField: newWidgetConfig.yField,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][widgets.length % 6]
      },
      data: newWidgetConfig.type === 'kpi' ? [{ value: kpiValue }] : widgetData
    };
    
    setWidgets([...widgets, newWidget]);
    setShowAddDialog(false);
  };
  
  const deleteWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
    if (selectedWidget === id) {
      setSelectedWidget(null);
    }
  };
  
  const duplicateWidget = (widget: DashboardWidget) => {
    const newWidget: DashboardWidget = {
      ...widget,
      id: `widget-${Date.now()}`,
      title: `${widget.title} (副本)`
    };
    setWidgets([...widgets, newWidget]);
  };
  
  const selectedWidgetData = widgets.find(w => w.id === selectedWidget);
  
  return (
    <div className="space-y-6">
      {/* 工具栏 */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Input
                value={dashboardName}
                onChange={e => setDashboardName(e.target.value)}
                className="w-48"
              />
              <Badge variant="secondary">{widgets.length} 个组件</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-1" />
                添加组件
              </Button>
              <Button variant="outline">
                <Save className="w-4 h-4 mr-1" />
                保存
              </Button>
              <Button variant="outline">
                <Share2 className="w-4 h-4 mr-1" />
                分享
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-1" />
                导出
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid lg:grid-cols-4 gap-6">
        {/* 画布区域 */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Grid3X3 className="w-5 h-5" />
                仪表盘画布
                <Badge variant="outline" className="ml-auto">
                  拖拽排序
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {widgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-lg">
                  <LayoutGrid className="w-12 h-12 text-gray-300 mb-4" />
                  <p className="text-gray-500 mb-4">还没有添加任何组件</p>
                  <Button onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    添加第一个组件
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {widgets.map(widget => (
                        <SortableWidget
                          key={widget.id}
                          widget={widget}
                          isSelected={selectedWidget === widget.id}
                          onSelect={() => setSelectedWidget(widget.id)}
                          onDelete={() => deleteWidget(widget.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* 属性面板 */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="w-5 h-5" />
                属性配置
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedWidgetData ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>组件标题</Label>
                    <Input
                      value={selectedWidgetData.title}
                      onChange={e => {
                        setWidgets(widgets.map(w =>
                          w.id === selectedWidget ? { ...w, title: e.target.value } : w
                        ));
                      }}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>图表类型</Label>
                    <Select
                      value={selectedWidgetData.type}
                      onValueChange={v => {
                        setWidgets(widgets.map(w =>
                          w.id === selectedWidget ? { ...w, type: v as any } : w
                        ));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bar">柱状图</SelectItem>
                        <SelectItem value="line">折线图</SelectItem>
                        <SelectItem value="pie">饼图</SelectItem>
                        <SelectItem value="area">面积图</SelectItem>
                        <SelectItem value="kpi">KPI指标卡</SelectItem>
                        <SelectItem value="table">数据表格</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>X轴字段</Label>
                    <Select
                      value={selectedWidgetData.config.xField || ''}
                      onValueChange={v => {
                        setWidgets(widgets.map(w =>
                          w.id === selectedWidget
                            ? { ...w, config: { ...w.config, xField: v }, data: generateWidgetData({ ...newWidgetConfig, xField: v }) }
                            : w
                        ));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择字段" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.headers.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Y轴字段</Label>
                    <Select
                      value={selectedWidgetData.config.yField || ''}
                      onValueChange={v => {
                        setWidgets(widgets.map(w =>
                          w.id === selectedWidget
                            ? { ...w, config: { ...w.config, yField: v }, data: generateWidgetData({ ...newWidgetConfig, yField: v }) }
                            : w
                        ));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择字段" />
                      </SelectTrigger>
                      <SelectContent>
                        {fieldStats.filter(f => f.type === 'number').map(f => (
                          <SelectItem key={f.field} value={f.field}>{f.field}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => duplicateWidget(selectedWidgetData)}
                      className="flex-1"
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      复制
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteWidget(selectedWidgetData.id)}
                      className="flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">点击组件进行编辑</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* 组件库 */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">组件库</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'bar', icon: BarChart3, name: '柱状图' },
                  { type: 'line', icon: LineChartIcon, name: '折线图' },
                  { type: 'pie', icon: PieChartIcon, name: '饼图' },
                  { type: 'area', icon: LayoutGrid, name: '面积图' },
                  { type: 'kpi', icon: Hash, name: '指标卡' },
                  { type: 'table', icon: Table2, name: '表格' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => {
                        setNewWidgetConfig({ ...newWidgetConfig, type: item.type as any });
                        setShowAddDialog(true);
                      }}
                      className="p-3 border rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs">{item.name}</p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* 添加组件对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加仪表盘组件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>组件标题</Label>
              <Input
                value={newWidgetConfig.title}
                onChange={e => setNewWidgetConfig({ ...newWidgetConfig, title: e.target.value })}
                placeholder="输入组件标题"
              />
            </div>
            
            <div className="space-y-2">
              <Label>组件类型</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { type: 'bar', icon: BarChart3, name: '柱状图' },
                  { type: 'line', icon: LineChartIcon, name: '折线图' },
                  { type: 'pie', icon: PieChartIcon, name: '饼图' },
                  { type: 'area', icon: LayoutGrid, name: '面积图' },
                  { type: 'kpi', icon: Hash, name: '指标卡' },
                  { type: 'table', icon: Table2, name: '表格' },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => setNewWidgetConfig({ ...newWidgetConfig, type: item.type as any })}
                      className={`p-3 border rounded-lg transition-colors ${
                        newWidgetConfig.type === item.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mx-auto mb-1 ${newWidgetConfig.type === item.type ? 'text-blue-500' : ''}`} />
                      <p className="text-xs">{item.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>X轴字段</Label>
                <Select
                  value={newWidgetConfig.xField}
                  onValueChange={v => setNewWidgetConfig({ ...newWidgetConfig, xField: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.headers.map(h => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Y轴字段</Label>
                <Select
                  value={newWidgetConfig.yField}
                  onValueChange={v => setNewWidgetConfig({ ...newWidgetConfig, yField: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择字段" />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldStats.filter(f => f.type === 'number').map(f => (
                      <SelectItem key={f.field} value={f.field}>{f.field}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={addWidget}>
              <Plus className="w-4 h-4 mr-1" />
              添加
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
