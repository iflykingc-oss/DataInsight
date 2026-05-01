'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2, Wand2, Check, Copy, Lightbulb, Sparkles, Code, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedData } from '@/lib/data-processor';

interface AIFormulaGeneratorProps {
  data: ParsedData;
  modelConfig: { apiKey: string; baseUrl: string; model: string } | null;
  onApplyFormula?: (formula: string, targetColumn: string) => void;
}

interface FormulaExample {
  id: string;
  description: string;
  formula: string;
  explanation: string;
}

const FORMULA_EXAMPLES: FormulaExample[] = [
  {
    id: '1',
    description: '统计A列中状态为"已完成"的记录数',
    formula: '=COUNTIF(A:A, "已完成")',
    explanation: '使用COUNTIF函数统计A列中等于"已完成"的单元格数量',
  },
  {
    id: '2',
    description: '如果销售额大于10000，提成10%，否则5%',
    formula: '=IF(B2>10000, B2*0.1, B2*0.05)',
    explanation: 'IF条件判断：当B2大于10000时返回B2×10%，否则返回B2×5%',
  },
  {
    id: '3',
    description: '按客户名称统计重复次数并排名',
    formula: '=COUNTIF($C$2:$C$100, C2)',
    explanation: '统计C列中与当前行C2相同值的个数，即该客户的订单数',
  },
  {
    id: '4',
    description: '计算同比增长率',
    formula: '=IF(B2=0, "N/A", (C2-B2)/B2)',
    explanation: '用今年数据减去年数据再除以去年数据，B2=0时返回N/A避免除零',
  },
  {
    id: '5',
    description: '按金额区间自动分级',
    formula: '=IF(D2>=10000, "高", IF(D2>=3000, "中", "低"))',
    explanation: '嵌套IF判断：>=10000为高，>=3000为中，否则为低',
  },
];

