'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Spreadsheet } from '@/components/spreadsheet/Spreadsheet';
import { ExecutionPanel, SkillCard } from '@/components/skills/ExecutionPanel';
import type { ParsedData } from '@/lib/data-processor';
import type { CellRef } from '@/components/spreadsheet/Spreadsheet';
import type { SkillDefinition, LogEntry, ExecutionResult } from '@/lib/skills/registry';
import type { ProblemReport } from '@/lib/algorithms/problem-detector';
import { SKILL_REGISTRY } from '@/lib/skills/registry';
import { skillExecutor } from '@/lib/skills/executor';
import { classifyIntent, type ParsedIntent } from '@/lib/skills/intent/classifier';
import { detectProblems } from '@/lib/algorithms/problem-detector';
import { exportManager, EXPORT_PRESETS } from '@/lib/export/manager';
import { SessionManager, OperationBuilder } from '@/lib/session-manager';
import { promptOptimizer, matchScenario, type Scenario } from '@/lib/prompts/scenario-templates';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Undo2,
  Redo2,
  Settings,
  HelpCircle,
  ChevronDown,
  X,
  Loader2,
} from 'lucide-react';

interface SpreadsheetAgentPageProps {
  className?: string;
}

type ViewMode = 'table' | 'analysis' | 'export';

