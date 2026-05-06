import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyAdmin, verifyAuth } from '@/lib/auth-middleware';
import { getAIConfigAsync, saveAIConfigAsync } from '@/lib/auth-server';
import { validate, withSecurityHeaders } from '@/lib/validation';
import { logAdminAction, maskSensitiveData } from '@/lib/audit-logger';

// GET /api/admin/ai-config
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  const config = await getAIConfigAsync();
  if (auth.user!.role !== 'admin') {
    return withSecurityHeaders(NextResponse.json({
      success: true,
      data: {
        baseUrl: config.baseUrl,
        modelName: config.modelName,
      },
    }));
  }

  return withSecurityHeaders(NextResponse.json({ success: true, data: maskSensitiveData(config as unknown as Record<string, unknown>) }));
}

// PUT /api/admin/ai-config
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
    const existing = await getAIConfigAsync();

    await saveAIConfigAsync({
      id: existing.id,
      apiKey: apiKey !== undefined ? (apiKey as string) : existing.apiKey,
      baseUrl: baseUrl !== undefined ? (baseUrl as string) : existing.baseUrl,
      modelName: modelName !== undefined ? (modelName as string) : existing.modelName,
      updatedBy: auth.user!.id,
      updatedAt: new Date().toISOString(),
    });

    const updated = await getAIConfigAsync();

    logAdminAction('UPDATE_AI_CONFIG', 'success', {
      userId: auth.user!.id,
      username: auth.user!.username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      details: maskSensitiveData({ baseUrl: updated.baseUrl, modelName: updated.modelName }),
    });

    return withSecurityHeaders(NextResponse.json({ success: true, data: maskSensitiveData(updated as unknown as Record<string, unknown>) }));
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