// 函数分类数据
const FUNCTION_CATEGORIES = [
  {
    id: 'math',
    name: '数学函数',
    icon: '🔢',
    functions: [
      { name: 'SUM', syntax: 'SUM(number1, [number2], ...)', desc: '求和，计算所有数值的总和' },
      { name: 'AVERAGE', syntax: 'AVERAGE(number1, [number2], ...)', desc: '求平均值，计算所有数值的算术平均' },
      { name: 'COUNT', syntax: 'COUNT(value1, [value2], ...)', desc: '计数，统计包含数字的单元格数量' },
      { name: 'MAX', syntax: 'MAX(number1, [number2], ...)', desc: '最大值，返回一组数值中的最大值' },
      { name: 'MIN', syntax: 'MIN(number1, [number2], ...)', desc: '最小值，返回一组数值中的最小值' },
      { name: 'ROUND', syntax: 'ROUND(number, num_digits)', desc: '四舍五入，按指定位数对数字四舍五入' },
      { name: 'ABS', syntax: 'ABS(number)', desc: '绝对值，返回数字的绝对值' },
      { name: 'SQRT', syntax: 'SQRT(number)', desc: '平方根，返回数字的正平方根' },
      { name: 'POWER', syntax: 'POWER(number, power)', desc: '幂运算，返回数字的指定次幂' },
      { name: 'MOD', syntax: 'MOD(number, divisor)', desc: '取余，返回两数相除的余数' },
    ],
  },
  {
    id: 'conditional',
    name: '条件函数',
    icon: '🔀',
    functions: [
      { name: 'IF', syntax: 'IF(logical_test, value_if_true, [value_if_false])', desc: '条件判断，根据条件返回不同值' },
      { name: 'IFS', syntax: 'IFS(condition1, value1, [condition2, value2], ...)', desc: '多条件判断，依次检查多个条件' },
      { name: 'IFERROR', syntax: 'IFERROR(value, value_if_error)', desc: '错误处理，公式出错时返回指定值' },
      { name: 'SWITCH', syntax: 'SWITCH(expression, case1, result1, [case2, result2], ..., [default])', desc: '多值匹配，根据表达式值返回对应结果' },
      { name: 'AND', syntax: 'AND(logical1, [logical2], ...)', desc: '逻辑与，所有条件都为真时返回真' },
      { name: 'OR', syntax: 'OR(logical1, [logical2], ...)', desc: '逻辑或，任一条件为真时返回真' },
      { name: 'NOT', syntax: 'NOT(logical)', desc: '逻辑非，对逻辑值取反' },
    ],
  },
  {
    id: 'lookup',
    name: '查找函数',
    icon: '🔍',
    functions: [
      { name: 'VLOOKUP', syntax: 'VLOOKUP(lookup_value, table_array, col_index, [range_lookup])', desc: '垂直查找，在表格中按列查找数据' },
      { name: 'HLOOKUP', syntax: 'HLOOKUP(lookup_value, table_array, row_index, [range_lookup])', desc: '水平查找，在表格中按行查找数据' },
      { name: 'XLOOKUP', syntax: 'XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found])', desc: '智能查找，支持任意方向查找' },
      { name: 'INDEX', syntax: 'INDEX(array, row_num, [col_num])', desc: '索引，返回指定位置的数据' },
      { name: 'MATCH', syntax: 'MATCH(lookup_value, lookup_array, [match_type])', desc: '匹配，返回值在数组中的位置' },
      { name: 'FILTER', syntax: 'FILTER(array, include, [if_empty])', desc: '筛选，按条件筛选数据' },
      { name: 'UNIQUE', syntax: 'UNIQUE(array, [by_col], [exactly_once])', desc: '去重，返回唯一值列表' },
    ],
  },
  {
    id: 'text',
    name: '文本函数',
    icon: '📝',
    functions: [
      { name: 'CONCATENATE', syntax: 'CONCATENATE(text1, [text2], ...)', desc: '文本合并，将多个文本连接成一个' },
      { name: 'TEXTJOIN', syntax: 'TEXTJOIN(delimiter, ignore_empty, text1, ...)', desc: '带分隔符合并，用指定字符连接文本' },
      { name: 'LEFT', syntax: 'LEFT(text, [num_chars])', desc: '左侧取字，从文本左边提取字符' },
      { name: 'RIGHT', syntax: 'RIGHT(text, [num_chars])', desc: '右侧取字，从文本右边提取字符' },
      { name: 'MID', syntax: 'MID(text, start_num, num_chars)', desc: '中间取字，提取文本中间指定字符' },
      { name: 'LEN', syntax: 'LEN(text)', desc: '文本长度，返回文本的字符数' },
      { name: 'TRIM', syntax: 'TRIM(text)', desc: '去除空格，删除文本中的多余空格' },
      { name: 'UPPER', syntax: 'UPPER(text)', desc: '转大写，将文本转换为大写' },
      { name: 'LOWER', syntax: 'LOWER(text)', desc: '转小写，将文本转换为小写' },
      { name: 'SUBSTITUTE', syntax: 'SUBSTITUTE(text, old_text, new_text, [instance_num])', desc: '文本替换，替换文本中的指定内容' },
    ],
  },
  {
    id: 'date',
    name: '日期函数',
    icon: '📅',
    functions: [
      { name: 'TODAY', syntax: 'TODAY()', desc: '当前日期，返回今天的日期' },
      { name: 'NOW', syntax: 'NOW()', desc: '当前时间，返回当前的日期和时间' },
      { name: 'DATE', syntax: 'DATE(year, month, day)', desc: '构建日期，用年、月、日构建日期' },
      { name: 'YEAR', syntax: 'YEAR(date)', desc: '年份，提取日期中的年份' },
      { name: 'MONTH', syntax: 'MONTH(date)', desc: '月份，提取日期中的月份' },
      { name: 'DAY', syntax: 'DAY(date)', desc: '日期，提取日期中的日' },
      { name: 'DATEDIF', syntax: 'DATEDIF(start_date, end_date, unit)', desc: '日期间差，计算两个日期之间的间隔' },
      { name: 'EOMONTH', syntax: 'EOMONTH(start_date, months)', desc: '月末日期，返回指定月数后的月末日期' },
    ],
  },
  {
    id: 'statistical',
    name: '统计函数',
    icon: '📊',
    functions: [
      { name: 'COUNTIF', syntax: 'COUNTIF(range, criteria)', desc: '条件计数，统计满足条件的单元格数' },
      { name: 'COUNTIFS', syntax: 'COUNTIFS(criteria_range1, criteria1, ...)', desc: '多条件计数，统计满足多个条件的单元格数' },
      { name: 'SUMIF', syntax: 'SUMIF(range, criteria, [sum_range])', desc: '条件求和，统计满足条件的数值总和' },
      { name: 'SUMIFS', syntax: 'SUMIFS(sum_range, criteria_range1, criteria1, ...)', desc: '多条件求和，按多个条件求和' },
      { name: 'AVERAGEIF', syntax: 'AVERAGEIF(range, criteria, [average_range])', desc: '条件平均，统计满足条件的平均值' },
      { name: 'LARGE', syntax: 'LARGE(array, k)', desc: '第k大值，返回数组中第k大的值' },
      { name: 'SMALL', syntax: 'SMALL(array, k)', desc: '第k小值，返回数组中第k小的值' },
      { name: 'RANK', syntax: 'RANK(number, ref, [order])', desc: '排名，返回数值在参考范围中的排名' },
      { name: 'STDEV', syntax: 'STDEV(number1, [number2], ...)', desc: '标准差，计算样本标准差' },
      { name: 'VAR', syntax: 'VAR(number1, [number2], ...)', desc: '方差，计算样本方差' },
    ],
  },
];

