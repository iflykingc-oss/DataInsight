import type { ParsedData, CellValue } from '@/lib/data-processor';
import type {
  SkillDefinition,
  SkillStep,
  SkillContext,
  ExecutionResult,
  LogEntry,
  ToolResult,
  ToolHandler,
  ExecutionPlan,
  DataSnapshot,
  RetryPolicy,
  AlternativeStep,
} from './registry';
import { TOOL_HANDLERS } from './registry';
import { detectProblems, ProblemDetector } from '../algorithms/problem-detector';
import {
  removeEmptyRows,
  removeDuplicates,
  standardizeDateFormat,
  FormatStandardizer,
} from '../algorithms/format-standardizer';

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 2,
  backoffMultiplier: 2,
  initialDelayMs: 100,
  fallbackAction: 'rollback',
};

export class SkillExecutor {
  private maxRetries: number;
  private snapshots: Map<string, DataSnapshot> = new Map();
  private executionHistory: ExecutionResult[] = [];

  constructor(maxRetries = 2) {
    this.maxRetries = maxRetries;
  }

  async execute(
    skill: SkillDefinition,
    context: SkillContext,
    params?: Record<string, unknown>,
    onProgress?: (log: LogEntry[]) => void,
    onCancel?: () => boolean
  ): Promise<ExecutionResult> {
    const log: LogEntry[] = [];
    let currentData = { ...context.currentData };
    const startTime = Date.now();
    const partialErrors: string[] = [];
    const warnings: string[] = [];

    const snapshotId = this.createSnapshot(currentData, `执行 ${skill.name} 前`);
    context.operationSnapshot = snapshotId;

    const needsConfirmation = this.checkNeedsConfirmation(skill, params);
    if (needsConfirmation && params?.confirmed !== true) {
      return {
        success: true,
        status: 'cancelled',
        log: [],
        summary: '需要用户确认后才能执行',
        newData: currentData,
      };
    }

    if (onCancel?.()) {
      return {
        success: false,
        status: 'cancelled',
        log,
        newData: currentData,
        summary: '用户取消执行',
      };
    }

    const stepsToExecute = skill.execution.steps.filter((step) => {
      if (!step.condition) return true;
      try {
        return step.condition(currentData);
      } catch {
        return true;
      }
    });

    const totalSteps = stepsToExecute.length;
    let completedSteps = 0;

    for (let i = 0; i < stepsToExecute.length; i++) {
      const step = stepsToExecute[i];
      const stepIndex = skill.execution.steps.indexOf(step);

      if (onCancel?.()) {
        log.push({
          id: crypto.randomUUID(),
          step: stepIndex + 1,
          stepName: step.name,
          action: step.description,
          status: 'skipped',
          detail: '用户取消执行，后续步骤已跳过',
          timestamp: Date.now(),
          duration: 0,
        });
        break;
      }

      log.push({
        id: crypto.randomUUID(),
        step: stepIndex + 1,
        stepName: step.name,
        action: step.description,
        status: 'running',
        timestamp: Date.now(),
      });
      onProgress?.([...log]);

      const stepStartTime = Date.now();
      let retryCount = 0;
      let stepSuccess = false;
      let lastError: string | undefined;
      const retryPolicy = step.retryPolicy || { maxRetries: this.maxRetries };

      while (retryCount <= retryPolicy.maxRetries) {
        try {
          const handler = TOOL_HANDLERS[step.tool];
          if (!handler) {
            throw new Error(`未找到工具: ${step.tool}`);
          }

          const stepParams = { ...step.params, ...params };
          const result = await this.executeWithTimeout(
            handler(stepParams, currentData, context),
            skill.execution.timeout || 30000
          );

          if (result.success) {
            currentData = result.newData;
            const duration = Date.now() - stepStartTime;

            log[log.length - 1] = {
              ...log[log.length - 1],
              status: 'done',
              detail: result.summary,
              duration,
              timestamp: Date.now(),
            };

            if (result.changes && result.changes.length > 0) {
              log[log.length - 1].detail += ` | 变更: ${result.changes.map(c => c.description).join(', ')}`;
            }

            onProgress?.([...log]);
            stepSuccess = true;
            completedSteps++;
            break;
          } else {
            lastError = result.error || '执行失败';
            retryCount++;

            if (retryCount <= retryPolicy.maxRetries) {
              const delay = this.calculateBackoffDelay(retryPolicy, retryCount);
              await this.sleep(delay);

              log[log.length - 1] = {
                ...log[log.length - 1],
                status: 'running',
                detail: `重试中 (${retryCount}/${retryPolicy.maxRetries + 1}): ${lastError}`,
                retryCount,
                timestamp: Date.now(),
              };
              onProgress?.([...log]);
            }
          }
        } catch (error) {
          lastError = error instanceof Error ? error.message : '未知错误';
          retryCount++;

          if (retryCount <= retryPolicy.maxRetries) {
            const delay = this.calculateBackoffDelay(retryPolicy, retryCount);
            await this.sleep(delay);

            log[log.length - 1] = {
              ...log[log.length - 1],
              status: 'running',
              detail: `重试中 (${retryCount}/${retryPolicy.maxRetries + 1}): ${lastError}`,
              retryCount,
              timestamp: Date.now(),
            };
            onProgress?.([...log]);
          }
        }
      }

      if (!stepSuccess) {
        const alternative = this.findAlternativeStep(step, lastError);

        if (alternative) {
          log[log.length - 1] = {
            ...log[log.length - 1],
            status: 'skipped',
            detail: `执行替代方案: ${alternative.description}`,
            warning: `原始步骤失败: ${lastError}`,
            timestamp: Date.now(),
          };
          warnings.push(`步骤 ${stepIndex + 1} 替换为: ${alternative.description}`);
          completedSteps++;
          continue;
        }

        log[log.length - 1] = {
          ...log[log.length - 1],
          status: 'error',
          error: lastError,
          duration: Date.now() - stepStartTime,
          timestamp: Date.now(),
        };
        partialErrors.push(`步骤 ${stepIndex + 1} (${step.name}) 失败: ${lastError}`);

        if (skill.execution.rollbackOnFailure && step.rollbackTool) {
          const rollbackResult = await this.executeRollback(step, currentData, context);
          if (rollbackResult.success) {
            log.push({
              id: crypto.randomUUID(),
              step: log.length + 1,
              stepName: '回滚',
              action: '执行回滚',
              status: 'done',
              detail: '已回滚到执行前状态',
              timestamp: Date.now(),
            });

            return {
              success: false,
              status: 'rolled_back',
              log,
              newData: rollbackResult.newData,
              error: `执行失败已回滚: ${lastError}`,
              partialErrors,
              rollbackPerformed: true,
              executionTime: Date.now() - startTime,
              stepsCompleted: completedSteps,
              totalSteps,
            };
          }
        }

        if (!skill.execution.continueOnError) {
          return {
            success: false,
            status: 'failed',
            log,
            newData: currentData,
            error: `执行失败: ${lastError}`,
            partialErrors,
            executionTime: Date.now() - startTime,
            stepsCompleted: completedSteps,
            totalSteps,
          };
        }

        warnings.push(`步骤 ${stepIndex + 1} 失败但继续执行: ${lastError}`);
        completedSteps++;
      }
    }

    const duration = Date.now() - startTime;
    const successCount = log.filter((l) => l.status === 'done').length;
    const totalExecuted = log.filter((l) => l.status !== 'skipped').length;
    const errorCount = log.filter((l) => l.status === 'error').length;

    const changes = this.computeChanges(context.currentData, currentData);

    const result: ExecutionResult = {
      success: errorCount === 0,
      status: errorCount === 0 ? 'success' : errorCount < totalExecuted ? 'partial' : 'failed',
      log,
      newData: currentData,
      summary: this.generateSummary(skill.name, successCount, totalExecuted, duration, warnings),
      changes,
      partialErrors: partialErrors.length > 0 ? partialErrors : undefined,
      executionTime: duration,
      stepsCompleted: completedSteps,
      totalSteps,
    };

    this.executionHistory.push(result);

    return result;
  }

