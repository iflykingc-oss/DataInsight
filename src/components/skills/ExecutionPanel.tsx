import React, { useState, useEffect, useCallback } from 'react';
import type { LogEntry, ExecutionResult, SkillDefinition } from '@/lib/skills/registry';
import type { ParsedData } from '@/lib/data-processor';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Loader2,
  Info,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export interface ExecutionPanelProps {
  skill?: SkillDefinition;
  logs: LogEntry[];
  result?: ExecutionResult;
  data?: ParsedData;
  onConfirm?: () => void;
  onCancel?: () => void;
  onUndo?: () => void;
  onExport?: (format: 'csv' | 'xlsx' | 'json') => void;
  isExecuting?: boolean;
  needsConfirmation?: boolean;
  className?: string;
}

type ViewMode = 'steps' | 'changes' | 'preview';
type DetailLevel = 'summary' | 'detailed' | 'verbose';

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  skill,
  logs,
  result,
  data,
  onConfirm,
  onCancel,
  onUndo,
  onExport,
  isExecuting = false,
  needsConfirmation = false,
  className,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('steps');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('detailed');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (needsConfirmation) {
      setShowConfirmation(true);
    }
  }, [needsConfirmation]);

  const toggleStepExpansion = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);

  const getStatusIcon = (status: LogEntry['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-foreground bg-muted/30 border-border';
    }
  };

  const completedSteps = logs.filter((l) => l.status === 'done').length;
  const totalSteps = logs.length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const hasErrors = logs.some((l) => l.status === 'error');
  const hasWarnings = logs.some((l) => l.warning);

  if (showConfirmation && skill) {
    return (
      <ConfirmationDialog
        skill={skill}
        logs={logs}
        data={data}
        onConfirm={() => {
          setShowConfirmation(false);
          onConfirm?.();
        }}
        onCancel={() => {
          setShowConfirmation(false);
          onCancel?.();
        }}
        className={className}
      />
    );
  }

  return (
    <div className={cn('flex flex-col bg-white rounded-lg border shadow-sm', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="font-medium text-sm">
            {skill?.name || '执行面板'}
          </span>
          {isExecuting && (
            <span className="flex items-center gap-1 text-xs text-blue-600">
              <Loader2 className="w-3 h-3 animate-spin" />
              执行中...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden">
            {(['summary', 'detailed', 'verbose'] as DetailLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setDetailLevel(level)}
                className={cn(
                  'px-2 py-1 text-xs',
                  detailLevel === level
                    ? 'bg-blue-500 text-white'
                    : 'bg-white text-foreground hover:bg-muted'
                )}
              >
                {level === 'summary' ? '简' : level === 'detailed' ? '详' : '全'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 px-4 py-2 border-b bg-muted/30/50">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>执行进度</span>
            <span>{completedSteps}/{totalSteps} 步骤</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-300',
                hasErrors ? 'bg-red-500' : isExecuting ? 'bg-blue-500' : 'bg-green-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-2">
            {hasErrors ? (
              <span className="flex items-center gap-1 text-xs text-red-600">
                <XCircle className="w-3 h-3" />
                部分失败
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle className="w-3 h-3" />
                执行成功
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex border-b">
        {(['steps', 'changes', 'preview'] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={cn(
              'flex-1 px-4 py-2 text-sm font-medium transition-colors',
              viewMode === mode
                ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {mode === 'steps' ? '执行步骤' : mode === 'changes' ? '数据变更' : '数据预览'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 max-h-96">
        {viewMode === 'steps' && (
          <ExecutionStepsView
            logs={logs}
            detailLevel={detailLevel}
            expandedSteps={expandedSteps}
            onToggleExpand={toggleStepExpansion}
            getStatusIcon={getStatusIcon}
          />
        )}

        {viewMode === 'changes' && result?.changes && (
          <ChangesView changes={result.changes} />
        )}

        {viewMode === 'preview' && data && (
          <DataPreview data={data} />
        )}
      </div>

      {result && result.summary && (
        <div className="px-4 py-3 border-t bg-muted/30">
          <p className="text-sm text-foreground">{result.summary}</p>
          {result.partialErrors && result.partialErrors.length > 0 && (
            <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
              <p className="text-xs text-red-600 font-medium">部分错误：</p>
              <ul className="text-xs text-red-500 mt-1 space-y-1">
                {result.partialErrors.slice(0, 3).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {result.partialErrors.length > 3 && (
                  <li>...还有 {result.partialErrors.length - 3} 个错误</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30 rounded-b-lg">
        <div className="flex items-center gap-2">
          {hasWarnings && (
            <span className="flex items-center gap-1 text-xs text-yellow-600">
              <AlertTriangle className="w-3 h-3" />
              有警告
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onUndo && result && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-foreground hover:text-foreground hover:bg-muted rounded border transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              撤销
            </button>
          )}

          {onExport && (
            <ExportMenu onExport={onExport} />
          )}
        </div>
      </div>
    </div>
  );
};

interface ExecutionStepsViewProps {
  logs: LogEntry[];
  detailLevel: DetailLevel;
  expandedSteps: Set<string>;
  onToggleExpand: (stepId: string) => void;
  getStatusIcon: (status: LogEntry['status']) => React.ReactNode;
}

const ExecutionStepsView: React.FC<ExecutionStepsViewProps> = ({
  logs,
  detailLevel,
  expandedSteps,
  onToggleExpand,
  getStatusIcon,
}) => {
  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="w-8 h-8 mb-2" />
        <p className="text-sm">暂无执行记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log, index) => (
        <div
          key={log.id}
          className={cn(
            'border rounded-lg overflow-hidden transition-colors',
            log.status === 'error' ? 'border-red-200 bg-red-50' :
            log.status === 'done' ? 'border-green-200 bg-green-50' :
            'border-border bg-white'
          )}
        >
          <div
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted/50"
            onClick={() => onToggleExpand(log.id)}
          >
            {expandedSteps.has(log.id) ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}

            {getStatusIcon(log.status)}

            <span className="text-sm font-medium flex-1">
              {index + 1}. {log.stepName}
            </span>

            {log.duration && (
              <span className="text-xs text-muted-foreground">
                {log.duration}ms
              </span>
            )}

            {log.retryCount && log.retryCount > 0 && (
              <span className="text-xs text-yellow-600">
                重试 {log.retryCount} 次
              </span>
            )}
          </div>

          {expandedSteps.has(log.id) && (
            <div className="px-4 py-3 bg-white border-t">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">操作：</span>
                  <span className="text-foreground">{log.action}</span>
                </div>

                {log.detail && (
                  <div>
                    <span className="text-muted-foreground">详情：</span>
                    <span className="text-foreground">{log.detail}</span>
                  </div>
                )}

                {log.error && detailLevel !== 'summary' && (
                  <div className="p-2 bg-red-50 rounded border border-red-200">
                    <span className="text-red-600 font-medium">错误：</span>
                    <span className="text-red-500">{log.error}</span>
                  </div>
                )}

                {log.warning && (
                  <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
                    <span className="text-yellow-600 font-medium">警告：</span>
                    <span className="text-yellow-600">{log.warning}</span>
                  </div>
                )}

                {detailLevel === 'verbose' && log.dataSnapshot && (
                  <div className="p-2 bg-muted/30 rounded border border-border">
                    <span className="text-muted-foreground">数据快照：</span>
                    <code className="text-xs text-foreground block mt-1 whitespace-pre-wrap">
                      {log.dataSnapshot}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface ChangesViewProps {
  changes?: ExecutionResult['changes'];
}

const ChangesView: React.FC<ChangesViewProps> = ({ changes }) => {
  if (!changes || changes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CheckCircle className="w-8 h-8 mb-2" />
        <p className="text-sm">暂无数据变更</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change, index) => (
        <div
          key={index}
          className="p-3 bg-blue-50 rounded-lg border border-blue-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={cn(
              'px-2 py-0.5 text-xs rounded',
              change.type === 'rows' ? 'bg-purple-100 text-purple-700' :
              change.type === 'columns' ? 'bg-blue-100 text-blue-700' :
              change.type === 'cells' ? 'bg-green-100 text-green-700' :
              'bg-muted text-foreground'
            )}>
              {change.type === 'rows' ? '行' :
               change.type === 'columns' ? '列' :
               change.type === 'cells' ? '单元格' : '数据'}
            </span>
            <span className="text-sm font-medium">{change.description}</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              变更前：<span className="text-red-600 font-medium">{change.before}</span>
            </span>
            <span className="text-muted-foreground/50">→</span>
            <span className="text-muted-foreground">
              变更后：<span className="text-green-600 font-medium">{change.after}</span>
            </span>
          </div>

          {change.affectedRows && change.affectedRows.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              影响行数：{change.affectedRows.length} 行
              {change.affectedRows.length <= 5 && (
                <span className="ml-2">
                  (行号: {change.affectedRows.map(r => r + 1).join(', ')})
                </span>
              )}
            </div>
          )}

          {change.affectedCols && change.affectedCols.length > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              影响列：{change.affectedCols.join(', ')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface DataPreviewProps {
  data: ParsedData;
}

const DataPreview: React.FC<DataPreviewProps> = ({ data }) => {
  const previewRows = data.rows.slice(0, 5);
  const hasMoreRows = data.rows.length > 5;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Info className="w-4 h-4 text-blue-500" />
        <span className="text-sm text-foreground">
          数据预览：{data.rows.length} 行 × {data.headers.length} 列
        </span>
        {hasMoreRows && (
          <span className="text-xs text-muted-foreground">
            (显示前 5 行)
          </span>
        )}
      </div>

      <div className="overflow-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              {data.headers.map((header) => (
                <th
                  key={header}
                  className="px-3 py-2 text-left font-medium text-foreground border-b"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-muted/30">
                {data.headers.map((header) => (
                  <td
                    key={header}
                    className="px-3 py-2 text-foreground border-b"
                  >
                    {String(row[header] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface ExportMenuProps {
  onExport: (format: 'csv' | 'xlsx' | 'json') => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ onExport }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 text-sm text-foreground hover:text-foreground hover:bg-muted rounded border transition-colors"
      >
        导出
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-1 w-32 bg-white rounded border shadow-lg z-20">
            <button
              onClick={() => { onExport('csv'); setIsOpen(false); }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted rounded-t"
            >
              CSV 格式
            </button>
            <button
              onClick={() => { onExport('xlsx'); setIsOpen(false); }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted"
            >
              Excel 格式
            </button>
            <button
              onClick={() => { onExport('json'); setIsOpen(false); }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-muted rounded-b"
            >
              JSON 格式
            </button>
          </div>
        </>
      )}
    </div>
  );
};

interface ConfirmationDialogProps {
  skill: SkillDefinition;
  logs: LogEntry[];
  data?: ParsedData;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  skill,
  logs,
  data,
  onConfirm,
  onCancel,
  className,
}) => {
  const highImpactSteps = skill.execution.steps.filter((s) => s.estimatedImpact === 'high');
  const totalImpact = skill.execution.steps.reduce((sum, s) => {
    if (s.estimatedImpact === 'high') return sum + 3;
    if (s.estimatedImpact === 'medium') return sum + 2;
    return sum + 1;
  }, 0);

  return (
    <div className={cn('bg-white rounded-lg border shadow-lg', className)}>
      <div className="px-4 py-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          <span className="font-medium">确认执行 {skill.name}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <p className="text-sm text-foreground mb-2">{skill.description}</p>
        </div>

        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="text-sm font-medium mb-2">执行步骤（共 {skill.execution.steps.length} 步）：</div>
          <ul className="space-y-1 text-sm text-foreground">
            {skill.execution.steps.map((step, index) => (
              <li key={step.id} className="flex items-center gap-2">
                <span className="text-muted-foreground">{index + 1}.</span>
                <span>{step.name}</span>
                {step.estimatedImpact === 'high' && (
                  <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded">
                    高影响
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        {highImpactSteps.length > 0 && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">注意事项</p>
                <p className="text-yellow-700 mt-1">
                  此操作包含 {highImpactSteps.length} 个高影响步骤，可能导致数据显著变化。
                </p>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="text-sm text-muted-foreground">
            当前数据：{data.rows.length} 行 × {data.headers.length} 列
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t bg-muted/30 rounded-b-lg">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-foreground hover:text-foreground hover:bg-muted rounded border transition-colors"
        >
          取消
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded border border-blue-600 transition-colors"
        >
          确认执行
        </button>
      </div>
    </div>
  );
};

export interface SkillCardProps {
  skill: SkillDefinition;
  isSelected?: boolean;
  isRecommended?: boolean;
  onClick?: () => void;
  className?: string;
}

export const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  isSelected = false,
  isRecommended = false,
  onClick,
  className,
}) => {
  const categoryColors: Record<string, string> = {
    data: 'bg-blue-100 text-blue-700',
    format: 'bg-purple-100 text-purple-700',
    analysis: 'bg-green-100 text-green-700',
    export: 'bg-orange-100 text-orange-700',
    transform: 'bg-pink-100 text-pink-700',
    validate: 'bg-cyan-100 text-cyan-700',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border cursor-pointer transition-all',
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-border bg-white hover:border-blue-300 hover:shadow-sm',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <span className="text-2xl">{skill.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate">{skill.name}</h3>
            {isRecommended && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                推荐
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{skill.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={cn('px-2 py-0.5 text-xs rounded', categoryColors[skill.category])}>
              {skill.category}
            </span>
            <span className="text-xs text-muted-foreground">
              {skill.execution.steps.length} 步骤
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export interface ToastNotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
  className?: string;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({
  type,
  title,
  message,
  duration = 3000,
  onClose,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 p-4 rounded-lg border shadow-lg z-50 animate-slide-up',
        bgColors[type],
        className
      )}
    >
      <div className="flex items-start gap-3">
        {icons[type]}
        <div className="flex-1">
          <p className="font-medium text-sm">{title}</p>
          {message && (
            <p className="text-sm text-foreground mt-1">{message}</p>
          )}
        </div>
        <button
          onClick={() => { setIsVisible(false); onClose?.(); }}
          className="text-muted-foreground hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>
  );
};
