import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, verifyAuth } from '@/lib/auth-middleware';
import { getAIConfig, updateAIConfig } from '@/lib/auth';
import { validate, withSecurityHeaders } from '@/lib/validation';
import { logAdminAction, maskSensitiveData } from '@/lib/audit-logger';

// GET /api/admin/ai-config - 获取AI配置（管理员可编辑，普通用户只读）
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  const config = getAIConfig();
  // 普通用户不返回API Key
  if (auth.user!.role !== 'admin') {
    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        baseUrl: config.baseUrl,
        modelName: config.modelName,
        // apiKey 不返回给普通用户
      },
    }));
  }

  return withSecurityHeaders(NextResponse.json({ success: true, data: maskSensitiveData(config as unknown as Record<string, unknown>) }));
}

// PUT /api/admin/ai-config - 更新AI配置（仅管理员）
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  try {
    const body = await request.json();

    const validation = validate(body, {
      apiKey: { type: 'string', maxLength: 500 },
      baseUrl: { type: 'url' },
      modelName: { type: 'string', maxLength: 100 },
    });

    if (!validation.valid) {
      return withSecurityHeaders(NextResponse.json(
        { error: '输入验证失败', details: validation.errors },
        { status: 400 }
      ));
    }

    const { apiKey, baseUrl, modelName } = validation.sanitized;

    const config = updateAIConfig({
      apiKey: apiKey !== undefined ? (apiKey as string) : undefined,
      baseUrl: baseUrl !== undefined ? (baseUrl as string) : undefined,
      modelName: modelName !== undefined ? (modelName as string) : undefined,
      updatedBy: auth.user!.id,
    });

    logAdminAction('UPDATE_AI_CONFIG', 'success', {
      userId: auth.user!.id,
      username: auth.user!.username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      details: maskSensitiveData({ baseUrl: config.baseUrl, modelName: config.modelName }),
    });

    return withSecurityHeaders(NextResponse.json({ success: true, data: maskSensitiveData(config as unknown as Record<string, unknown>) }));
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败';
    logAdminAction('UPDATE_AI_CONFIG', 'failure', {
      userId: auth.user!.id,
      username: auth.user!.username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      errorMessage: message,
    });
    return withSecurityHeaders(NextResponse.json({ error: message }, { status: 500 }));
  }
}