export function SpreadsheetAgentPage({ className }: SpreadsheetAgentPageProps) {
  const { t } = useI18n();
  const [data, setData] = useState<ParsedData | null>(null);
  const [originalData, setOriginalData] = useState<ParsedData | null>(null);
  const [problemReport, setProblemReport] = useState<ProblemReport | null>(null);
  const [executionLogs, setExecutionLogs] = useState<LogEntry[]>([]);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellRef | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<SkillDefinition | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [scenario, setScenario] = useState<Scenario>('general');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [showSkillPanel, setShowSkillPanel] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [freeModeInput, setFreeModeInput] = useState('');
  const [operationDescription, setOperationDescription] = useState<string>('');
  const [sessionManager] = useState(() => new SessionManager());

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      const sessionData = sessionManager.getLatestSnapshot()?.data;
      if (!sessionData) {
        sessionManager.createSnapshotBeforeOperation(data, '初始数据');
      }
    }
  }, [data, sessionManager]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(e.target?.result, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          alert('文件数据不足，至少需要一行表头和一行数据');
          return;
        }

        const headers = jsonData[0].map(String);
        const rows = jsonData.slice(1).map((row) => {
          const rowObj: Record<string, unknown> = {};
          headers.forEach((header: string, i: number) => {
            const cellValue = row[i];
            if (typeof cellValue === 'string' && cellValue.trim() === '') {
              rowObj[header] = null;
            } else {
              rowObj[header] = cellValue;
            }
          });
          return rowObj;
        });

        const parsedData: ParsedData = {
          headers,
          rows: rows as ParsedData['rows'],
          fileName: file.name,
          rowCount: rows.length,
          columnCount: headers.length,
        };

        setData(parsedData);
        setOriginalData(JSON.parse(JSON.stringify(parsedData)));
        sessionManager.reset(parsedData);
        sessionManager.createSnapshotBeforeOperation(parsedData, '导入数据');

        const detectedScenario = matchScenario(JSON.stringify(headers)) || 'general';
        setScenario(detectedScenario);

        const problems = detectProblems(parsedData);
        setProblemReport(problems);

        setExecutionLogs([]);
        setExecutionResult(null);
      } catch (error) {
        console.error('文件解析失败:', error);
        alert('文件解析失败，请确保是有效的 Excel 或 CSV 文件');
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }, [sessionManager]);

  const handleSkillSelect = useCallback((skill: SkillDefinition) => {
    setSelectedSkill(skill);
    setNeedsConfirmation(
      skill.execution.requiresConfirmation === true ||
      (skill.execution.requiresConfirmation === 'complex_only' && skill.execution.steps.length > 3)
    );
  }, []);

  const executeSkill = useCallback(async (skill: SkillDefinition, params?: Record<string, unknown>) => {
    if (!data) return;

    setIsExecuting(true);
    setExecutionLogs([]);
    setOperationDescription(`正在执行 ${skill.name}...`);

    const beforeSnapshotId = sessionManager.createSnapshotBeforeOperation(data, `执行 ${skill.name} 前`);

    const skillContext = {
      originalData,
      currentData: data,
      problemReport: problemReport || undefined,
      sessionId: sessionManager.getSessionInfo().sessionId,
      timestamp: Date.now(),
      scenario,
      operationSnapshot: beforeSnapshotId,
    };

    try {
      const result = await skillExecutor.execute(
        skill,
        skillContext,
        params,
        (logs: LogEntry[]) => setExecutionLogs([...logs]),
        () => false
      );

      setExecutionResult(result);

      if (result.newData) {
        const operation = OperationBuilder.create()
          .type('skill_execution')
          .description(`${skill.name}: ${result.summary || '执行完成'}`)
          .skill(skill)
          .beforeSnapshot(beforeSnapshotId)
          .afterSnapshot(sessionManager.createSnapshotBeforeOperation(result.newData, `${skill.name} 执行后`))
          .params(params || {})
          .reversible(true)
          .result(result)
          .logs(result.log)
          .build();

        sessionManager.recordOperation(operation);
        setData(result.newData);
        setOperationDescription(result.summary || `${skill.name} 执行完成`);

        if (skill.id === 'problem-detection') {
          setProblemReport(detectProblems(result.newData));
        }
      }
    } catch (error) {
      console.error('Skill 执行失败:', error);
      setExecutionResult({
        success: false,
        status: 'failed',
        log: executionLogs,
        error: error instanceof Error ? error.message : '未知错误',
      });
      setOperationDescription('执行失败');
    } finally {
      setIsExecuting(false);
    }
  }, [data, originalData, problemReport, scenario, sessionManager, executionLogs]);

  const handleSkillConfirm = useCallback(() => {
    if (selectedSkill) {
      executeSkill(selectedSkill);
      setNeedsConfirmation(false);
    }
  }, [selectedSkill, executeSkill]);

  const handleSkillCancel = useCallback(() => {
    setSelectedSkill(null);
    setNeedsConfirmation(false);
  }, []);

  const handleUndo = useCallback(() => {
    const result = sessionManager.undo();
    if (result.success && result.snapshotId) {
      const snapshot = sessionManager.getSnapshot(result.snapshotId);
      if (snapshot) {
        setData(snapshot.data);
        setOperationDescription('已撤销上一步操作');
      }
    } else {
      alert(result.error || '撤销失败');
    }
  }, [sessionManager]);

  const handleRedo = useCallback(() => {
    const result = sessionManager.redo();
    if (result.success && result.snapshotId) {
      const snapshot = sessionManager.getSnapshot(result.snapshotId);
      if (snapshot) {
        setData(snapshot.data);
        setOperationDescription('已重做操作');
      }
    } else {
      alert(result.error || '重做失败');
    }
  }, [sessionManager]);

  const handleFreeModeSubmit = useCallback(async () => {
    if (!freeModeInput.trim() || !data) return;

    const intent: ParsedIntent = classifyIntent(freeModeInput, data);

    if (intent.needsClarification && intent.clarificationQuestion) {
      alert(intent.clarificationQuestion);
      return;
    }

    if (intent.skillId) {
      const skill = SKILL_REGISTRY.find((s) => s.id === intent.skillId);
      if (skill) {
        setSelectedSkill(skill);
        if (skill.execution.requiresConfirmation) {
          setNeedsConfirmation(true);
        } else {
          await executeSkill(skill, intent.params);
        }
      }
    } else if (intent.type === 'unknown') {
      alert(`无法理解指令：${freeModeInput}\n\n请尝试使用更明确的描述，如"筛选销售额大于10000"或"删除空行"`);
    }

    setFreeModeInput('');
  }, [freeModeInput, data, executeSkill]);

  const handleExport = useCallback(async (format: 'csv' | 'xlsx' | 'json') => {
    if (!data) return;

    const result = await exportManager.export(data, { format });
    if (result.success && result.downloadUrl) {
      exportManager.download(result);
      setShowExportPanel(false);
    } else {
      alert(result.error || '导出失败');
    }
  }, [data]);

  const handleReset = useCallback(() => {
    if (originalData) {
      const confirmed = confirm('确定要重置数据吗？所有未保存的更改将丢失。');
      if (confirmed) {
        setData(JSON.parse(JSON.stringify(originalData)));
        sessionManager.reset(originalData);
        sessionManager.createSnapshotBeforeOperation(originalData, '重置数据');
        setExecutionLogs([]);
        setExecutionResult(null);
        setOperationDescription('数据已重置');
      }
    }
  }, [originalData, sessionManager]);

  const canUndo = sessionManager.canUndo();
  const canRedo = sessionManager.canRedo();

  const recommendedSkills = problemReport?.problems
    .filter((p) => p.autoFixable)
    .map((p) => {
      if (p.type === 'duplicate_rows') return SKILL_REGISTRY.find((s) => s.id === 'data-deduplication');
      if (p.type === 'empty_rows' || p.type === 'empty_columns') return SKILL_REGISTRY.find((s) => s.id === 'one-click-clean');
      return SKILL_REGISTRY.find((s) => s.id === 'one-click-format');
    })
    .filter(Boolean) as SkillDefinition[];

  return (
    <div className={cn('flex flex-col h-full bg-muted/30', className)}>
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-blue-600" />
            <h1 className="text-lg font-semibold">DataInsight AI表格智能体</h1>
          </div>
          {scenario !== 'general' && (
            <span className={cn(
              'px-2 py-0.5 text-xs rounded',
              scenario === 'retail' && 'bg-orange-100 text-orange-700',
              scenario === 'finance' && 'bg-green-100 text-green-700',
              scenario === 'hr' && 'bg-purple-100 text-purple-700',
            )}>
              {scenario === 'retail' ? '零售' : scenario === 'finance' ? '财务' : '人力资源'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {data && (
            <>
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-muted/30',
                  canUndo ? 'text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'
                )}
                title={sessionManager.getUndoDescription() || '撤销'}
              >
                <Undo2 className="w-4 h-4" />
                撤销
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 text-sm border rounded hover:bg-muted/30',
                  canRedo ? 'text-foreground' : 'text-muted-foreground/50 cursor-not-allowed'
                )}
                title={sessionManager.getRedoDescription() || '重做'}
              >
                <Redo2 className="w-4 h-4" />
                重做
              </button>
              <div className="w-px h-6 bg-border" />
            </>
          )}

          <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">
            <Upload className="w-4 h-4" />
            <span>上传文件</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {data && (
            <>
              <button
                onClick={() => setShowExportPanel(!showExportPanel)}
                className="flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-muted/30"
              >
                <Download className="w-4 h-4" />
                导出
                <ChevronDown className="w-3 h-3" />
              </button>

              <button
                onClick={handleReset}
                className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded"
                title="重置数据"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {showExportPanel && data && (
        <div className="absolute right-4 top-16 z-30 bg-white rounded-md border shadow-lg p-4 w-72">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">导出数据</h3>
            <button onClick={() => setShowExportPanel(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            {EXPORT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleExport(preset.options.format as 'csv' | 'xlsx' | 'json')}
                className="w-full p-3 text-left border rounded-md hover:bg-muted/30"
              >
                <div className="font-medium text-sm">{preset.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{preset.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {data ? (
          <>
            <main className="flex-1 flex flex-col overflow-hidden p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex rounded-md border overflow-hidden">
                    {(['table', 'analysis', 'export'] as ViewMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setViewMode(mode)}
                        className={cn(
                          'px-4 py-1.5 text-sm',
                          viewMode === mode
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-foreground hover:bg-muted/30'
                        )}
                      >
                        {mode === 'table' ? '数据表' : mode === 'analysis' ? '问题分析' : '导出'}
                      </button>
                    ))}
                  </div>

                  {problemReport && (
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'px-2 py-0.5 text-xs rounded font-medium',
                        problemReport.grade === 'A' && 'bg-green-100 text-green-700',
                        problemReport.grade === 'B' && 'bg-blue-100 text-blue-700',
                        problemReport.grade === 'C' && 'bg-yellow-100 text-yellow-700',
                        problemReport.grade === 'D' && 'bg-orange-100 text-orange-700',
                        problemReport.grade === 'F' && 'bg-red-100 text-red-700',
                      )}>
                        健康度: {problemReport.grade} ({problemReport.totalScore}/100)
                      </span>
                      {problemReport.problems.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          发现 {problemReport.problems.length} 个问题
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="text-sm text-muted-foreground">
                  {data.headers.length} 列 × {data.rows.length} 行
                  {data.fileName && <span className="ml-2">| {data.fileName}</span>}
                </div>
              </div>

              {viewMode === 'table' && (
                <div className="flex-1 overflow-hidden">
                  <Spreadsheet
                    data={data}
                    onChange={(newData) => {
                      setData(newData);
                      sessionManager.createSnapshotBeforeOperation(newData, '手动编辑');
                    }}
                    selectedCell={selectedCell}
                    onCellSelect={setSelectedCell}
                    showToolbar
                    showFooter
                    pageSize={50}
                  />
                </div>
              )}

              {viewMode === 'analysis' && problemReport && (
                <div className="flex-1 overflow-auto">
                  <div className="bg-white rounded-md border p-4">
                    <h2 className="text-lg font-medium mb-4">数据健康度报告</h2>

                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="p-4 bg-muted/30 rounded-md text-center">
                        <div className="text-2xl font-bold text-blue-600">{problemReport.totalScore}</div>
                        <div className="text-sm text-muted-foreground">健康度得分</div>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-md text-center">
                        <div className="text-2xl font-bold text-green-600">{problemReport.statistics.totalRows}</div>
                        <div className="text-sm text-muted-foreground">数据行数</div>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-md text-center">
                        <div className="text-2xl font-bold text-orange-600">{problemReport.problems.length}</div>
                        <div className="text-sm text-muted-foreground">发现问题</div>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-md text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {problemReport.problems.filter(p => p.autoFixable).length}
                        </div>
                        <div className="text-sm text-muted-foreground">可自动修复</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {problemReport.problems.map((problem, index) => (
                        <div
                          key={index}
                          className={cn(
                            'p-4 rounded-md border',
                            problem.severity === 'critical' && 'bg-red-50 border-red-200',
                            problem.severity === 'high' && 'bg-orange-50 border-orange-200',
                            problem.severity === 'medium' && 'bg-yellow-50 border-yellow-200',
                            problem.severity === 'low' && 'bg-blue-50 border-blue-200',
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-medium">{problem.title}</h3>
                              <p className="text-sm text-foreground mt-1">{problem.description}</p>
                            </div>
                            {problem.autoFixable && (
                              <button
                                onClick={() => {
                                  const skill = SKILL_REGISTRY.find(s => s.id === problem.type.replace(/_/g, '-'));
                                  if (skill) {
                                    handleSkillSelect(skill);
                                  }
                                }}
                                className="px-3 py-1 text-sm bg-white border rounded hover:bg-muted/30"
                              >
                                一键修复
                              </button>
                            )}
                          </div>
                          {problem.suggestions.length > 0 && (
                            <div className="mt-2 text-sm text-muted-foreground">
                              建议: {problem.suggestions[0]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {problemReport.recommendations.length > 0 && (
                      <div className="mt-6 p-4 bg-muted/30 rounded-md">
                        <h3 className="font-medium mb-2">优化建议</h3>
                        <ul className="space-y-1">
                          {problemReport.recommendations.map((rec, i) => (
                            <li key={i} className="text-sm text-foreground flex items-start gap-2">
                              <Sparkles className="w-4 h-4 text-blue-500 mt-0.5" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {viewMode === 'export' && (
                <div className="flex-1 overflow-auto">
                  <div className="bg-white rounded-md border p-6">
                    <h2 className="text-lg font-medium mb-4">导出数据</h2>
                    <p className="text-sm text-muted-foreground mb-6">
                      选择导出格式后，数据将下载到您的设备。注意：导出的数据不包含任何隐私追踪信息。
                    </p>

                    <div className="grid grid-cols-3 gap-4">
                      {EXPORT_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => handleExport(preset.options.format as 'csv' | 'xlsx' | 'json')}
                          className="p-4 border rounded-md text-left hover:border-blue-500 hover:bg-blue-50 transition-colors"
                        >
                          <div className="font-medium mb-1">{preset.name}</div>
                          <div className="text-sm text-muted-foreground">{preset.description}</div>
                        </button>
                      ))}
                    </div>

                    <div className="mt-6 p-4 bg-green-50 rounded-md border border-green-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <div className="font-medium text-green-800">隐私保护</div>
                          <div className="text-sm text-green-700 mt-1">
                            所有数据均在本地处理，不会上传到任何服务器。关闭页面后数据将自动销毁。
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <span>{operationDescription}</span>
                {isExecuting && <Loader2 className="w-4 h-4 animate-spin" />}
              </div>
            </main>

            <aside className={cn(
              'w-80 border-l bg-white flex flex-col overflow-hidden transition-all',
              showSkillPanel ? 'flex' : 'w-0 border-l-0'
            )}>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-medium">技能面板</h2>
                  <button
                    onClick={() => setShowSkillPanel(false)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="输入指令，如：筛选、排序、清洗..."
                    value={freeModeInput}
                    onChange={(e) => setFreeModeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleFreeModeSubmit()}
                    className="w-full px-3 py-2 pr-10 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleFreeModeSubmit}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-600"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4 space-y-4">
                {recommendedSkills && recommendedSkills.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">推荐技能</h3>
                    <div className="space-y-2">
                      {recommendedSkills.slice(0, 3).map((skill) => (
                        <SkillCard
                          key={skill!.id}
                          skill={skill!}
                          isSelected={selectedSkill?.id === skill!.id}
                          isRecommended
                          onClick={() => handleSkillSelect(skill!)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">数据处理</h3>
                  <div className="space-y-2">
                    {SKILL_REGISTRY.filter(s => s.category === 'data').map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        isSelected={selectedSkill?.id === skill.id}
                        onClick={() => handleSkillSelect(skill)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">格式化</h3>
                  <div className="space-y-2">
                    {SKILL_REGISTRY.filter(s => s.category === 'format').map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        isSelected={selectedSkill?.id === skill.id}
                        onClick={() => handleSkillSelect(skill)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase mb-2">分析与导出</h3>
                  <div className="space-y-2">
                    {SKILL_REGISTRY.filter(s => ['analysis', 'export'].includes(s.category)).map((skill) => (
                      <SkillCard
                        key={skill.id}
                        skill={skill}
                        isSelected={selectedSkill?.id === skill.id}
                        onClick={() => handleSkillSelect(skill)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {executionLogs.length > 0 && (
                <div className="border-t">
                  <ExecutionPanel
                    skill={selectedSkill || undefined}
                    logs={executionLogs}
                    result={executionResult || undefined}
                    data={data}
                    isExecuting={isExecuting}
                    needsConfirmation={needsConfirmation}
                    onConfirm={handleSkillConfirm}
                    onCancel={handleSkillCancel}
                    onUndo={handleUndo}
                    onExport={handleExport}
                  />
                </div>
              )}
            </aside>

            {!showSkillPanel && (
              <button
                onClick={() => setShowSkillPanel(true)}
                className="absolute right-4 bottom-4 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700"
              >
                <Sparkles className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="text-center">
              <FileSpreadsheet className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-foreground mb-2">上传您的表格文件</h2>
              <p className="text-sm text-muted-foreground mb-6">
                支持 Excel (.xlsx, .xls) 和 CSV 文件
              </p>
              <label className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md cursor-pointer hover:bg-blue-700">
                <Upload className="w-5 h-5" />
                选择文件
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-12 grid grid-cols-3 gap-8 max-w-3xl">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-md flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔍</span>
                </div>
                <h3 className="font-medium mb-1">智能检测</h3>
                <p className="text-xs text-muted-foreground">自动识别数据问题并提供修复建议</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-md flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">⚡</span>
                </div>
                <h3 className="font-medium mb-1">一键处理</h3>
                <p className="text-xs text-muted-foreground">复杂的表格操作一句话就能完成</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-md flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🔒</span>
                </div>
                <h3 className="font-medium mb-1">隐私保护</h3>
                <p className="text-xs text-muted-foreground">数据本地处理，不上传服务器</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {needsConfirmation && selectedSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-md shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium">确认执行 {selectedSkill.name}</h3>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-foreground mb-4">{selectedSkill.description}</p>
              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium">将执行以下 {selectedSkill.execution.steps.length} 个步骤：</div>
                {selectedSkill.execution.steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                      {i + 1}
                    </span>
                    <span>{step.name}</span>
                    {step.estimatedImpact === 'high' && (
                      <span className="text-xs text-red-500">高影响</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={handleSkillCancel}
                className="px-4 py-2 text-sm border rounded hover:bg-muted/30"
              >
                取消
              </button>
              <button
                onClick={handleSkillConfirm}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpreadsheetAgentPage;
