import type { ParsedData, CellValue } from '@/lib/data-processor';
import type { Operation } from './types';

export interface SessionContext {
  sessionId: string;
  originalData: ParsedData;
  currentData: ParsedData;
  operations: Operation[];
  references: {
    '刚才': Operation | undefined;
    '那个': Operation | undefined;
    '筛选结果': Operation | undefined;
    [key: string]: Operation | undefined;
  };
  scenario: string;
}

export function createSessionContext(data: ParsedData, scenario: string = 'general'): SessionContext {
  return {
    sessionId: crypto.randomUUID(),
    originalData: data,
    currentData: data,
    operations: [],
    references: {
      '刚才': undefined,
      '那个': undefined,
      '筛选结果': undefined,
    },
    scenario,
  };
}

export function updateReferences(context: SessionContext, operation: Operation): void {
  context.operations.push(operation);

  context.references['刚才'] = operation;
  context.references['那个'] = operation;

  if (operation.tool?.startsWith('filter_')) {
    context.references['筛选结果'] = operation;
  }
}

export function resolveUndoTarget(
  context: SessionContext,
  instruction: string
): Operation | null {
  const normalized = instruction.toLowerCase();

  if (normalized.includes('撤销') || normalized.includes('取消') || normalized.includes('还原')) {
    return context.operations.at(-1) || null;
  }

  if (normalized.includes('刚才') || normalized.includes('上一步') || normalized.includes('上一个')) {
    return context.references['刚才'] || context.operations.at(-1) || null;
  }

  if (normalized.includes('那个') || normalized.includes('之前的')) {
    return context.references['那个'] || context.operations.at(-1) || null;
  }

  if (normalized.includes('筛选')) {
    return context.references['筛选结果'] || null;
  }

  return context.operations.at(-1) || null;
}

export function undo(context: SessionContext): {
  success: boolean;
  newData?: ParsedData;
  message?: string;
} {
  const lastOp = context.operations.pop();

  if (!lastOp) {
    return { success: false, message: '没有可撤销的操作' };
  }

  context.references['刚才'] = context.operations.at(-1);

  return {
    success: true,
    newData: lastOp.before,
    message: `已撤销：${lastOp.tool ?? lastOp.type}`,
  };
}

export function getOperationSummary(context: SessionContext): {
  total: number;
  byType: Record<string, number>;
  recent: Operation[];
} {
  const byType: Record<string, number> = {};

  for (const op of context.operations) {
    const key = op.tool ?? op.type ?? 'unknown';
    byType[key] = (byType[key] || 0) + 1;
  }

  return {
    total: context.operations.length,
    byType,
    recent: context.operations.slice(-5),
  };
}