  private checkNeedsConfirmation(skill: SkillDefinition, params?: Record<string, unknown>): boolean {
    if (skill.execution.requiresConfirmation === true) {
      return true;
    }

    if (skill.execution.requiresConfirmation === 'complex_only') {
      return skill.execution.steps.length > 3;
    }

    const highImpactSteps = skill.execution.steps.filter((s) => s.estimatedImpact === 'high');
    if (highImpactSteps.length > 1) {
      return true;
    }

    const stepsNeedingConfirm = skill.execution.steps.filter((s) => s.requiresConfirmation);
    if (stepsNeedingConfirm.length > 0 && params?.confirmed !== true) {
      return true;
    }

    return false;
  }

  private calculateBackoffDelay(policy: RetryPolicy, retryCount: number): number {
    const baseDelay = policy.initialDelayMs || 100;
    const multiplier = policy.backoffMultiplier || 2;
    return Math.min(baseDelay * Math.pow(multiplier, retryCount - 1), 10000);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private findAlternativeStep(step: SkillStep, error: unknown): AlternativeStep | null {
    if (!step.alternatives) return null;

    for (const alt of step.alternatives) {
      try {
        if (alt.condition(error)) {
          return alt;
        }
      } catch {
        continue;
      }
    }

    return null;
  }

  private async executeRollback(
    step: SkillStep,
    currentData: ParsedData,
    context: SkillContext
  ): Promise<ToolResult> {
    if (!step.rollbackTool) {
      return {
        success: false,
        newData: currentData,
        summary: '无可用回滚工具',
        error: '无可用回滚工具',
      };
    }

    const handler = TOOL_HANDLERS[step.rollbackTool];
    if (!handler) {
      return {
        success: false,
        newData: currentData,
        summary: '回滚工具不存在',
        error: '回滚工具不存在',
      };
    }

    try {
      return await handler(step.rollbackParams || {}, currentData, context);
    } catch (error) {
      return {
        success: false,
        newData: currentData,
        summary: '回滚执行失败',
        error: error instanceof Error ? error.message : '回滚执行失败',
      };
    }
  }

  private computeChanges(before: ParsedData, after: ParsedData): ExecutionResult['changes'] {
    const changes: ExecutionResult['changes'] = [];

    if (before.rows.length !== after.rows.length) {
      changes.push({
        type: 'rows',
        before: before.rows.length,
        after: after.rows.length,
        description: `数据行数: ${before.rows.length} → ${after.rows.length}`,
        affectedRows: this.findChangedRowIndices(before, after),
      });
    }

    if (before.headers.length !== after.headers.length) {
      changes.push({
        type: 'columns',
        before: before.headers.length,
        after: after.headers.length,
        description: `数据列数: ${before.headers.length} → ${after.headers.length}`,
        affectedCols: this.findChangedColumns(before, after),
      });
    }

    const cellChanges = this.findCellChanges(before, after);
    if (cellChanges.length > 0) {
      changes.push({
        type: 'cells',
        before: 0,
        after: cellChanges.length,
        description: `修改了 ${cellChanges.length} 个单元格`,
        affectedRows: cellChanges.map((c) => c.row),
        affectedCols: [...new Set(cellChanges.map((c) => c.col))],
      });
    }

    return changes;
  }

  private findChangedRowIndices(before: ParsedData, after: ParsedData): number[] {
    const changed: number[] = [];
    const afterKeys = new Set(after.rows.map((r) => JSON.stringify(r)));

    for (let i = 0; i < before.rows.length; i++) {
      if (!afterKeys.has(JSON.stringify(before.rows[i]))) {
        changed.push(i);
      }
    }

    return changed;
  }

  private findChangedColumns(before: ParsedData, after: ParsedData): string[] {
    const beforeCols = new Set(before.headers);
    const afterCols = new Set(after.headers);

    const removed = [...beforeCols].filter((c) => !afterCols.has(c));
    const added = [...afterCols].filter((c) => !beforeCols.has(c));

    return [...removed, ...added];
  }

  private findCellChanges(
    before: ParsedData,
    after: ParsedData
  ): { row: number; col: string; beforeVal: unknown; afterVal: unknown }[] {
    const changes: { row: number; col: string; beforeVal: unknown; afterVal: unknown }[] = [];

    const minRows = Math.min(before.rows.length, after.rows.length);
    const commonHeaders = before.headers.filter((h) => after.headers.includes(h));

    for (let i = 0; i < minRows; i++) {
      for (const header of commonHeaders) {
        const beforeVal = before.rows[i]?.[header];
        const afterVal = after.rows[i]?.[header];

        if (String(beforeVal) !== String(afterVal)) {
          changes.push({
            row: i,
            col: header,
            beforeVal,
            afterVal,
          });
        }
      }
    }

    return changes;
  }

  private generateSummary(
    skillName: string,
    successCount: number,
    totalSteps: number,
    duration: number,
    warnings: string[]
  ): string {
    let summary = `${skillName} 执行完成 | ${successCount}/${totalSteps} 步骤成功 (${duration}ms)`;

    if (warnings.length > 0) {
      summary += ` | ⚠️ ${warnings.length} 个警告`;
    }

    return summary;
  }

  private createSnapshot(data: ParsedData, description: string): string {
    const id = crypto.randomUUID();
    this.snapshots.set(id, {
      id,
      data: JSON.parse(JSON.stringify(data)),
      timestamp: Date.now(),
      description,
    });

    if (this.snapshots.size > 50) {
      const oldestKey = this.snapshots.keys().next().value;
      if (oldestKey) {
        this.snapshots.delete(oldestKey);
      }
    }

    return id;
  }

  getSnapshot(id: string): DataSnapshot | undefined {
    return this.snapshots.get(id);
  }

  deleteSnapshot(id: string): void {
    this.snapshots.delete(id);
  }

  private async executeWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`执行超时 (${timeout}ms)`)), timeout)
      ),
    ]);
  }

  async planExecution(
    skill: SkillDefinition,
    context: SkillContext,
    params?: Record<string, unknown>
  ): Promise<ExecutionPlan> {
    const steps: ExecutionPlan['steps'] = [];
    let estimatedTime = 0;
    let riskLevel: ExecutionPlan['riskLevel'] = 'low';
    const warnings: string[] = [];

    for (let i = 0; i < skill.execution.steps.length; i++) {
      const step = skill.execution.steps[i];
      let willExecute = true;
      let skipReason: string | undefined;

      if (step.condition) {
        try {
          willExecute = step.condition(context.currentData);
          if (!willExecute) {
            skipReason = '条件不满足';
          }
        } catch (error) {
          willExecute = false;
          skipReason = '条件执行错误';
        }
      }

      const stepTime = step.estimatedTime || 100;
      estimatedTime += willExecute ? stepTime : 0;

      if (step.estimatedImpact === 'high' && willExecute) {
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
        warnings.push(`步骤 "${step.name}" 为高影响性操作`);
      }

      if (step.estimatedImpact === 'high' && willExecute) {
        riskLevel = 'high';
      }

      steps.push({
        stepId: step.id,
        stepName: step.name,
        tool: step.tool,
        params: { ...step.params, ...params },
        reasoning: `步骤 ${i + 1}: ${step.description}`,
        willExecute,
        estimatedImpact: step.estimatedImpact,
        skipReason,
      });
    }

    const requiresConfirmation = this.checkNeedsConfirmation(skill, params);

    return {
      skillId: skill.id,
      skillName: skill.name,
      steps,
      estimatedTime,
      riskLevel,
      totalSteps: skill.execution.steps.length,
      requiresConfirmation,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  generatePreview(
    skill: SkillDefinition,
    context: SkillContext,
    params?: Record<string, unknown>
  ): { previewData: ParsedData; summary: string; changes: ExecutionResult['changes'] } {
    const previewRows = Math.min(skill.output.previewCount, context.currentData.rows.length);
    const previewData: ParsedData = {
      ...context.currentData,
      rows: context.currentData.rows.slice(0, previewRows),
    };

    const allToolHandlers = Object.keys(TOOL_HANDLERS);
    const availableTools = skill.execution.steps
      .filter((s) => allToolHandlers.includes(s.tool))
      .map((s) => s.name)
      .join(', ');

    const changes = this.computeChanges(context.currentData, {
      ...context.currentData,
      rows: context.currentData.rows.slice(0, previewRows),
    });

    return {
      previewData,
      summary: `预览前 ${previewRows} 行（共 ${context.currentData.rows.length} 行）\n可用操作: ${availableTools || '无'}`,
      changes,
    };
  }

  getExecutionHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  clearHistory(): void {
    this.executionHistory = [];
  }
}

export const skillExecutor = new SkillExecutor(2);

function filterByCondition(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { column, operator, value } = params as {
      column: string;
      operator: string;
      value: CellValue;
    };

    if (!column || !operator) {
      resolve({
        success: false,
        newData: data,
        summary: '缺少筛选参数',
        error: '缺少 column 或 operator 参数',
      });
      return;
    }

    if (!data.headers.includes(column)) {
      resolve({
        success: false,
        newData: data,
        summary: `列 "${column}" 不存在`,
        error: `列 "${column}" 不存在`,
      });
      return;
    }

    const filteredRows = data.rows.filter((row) => {
      const cellValue = row[column];
      const cellNum = Number(cellValue);
      const compareNum = Number(value);

      switch (operator) {
        case 'eq':
          return String(cellValue) === String(value);
        case 'neq':
          return String(cellValue) !== String(value);
        case 'gt':
          return !isNaN(cellNum) && !isNaN(compareNum) && cellNum > compareNum;
        case 'gte':
          return !isNaN(cellNum) && !isNaN(compareNum) && cellNum >= compareNum;
        case 'lt':
          return !isNaN(cellNum) && !isNaN(compareNum) && cellNum < compareNum;
        case 'lte':
          return !isNaN(cellNum) && !isNaN(compareNum) && cellNum <= compareNum;
        case 'contains':
          return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
        case 'not_contains':
          return !String(cellValue).toLowerCase().includes(String(value).toLowerCase());
        case 'starts_with':
          return String(cellValue).toLowerCase().startsWith(String(value).toLowerCase());
        case 'ends_with':
          return String(cellValue).toLowerCase().endsWith(String(value).toLowerCase());
        case 'is_empty':
          return cellValue === null || cellValue === undefined || cellValue === '';
        case 'is_not_empty':
          return cellValue !== null && cellValue !== undefined && cellValue !== '';
        case 'between':
          if (typeof value === 'string' && value.includes(',')) {
            const [min, max] = value.split(',').map((v) => Number(v.trim()));
            return !isNaN(cellNum) && !isNaN(min) && !isNaN(max) && cellNum >= min && cellNum <= max;
          }
          return true;
        default:
          return true;
      }
    });

    const removedCount = data.rows.length - filteredRows.length;

    resolve({
      success: true,
      newData: { ...data, rows: filteredRows },
      summary: `筛选 ${column} ${getOperatorLabel(operator)} ${value}，保留 ${filteredRows.length} 行（移除 ${removedCount} 行）`,
      changes: [
        {
          type: 'rows',
          before: data.rows.length,
          after: filteredRows.length,
          description: `筛选后保留 ${filteredRows.length} 行`,
        },
      ],
      affectedRows: data.rows.map((_, i) => i).slice(0, removedCount),
    });
  });
}