// 常用公式模板
const FORMULA_TEMPLATES = [
  { category: '数据统计', templates: [
    { title: '统计唯一值数量', formula: '=ROWS(UNIQUE(A:A))', desc: '统计A列中有多少个不重复的值' },
    { title: '统计非空单元格', formula: '=COUNTA(A:A)', desc: '统计A列中非空单元格的数量' },
    { title: '计算百分比', formula: '=A1/SUM(A:A)', desc: '计算A1占A列总和的百分比' },
    { title: '计算环比增长率', formula: '=(B2-B1)/B1', desc: '计算B列相邻单元格的增长率' },
    { title: '计算同比增长率', formula: '=(B2-B13)/B13', desc: '计算B列与12个月前的同比增长率' },
  ]},
  { category: '条件判断', templates: [
    { title: '按分数评级', formula: '=IF(A1>=90,"优",IF(A1>=80,"良",IF(A1>=60,"及格","不及格")))', desc: '根据分数自动评定等级' },
    { title: '标记达标数据', formula: '=IF(A1>=100,"✓达标","✗未达标")', desc: '标记数值是否达到标准' },
    { title: '计算奖金', formula: '=IF(A1>=10000,A1*0.1,IF(A1>=5000,A1*0.05,0))', desc: '根据业绩计算奖金比例' },
    { title: '判断星期几', formula: '=TEXT(A1,"aaaa")', desc: '将日期转换为星期几的文字' },
    { title: '计算工作日', formula: '=NETWORKDAYS(A1,B1)', desc: '计算两个日期之间的工作日天数' },
  ]},
  { category: '文本处理', templates: [
    { title: '合并文本', formula: '=A1&"-"&B1', desc: '用短横线连接A1和B1' },
    { title: '提取姓名', formula: '=LEFT(A1,FIND(" ",A1)-1)', desc: '从"姓名 手机号"格式中提取姓名' },
    { title: '提取手机号', formula: '=RIGHT(A1,11)', desc: '从字符串右侧提取11位手机号' },
    { title: '清除空格', formula: '=TRIM(A1)', desc: '删除文本中多余的空格' },
    { title: '大写转换', formula: '=UPPER(A1)', desc: '将文本转换为全大写' },
  ]},
  { category: '日期计算', templates: [
    { title: '计算年龄', formula: '=DATEDIF(A1,TODAY(),"Y")', desc: '根据出生日期计算周岁年龄' },
    { title: '计算工龄', formula: '=DATEDIF(A1,TODAY(),"M")&"个月"', desc: '计算入职到现在的月数' },
    { title: '判断是否到期', formula: '=IF(A1<TODAY(),"已过期","在有效期内")', desc: '判断日期是否已过期' },
    { title: '计算剩余天数', formula: '=A1-TODAY()', desc: '计算距离目标日期还剩多少天' },
    { title: '月末日期', formula: '=EOMONTH(A1,0)', desc: '返回A1所在月份的最后一天' },
  ]},
];

