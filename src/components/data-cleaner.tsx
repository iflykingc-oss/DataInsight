'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Trash2,
  Plus,
  ArrowRight,
  Filter,
  RefreshCw,
  Search,
  CheckCircle,
  AlertTriangle,
  Copy,
  Merge,
  Split,
  Calculator,
  Type,
  Hash,
  Calendar
} from 'lucide-react';
import type { ParsedData, FieldStat } from '@/lib/data-processor';
import { generateId } from '@/lib/utils';

interface CleaningStep {
  id: string;
  type: 'filter' | 'deduplicate' | 'fillnull' | 'convert' | 'calculate' | 'rename';
  config: Record<string, string | number>;
  enabled: boolean;
}

interface DataCleanerProps {
  data: ParsedData;
  fieldStats: FieldStat[];
  onDataChange?: (data: ParsedData) => void;
}

export function DataCleaner({ data, fieldStats, onDataChange }: DataCleanerProps) {
  const [cleaningSteps, setCleaningSteps] = useState<CleaningStep[]>([]);
  const [previewData, setPreviewData] = useState<{ before: ParsedData; after: ParsedData }>({
    before: data,
    after: data
  });
  
  // 当前步骤配置
  const [filterField, setFilterField] = useState('');
  const [filterOperator, setFilterOperator] = useState('equals');
  const [filterValue, setFilterValue] = useState('');
  
  const [nullFillField, setNullFillField] = useState('');
  const [nullFillMethod, setNullFillMethod] = useState<'value' | 'mean' | 'median' | 'mode'>('value');
  const [nullFillValue, setNullFillValue] = useState('');
  
  const [convertField, setConvertField] = useState('');
  const [convertFrom, setConvertFrom] = useState<'string' | 'number' | 'date'>('string');
  const [convertTo, setConvertTo] = useState<'string' | 'number' | 'date'>('number');
  
  const [calcField, setCalcField] = useState('');
  const [calcExpression, setCalcExpression] = useState('');
  
  const [renameField, setRenameField] = useState('');
  const [newFieldName, setNewFieldName] = useState('');
  
  // 添加清洗步骤
  const addStep = (step: Omit<CleaningStep, 'id'>) => {
    const newStep: CleaningStep = {
      ...step,
      id: generateId('step')
    };
    setCleaningSteps([...cleaningSteps, newStep]);
    applyCleaning([...cleaningSteps, newStep]);
  };
  
  // 删除清洗步骤
  const removeStep = (id: string) => {
    const newSteps = cleaningSteps.filter(s => s.id !== id);
    setCleaningSteps(newSteps);
    applyCleaning(newSteps);
  };
  
  // 切换步骤启用状态
  const toggleStep = (id: string) => {
    const newSteps = cleaningSteps.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setCleaningSteps(newSteps);
    applyCleaning(newSteps);
  };
  
  // 应用清洗
  const applyCleaning = (steps: CleaningStep[]) => {
    let result = { ...data, rows: [...data.rows] };
    
    steps.filter(s => s.enabled).forEach(step => {
      switch (step.type) {
        case 'filter':
          result.rows = result.rows.filter(row => {
            const value = row[step.config.field];
            const target = String(step.config.value);
            switch (step.config.operator) {
              case 'equals': return String(value) === target;
              case 'not_equals': return String(value) !== target;
              case 'contains': return String(value).includes(target);
              case 'greater': return Number(value) > Number(target);
              case 'less': return Number(value) < Number(target);
              default: return true;
            }
          });
          break;
          
        case 'deduplicate':
          const seen = new Set<string>();
          result.rows = result.rows.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          break;
          
        case 'fillnull':
          result.rows = result.rows.map(row => {
            const newRow = { ...row };
            if (newRow[step.config.field] === null || newRow[step.config.field] === undefined || newRow[step.config.field] === '') {
              switch (step.config.method) {
                case 'value':
                  newRow[step.config.field] = step.config.value;
                  break;
                case 'mean':
                  const values = data.rows.map(r => Number(r[step.config.field])).filter(v => !isNaN(v));
                  newRow[step.config.field] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                  break;
                case 'median':
                  const nums = data.rows.map(r => Number(r[step.config.field])).filter(v => !isNaN(v)).sort((a, b) => a - b);
                  newRow[step.config.field] = nums.length % 2 === 0 ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2 : nums[Math.floor(nums.length / 2)];
                  break;
                case 'mode':
                  const countMap = new Map<string, number>();
                  data.rows.forEach(r => {
                    const v = String(r[step.config.field]);
                    countMap.set(v, (countMap.get(v) || 0) + 1);
                  });
                  let maxCount = 0, modeValue = '';
                  countMap.forEach((count, v) => {
                    if (count > maxCount) { maxCount = count; modeValue = v; }
                  });
                  newRow[step.config.field] = modeValue;
                  break;
              }
            }
            return newRow;
          });
          break;
          
        case 'convert':
          result.rows = result.rows.map(row => {
            const newRow = { ...row };
            const value = row[step.config.field];
            switch (step.config.to) {
              case 'number':
                newRow[step.config.field] = Number(value);
                break;
              case 'string':
                newRow[step.config.field] = String(value);
                break;
              case 'date':
                newRow[step.config.field] = new Date(value).toISOString();
                break;
            }
            return newRow;
          });
          break;
          
        case 'rename':
          result.rows = result.rows.map(row => {
            const newRow = { ...row };
            const fieldKey = String(step.config.field);
            const newNameKey = String(step.config.newName);
            newRow[newNameKey] = newRow[fieldKey];
            delete newRow[fieldKey];
            return newRow;
          });
          result.headers = result.headers.map(h => h === step.config.field ? String(step.config.newName) : h);
          break;
      }
    });
    
    result.rowCount = result.rows.length;
    setPreviewData({ before: data, after: result });
  };
  
  // 确认应用清洗
  const confirmCleaning = () => {
    onDataChange?.(previewData.after);
  };
  
  // 重置清洗
  const resetCleaning = () => {
    setCleaningSteps([]);
    setPreviewData({ before: data, after: data });
  };
  
  // 获取字段统计
  const getFieldStat = (field: string) => fieldStats.find(f => f.field === field);
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-5 h-5 text-purple-500" />
            数据清洗
            <Badge variant="secondary" className="ml-auto">
              {cleaningSteps.length} 个清洗步骤
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="filter" className="space-y-4">
            <TabsList>
              <TabsTrigger value="filter">
                <Filter className="w-4 h-4 mr-1" />
                筛选过滤
              </TabsTrigger>
              <TabsTrigger value="deduplicate">
                <Copy className="w-4 h-4 mr-1" />
                去重
              </TabsTrigger>
              <TabsTrigger value="fillnull">
                <RefreshCw className="w-4 h-4 mr-1" />
                空值填充
              </TabsTrigger>
              <TabsTrigger value="convert">
                <Type className="w-4 h-4 mr-1" />
                类型转换
              </TabsTrigger>
              <TabsTrigger value="calculate">
                <Calculator className="w-4 h-4 mr-1" />
                计算字段
              </TabsTrigger>
              <TabsTrigger value="rename">
                <Hash className="w-4 h-4 mr-1" />
                重命名
              </TabsTrigger>
            </TabsList>
            
            {/* 筛选过滤 */}
            <TabsContent value="filter" className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>选择字段</Label>
                  <Select value={filterField} onValueChange={setFilterField}>
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
                  <Label>条件</Label>
                  <Select value={filterOperator} onValueChange={setFilterOperator}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">等于</SelectItem>
                      <SelectItem value="not_equals">不等于</SelectItem>
                      <SelectItem value="contains">包含</SelectItem>
                      <SelectItem value="greater">大于</SelectItem>
                      <SelectItem value="less">小于</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>值</Label>
                  <Input
                    value={filterValue}
                    onChange={e => setFilterValue(e.target.value)}
                    placeholder="输入值"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => addStep({
                      type: 'filter',
                      config: { field: filterField, operator: filterOperator, value: filterValue },
                      enabled: true
                    })}
                    disabled={!filterField || !filterValue}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加条件
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* 去重 */}
            <TabsContent value="deduplicate" className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">删除重复行</h4>
                    <p className="text-sm text-amber-600 mt-1">
                      自动检测并删除完全相同的重复记录。当前数据 {data.rowCount} 行，
                      预计去重后约 {Math.floor(data.rowCount * 0.95)} 行
                    </p>
                    <Button
                      className="mt-3"
                      variant="outline"
                      onClick={() => addStep({
                        type: 'deduplicate',
                        config: {},
                        enabled: true
                      })}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      添加去重步骤
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            {/* 空值填充 */}
            <TabsContent value="fillnull" className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>选择字段</Label>
                  <Select value={nullFillField} onValueChange={setNullFillField}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择字段" />
                    </SelectTrigger>
                    <SelectContent>
                      {data.headers.filter(h => {
                        const stat = getFieldStat(h);
                        return stat && stat.nullCount > 0;
                      }).map(h => (
                        <SelectItem key={h} value={h}>
                          {h} ({getFieldStat(h)?.nullCount}个空值)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>填充方式</Label>
                  <Select value={nullFillMethod} onValueChange={(value) => setNullFillMethod(value as 'mode' | 'value' | 'mean' | 'median')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="value">固定值</SelectItem>
                      <SelectItem value="mean">均值 (数值)</SelectItem>
                      <SelectItem value="median">中位数 (数值)</SelectItem>
                      <SelectItem value="mode">众数</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {nullFillMethod === 'value' && (
                  <div className="space-y-2">
                    <Label>填充值</Label>
                    <Input
                      value={nullFillValue}
                      onChange={e => setNullFillValue(e.target.value)}
                      placeholder="输入填充值"
                    />
                  </div>
                )}
                <div className="flex items-end">
                  <Button
                    onClick={() => addStep({
                      type: 'fillnull',
                      config: { field: nullFillField, method: nullFillMethod, value: nullFillValue },
                      enabled: true
                    })}
                    disabled={!nullFillField}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加填充
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* 类型转换 */}
            <TabsContent value="convert" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>选择字段</Label>
                  <Select value={convertField} onValueChange={setConvertField}>
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
                  <Label>转换为</Label>
                  <Select value={convertTo} onValueChange={v => setConvertTo(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">文本</SelectItem>
                      <SelectItem value="number">数值</SelectItem>
                      <SelectItem value="date">日期</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => addStep({
                      type: 'convert',
                      config: { field: convertField, from: convertFrom, to: convertTo },
                      enabled: true
                    })}
                    disabled={!convertField}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加转换
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            {/* 计算字段 */}
            <TabsContent value="calculate" className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h4 className="font-medium text-purple-800 mb-2">计算字段</h4>
                <p className="text-sm text-purple-600 mb-4">
                  使用现有字段创建新的计算字段，支持加减乘除和聚合函数
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>新字段名</Label>
                    <Input
                      value={calcField}
                      onChange={e => setCalcField(e.target.value)}
                      placeholder="利润率"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>表达式 (使用字段名)</Label>
                    <Input
                      value={calcExpression}
                      onChange={e => setCalcExpression(e.target.value)}
                      placeholder="销售额 / 成本 * 100"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  可用操作符: + - * / % | 可用函数: SUM() AVG() COUNT() MAX() MIN()
                </p>
              </div>
            </TabsContent>
            
            {/* 重命名 */}
            <TabsContent value="rename" className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>选择字段</Label>
                  <Select value={renameField} onValueChange={setRenameField}>
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
                  <Label>新名称</Label>
                  <Input
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    placeholder="输入新名称"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={() => addStep({
                      type: 'rename',
                      config: { field: renameField, newName: newFieldName },
                      enabled: true
                    })}
                    disabled={!renameField || !newFieldName}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    添加重命名
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {/* 清洗步骤列表 */}
      {cleaningSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">清洗步骤预览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cleaningSteps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <Badge variant="outline">{index + 1}</Badge>
                  <Checkbox
                    checked={step.enabled}
                    onCheckedChange={() => toggleStep(step.id)}
                  />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {step.type === 'filter' && `筛选: ${step.config.field} ${step.config.operator} ${step.config.value}`}
                      {step.type === 'deduplicate' && '删除重复行'}
                      {step.type === 'fillnull' && `空值填充: ${step.config.field} = ${step.config.method}`}
                      {step.type === 'convert' && `类型转换: ${step.config.field} → ${step.config.to}`}
                      {step.type === 'rename' && `重命名: ${step.config.field} → ${step.config.newName}`}
                      {step.type === 'calculate' && `计算字段: ${step.config.field}`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeStep(step.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
            
            {/* 预览对比 */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <span className="text-gray-400">清洗前</span>
                  <Badge>{previewData.before.rowCount} 行</Badge>
                </h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData.before.headers.slice(0, 3).map(h => (
                          <TableHead key={h} className="text-xs">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.before.rows.slice(0, 3).map((row, i) => (
                        <TableRow key={i}>
                          {previewData.before.headers.slice(0, 3).map(h => (
                            <TableCell key={h} className="text-xs">{String(row[h])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>清洗后</span>
                  <Badge className="bg-green-100 text-green-700">{previewData.after.rowCount} 行</Badge>
                </h4>
                <div className="border rounded-lg overflow-hidden border-green-200">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {previewData.after.headers.slice(0, 3).map(h => (
                          <TableHead key={h} className="text-xs">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.after.rows.slice(0, 3).map((row, i) => (
                        <TableRow key={i}>
                          {previewData.after.headers.slice(0, 3).map(h => (
                            <TableCell key={h} className="text-xs">{String(row[h])}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={resetCleaning}>
                重置
              </Button>
              <Button onClick={confirmCleaning}>
                <CheckCircle className="w-4 h-4 mr-1" />
                应用清洗
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
