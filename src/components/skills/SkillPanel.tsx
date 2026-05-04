import { cn } from '@/lib/utils';
import type { SkillDefinition, LogEntry } from '@/lib/skills';
import type { ProblemReport } from '@/lib/algorithms';

interface SkillPanelProps {
  skills: SkillDefinition[];
  onSkillClick: (skill: SkillDefinition, params?: Record<string, unknown>) => void;
  problemReport?: ProblemReport;
  onProblemFix?: (problemType: string) => void;
  className?: string;
}

export function SkillPanel({
  skills,
  onSkillClick,
  problemReport,
  onProblemFix,
  className,
}: SkillPanelProps) {
  const buttonSkills = skills.filter(
    (s) => s.id !== 'problem-detection'
  );

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {problemReport && problemReport.hasProblems && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔍</span>
            <h3 className="font-medium text-amber-800">检测到 {problemReport.problems.length} 个问题</h3>
            <span className="ml-auto text-sm text-amber-600">
              健康度: {problemReport.overallHealth}/100
            </span>
          </div>
          <div className="space-y-2">
            {problemReport.problems.slice(0, 4).map((problem, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      problem.severity === 'critical' && 'bg-red-500',
                      problem.severity === 'medium' && 'bg-amber-500',
                      problem.severity === 'low' && 'bg-yellow-500',
                      problem.severity === 'info' && 'bg-blue-500'
                    )}
                  />
                  <span className="text-sm text-gray-700">
                    {problem.type}
                    <span className="text-gray-400 ml-1">({problem.count})</span>
                  </span>
                </div>
                {problem.autoFixable && onProblemFix && (
                  <button
                    onClick={() => onProblemFix(problem.type)}
                    className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                  >
                    修复
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {buttonSkills.map((skill) => (
          <button
            key={skill.id}
            onClick={() => onSkillClick(skill)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 p-3 rounded-lg border',
              'transition-all duration-150 hover:shadow-md',
              'bg-white hover:bg-gray-50 border-gray-200'
            )}
          >
            <span className="text-xl">{skill.icon}</span>
            <span className="text-sm font-medium text-gray-700">{skill.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface ExecutionLogProps {
  log: LogEntry[];
  className?: string;
}

export function ExecutionLog({ log, className }: ExecutionLogProps) {
  if (log.length === 0) {
    return null;
  }

  return (
    <div className={cn('bg-gray-50 rounded-lg p-3', className)}>
      <h4 className="text-sm font-medium text-gray-700 mb-2">执行日志</h4>
      <div className="space-y-1">
        {log.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-xs',
                entry.status === 'done' && 'bg-green-100 text-green-600',
                entry.status === 'running' && 'bg-blue-100 text-blue-600',
                entry.status === 'error' && 'bg-red-100 text-red-600',
                entry.status === 'pending' && 'bg-gray-100 text-gray-400'
              )}
            >
              {entry.status === 'done' ? '✓' : entry.status === 'running' ? '⟳' : entry.status === 'error' ? '✗' : '○'}
            </span>
            <span className="text-gray-600">{entry.stepName}</span>
            {entry.detail && (
              <span className="text-gray-400 text-xs ml-auto">{entry.detail}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface ConfirmationDialogProps {
  title: string;
  message: string;
  details?: string[];
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmationDialog({
  title,
  message,
  details,
  onConfirm,
  onCancel,
  confirmLabel = '确认',
  cancelLabel = '取消',
}: ConfirmationDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        {details && details.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <ul className="text-sm text-gray-600 space-y-1">
              {details.map((detail, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-gray-400">•</span>
                  {detail}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ExportReminderProps {
  message: string;
  onExportCSV: () => void;
  onExportExcel: () => void;
  onContinue: () => void;
  onDismiss?: () => void;
}

export function ExportReminder({
  message,
  onExportCSV,
  onExportExcel,
  onContinue,
  onDismiss,
}: ExportReminderProps) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-medium text-amber-800 mb-1">数据未保存</h4>
          <p className="text-sm text-amber-700 mb-3">{message}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onExportCSV}
              className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700"
            >
              导出 CSV
            </button>
            <button
              onClick={onExportExcel}
              className="px-3 py-1.5 text-sm font-medium text-amber-700 bg-white border border-amber-300 rounded-lg hover:bg-amber-50"
            >
              导出 Excel
            </button>
            <button
              onClick={onContinue}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              继续处理
            </button>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