export function AIFormulaGenerator({ data, modelConfig, onApplyFormula }: AIFormulaGeneratorProps) {
  const [requirement, setRequirement] = useState('');
  const [generatedFormula, setGeneratedFormula] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [targetColumn, setTargetColumn] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // 搜索函数
  const filteredFunctions = searchQuery
    ? FUNCTION_CATEGORIES.map(cat => ({
        ...cat,
        functions: cat.functions.filter(f => 
          f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.desc.includes(searchQuery)
        ),
      })).filter(cat => cat.functions.length > 0)
    : selectedCategory
      ? FUNCTION_CATEGORIES.filter(cat => cat.id === selectedCategory)
      : FUNCTION_CATEGORIES;

  const handleGenerate = async () => {
    if (!requirement.trim()) return;
    if (!modelConfig) {
      setError('请先配置AI模型');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedFormula('');
    setExplanation('');

    try {
      const response = await fetch('/api/ai-formula', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requirement: requirement.trim(),
          headers: data.headers,
          sampleRows: data.rows.slice(0, 3),
          modelConfig,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || '生成失败');
      }

      const result = await response.json();
      if (result.success) {
        setGeneratedFormula(result.data.formula);
        setExplanation(result.data.explanation);
      } else {
        throw new Error(result.error || '生成失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedFormula);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (!targetColumn.trim()) return;
    onApplyFormula?.(generatedFormula, targetColumn.trim());
    setShowApplyDialog(false);
    setTargetColumn('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-primary" />
            智能公式
          </h3>
          <p className="text-sm text-muted-foreground">
            用自然语言描述需求，AI自动生成标准表格公式
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="generate" className="flex-1">
            <Wand2 className="w-3.5 h-3.5 mr-1" />
            AI生成
          </TabsTrigger>
          <TabsTrigger value="functions" className="flex-1">
            <Calculator className="w-3.5 h-3.5 mr-1" />
            函数库
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex-1">
            <Sparkles className="w-3.5 h-3.5 mr-1" />
            模板
          </TabsTrigger>
          <TabsTrigger value="examples" className="flex-1">
            <Lightbulb className="w-3.5 h-3.5 mr-1" />
            示例
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  描述你的计算需求
                </label>
                <Textarea
                  value={requirement}
                  onChange={e => setRequirement(e.target.value)}
                  placeholder="例如：统计A列中状态为已完成的记录数；如果销售额大于10000，提成比例按10%计算..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                可用列：{data.headers.join('、')}
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading || !requirement.trim()}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    正在生成公式...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    生成公式
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {generatedFormula && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    生成的公式
                  </h4>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="p-3 bg-background rounded-lg font-mono text-sm border">
                  {generatedFormula}
                </div>

                {explanation && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-muted-foreground">公式解释</h5>
                    <p className="text-sm">{explanation}</p>
                  </div>
                )}

                <Button
                  onClick={() => setShowApplyDialog(true)}
                  className="w-full"
                >
                  <Check className="w-4 h-4 mr-2" />
                  采纳并应用
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* 函数库 */}
        <TabsContent value="functions" className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="搜索函数..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>
          
          {!searchQuery && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                全部
              </Button>
              {FUNCTION_CATEGORIES.map(cat => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                >
                  {cat.icon} {cat.name}
                </Button>
              ))}
            </div>
          )}

          <ScrollArea className="h-[400px]">
            <div className="space-y-4 pr-4">
              {filteredFunctions.map(cat => (
                <div key={cat.id}>
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <span>{cat.icon}</span> {cat.name}
                  </h4>
                  <div className="grid gap-2">
                    {cat.functions.map(fn => (
                      <Card key={fn.name} className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
                        setRequirement(`使用${fn.name}函数：${fn.desc}`);
                      }}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-1">
                            <code className="text-sm font-mono font-medium text-primary">{fn.name}()</code>
                            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={e => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(fn.syntax);
                            }}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-xs font-mono text-muted-foreground mb-1">{fn.syntax}</p>
                          <p className="text-xs text-muted-foreground">{fn.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
              {filteredFunctions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>未找到匹配的函数</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* 公式模板 */}
        <TabsContent value="templates" className="space-y-4">
          <ScrollArea className="h-[450px]">
            <div className="space-y-6 pr-4">
              {FORMULA_TEMPLATES.map(cat => (
                <div key={cat.category}>
                  <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {cat.category}
                  </h4>
                  <div className="space-y-2">
                    {cat.templates.map((tmpl, idx) => (
                      <Card key={idx} className="cursor-pointer hover:border-primary transition-colors" onClick={() => {
                        setRequirement(tmpl.desc);
                        setGeneratedFormula(tmpl.formula);
                        setExplanation(tmpl.desc);
                      }}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-1">
                            <p className="text-sm font-medium">{tmpl.title}</p>
                            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={e => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(tmpl.formula);
                            }}>
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="p-2 bg-muted rounded font-mono text-xs mb-1">
                            {tmpl.formula}
                          </div>
                          <p className="text-xs text-muted-foreground">{tmpl.desc}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="examples">
          <div className="space-y-3">
            {FORMULA_EXAMPLES.map(example => (
              <Card
                key={example.id}
                className="cursor-pointer hover:border-primary transition-colors"
                onClick={() => {
                  setRequirement(example.description);
                }}
              >
                <CardContent className="p-4">
                  <p className="font-medium text-sm mb-2">{example.description}</p>
                  <div className="p-2 bg-muted rounded font-mono text-xs mb-2">
                    {example.formula}
                  </div>
                  <p className="text-xs text-muted-foreground">{example.explanation}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* 应用对话框 */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>应用公式</DialogTitle>
            <DialogDescription>
              选择要应用公式的目标列
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">公式</label>
              <div className="p-2 bg-muted rounded font-mono text-sm mt-1">
                {generatedFormula}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">目标列</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.headers.map(header => (
                  <button
                    key={header}
                    onClick={() => setTargetColumn(header)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm border transition-colors',
                      targetColumn === header
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted'
                    )}
                  >
                    {header}
                  </button>
                ))}
              </div>
              {targetColumn === '' && (
                <p className="text-xs text-destructive mt-1">请选择目标列</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              取消
            </Button>
            <Button onClick={handleApply} disabled={!targetColumn}>
              确认应用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
