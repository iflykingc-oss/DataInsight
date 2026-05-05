/**
 * API 工具函数
 * 统一的响应格式、错误处理、性能监控
 */

import { NextResponse } from 'next/server';
import { withSecurityHeaders } from './validation';

// ============================================================
// 统一响应格式
// ============================================================

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  details?: Array<{ field: string; message: string }>;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    timestamp?: string;
    durationMs?: number;
  };
}

export function successResponse<T>(data: T, meta?: APIResponse<T>['meta']): NextResponse {
  return withSecurityHeaders(NextResponse.json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  }));
}

export function errorResponse(
  message: string,
  status: number = 500,
  details?: Array<{ field: string; message: string }>
): NextResponse {
  return withSecurityHeaders(NextResponse.json({
    success: false,
    error: message,
    details,
    meta: { timestamp: new Date().toISOString() },
  }, { status }));
}

// ============================================================
// API 路由包装器（自动处理错误和性能监控）
// ============================================================

export interface APIHandlerOptions {
  requireAuth?: boolean;
  requireAdmin?: boolean;
  validateBody?: boolean;
}

export function createAPIHandler<T>(
  handler: (req: Request) => Promise<T>,
  options: { requireAuth?: boolean; requireAdmin?: boolean } = {}
) {
  return async (req: Request): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      const data = await handler(req);
      return successResponse(data, { durationMs: Date.now() - startTime });
    } catch (error) {
      const message = error instanceof Error ? error.message : '服务器内部错误';
      const status = (error as { status?: number }).status || 500;
      return errorResponse(message, status);
    }
  };
}

// ============================================================
// 性能监控
// ============================================================

export class PerformanceMonitor {
  private metrics: Array<{
    name: string;
    duration: number;
    timestamp: number;
    success: boolean;
  }> = [];
  private maxSize = 1000;

  record(name: string, duration: number, success: boolean): void {
    this.metrics.push({ name, duration, timestamp: Date.now(), success });
    if (this.metrics.length > this.maxSize) {
      this.metrics = this.metrics.slice(-this.maxSize);
    }
  }

  getAverage(name: string, timeWindowMs = 3600000): number {
    const cutoff = Date.now() - timeWindowMs;
    const relevant = this.metrics.filter(m => m.name === name && m.timestamp > cutoff);
    if (relevant.length === 0) return 0;
    return relevant.reduce((sum, m) => sum + m.duration, 0) / relevant.length;
  }

  getStats(name?: string): { count: number; avgDuration: number; successRate: number } {
    const relevant = name ? this.metrics.filter(m => m.name === name) : this.metrics;
    if (relevant.length === 0) return { count: 0, avgDuration: 0, successRate: 0 };

    const avgDuration = relevant.reduce((sum, m) => sum + m.duration, 0) / relevant.length;
    const successRate = relevant.filter(m => m.success).length / relevant.length;
    return { count: relevant.length, avgDuration, successRate };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// ============================================================
// 缓存工具
// ============================================================

export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================
// 数据脱敏工具
// ============================================================

export function maskApiKey(key: string): string {
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

// ============================================================
// 数据大小格式化
// ============================================================

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
