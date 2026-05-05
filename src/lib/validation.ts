/**
 * 统一输入验证模块
 * 为所有 API 提供严格的输入校验，防止非法数据进入系统
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// 验证规则
// ============================================================

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: (string | number)[];
  custom?: (value: unknown) => boolean | string;
}

export interface ValidationSchema {
  [key: string]: ValidationRule;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ field: string; message: string }>;
  sanitized: Record<string, unknown>;
}

// ============================================================
// 核心验证函数
// ============================================================

export function validate(data: Record<string, unknown>, schema: ValidationSchema): ValidationResult {
  const errors: Array<{ field: string; message: string }> = [];
  const sanitized: Record<string, unknown> = {};

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];

    // 必填检查
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push({ field, message: `${field} 为必填项` });
      continue;
    }

    // 未提供且非必填，跳过
    if (value === undefined || value === null) {
      continue;
    }

    // 类型检查
    if (rule.type) {
      const typeValid = checkType(value, rule.type);
      if (typeValid !== true) {
        errors.push({ field, message: typeValid });
        continue;
      }
    }

    // 字符串长度检查
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push({ field, message: `${field} 至少需要 ${rule.minLength} 个字符` });
        continue;
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push({ field, message: `${field} 最多 ${rule.maxLength} 个字符` });
        continue;
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push({ field, message: `${field} 格式不正确` });
        continue;
      }
    }

    // 数值范围检查
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({ field, message: `${field} 最小值为 ${rule.min}` });
        continue;
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({ field, message: `${field} 最大值为 ${rule.max}` });
        continue;
      }
    }

    // 枚举检查
    if (rule.enum && !rule.enum.includes(value as string | number)) {
      errors.push({ field, message: `${field} 必须是以下值之一: ${rule.enum.join(', ')}` });
      continue;
    }

    // 自定义验证
    if (rule.custom) {
      const customResult = rule.custom(value);
      if (customResult !== true) {
        errors.push({ field, message: typeof customResult === 'string' ? customResult : `${field} 验证失败` });
        continue;
      }
    }

    // 通过验证，保留值
    sanitized[field] = sanitizeValue(value, rule.type);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

function checkType(value: unknown, type: string): true | string {
  switch (type) {
    case 'string':
      return typeof value === 'string' ? true : '必须是字符串';
    case 'number':
      return typeof value === 'number' && !isNaN(value) ? true : '必须是有效数字';
    case 'boolean':
      return typeof value === 'boolean' ? true : '必须是布尔值';
    case 'array':
      return Array.isArray(value) ? true : '必须是数组';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value) ? true : '必须是对象';
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : '必须是有效邮箱';
    case 'url':
      return typeof value === 'string' && /^https?:\/\/.+/.test(value) ? true : '必须是有效URL';
    default:
      return true;
  }
}

function sanitizeValue(value: unknown, type?: string): unknown {
  if (typeof value === 'string') {
    // 基础XSS防护：移除危险标签
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  return value;
}

// ============================================================
// 常用验证模式
// ============================================================

export const Validators = {
  username: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_\-\u4e00-\u9fa5]+$/,
  },
  password: {
    type: 'string' as const,
    required: true,
    minLength: 8,
    maxLength: 128,
    custom: (v: unknown) => {
      const s = String(v);
      if (!/[A-Za-z]/.test(s)) return '密码必须包含字母';
      if (!/[0-9]/.test(s)) return '密码必须包含数字';
      return true;
    },
  },
  name: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  role: {
    type: 'string' as const,
    required: true,
    enum: ['admin', 'member'],
  },
  apiKey: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 500,
  },
  baseUrl: {
    type: 'url' as const,
    required: true,
  },
  modelName: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 100,
  },
  message: {
    type: 'string' as const,
    required: true,
    minLength: 1,
    maxLength: 10000,
  },
  pageSize: {
    type: 'number' as const,
    min: 1,
    max: 1000,
  },
  page: {
    type: 'number' as const,
    min: 1,
  },
};

// ============================================================
// API 中间件包装器
// ============================================================

export function withValidation(
  schema: ValidationSchema,
  handler: (req: NextRequest, sanitized: Record<string, unknown>) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      let body: Record<string, unknown>;
      const contentType = req.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        body = await req.json();
      } else if (contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        body = {};
        formData.forEach((value, key) => {
          body[key] = value;
        });
      } else {
        return NextResponse.json({ error: '不支持的 Content-Type' }, { status: 415 });
      }

      const result = validate(body, schema);
      if (!result.valid) {
        return NextResponse.json(
          { error: '输入验证失败', details: result.errors },
          { status: 400 }
        );
      }

      return handler(req, result.sanitized);
    } catch {
      return NextResponse.json({ error: '请求解析失败' }, { status: 400 });
    }
  };
}

// ============================================================
// 安全头中间件
// ============================================================

export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}
