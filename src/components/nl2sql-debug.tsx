'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, AlertTriangle, CheckCircle, RefreshCw, Bug } from 'lucide-react';

/**
 * NL2SQL 自调试模块 — 参考 airda 的 NL2SQL + self-debug 架构
 * 
 * 核心流程：
 * 1. 自然语言 → SQL 生成
 * 2. SQL 执行验证
 * 3. 错误时自动修复（最多3轮自调试）
 * 4. 返回最终结果 + SQL + 执行日志
 */

interface NL2SQLDebugProps {
  data: {
    headers: string[];
    rows: Record<string, unknown>[];
  };
  modelConfig?: {
    apiKey?: string;
    baseUrl?: string;
    modelName?: string;
  };
  onSQLResult?: (result: SQLDebugResult) => void;
}

interface SQLDebugResult {
  sql: string;
  result: Record<string, unknown>[];
  columns: string[];
  debugLog: DebugStep[];
  success: boolean;
  executionTime: number;
}

interface DebugStep {
  step: number;
  sql: string;
  status: 'generating' | 'executing' | 'error' | 'success' | 'fixing';
  error?: string;
  fixedSQL?: string;
  timestamp: number;
}

export function NL2SQLDebug({ data, modelConfig, onSQLResult }: NL2SQLDebugProps) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([]);
  const [finalResult, setFinalResult] = useState<SQLDebugResult | null>(null);

  const generateAndDebugSQL = useCallback(async () => {
    if (!question.trim() || !data.headers.length) return;
    setLoading(true);
    setDebugSteps([]);
    setFinalResult(null);

    const steps: DebugStep[] = [];
    const MAX_DEBUG_ROUNDS = 3;

    try {
      // Step 1: Generate SQL from natural language
      steps.push({ step: 1, sql: '', status: 'generating', timestamp: Date.now() });
      setDebugSteps([...steps]);

      const genResponse = await fetch('/api/ai-formula', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof window !== 'undefined' && localStorage.getItem('datainsight_token')
            ? { Authorization: `Bearer ${localStorage.getItem('datainsight_token')}` }
            : {}),
        },
        body: JSON.stringify({
          text: `将以下自然语言转为SQL查询语句。表名为 data，列名为：${data.headers.join(', ')}。\n问题：${question}\n只返回SQL语句，不要其他内容。`,
          modelConfig,
        }),
      });

      const genData = await genResponse.json();
      let currentSQL = genData.data?.formula || genData.data?.sql || '';
      // 提取SQL（可能包裹在代码块中）
      const sqlMatch = currentSQL.match(/```(?:sql)?\s*([\s\S]*?)```/);
      if (sqlMatch) currentSQL = sqlMatch[1].trim();

      steps[0].sql = currentSQL;
      steps[0].status = 'executing';
      setDebugSteps([...steps]);

      // Step 2-N: Execute + Self-debug loop
      for (let round = 0; round < MAX_DEBUG_ROUNDS; round++) {
        const startTime = Date.now();

        // Execute SQL via the SQL Lab endpoint
        const execResponse = await fetch('/api/data-story', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(typeof window !== 'undefined' && localStorage.getItem('datainsight_token')
              ? { Authorization: `Bearer ${localStorage.getItem('datainsight_token')}` }
              : {}),
          },
          body: JSON.stringify({
            action: 'execute-sql',
            sql: currentSQL,
            data,
          }),
        });

        const execData = await execResponse.json();
        const executionTime = Date.now() - startTime;

        if (execData.success) {
          // SQL executed successfully
          steps[round].status = 'success';
          setDebugSteps([...steps]);

          const result: SQLDebugResult = {
            sql: currentSQL,
            result: execData.data?.rows || execData.data || [],
            columns: execData.data?.columns || data.headers,
            debugLog: steps.filter(s => s.status !== 'generating'),
            success: true,
            executionTime,
          };
          setFinalResult(result);
          onSQLResult?.(result);
          break;
        } else {
          // SQL execution failed — attempt self-debug
          const errorMsg = execData.error || '执行失败';
          steps[round].status = 'error';
          steps[round].error = errorMsg;
          setDebugSteps([...steps]);

          if (round < MAX_DEBUG_ROUNDS - 1) {
            // Self-debug: ask LLM to fix the SQL
            steps.push({
              step: round + 2,
              sql: '',
              status: 'fixing',
              error: errorMsg,
              timestamp: Date.now(),
            });
            setDebugSteps([...steps]);

            const fixResponse = await fetch('/api/ai-formula', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(typeof window !== 'undefined' && localStorage.getItem('datainsight_token')
                  ? { Authorization: `Bearer ${localStorage.getItem('datainsight_token')}` }
                  : {}),
              },
              body: JSON.stringify({
                text: `以下SQL执行出错，请修复。\n列名：${data.headers.join(', ')}\nSQL：${currentSQL}\n错误：${errorMsg}\n只返回修复后的SQL语句。`,
                modelConfig,
              }),
            });

            const fixData = await fixResponse.json();
            let fixedSQL = fixData.data?.formula || fixData.data?.sql || '';
            const fixedMatch = fixedSQL.match(/```(?:sql)?\s*([\s\S]*?)```/);
            if (fixedMatch) fixedSQL = fixedMatch[1].trim();

            steps[round + 1].sql = fixedSQL;
            steps[round + 1].fixedSQL = fixedSQL;
            steps[round].fixedSQL = fixedSQL;
            currentSQL = fixedSQL;
            setDebugSteps([...steps]);
          } else {
            // Max debug rounds reached
            const result: SQLDebugResult = {
              sql: currentSQL,
              result: [],
              columns: [],
              debugLog: steps,
              success: false,
              executionTime,
            };
            setFinalResult(result);
            onSQLResult?.(result);
          }
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : '未知错误';
      steps.push({ step: steps.length + 1, sql: '', status: 'error', error: errorMsg, timestamp: Date.now() });
      setDebugSteps([...steps]);
      setFinalResult({
        sql: '',
        result: [],
        columns: [],
        debugLog: steps,
        success: false,
        executionTime: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [question, data, modelConfig, onSQLResult]);

  const statusIcon = (status: DebugStep['status']) => {
    switch (status) {
      case 'generating': return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
      case 'executing': return <Database className="h-3.5 w-3.5 text-primary animate-pulse" />;
      case 'error': return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case 'success': return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case 'fixing': return <Bug className="h-3.5 w-3.5 text-amber-500 animate-pulse" />;
    }
  };

  const statusLabel: Record<DebugStep['status'], string> = {
    generating: '生成SQL中...',
    executing: '执行SQL中...',
    error: '执行出错',
    success: '执行成功',
    fixing: '自修复中...',
  };

  return (
    <div className="space-y-4">
      {/* 输入区 */}
      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="用自然语言描述你想查询的数据，例如：查找销售额超过1万的记录"
          className="flex-1 min-h-[60px] resize-none"
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generateAndDebugSQL(); } }}
        />
        <Button onClick={generateAndDebugSQL} disabled={loading || !question.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
        </Button>
      </div>

      {/* 调试日志 */}
      {debugSteps.length > 0 && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5" />
              自调试日志
              <Badge variant="outline" className="text-xs">
                {debugSteps.filter(s => s.status === 'success').length > 0 ? '已解决' : `${debugSteps.length}轮`}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {debugSteps.map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {statusIcon(step.status)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">步骤 {step.step}</span>
                    <Badge variant={step.status === 'success' ? 'default' : step.status === 'error' ? 'destructive' : 'secondary'} className="text-xs px-1.5 py-0">
                      {statusLabel[step.status]}
                    </Badge>
                  </div>
                  {step.sql && (
                    <pre className="mt-1 p-2 bg-muted rounded text-xs font-mono overflow-x-auto max-h-20">
                      {step.sql}
                    </pre>
                  )}
                  {step.error && (
                    <p className="mt-1 text-destructive">{step.error}</p>
                  )}
                  {step.fixedSQL && (
                    <div className="mt-1">
                      <span className="text-amber-500">修复后：</span>
                      <pre className="p-2 bg-muted/50 rounded text-xs font-mono overflow-x-auto max-h-20">
                        {step.fixedSQL}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 结果 */}
      {finalResult && finalResult.success && (
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
              查询结果
              <Badge variant="outline" className="text-xs">
                {finalResult.result.length} 行 · {finalResult.executionTime}ms
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-60">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    {finalResult.columns.map(col => (
                      <th key={col} className="text-left py-1.5 px-2 font-medium text-muted-foreground">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finalResult.result.slice(0, 50).map((row, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {finalResult.columns.map(col => (
                        <td key={col} className="py-1 px-2">{String((row as Record<string, unknown>)[col] ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
