export interface WorkerTask<T = unknown> {
  id: string;
  type: string;
  payload: unknown;
  priority?: number;
}

export interface WorkerResult<T = unknown> {
  taskId: string;
  success: boolean;
  data?: T;
  error?: string;
  executionTime: number;
}

export type TaskHandler<T, R> = (payload: T) => Promise<R>;

export class TaskQueue {
  private static instance: TaskQueue;
  private queue: WorkerTask[] = [];
  private isProcessing = false;
  private handlers = new Map<string, TaskHandler<unknown, unknown>>();
  private results = new Map<string, WorkerResult>();
  private listeners = new Map<string, Array<(result: WorkerResult) => void>>();

  static getInstance(): TaskQueue {
    if (!TaskQueue.instance) {
      TaskQueue.instance = new TaskQueue();
    }
    return TaskQueue.instance;
  }

  registerHandler<T, R>(type: string, handler: TaskHandler<T, R>): void {
    this.handlers.set(type, handler as TaskHandler<unknown, unknown>);
  }

  async addTask<T>(type: string, payload: T, priority = 0): Promise<string> {
    const task: WorkerTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      payload,
      priority,
    };

    this.queue.push(task);
    this.queue.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    this.notifyListeners(task.id);

    if (!this.isProcessing) {
      this.processNext();
    }

    return task.id;
  }

  getResult<T>(taskId: string): WorkerResult<T> | undefined {
    return this.results.get(taskId) as WorkerResult<T> | undefined;
  }

  onResult(taskId: string, callback: (result: WorkerResult) => void): void {
    const existing = this.listeners.get(taskId) || [];
    existing.push(callback);
    this.listeners.set(taskId, existing);
  }

  private notifyListeners(taskId: string): void {
    const listeners = this.listeners.get(taskId);
    if (listeners) {
      const result = this.results.get(taskId);
      if (result) {
        listeners.forEach(cb => cb(result));
        this.listeners.delete(taskId);
      }
    }
  }

  private async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift();

    if (!task) {
      this.isProcessing = false;
      return;
    }

    const handler = this.handlers.get(task.type);
    const startTime = Date.now();

    if (!handler) {
      const result: WorkerResult = {
        taskId: task.id,
        success: false,
        error: `未找到任务处理器: ${task.type}`,
        executionTime: 0,
      };
      this.results.set(task.id, result);
      this.notifyListeners(task.id);
      this.processNext();
      return;
    }

    try {
      const data = await handler(task.payload);
      const result: WorkerResult = {
        taskId: task.id,
        success: true,
        data,
        executionTime: Date.now() - startTime,
      };
      this.results.set(task.id, result);
      this.notifyListeners(task.id);
    } catch (error) {
      const result: WorkerResult = {
        taskId: task.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
      this.results.set(task.id, result);
      this.notifyListeners(task.id);
    }

    this.processNext();
  }

  clear(): void {
    this.queue = [];
    this.results.clear();
    this.isProcessing = false;
  }

  getStats(): { pending: number; completed: number; handlers: number } {
    return {
      pending: this.queue.length,
      completed: this.results.size,
      handlers: this.handlers.size,
    };
  }
}

export const taskQueue = TaskQueue.getInstance();

taskQueue.registerHandler('analyze', async (payload: unknown) => {
  const { parseFile, analyzeData } = await import('@/lib/data-processor');
  const data = await parseFile(payload as File);
  return analyzeData(data);
});

taskQueue.registerHandler('clean', async (payload: unknown) => {
  const { cleanData } = await import('@/lib/data-processor');
  const { data, strategies } = payload as { data: import('@/types').ParsedData; strategies: Record<string, string> };
  return cleanData(data, strategies);
});

taskQueue.registerHandler('aggregate', async (payload: unknown) => {
  const { aggregateData } = await import('@/lib/data-processor');
  const { data, groupBy, aggregations } = payload as {
    data: import('@/types').ParsedData;
    groupBy: string[];
    aggregations: { field: string; operation: 'sum' | 'avg' | 'count' | 'min' | 'max' }[];
  };
  return aggregateData(data, groupBy, aggregations);
});
