'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export function AIFormulaGenerator({ data, modelConfig, onApplyFormula }: AIFormulaGeneratorProps) {
  const [requirement, setRequirement] = useState('');
  const [generatedFormula, setGeneratedFormula] = useState('');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [targetColumn, setTargetColumn] = useState('');
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [error, setError] = useState('');

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
            AI 生成公式
          </h3>
          <p className="text-sm text-muted-foreground">
            用自然语言描述需求，AI自动生成标准表格公式
          </p>
        </div>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="w-full">
          <TabsTrigger value="generate" className="flex-1">
            <Wand2 className="w-3.5 h-3.5 mr-1" />
            生成公式
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
