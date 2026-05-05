import type { ParsedData, CellValue } from '@/lib/data-processor';
import type { SkillDefinition, LogEntry, ExecutionResult } from './skills/registry';

export type OperationType =
  | 'skill_execution'
  | 'manual_edit'
  | 'import'
  | 'export'
  | 'undo'
  | 'redo'
  | 'filter'
  | 'sort'
  | 'delete'
  | 'add'
  | 'modify';

export interface OperationRecord {
  id: string;
  type: OperationType;
  timestamp: number;
  description: string;
  skillId?: string;
  skillName?: string;
  beforeSnapshotId?: string;
  afterSnapshotId?: string;
  logs?: LogEntry[];
  result?: ExecutionResult;
  params?: Record<string, unknown>;
  reversible: boolean;
  userId?: string;
}

export interface DataSnapshot {
  id: string;
  data: ParsedData;
  timestamp: number;
  description: string;
  size: number;
  tags?: string[];
}

export interface SessionState {
  sessionId: string;
  createdAt: number;
  updatedAt: number;
  operations: OperationRecord[];
  snapshots: Map<string, DataSnapshot>;
  undoStack: string[];
  redoStack: string[];
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  dataSource?: string;
  rowCount: number;
  colCount: number;
  firstColumn?: string;
  lastModified?: number;
  operationCount: number;
  tags: string[];
}

export interface SessionExportData {
  sessionId: string;
  exportedAt: number;
  operations: OperationRecord[];
  finalData?: ParsedData;
  metadata: SessionMetadata;
}

export class SessionManager {
  private session: SessionState;
  private maxSnapshots: number = 50;
  private maxOperations: number = 100;
  private autoSnapshotEnabled: boolean = true;
  private snapshotThreshold: number = 10;

  constructor(data?: ParsedData) {
    this.session = this.createSession(data);
  }

  private createSession(data?: ParsedData): SessionState {
    const sessionId = crypto.randomUUID();
    const now = Date.now();

    const snapshots = new Map<string, DataSnapshot>();
    if (data) {
      const initialSnapshot = this.createSnapshot(data, '初始数据');
      snapshots.set(initialSnapshot.id, initialSnapshot);
    }

    return {
      sessionId,
      createdAt: now,
      updatedAt: now,
      operations: [],
      snapshots,
      undoStack: [],
      redoStack: [],
      metadata: {
        rowCount: data?.rows.length || 0,
        colCount: data?.headers.length || 0,
        firstColumn: data?.headers[0],
        lastModified: now,
        operationCount: 0,
        tags: [],
      },
    };
  }

  private createSnapshot(data: ParsedData, description: string, tags?: string[]): DataSnapshot {
    const serialized = JSON.stringify(data);
    return {
      id: crypto.randomUUID(),
      data: JSON.parse(serialized),
      timestamp: Date.now(),
      description,
      size: new Blob([serialized]).size,
      tags,
    };
  }

  recordOperation(
    operation: Omit<OperationRecord, 'id' | 'timestamp'>
  ): string {
    const id = crypto.randomUUID();
    const record: OperationRecord = {
      ...operation,
      id,
      timestamp: Date.now(),
    };

    this.session.operations.push(record);

    if (this.session.operations.length > this.maxOperations) {
      const removed = this.session.operations.shift();
      if (removed?.beforeSnapshotId) {
        this.session.snapshots.delete(removed.beforeSnapshotId);
      }
    }

    this.session.undoStack.push(id);
    this.session.redoStack = [];

    this.session.metadata.lastModified = Date.now();
    this.session.metadata.operationCount++;

    return id;
  }

  createSnapshotBeforeOperation(
    data: ParsedData,
    description: string,
    tags?: string[]
  ): string {
    const snapshot = this.createSnapshot(data, description, tags);
    this.session.snapshots.set(snapshot.id, snapshot);

    if (this.session.snapshots.size > this.maxSnapshots) {
      const oldestKey = this.session.snapshots.keys().next().value;
      if (oldestKey) {
        this.session.snapshots.delete(oldestKey);
      }
    }

    return snapshot.id;
  }

  undo(): {
    success: boolean;
    snapshotId?: string;
    error?: string;
  } {
    if (this.session.undoStack.length === 0) {
      return { success: false, error: '没有可撤销的操作' };
    }

    const operationId = this.session.undoStack.pop()!;
    const operation = this.session.operations.find((op) => op.id === operationId);

    if (!operation || !operation.beforeSnapshotId) {
      return { success: false, error: '找不到可撤销的操作快照' };
    }

    const snapshot = this.session.snapshots.get(operation.beforeSnapshotId);
    if (!snapshot) {
      return { success: false, error: '快照已过期或不存在' };
    }

    this.session.redoStack.push(operationId);

    this.recordOperation({
      type: 'undo',
      description: `撤销: ${operation.description}`,
      reversible: false,
      beforeSnapshotId: operation.afterSnapshotId,
      afterSnapshotId: operation.beforeSnapshotId,
    });

    return {
      success: true,
      snapshotId: operation.beforeSnapshotId,
    };
  }