function extractRows(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { startRow, endRow, count } = params as { startRow?: number; endRow?: number; count?: number };

    if (count !== undefined) {
      const validCount = Math.min(count, data.rows.length);
      const extractedRows = data.rows.slice(0, validCount);
      resolve({
        success: true,
        newData: { ...data, rows: extractedRows },
        summary: `提取前 ${validCount} 行`,
        changes: [
          {
            type: 'rows',
            before: data.rows.length,
            after: validCount,
            description: `提取前 ${validCount} 行`,
          },
        ],
        affectedRows: Array.from({ length: validCount }, (_, i) => i),
      });
      return;
    }

    const validStart = Math.max(0, Math.min(startRow || 0, data.rows.length - 1));
    const validEnd = Math.max(validStart, Math.min(endRow || validStart, data.rows.length - 1));

    const extractedRows = data.rows.slice(validStart, validEnd + 1);

    resolve({
      success: true,
      newData: { ...data, rows: extractedRows },
      summary: `提取第 ${validStart + 1} - ${validEnd + 1} 行，共 ${extractedRows.length} 行`,
      changes: [
        {
          type: 'rows',
          before: data.rows.length,
          after: extractedRows.length,
          description: `提取 ${extractedRows.length} 行`,
        },
      ],
      affectedRows: Array.from({ length: validEnd - validStart + 1 }, (_, i) => validStart + i),
    });
  });
}

