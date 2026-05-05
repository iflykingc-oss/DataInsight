/**
 * 熔断降级系统
 * 保护系统稳定性，防止级联故障，自动降级处理
 */

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitConfig {
  name: string;
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
  halfOpenMaxCalls: number;
  enabled: boolean;
}

export interface CircuitMetrics {
  name: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  avgResponseTime: number;
  errorRate: number;
  resetTime: number | null;
}

export interface FallbackResult<T> {
  usedFallback: boolean;
  result?: T;
  error?: string;
  source: 'primary' | 'fallback' | 'error';
}

const DEFAULT_CONFIG: Omit<CircuitConfig, 'name'> = {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  resetTimeout: 60000,
  halfOpenMaxCalls: 3,
  enabled: true,
};

type CircuitInstance = CircuitConfig & {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalCalls: number;
  totalFailures: number;
  totalSuccesses: number;
  responseTimes: number[];
  halfOpenCalls: number;
  resetTime: number | null;
};

class CircuitBreaker {
  private circuits: Map<string, CircuitInstance> = new Map();

  private listeners: Array<(name: string, state: CircuitState, metrics: CircuitMetrics) => void> = [];

  constructor() {
    // 定期检查并重置断路器
    if (typeof window !== 'undefined') {
      setInterval(() => this.checkAndReset(), 10000);
    }
  }

  /**
   * 注册熔断器
   */
  register(name: string, config?: Partial<CircuitConfig>): void {
    const fullConfig = { ...DEFAULT_CONFIG, ...config, name };
    this.circuits.set(name, {
      ...fullConfig,
      state: 'closed',
      failureCount: 0,
      successCount: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      totalCalls: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      responseTimes: [],
      halfOpenCalls: 0,
      resetTime: null,
    });
  }