  redo(): {
    success: boolean;
    snapshotId?: string;
    error?: string;
  } {
    if (this.session.redoStack.length === 0) {
      return { success: false, error: '没有可重做的操作' };
    }

    const operationId = this.session.redoStack.pop()!;
    const operation = this.session.operations.find((op) => op.id === operationId);

    if (!operation || !operation.afterSnapshotId) {
      return { success: false, error: '找不到可重做的操作' };
    }

    const snapshot = this.session.snapshots.get(operation.afterSnapshotId);
    if (!snapshot) {
      return { success: false, error: '快照已过期或不存在' };
    }

    this.session.undoStack.push(operationId);

    this.recordOperation({
      type: 'redo',
      description: `重做: ${operation.description}`,
      reversible: false,
    });

    return {
      success: true,
      snapshotId: operation.afterSnapshotId,
    };
  }

  getSnapshot(id: string): DataSnapshot | undefined {
    return this.session.snapshots.get(id);
  }

  getLatestSnapshot(): DataSnapshot | undefined {
    if (this.session.snapshots.size === 0) return undefined;
    const snapshots = Array.from(this.session.snapshots.values());
    return snapshots.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  getOperations(filter?: {
    type?: OperationType;
    skillId?: string;
    since?: number;
    until?: number;
  }): OperationRecord[] {
    let filtered = [...this.session.operations];

    if (filter?.type) {
      filtered = filtered.filter((op) => op.type === filter.type);
    }

    if (filter?.skillId) {
      filtered = filtered.filter((op) => op.skillId === filter.skillId);
    }

    if (filter?.since) {
      filtered = filtered.filter((op) => op.timestamp >= filter.since!);
    }

    if (filter?.until) {
      filtered = filtered.filter((op) => op.timestamp <= filter.until!);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getOperationById(id: string): OperationRecord | undefined {
    return this.session.operations.find((op) => op.id === id);
  }

  canUndo(): boolean {
    return this.session.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.session.redoStack.length > 0;
  }

  getUndoDescription(): string | undefined {
    if (this.session.undoStack.length === 0) return undefined;
    const lastOperationId = this.session.undoStack[this.session.undoStack.length - 1];
    const operation = this.session.operations.find((op) => op.id === lastOperationId);
    return operation?.description;
  }

  getRedoDescription(): string | undefined {
    if (this.session.redoStack.length === 0) return undefined;
    const lastRedoId = this.session.redoStack[this.session.redoStack.length - 1];
    const operation = this.session.operations.find((op) => op.id === lastRedoId);
    return operation?.description;
  }

  getSessionInfo(): {
    sessionId: string;
    operationCount: number;
    snapshotCount: number;
    canUndo: boolean;
    canRedo: boolean;
    createdAt: number;
    lastModified: number;
    duration: number;
  } {
    const now = Date.now();
    return {
      sessionId: this.session.sessionId,
      operationCount: this.session.operations.length,
      snapshotCount: this.session.snapshots.size,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      createdAt: this.session.createdAt,
      lastModified: this.session.metadata.lastModified || now,
      duration: now - this.session.createdAt,
    };
  }

  getMetadata(): SessionMetadata {
    return { ...this.session.metadata };
  }

  updateMetadata(updates: Partial<SessionMetadata>): void {
    Object.assign(this.session.metadata, updates);
  }

  addTag(tag: string): void {
    if (!this.session.metadata.tags.includes(tag)) {
      this.session.metadata.tags.push(tag);
    }
  }

  removeTag(tag: string): void {
    this.session.metadata.tags = this.session.metadata.tags.filter((t) => t !== tag);
  }

  exportSession(includeData: boolean = false): SessionExportData {
    return {
      sessionId: this.session.sessionId,
      exportedAt: Date.now(),
      operations: this.session.operations,
      finalData: includeData ? this.getLatestSnapshot()?.data : undefined,
      metadata: this.session.metadata,
    };
  }

  importSession(data: SessionExportData): void {
    this.session.sessionId = data.sessionId;
    this.session.operations = data.operations;
    this.session.metadata = data.metadata;
    this.session.updatedAt = Date.now();
  }

  clearHistory(keepLast: number = 5): void {
    if (this.session.operations.length > keepLast) {
      const toRemove = this.session.operations.slice(0, -keepLast);
      this.session.operations = this.session.operations.slice(-keepLast);

      for (const op of toRemove) {
        if (op.beforeSnapshotId) {
          this.session.snapshots.delete(op.beforeSnapshotId);
        }
        if (op.afterSnapshotId) {
          this.session.snapshots.delete(op.afterSnapshotId);
        }
      }
    }

    this.session.undoStack = [];
    this.session.redoStack = [];
  }

  reset(data?: ParsedData): void {
    const newSession = this.createSession(data);
    this.session = newSession;
  }

  setAutoSnapshot(enabled: boolean, threshold?: number): void {
    this.autoSnapshotEnabled = enabled;
    if (threshold !== undefined) {
      this.snapshotThreshold = threshold;
    }
  }

  shouldAutoSnapshot(): boolean {
    if (!this.autoSnapshotEnabled) return false;
    const opsSinceLastSnapshot = this.session.operations.filter(
      (op) => !this.session.undoStack.includes(op.id)
    ).length;
    return opsSinceLastSnapshot >= this.snapshotThreshold;
  }

  getOperationTimeline(filter?: {
    since?: number;
    until?: number;
    limit?: number;
  }): {
    date: string;
    operations: OperationRecord[];
  }[] {
    const operations = this.getOperations({
      since: filter?.since,
      until: filter?.until,
    });

    if (filter?.limit) {
      operations.length = Math.min(operations.length, filter.limit);
    }

    const groups = new Map<string, OperationRecord[]>();

    for (const op of operations) {
      const date = new Date(op.timestamp).toLocaleDateString('zh-CN');
      const existing = groups.get(date) || [];
      existing.push(op);
      groups.set(date, existing);
    }

    return Array.from(groups.entries())
      .map(([date, ops]) => ({ date, operations: ops.sort((a, b) => b.timestamp - a.timestamp) }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getStatistics(): {
    totalOperations: number;
    byType: Record<OperationType, number>;
    bySkill: Record<string, number>;
    averageOperationsPerDay: number;
    mostActiveDay: string;
    sessionDuration: number;
  } {
    const byType: Record<OperationType, number> = {
      skill_execution: 0,
      manual_edit: 0,
      import: 0,
      export: 0,
      undo: 0,
      redo: 0,
      filter: 0,
      sort: 0,
      delete: 0,
      add: 0,
      modify: 0,
    };

    const bySkill: Record<string, number> = {};

    for (const op of this.session.operations) {
      byType[op.type] = (byType[op.type] || 0) + 1;
      if (op.skillId) {
        bySkill[op.skillId] = (bySkill[op.skillId] || 0) + 1;
      }
    }

    const timeline = this.getOperationTimeline();
    const days = new Set(timeline.map((t) => t.date)).size || 1;
    const averageOperationsPerDay = this.session.operations.length / days;

    const mostActiveDay = timeline.reduce(
      (max, day) => (day.operations.length > (max?.operations.length || 0) ? day : max),
      timeline[0]
    )?.date || 'N/A';

    return {
      totalOperations: this.session.operations.length,
      byType,
      bySkill,
      averageOperationsPerDay,
      mostActiveDay,
      sessionDuration: Date.now() - this.session.createdAt,
    };
  }
}

export class OperationBuilder {
  private operation: Partial<OperationRecord> = {};

  static create(): OperationBuilder {
    return new OperationBuilder();
  }

  type(type: OperationType): this {
    this.operation.type = type;
    return this;
  }

  description(desc: string): this {
    this.operation.description = desc;
    return this;
  }

  skill(skill: SkillDefinition): this {
    this.operation.skillId = skill.id;
    this.operation.skillName = skill.name;
    return this;
  }

  beforeSnapshot(id: string): this {
    this.operation.beforeSnapshotId = id;
    return this;
  }

  afterSnapshot(id: string): this {
    this.operation.afterSnapshotId = id;
    return this;
  }

  params(params: Record<string, unknown>): this {
    this.operation.params = params;
    return this;
  }

  reversible(reversible: boolean): this {
    this.operation.reversible = reversible;
    return this;
  }

  result(result: ExecutionResult): this {
    this.operation.result = result;
    return this;
  }

  logs(logs: LogEntry[]): this {
    this.operation.logs = logs;
    return this;
  }

  build(): Omit<OperationRecord, 'id' | 'timestamp'> {
    if (!this.operation.type) {
      throw new Error('Operation type is required');
    }
    if (!this.operation.description) {
      throw new Error('Operation description is required');
    }
    return {
      type: this.operation.type,
      description: this.operation.description,
      skillId: this.operation.skillId,
      skillName: this.operation.skillName,
      beforeSnapshotId: this.operation.beforeSnapshotId,
      afterSnapshotId: this.operation.afterSnapshotId,
      params: this.operation.params,
      reversible: this.operation.reversible ?? true,
      result: this.operation.result,
      logs: this.operation.logs,
    };
  }
}

export const sessionManagerFactory = {
  create: (data?: ParsedData): SessionManager => new SessionManager(data),
};