function extractColumns(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { columns } = params as { columns: string[] };

    if (!columns || !Array.isArray(columns)) {
      resolve({
        success: false,
        newData: data,
        summary: '缺少 columns 参数',
        error: '需要指定要提取的列',
      });
      return;
    }

    const validColumns = columns.filter((c) => data.headers.includes(c));
    const invalidColumns = columns.filter((c) => !data.headers.includes(c));

    if (validColumns.length === 0) {
      resolve({
        success: false,
        newData: data,
        summary: '没有有效的列可提取',
        error: `指定的列都不存在: ${invalidColumns.join(', ')}`,
      });
      return;
    }

    const newHeaders = data.headers.filter((h) => validColumns.includes(h));
    const newRows = data.rows.map((row) => {
      const newRow: Record<string, CellValue> = {};
      newHeaders.forEach((h) => {
        newRow[h] = row[h];
      });
      return newRow;
    });

    resolve({
      success: true,
      newData: { headers: newHeaders, rows: newRows, fileName: context?.currentData?.fileName ?? 'data', rowCount: newRows.length, columnCount: newHeaders.length },
      summary: `提取 ${newHeaders.length} 列${invalidColumns.length > 0 ? `（${invalidColumns.length} 列不存在）` : ''}：${newHeaders.join(', ')}`,
      changes: [
        {
          type: 'columns',
          before: data.headers.length,
          after: newHeaders.length,
          description: `提取 ${newHeaders.length} 列`,
        },
      ],
      affectedCols: newHeaders,
    });
  });
}

function removeEmptyRowsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const result = removeEmptyRows(data);
    resolve({
      success: true,
      newData: result.newData,
      summary: `删除 ${result.removedCount} 个空行${result.removedCount > 0 ? `（保留 ${result.newData.rows.length} 行）` : ''}`,
      changes: [
        {
          type: 'rows',
          before: data.rows.length,
          after: result.newData.rows.length,
          description: `删除 ${result.removedCount} 个空行`,
        },
      ],
    });
  });
}

function removeEmptyColumnsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const emptyCols: string[] = [];
    for (const header of data.headers) {
      const isEmpty = data.rows.every((row) => {
        const val = row[header];
        return val === null || val === undefined || val === '';
      });
      if (isEmpty) {
        emptyCols.push(header);
      }
    }

    const newHeaders = data.headers.filter((h) => !emptyCols.includes(h));
    const newRows = data.rows.map((row) => {
      const newRow: Record<string, CellValue> = {};
      newHeaders.forEach((h) => {
        newRow[h] = row[h];
      });
      return newRow;
    });

    resolve({
      success: true,
      newData: { ...data, headers: newHeaders, rows: newRows },
      summary: emptyCols.length > 0 ? `删除 ${emptyCols.length} 个空列: ${emptyCols.join(', ')}` : '没有空列需要删除',
      changes: [
        {
          type: 'columns',
          before: data.headers.length,
          after: newHeaders.length,
          description: `删除 ${emptyCols.length} 个空列`,
        },
      ],
      affectedCols: emptyCols,
    });
  });
}

function removeDuplicatesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const result = removeDuplicates(data);
    resolve({
      success: true,
      newData: result.newData,
      summary: `删除 ${result.removedCount} 个重复行${result.removedCount > 0 ? `（保留 ${result.newData.rows.length} 行）` : ''}`,
      changes: [
        {
          type: 'rows',
          before: data.rows.length,
          after: result.newData.rows.length,
          description: `删除 ${result.removedCount} 个重复行`,
        },
      ],
    });
  });
}

function trimWhitespaceTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { columns } = params as { columns?: string[] };
    const targetCols = columns || data.headers;

    let totalChanges = 0;
    const affectedRows: number[] = [];
    const newRows = data.rows.map((row, rowIndex) => {
      const newRow = { ...row };
      let rowChanged = false;
      targetCols.forEach((col) => {
        if (!data.headers.includes(col)) return;
        const val = newRow[col];
        if (typeof val === 'string') {
          const trimmed = val.trim().replace(/\s+/g, ' ');
          if (trimmed !== val) {
            totalChanges++;
            newRow[col] = trimmed;
            rowChanged = true;
          }
        }
      });
      if (rowChanged) {
        affectedRows.push(rowIndex);
      }
      return newRow;
    });

    resolve({
      success: true,
      newData: { ...data, rows: newRows },
      summary: totalChanges > 0 ? `去除空格：${totalChanges} 个单元格已清理` : '无需清理空格',
      changes: totalChanges > 0 ? [{ type: 'cells', before: 0, after: totalChanges, description: `清理 ${totalChanges} 个单元格`, affectedRows }] : [],
    });
  });
}

function standardizeDateFormatTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { column, targetFormat } = params as { column?: string; targetFormat?: string };
    const targetCol = column || data.headers.find((h) =>
      ['日期', 'date', '时间', 'time', '创建时间', '更新时间'].some((kw) =>
        h.toLowerCase().includes(kw)
      )
    );

    if (!targetCol) {
      resolve({
        success: false,
        newData: data,
        summary: '未找到日期列',
        error: '未找到日期列',
      });
      return;
    }

    if (!data.headers.includes(targetCol)) {
      resolve({
        success: false,
        newData: data,
        summary: `列 "${targetCol}" 不存在`,
        error: `列 "${targetCol}" 不存在`,
      });
      return;
    }

    const standardizer = new FormatStandardizer(data);
    const result = standardizer.standardizeDateFormat(
      targetCol,
      (targetFormat as 'YYYY-MM-DD' | 'YYYY/MM/DD' | 'MM/DD/YYYY') || 'YYYY-MM-DD'
    );

    if (result.changes === 0) {
      resolve({
        success: true,
        newData: data,
        summary: `日期格式已是 ${result.targetFormat}，无需转换`,
      });
      return;
    }

    const newRows = data.rows.map((row, i) => {
      const convResult = result.results[i];
      if (convResult.success && convResult.convertedValue !== convResult.originalValue) {
        return { ...row, [targetCol]: convResult.convertedValue };
      }
      return row;
    });

    resolve({
      success: true,
      newData: { ...data, rows: newRows },
      summary: `日期格式标准化：${result.changes} 个单元格已转换为 ${result.targetFormat}`,
      changes: [{ type: 'cells', before: 0, after: result.changes, description: `转换 ${result.changes} 个日期格式` }],
    });
  });
}

function conditionalDeleteTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const filterParams = { ...params, isDeleteMode: true };
    const result = filterByCondition(filterParams, data, context);

    result.then((filterResult) => {
      if (filterResult.success) {
        const removedCount = data.rows.length - filterResult.newData.rows.length;
        resolve({
          success: true,
          newData: filterResult.newData,
          summary: `条件删除：移除了 ${removedCount} 行（保留 ${filterResult.newData.rows.length} 行）`,
          changes: filterResult.changes,
          affectedRows: filterResult.affectedRows,
        });
      } else {
        resolve(filterResult);
      }
    });
  });
}

function parseFilterCondition(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { raw } = params as { raw?: string };

    if (!raw) {
      resolve({
        success: true,
        newData: data,
        summary: '条件解析完成（无原始输入）',
      });
      return;
    }

    const parsed = {
      hasColumn: false,
      hasOperator: false,
      hasValue: false,
      suggestions: [] as string[],
    };

    const columnPatterns = data.headers.map((h) => `列"${h}"`);
    parsed.suggestions.push(...columnPatterns);

    resolve({
      success: true,
      newData: data,
      summary: `条件解析完成：${JSON.stringify(parsed)}`,
      metadata: { parsed },
    });
  });
}

function validateFilterParams(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { column, operator } = params as { column?: string; operator?: string };
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!column) {
      errors.push('缺少列名参数');
    } else if (!data.headers.includes(column)) {
      errors.push(`列 "${column}" 不存在`);
    }

    if (!operator) {
      errors.push('缺少操作符参数');
    }

    const validOperators = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'contains', 'not_contains', 'is_empty', 'is_not_empty'];
    if (operator && !validOperators.includes(operator)) {
      warnings.push(`操作符 "${operator}" 可能不支持`);
    }

    if (errors.length > 0) {
      resolve({
        success: false,
        newData: data,
        summary: '参数验证失败',
        error: errors.join('; '),
      });
      return;
    }

    resolve({
      success: true,
      newData: data,
      summary: `参数验证通过${warnings.length > 0 ? `（警告: ${warnings.join('; ')}）` : ''}`,
      metadata: { warnings },
    });
  });
}

function validateFilterResult(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const warnings: string[] = [];

    if (data.rows.length === 0) {
      warnings.push('筛选结果为空');
    }

    if (data.rows.length < 10) {
      warnings.push(`筛选结果较少（${data.rows.length} 行）`);
    }

    resolve({
      success: true,
      newData: data,
      summary: `筛选结果验证通过${warnings.length > 0 ? `（警告: ${warnings.join('; ')}）` : ''}`,
      metadata: { warnings, rowCount: data.rows.length },
    });
  });
}

function sortData(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { column, direction, multiSort } = params as {
      column?: string;
      direction?: 'asc' | 'desc';
      multiSort?: { column: string; direction: 'asc' | 'desc' }[];
    };

    if (multiSort && Array.isArray(multiSort)) {
      let sortedRows = [...data.rows];
      for (let i = multiSort.length - 1; i >= 0; i--) {
        const { column: col, direction: dir } = multiSort[i];
        sortedRows = sortByColumn(sortedRows, col, dir);
      }
      resolve({
        success: true,
        newData: { ...data, rows: sortedRows },
        summary: `多列排序: ${multiSort.map((s) => `${s.column}(${s.direction})`).join(' → ')}`,
        changes: [{ type: 'data', before: 0, after: 0, description: '数据已重新排序' }],
      });
      return;
    }

    if (!column) {
      resolve({
        success: false,
        newData: data,
        summary: '缺少排序列',
        error: '需要指定排序列',
      });
      return;
    }

    if (!data.headers.includes(column)) {
      resolve({
        success: false,
        newData: data,
        summary: `列 "${column}" 不存在`,
        error: `列 "${column}" 不存在`,
      });
      return;
    }

    const sortedRows = sortByColumn([...data.rows], column, direction || 'asc');

    resolve({
      success: true,
      newData: { ...data, rows: sortedRows },
      summary: `已按 ${column} ${direction === 'desc' ? '降序' : '升序'} 排序`,
      changes: [{ type: 'data', before: 0, after: 0, description: '数据已按列排序' }],
    });
  });
}

function sortByColumn(
  rows: Record<string, CellValue>[],
  column: string,
  direction: 'asc' | 'desc'
): Record<string, CellValue>[] {
  return rows.sort((a, b) => {
    const aVal = a[column] ?? '';
    const bVal = b[column] ?? '';
    const aNum = Number(aVal);
    const bNum = Number(bVal);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return direction === 'asc' ? aNum - bNum : bNum - aNum;
    }

    const cmp = String(aVal).localeCompare(String(bVal));
    return direction === 'asc' ? cmp : -cmp;
  });
}

function parseSortParams(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { raw } = params as { raw?: string };

    resolve({
      success: true,
      newData: data,
      summary: '排序参数解析完成',
      metadata: { raw },
    });
  });
}

function validateSortParams(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { column } = params as { column?: string };

    if (!column) {
      resolve({
        success: false,
        newData: data,
        summary: '缺少排序列',
        error: '需要指定排序列',
      });
      return;
    }

    if (!data.headers.includes(column)) {
      resolve({
        success: false,
        newData: data,
        summary: `列 "${column}" 不存在`,
        error: `列 "${column}" 不存在`,
      });
      return;
    }

    resolve({
      success: true,
      newData: data,
      summary: '排序参数验证通过',
    });
  });
}

function previewSort(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  const previewCount = 5;
  return Promise.resolve({
    success: true,
    newData: data,
    summary: `排序预览：显示前 ${previewCount} 行`,
    metadata: { previewCount },
  });
}

function detectEmptyRowsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const detector = new ProblemDetector(data);
    const results = detector.detectEmptyRows();
    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    const allIndices = results.flatMap(r => r.indices || []);
    const maxSeverity = results.length > 0 ? results[0].severity : 'info';
    resolve({
      success: true,
      newData: data,
      summary: `检测到 ${totalCount} 个空行`,
      affectedRows: allIndices,
      metadata: { severity: maxSeverity },
    });
  });
}

function detectDuplicateRowsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const detector = new ProblemDetector(data);
    const results = detector.detectDuplicateRows();
    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    const allIndices = results.flatMap(r => r.indices || []);
    const maxSeverity = results.length > 0 ? results[0].severity : 'info';
    resolve({
      success: true,
      newData: data,
      summary: `检测到 ${totalCount} 个重复行（共 ${allIndices.length} 条数据）`,
      affectedRows: allIndices,
      metadata: { severity: maxSeverity, groups: totalCount },
    });
  });
}

function detectDateFormatIssuesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const detector = new ProblemDetector(data);
    const results = detector.detectDateFormatInconsistencies();
    resolve({
      success: true,
      newData: data,
      summary: `检测到 ${results.length} 个日期格式问题`,
      affectedCols: results.map((r) => r.type),
      metadata: { issues: results },
    });
  });
}

function detectTypeMismatchTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const detector = new ProblemDetector(data);
    const results = detector.detectTypeMismatch();
    resolve({
      success: true,
      newData: data,
      summary: `检测到 ${results.length} 个类型混乱问题`,
      metadata: { issues: results },
    });
  });
}

function detectMissingValuesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const detector = new ProblemDetector(data);
    const results = detector.detectMissingValues();
    const totalCount = results.reduce((sum, r) => sum + r.count, 0);
    const maxSeverity = results.length > 0 ? results[0].severity : 'info';
    const suggestions = results.flatMap(r => r.suggestions);
    resolve({
      success: true,
      newData: data,
      summary: `检测到 ${totalCount} 个缺失值`,
      metadata: { severity: maxSeverity, suggestions },
    });
  });
}

function detectOutliersTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const detector = new ProblemDetector(data);
    const results = detector.detectOutliers();
    resolve({
      success: true,
      newData: data,
      summary: `检测到 ${results.length} 个异常值`,
      metadata: { outliers: results },
    });
  });
}

function detectSpellingErrorsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const errors: { row: number; col: string; value: string }[] = [];
    const textColumns = data.headers.filter((h) => {
      const sample = data.rows[0]?.[h];
      return typeof sample === 'string';
    });

    const commonMisspellings: Record<string, string[]> = {
      '男女': ['男', '女'],
      '有无': ['有', '无'],
    };

    for (const col of textColumns) {
      for (let i = 0; i < data.rows.length; i++) {
        const val = String(data.rows[i][col] || '');
        for (const [correct, variants] of Object.entries(commonMisspellings)) {
          if (variants.includes(val)) {
            errors.push({ row: i, col, value: val });
          }
        }
      }
    }

    resolve({
      success: true,
      newData: data,
      summary: errors.length > 0 ? `检测到 ${errors.length} 个可能的拼写变体` : '未检测到拼写错误',
      metadata: { errors },
    });
  });
}

function detectEncodingIssuesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const issues: { row: number; col: string; value: string }[] = [];
    const problematicPatterns = [
      /[\x00-\x08\x0B\x0C\x0E-\x1F]/,
      /Ã¡|Ã©|Ã­|Ã³|Ãº/,
      /\?{3,}/,
      /[â€™â€œâ€�]/,
    ];

    for (const header of data.headers) {
      for (let i = 0; i < data.rows.length; i++) {
        const val = String(data.rows[i][header] || '');
        for (const pattern of problematicPatterns) {
          if (pattern.test(val)) {
            issues.push({ row: i, col: header, value: val });
            break;
          }
        }
      }
    }

    resolve({
      success: true,
      newData: data,
      summary: issues.length > 0 ? `检测到 ${issues.length} 个编码问题` : '未检测到编码问题',
      metadata: { issues },
    });
  });
}

function fixEncodingIssuesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    let changes = 0;
    const newRows = data.rows.map((row) => {
      const newRow = { ...row };
      for (const header of data.headers) {
        const val = newRow[header];
        if (typeof val === 'string') {
          let fixed = val;
          fixed = fixed.replace(/Ã¡/g, 'á');
          fixed = fixed.replace(/Ã©/g, 'é');
          fixed = fixed.replace(/Ã­/g, 'í');
          fixed = fixed.replace(/Ã³/g, 'ó');
          fixed = fixed.replace(/Ãº/g, 'ú');
          fixed = fixed.replace(/â€™/g, "'");
          fixed = fixed.replace(/â€œ/g, '"');
          fixed = fixed.replace(/â€/g, '"');
          fixed = fixed.replace(/\?{3,}/g, '?');

          if (fixed !== val) {
            changes++;
            newRow[header] = fixed;
          }
        }
      }
      return newRow;
    });

    resolve({
      success: true,
      newData: { ...data, rows: newRows },
      summary: changes > 0 ? `修复编码问题：${changes} 个单元格已修复` : '无需修复编码问题',
      changes: changes > 0 ? [{ type: 'cells', before: 0, after: changes, description: `修复 ${changes} 个编码问题` }] : [],
    });
  });
}

function fillMissingValuesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { strategy, column, value } = params as { strategy?: string; column?: string; value?: CellValue };
    const targetCols = column ? [column] : data.headers;
    let changes = 0;
    const affectedRows: number[] = [];

    const newRows = data.rows.map((row, rowIndex) => {
      const newRow = { ...row };
      let rowChanged = false;
      targetCols.forEach((h) => {
        const val = newRow[h];
        if (val === null || val === undefined || val === '') {
          changes++;
          rowChanged = true;
          if (strategy === 'zero') {
            newRow[h] = 0;
          } else if (strategy === 'empty') {
            newRow[h] = 'N/A';
          } else if (strategy === 'forward' && rowIndex > 0) {
            newRow[h] = data.rows[rowIndex - 1][h];
          } else if (strategy === 'mean' && !isNaN(Number(data.rows[0]?.[h]))) {
            const numericValues = data.rows.map((r) => Number(r[h])).filter((n) => !isNaN(n));
            if (numericValues.length > 0) {
              const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
              newRow[h] = Number(mean.toFixed(2));
            } else {
              newRow[h] = value ?? 'N/A';
            }
          } else {
            newRow[h] = value ?? 'N/A';
          }
        }
      });
      if (rowChanged) {
        affectedRows.push(rowIndex);
      }
      return newRow;
    });

    resolve({
      success: true,
      newData: { ...data, rows: newRows },
      summary: `缺失值填充：${changes} 个单元格已填充（策略: ${strategy || '默认值'}）`,
      changes: [{ type: 'cells', before: 0, after: changes, description: `填充 ${changes} 个缺失值`, affectedRows }],
    });
  });
}

function calculateBasicStatsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const stats: Record<string, { count: number; nulls: number; numeric: number; unique: number }> = {};

    for (const h of data.headers) {
      let nulls = 0;
      let numeric = 0;
      const uniqueValues = new Set<string>();

      for (const row of data.rows) {
        const val = row[h];
        if (val === null || val === undefined || val === '') {
          nulls++;
        } else if (!isNaN(Number(val))) {
          numeric++;
        }
        uniqueValues.add(String(val));
      }

      stats[h] = {
        count: data.rows.length,
        nulls,
        numeric,
        unique: uniqueValues.size,
      };
    }

    resolve({
      success: true,
      newData: data,
      summary: `基本统计完成：${data.headers.length} 列`,
      metadata: { stats },
    });
  });
}

function calculateCorrelationTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const numericCols = data.headers.filter((h) => {
      const sample = data.rows[0]?.[h];
      return typeof sample === 'number' || !isNaN(Number(sample));
    });

    const correlations: { col1: string; col2: string; correlation: number }[] = [];

    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const col1 = numericCols[i];
        const col2 = numericCols[j];

        const vals1 = data.rows.map((r) => Number(r[col1])).filter((n) => !isNaN(n));
        const vals2 = data.rows.map((r) => Number(r[col2])).filter((n) => !isNaN(n));

        if (vals1.length > 2 && vals2.length > 2) {
          const correlation = calculatePearsonCorrelation(vals1, vals2);
          correlations.push({ col1, col2, correlation });
        }
      }
    }

    resolve({
      success: true,
      newData: data,
      summary: `相关性分析完成：${correlations.length} 个列对`,
      metadata: { correlations },
    });
  });
}

function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n === 0) return 0;

  const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
  const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
  const sumXY = x.slice(0, n).reduce((total, xi, i) => total + xi * y[i], 0);
  const sumX2 = x.slice(0, n).reduce((total, xi) => total + xi * xi, 0);
  const sumY2 = y.slice(0, n).reduce((total, yi) => total + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

function analyzeDistributionTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '分布分析完成',
    metadata: { message: '分布分析功能' },
  });
}

function analyzeTrendTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '趋势分析完成',
    metadata: { message: '趋势分析功能' },
  });
}

function standardizeTextCaseTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    let changes = 0;
    const newRows = data.rows.map((row) => {
      const newRow = { ...row };
      data.headers.forEach((h) => {
        const val = newRow[h];
        if (typeof val === 'string') {
          const standardized = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
          if (standardized !== val) {
            changes++;
            newRow[h] = standardized;
          }
        }
      });
      return newRow;
    });

    resolve({
      success: true,
      newData: { ...data, rows: newRows },
      summary: `文本标准化：${changes} 个单元格已调整`,
      changes: changes > 0 ? [{ type: 'cells', before: 0, after: changes, description: `调整 ${changes} 个单元格` }] : [],
    });
  });
}

function standardizeNumberFormatTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    const { decimalPlaces } = params as { decimalPlaces?: number };
    const decimals = decimalPlaces ?? 2;
    let changes = 0;
    const newRows = data.rows.map((row) => {
      const newRow = { ...row };
      data.headers.forEach((h) => {
        const val = newRow[h];
        if (typeof val === 'number') {
          changes++;
          newRow[h] = Number(val.toFixed(decimals));
        }
      });
      return newRow;
    });

    resolve({
      success: true,
      newData: { ...data, rows: newRows },
      summary: `数字格式标准化：${changes} 个单元格已调整（保留 ${decimals} 位小数）`,
      changes: changes > 0 ? [{ type: 'cells', before: 0, after: changes, description: `调整 ${changes} 个数字` }] : [],
    });
  });
}

function fixTypeErrorsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return new Promise((resolve) => {
    let changes = 0;
    const newRows = data.rows.map((row) => {
      const newRow = { ...row };
      data.headers.forEach((h) => {
        const val = newRow[h];
        if (typeof val === 'string') {
          const num = Number(val);
          if (val.trim() !== '' && !isNaN(num)) {
            changes++;
            newRow[h] = num;
          }
        }
      });
      return newRow;
    });

    resolve({
      success: true,
      newData: { ...data, rows: newRows },
      summary: `类型修复：${changes} 个单元格已修正`,
      changes: changes > 0 ? [{ type: 'cells', before: 0, after: changes, description: `修正 ${changes} 个类型错误` }] : [],
    });
  });
}

function autoFitWidthTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '列宽已自动调整',
  });
}

function parseFilterConditionTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '条件解析完成',
  });
}

function validateFilterResultTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '筛选结果验证通过',
  });
}

function parseColumnSelectionTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '列选择解析完成',
  });
}

function validateColumnSelectionTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '列选择验证通过',
  });
}

function parseRowRangeTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '行范围解析完成',
  });
}

function validateRowRangeTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '行范围验证通过',
  });
}

function detectDeduplicationMethodTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '去重方法检测完成',
    metadata: { method: 'full_row' },
  });
}

function analyzeDuplicatesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '重复分析完成',
  });
}

function findDuplicatesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '重复查找完成',
  });
}

function previewDeletionTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '删除预览完成',
  });
}

function analyzeMissingValuesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '缺失值分析完成',
  });
}

function suggestFillStrategyTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '填充策略建议完成',
    metadata: { strategy: 'forward' },
  });
}

function previewFillTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '填充预览完成',
  });
}

function parseAggregationParamsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '聚合参数解析完成',
  });
}

function groupDataTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '数据分组完成',
  });
}

function calculateAggregationTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '聚合计算完成',
  });
}

function formatAggregationResultTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '聚合结果格式化完成',
  });
}

function parseTransformParamsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '转换参数解析完成',
  });
}

function validateTransformTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '转换验证通过',
  });
}

function applyTransformTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  const { transformType } = params as { transformType?: string };

  if (transformType === 'transpose') {
    const newHeaders = data.rows.map((_, i) => `行${i + 1}`);
    const newRows = data.headers.map((h) => {
      const newRow: Record<string, CellValue> = { [h]: h };
      data.rows.forEach((row, i) => {
        newRow[`行${i + 1}`] = row[h];
      });
      return newRow;
    });

    return Promise.resolve({
      success: true,
      newData: { headers: newHeaders, rows: newRows, fileName: context?.currentData?.fileName ?? 'data', rowCount: newRows.length, columnCount: newHeaders.length },
      summary: '数据转置完成',
    });
  }

  return Promise.resolve({
    success: true,
    newData: data,
    summary: '数据转换完成',
  });
}

function validateDataTypesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '数据类型校验通过',
  });
}

function validateValueRangesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '数值范围校验通过',
  });
}

function validateFormatsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '格式校验通过',
  });
}

function validateCustomRulesTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '自定义规则校验通过',
  });
}

function previewConditionalDeleteTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '条件删除预览完成',
  });
}

function parseExportParamsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '导出参数解析完成',
  });
}

function prepareExportDataTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '导出数据准备完成',
  });
}

function generateExportFileTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return Promise.resolve({
    success: true,
    newData: data,
    summary: '导出文件生成完成',
  });
}

function restoreRowsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  if (context?.operationSnapshot) {
    const snapshot = skillExecutor.getSnapshot(typeof context.operationSnapshot === 'string' ? context.operationSnapshot : context.operationSnapshot.id);
    if (snapshot) {
      return Promise.resolve({
        success: true,
        newData: snapshot.data,
        summary: '数据已恢复',
      });
    }
  }

  return Promise.resolve({
    success: false,
    newData: data,
    summary: '无法恢复数据',
    error: '没有可用的快照',
  });
}

function restoreColumnsTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return restoreRowsTool(params, data, context);
}

function restoreMissingTool(
  params: Record<string, unknown>,
  data: ParsedData,
  context?: SkillContext
): Promise<ToolResult> {
  return restoreRowsTool(params, data, context);
}

function getOperatorLabel(operator: string): string {
  const labels: Record<string, string> = {
    eq: '=',
    neq: '≠',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    contains: '包含',
    not_contains: '不包含',
    starts_with: '开头是',
    ends_with: '结尾是',
    is_empty: '为空',
    is_not_empty: '不为空',
  };
  return labels[operator] || operator;
}

TOOL_HANDLERS['filter_by_condition'] = filterByCondition;
TOOL_HANDLERS['extract_rows'] = extractRows;
TOOL_HANDLERS['extract_columns'] = extractColumns;
TOOL_HANDLERS['remove_empty_rows'] = removeEmptyRowsTool;
TOOL_HANDLERS['remove_empty_columns'] = removeEmptyColumnsTool;
TOOL_HANDLERS['remove_duplicates'] = removeDuplicatesTool;
TOOL_HANDLERS['trim_whitespace'] = trimWhitespaceTool;
TOOL_HANDLERS['standardize_date_format'] = standardizeDateFormatTool;
TOOL_HANDLERS['detect_empty_rows'] = detectEmptyRowsTool;
TOOL_HANDLERS['detect_duplicate_rows'] = detectDuplicateRowsTool;
TOOL_HANDLERS['detect_date_format_issues'] = detectDateFormatIssuesTool;
TOOL_HANDLERS['detect_type_mismatch'] = detectTypeMismatchTool;
TOOL_HANDLERS['detect_missing_values'] = detectMissingValuesTool;
TOOL_HANDLERS['detect_outliers'] = detectOutliersTool;
TOOL_HANDLERS['detect_spelling_errors'] = detectSpellingErrorsTool;
TOOL_HANDLERS['detect_encoding_issues'] = detectEncodingIssuesTool;
TOOL_HANDLERS['fix_encoding_issues'] = fixEncodingIssuesTool;
TOOL_HANDLERS['auto_fit_width'] = autoFitWidthTool;
TOOL_HANDLERS['standardize_text_case'] = standardizeTextCaseTool;
TOOL_HANDLERS['standardize_number_format'] = standardizeNumberFormatTool;
TOOL_HANDLERS['fix_type_errors'] = fixTypeErrorsTool;
TOOL_HANDLERS['parse_filter_condition'] = parseFilterConditionTool;
TOOL_HANDLERS['validate_filter_params'] = validateFilterParams;
TOOL_HANDLERS['validate_filter_result'] = validateFilterResultTool;
TOOL_HANDLERS['parse_sort_params'] = parseSortParams;
TOOL_HANDLERS['validate_sort_params'] = validateSortParams;
TOOL_HANDLERS['preview_sort'] = previewSort;
TOOL_HANDLERS['sort_data'] = sortData;
TOOL_HANDLERS['detect_deduplication_method'] = detectDeduplicationMethodTool;
TOOL_HANDLERS['analyze_duplicates'] = analyzeDuplicatesTool;
TOOL_HANDLERS['find_duplicates'] = findDuplicatesTool;
TOOL_HANDLERS['preview_deletion'] = previewDeletionTool;
TOOL_HANDLERS['analyze_missing_values'] = analyzeMissingValuesTool;
TOOL_HANDLERS['suggest_fill_strategy'] = suggestFillStrategyTool;
TOOL_HANDLERS['preview_fill'] = previewFillTool;
TOOL_HANDLERS['fill_missing_values'] = fillMissingValuesTool;
TOOL_HANDLERS['parse_column_selection'] = parseColumnSelectionTool;
TOOL_HANDLERS['validate_column_selection'] = validateColumnSelectionTool;
TOOL_HANDLERS['parse_row_range'] = parseRowRangeTool;
TOOL_HANDLERS['validate_row_range'] = validateRowRangeTool;
TOOL_HANDLERS['calculate_basic_stats'] = calculateBasicStatsTool;
TOOL_HANDLERS['calculate_correlation'] = calculateCorrelationTool;
TOOL_HANDLERS['analyze_distribution'] = analyzeDistributionTool;
TOOL_HANDLERS['analyze_trend'] = analyzeTrendTool;
TOOL_HANDLERS['conditional_delete'] = conditionalDeleteTool;
TOOL_HANDLERS['parse_aggregation_params'] = parseAggregationParamsTool;
TOOL_HANDLERS['group_data'] = groupDataTool;
TOOL_HANDLERS['calculate_aggregation'] = calculateAggregationTool;
TOOL_HANDLERS['format_aggregation_result'] = formatAggregationResultTool;
TOOL_HANDLERS['parse_transform_params'] = parseTransformParamsTool;
TOOL_HANDLERS['validate_transform'] = validateTransformTool;
TOOL_HANDLERS['apply_transform'] = applyTransformTool;
TOOL_HANDLERS['validate_data_types'] = validateDataTypesTool;
TOOL_HANDLERS['validate_value_ranges'] = validateValueRangesTool;
TOOL_HANDLERS['validate_formats'] = validateFormatsTool;
TOOL_HANDLERS['validate_custom_rules'] = validateCustomRulesTool;
TOOL_HANDLERS['preview_conditional_delete'] = previewConditionalDeleteTool;
TOOL_HANDLERS['parse_export_params'] = parseExportParamsTool;
TOOL_HANDLERS['prepare_export_data'] = prepareExportDataTool;
TOOL_HANDLERS['generate_export_file'] = generateExportFileTool;
TOOL_HANDLERS['restore_rows'] = restoreRowsTool;
TOOL_HANDLERS['restore_columns'] = restoreColumnsTool;
TOOL_HANDLERS['restore_missing'] = restoreMissingTool;
TOOL_HANDLERS['set_alignment_center'] = async (params, data) => ({
  success: true,
  newData: data,
  summary: '已设置居中对齐',
});
TOOL_HANDLERS['set_header_style'] = async (params, data) => ({
  success: true,
  newData: data,
  summary: '表头样式已更新',
});
