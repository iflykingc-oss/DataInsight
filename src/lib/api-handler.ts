import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  RateLimitError,
  ExternalServiceError,
  createErrorResponse,
  createFailResponse,
  type ApiResponse
} from './api-response';

interface RequestHandler<T = unknown> {
  (request: NextRequest, body?: T): Promise<NextResponse<ApiResponse>>;
}

interface HandlerOptions {
  schema?: ZodSchema;
  requireAuth?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function withErrorHandling<T = unknown>(
  handler: RequestHandler<T>,
  options: HandlerOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse<ApiResponse>> => {
    try {
      let body: T | undefined;

      if (options.schema && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
        try {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const rawBody = await request.json();
            const validated: T = options.schema.parse(rawBody) as T;
            body = validated;
          } else if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const rawObject: Record<string, unknown> = {};
            formData.forEach((value, key) => {
              rawObject[key] = value;
            });
            const validated: T = options.schema.parse(rawObject) as T;
            body = validated;
          }
        } catch (error) {
          if (error instanceof ZodError) {
            const details: Record<string, string> = {};
            error.issues.forEach((issue) => {
              const path = issue.path.join('.');
              details[path] = issue.message;
            });
            return NextResponse.json(
              createErrorResponse('VALIDATION_ERROR', '请求参数验证失败', details),
              { status: 400 }
            );
          }
          throw error;
        }
      }

      const response = await handler(request, body);

      if (response.status >= 400) {
        console.warn(`[API Warning] ${request.method} ${request.url} returned ${response.status}`);
      }

      return response;

    } catch (error) {
      console.error(`[API Error] ${request.method} ${request.url}:`, error);

      if (error instanceof ValidationError) {
        return NextResponse.json(
          createErrorResponse(error.code, error.message, error.details),
          { status: 400 }
        );
      }

      if (error instanceof UnauthorizedError) {
        return NextResponse.json(
          createErrorResponse(error.code, error.message),
          { status: 401 }
        );
      }

      if (error instanceof NotFoundError) {
        return NextResponse.json(
          createErrorResponse(error.code, error.message),
          { status: 404 }
        );
      }

      if (error instanceof RateLimitError) {
        return NextResponse.json(
          createErrorResponse(error.code, error.message),
          {
            status: 429,
            headers: {
              'Retry-After': error.details?.retryAfter || '60'
            }
          }
        );
      }

      if (error instanceof ExternalServiceError) {
        return NextResponse.json(
          createErrorResponse(error.code, error.message),
          { status: 503 }
        );
      }

      if (error instanceof AppError) {
        return NextResponse.json(
          createErrorResponse(error.code, error.message),
          { status: 500 }
        );
      }

      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          return NextResponse.json(
            createErrorResponse('NETWORK_ERROR', '网络请求失败，请检查网络连接'),
            { status: 503 }
          );
        }

        if (error.message.includes('timeout')) {
          return NextResponse.json(
            createErrorResponse('TIMEOUT', '请求超时，请稍后重试'),
            { status: 504 }
          );
        }

        return NextResponse.json(
          createErrorResponse('INTERNAL_ERROR', process.env.NODE_ENV === 'development' ? error.message : '服务器内部错误'),
          { status: 500 }
        );
      }

      return NextResponse.json(
        createFailResponse('请求处理失败'),
        { status: 500 }
      );
    }
  };
}

export function withRateLimit(
  handler: RequestHandler,
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return async (request: NextRequest): Promise<NextResponse<ApiResponse>> => {
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const key = `rate:${ip}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      rateLimitMap.set(key, record);
    }

    record.count++;

    if (record.count > maxRequests) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      return NextResponse.json(
        createErrorResponse('RATE_LIMIT_EXCEEDED', `请求过于频繁，请在 ${retryAfter} 秒后重试`),
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
            'X-RateLimit-Limit': String(maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(record.resetTime)
          }
        }
      );
    }

    const response = await handler(request);

    response.headers.set('X-RateLimit-Limit', String(maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(Math.max(0, maxRequests - record.count)));
    response.headers.set('X-RateLimit-Reset', String(record.resetTime));

    return response;
  };
}

export function checkRateLimit(ip: string, maxRequests: number = 100, windowMs: number = 60000): { allowed: boolean; retryAfter?: number } {
  const key = `rate:${ip}`;
  const now = Date.now();

  let record = rateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + windowMs };
    rateLimitMap.set(key, record);
  }

  record.count++;

  if (record.count > maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((record.resetTime - now) / 1000)
    };
  }

  return { allowed: true };
}

export function sanitizeErrorForProduction(error: Error): string {
  if (process.env.NODE_ENV === 'production') {
    return '服务器发生错误，请稍后重试或联系技术支持';
  }
  return error.message;
}

export function logApiError(
  method: string,
  url: string,
  error: unknown,
  userId?: string
): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    method,
    url,
    userId,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : String(error)
  };

  console.error('[API Error]', JSON.stringify(errorInfo, null, 2));
}
