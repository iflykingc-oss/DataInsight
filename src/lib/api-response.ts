export type ApiStatus = 'success' | 'error' | 'fail';

export interface ApiResponse<T = unknown> {
  success: boolean;
  status: ApiStatus;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
  stack?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function createSuccessResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    status: 'success',
    data,
    timestamp: Date.now(),
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  details?: Record<string, string>
): ApiResponse<never> {
  return {
    success: false,
    status: 'error',
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
  };
}

export function createFailResponse(
  message: string,
  details?: Record<string, string>
): ApiResponse<never> {
  return {
    success: false,
    status: 'fail',
    error: {
      code: 'BUSINESS_ERROR',
      message,
      details,
    },
    timestamp: Date.now(),
  };
}

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: Record<string, string>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} 不存在或已被删除`);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '请先登录或提供有效的认证信息') {
    super('UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '您没有权限执行此操作') {
    super('FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('RATE_LIMIT_EXCEEDED', '请求过于频繁，请稍后再试', retryAfter ? { retryAfter: String(retryAfter) } : undefined);
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: string) {
    super('EXTERNAL_SERVICE_ERROR', `${service} 服务暂时不可用`, originalError ? { originalError } : undefined);
    this.name = 'ExternalServiceError';
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function getErrorCode(error: unknown): string {
  if (isAppError(error)) {
    return error.code;
  }
  if (error instanceof Error) {
    return 'INTERNAL_ERROR';
  }
  return 'UNKNOWN_ERROR';
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '发生未知错误';
}
