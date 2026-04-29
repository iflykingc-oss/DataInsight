export interface ApiResponse<T = unknown> {
  success: boolean;
  status: ApiStatus;
  data?: T;
  error?: ApiError;
  timestamp: number;
}

export type ApiStatus = 'success' | 'error' | 'fail';

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
    error: { code, message, details },
    timestamp: Date.now(),
  };
}
