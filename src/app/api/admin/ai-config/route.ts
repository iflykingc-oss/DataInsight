import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, verifyAuth } from '@/lib/auth-middleware';
import { getAdminAIConfig, updateAdminAIConfig } from '@/lib/auth';

// GET /api/admin/ai-config - 获取AI配置（管理员可编辑，普通用户只读）
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const config = getAdminAIConfig();
  // 普通用户不返回API Key
  if (auth.user!.role !== 'admin') {
    return NextResponse.json({
      success: true,
      data: {
        baseUrl: config.baseUrl,
        modelName: config.modelName,
        // apiKey 不返回给普通用户
      },
    });
  }

  return NextResponse.json({ success: true, data: config });
}

// PUT /api/admin/ai-config - 更新AI配置（仅管理员）
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { apiKey, baseUrl, modelName } = body;

    const config = updateAdminAIConfig(
      {
        apiKey: apiKey !== undefined ? apiKey : undefined,
        baseUrl: baseUrl !== undefined ? baseUrl : undefined,
        modelName: modelName !== undefined ? modelName : undefined,
      },
      auth.user!.id
    );

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}