  /**
   * 执行受保护的操作
   */
  async execute<T>(
    name: string,
    primaryFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<FallbackResult<T>> {
    const circuit = this.circuits.get(name);

    // 未注册的熔断器，直接执行
    if (!circuit) {
      try {
        const result = await this.executeWithTimeout(primaryFn, DEFAULT_CONFIG.timeout);
        return { usedFallback: false, result, source: 'primary' };
      } catch (error) {
        if (fallbackFn) {
          try {
            const fallbackResult = await fallbackFn();
            return { usedFallback: true, result: fallbackResult, source: 'fallback' };
          } catch {
            return { usedFallback: true, error: String(error), source: 'error' };
          }
        }
        throw error;
      }
    }

    // 检查状态
    if (!circuit.enabled) {
      return this.executePrimary(circuit, primaryFn, fallbackFn);
    }

    switch (circuit.state) {
      case 'closed':
        return this.executeClosed(circuit, name, primaryFn, fallbackFn);

      case 'open':
        return this.executeOpen(circuit, name, primaryFn, fallbackFn);

      case 'half_open':
        return this.executeHalfOpen(circuit, name, primaryFn, fallbackFn);

      default:
        return this.executePrimary(circuit, primaryFn, fallbackFn);
    }
  }

  /**
   * 关闭状态执行
   */
  private async executeClosed<T>(
    circuit: CircuitInstance,
    name: string,
    primaryFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<FallbackResult<T>> {
    const result = await this.executeWithCircuit(name, primaryFn, circuit);

    if (result.success) {
      this.onSuccess(circuit, name);
      return { usedFallback: false, result: result.data, source: 'primary' };
    } else {
      this.onFailure(circuit, name);

      if (fallbackFn && circuit.state !== 'open') {
        try {
          const fallbackResult = await fallbackFn();
          return { usedFallback: true, result: fallbackResult, source: 'fallback' };
        } catch {
          return { usedFallback: true, error: result.error, source: 'error' };
        }
      }

      return { usedFallback: false, error: result.error, source: 'primary' };
    }
  }

  /**
   * 打开状态执行
   */
  private async executeOpen<T>(
    circuit: CircuitInstance,
    name: string,
    primaryFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<FallbackResult<T>> {
    const now = Date.now();
    const resetTime = circuit.lastFailureTime! + circuit.resetTimeout;

    if (now >= resetTime) {
      // 转换到半开状态
      this.transitionTo(circuit, name, 'half_open');
      circuit.halfOpenCalls = 0;
      return this.executeHalfOpen(circuit, name, primaryFn, fallbackFn);
    }

    // 熔断打开，直接使用降级
    if (fallbackFn) {
      try {
        const fallbackResult = await fallbackFn();
        return { usedFallback: true, result: fallbackResult, source: 'fallback' };
      } catch (error) {
        return { usedFallback: true, error: String(error), source: 'error' };
      }
    }

    return {
      usedFallback: true,
      error: `Circuit breaker is open. Reset at ${new Date(resetTime).toISOString()}`,
      source: 'error',
    };
  }

  /**
   * 半开状态执行
   */
  private async executeHalfOpen<T>(
    circuit: CircuitInstance,
    name: string,
    primaryFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<FallbackResult<T>> {
    // 限制半开状态的调用次数
    if (circuit.halfOpenCalls >= circuit.halfOpenMaxCalls) {
      if (fallbackFn) {
        try {
          const fallbackResult = await fallbackFn();
          return { usedFallback: true, result: fallbackResult, source: 'fallback' };
        } catch {
          return { usedFallback: true, error: 'Circuit half-open max calls reached', source: 'error' };
        }
      }

      return {
        usedFallback: true,
        error: 'Circuit half-open max calls reached',
        source: 'error',
      };
    }

    circuit.halfOpenCalls++;

    const result = await this.executeWithCircuit(name, primaryFn, circuit);

    if (result.success) {
      this.onSuccess(circuit, name);
      return { usedFallback: false, result: result.data, source: 'primary' };
    } else {
      this.onFailure(circuit, name);

      if (fallbackFn) {
        try {
          const fallbackResult = await fallbackFn();
          return { usedFallback: true, result: fallbackResult, source: 'fallback' };
        } catch {
          return { usedFallback: true, error: result.error, source: 'error' };
        }
      }

      return { usedFallback: false, error: result.error, source: 'primary' };
    }
  }

  /**
   * 执行主逻辑
   */
  private async executePrimary<T>(
    circuit: CircuitInstance,
    primaryFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>
  ): Promise<FallbackResult<T>> {
    try {
      const result = await this.executeWithTimeout(primaryFn, circuit.timeout);
      return { usedFallback: false, result, source: 'primary' };
    } catch (error) {
      if (fallbackFn) {
        try {
          const fallbackResult = await fallbackFn();
          return { usedFallback: true, result: fallbackResult, source: 'fallback' };
        } catch {
          return { usedFallback: true, error: String(error), source: 'error' };
        }
      }
      throw error;
    }
  }

  /**
   * 带熔断跟踪的执行
   */
  private async executeWithCircuit<T>(
    name: string,
    fn: () => Promise<T>,
    circuit: CircuitInstance
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const startTime = Date.now();

    try {
      const data = await this.executeWithTimeout(fn, circuit.timeout);
      const responseTime = Date.now() - startTime;

      circuit.responseTimes.push(responseTime);
      if (circuit.responseTimes.length > 100) {
        circuit.responseTimes.shift();
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout<T>(fn: () => Promise<T>, timeout: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 成功处理
   */
  private onSuccess(circuit: CircuitInstance, name: string): void {
    circuit.failureCount = 0;
    circuit.successCount++;
    circuit.lastSuccessTime = Date.now();
    circuit.totalCalls++;
    circuit.totalSuccesses++;

    if (circuit.state === 'half_open' && circuit.successCount >= circuit.successThreshold) {
      this.transitionTo(circuit, name, 'closed');
    }
  }

  /**
   * 失败处理
   */
  private onFailure(circuit: CircuitInstance, name: string): void {
    circuit.failureCount++;
    circuit.successCount = 0;
    circuit.lastFailureTime = Date.now();
    circuit.totalCalls++;
    circuit.totalFailures++;

    if (circuit.state === 'half_open') {
      // 半开状态失败，立即打开
      this.transitionTo(circuit, name, 'open');
    } else if (circuit.state === 'closed' && circuit.failureCount >= circuit.failureThreshold) {
      // 达到失败阈值，打开熔断器
      this.transitionTo(circuit, name, 'open');
    }
  }

  /**
   * 状态转换
   */
  private transitionTo(
    circuit: CircuitInstance,
    name: string,
    newState: CircuitState
  ): void {
    const oldState = circuit.state;
    circuit.state = newState;

    if (newState === 'open') {
      circuit.resetTime = Date.now() + circuit.resetTimeout;
    } else if (newState === 'closed') {
      circuit.failureCount = 0;
      circuit.successCount = 0;
      circuit.resetTime = null;
    } else if (newState === 'half_open') {
      circuit.successCount = 0;
      circuit.halfOpenCalls = 0;
      circuit.resetTime = null;
    }

    this.notifyListeners(name, newState, this.getMetrics(name));
  }

  /**
   * 检查并重置
   */
  private checkAndReset(): void {
    for (const [name, circuit] of this.circuits.entries()) {
      if (circuit.state === 'open' && circuit.lastFailureTime) {
        if (Date.now() >= circuit.lastFailureTime + circuit.resetTimeout) {
          this.transitionTo(circuit, name, 'half_open');
        }
      }
    }
  }

  /**
   * 获取熔断器指标
   */
  getMetrics(name: string): CircuitMetrics | null {
    const circuit = this.circuits.get(name);
    if (!circuit) return null;

    const avgResponseTime =
      circuit.responseTimes.length > 0
        ? circuit.responseTimes.reduce((a, b) => a + b, 0) / circuit.responseTimes.length
        : 0;

    const errorRate =
      circuit.totalCalls > 0 ? circuit.totalFailures / circuit.totalCalls : 0;

    return {
      name: circuit.name,
      state: circuit.state,
      failureCount: circuit.failureCount,
      successCount: circuit.successCount,
      lastFailureTime: circuit.lastFailureTime,
      lastSuccessTime: circuit.lastSuccessTime,
      totalCalls: circuit.totalCalls,
      totalFailures: circuit.totalFailures,
      totalSuccesses: circuit.totalSuccesses,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Number((errorRate * 100).toFixed(2)),
      resetTime: circuit.resetTime,
    };
  }

  /**
   * 获取所有熔断器状态
   */
  getAllMetrics(): Map<string, CircuitMetrics> {
    const result = new Map<string, CircuitMetrics>();
    for (const name of this.circuits.keys()) {
      const metrics = this.getMetrics(name);
      if (metrics) {
        result.set(name, metrics);
      }
    }
    return result;
  }

  /**
   * 手动重置熔断器
   */
  reset(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      this.transitionTo(circuit, name, 'closed');
    }
  }

  /**
   * 手动打开熔断器
   */
  trip(name: string): void {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.lastFailureTime = Date.now();
      this.transitionTo(circuit, name, 'open');
    }
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: (name: string, state: CircuitState, metrics: CircuitMetrics) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(name: string, state: CircuitState, metrics: CircuitMetrics | null): void {
    if (metrics) {
      this.listeners.forEach(listener => listener(name, state, metrics));
    }
  }

  /**
   * 取消注册
   */
  unregister(name: string): void {
    this.circuits.delete(name);
  }
}

/** 全局熔断器实例 */
export const circuitBreaker = new CircuitBreaker();

// 便捷执行函数
export async function withCircuit<T>(
  name: string,
  primaryFn: () => Promise<T>,
  fallbackFn?: () => Promise<T>
): Promise<FallbackResult<T>> {
  return circuitBreaker.execute(name, primaryFn, fallbackFn);
}

// 预定义的常用熔断器
circuitBreaker.register('llm-api', {
  name: 'llm-api',
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 60000,
  resetTimeout: 120000,
  enabled: true,
});

circuitBreaker.register('skill-executor', {
  name: 'skill-executor',
  failureThreshold: 10,
  successThreshold: 5,
  timeout: 30000,
  resetTimeout: 60000,
  enabled: true,
});

circuitBreaker.register('workflow-engine', {
  name: 'workflow-engine',
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 120000,
  resetTimeout: 180000,
  enabled: true,
});
