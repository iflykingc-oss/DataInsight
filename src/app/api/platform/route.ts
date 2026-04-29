import { NextResponse } from 'next/server';
import type { ConnectResult, PlatformType } from '@/lib/platform-types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, action, credentials, ...params } = body;

    if (!platform || !action || !credentials) {
      return NextResponse.json<ConnectResult>(
        { success: false, message: '缺少必要参数' },
        { status: 400 }
      );
    }

    const platformEndpoints: Record<PlatformType, string> = {
      feishu: '/api/platform/feishu',
      wechat: '/api/platform/wechat',
      dingtalk: '/api/platform/dingtalk',
      wps: '/api/platform/wps',
    };

    const endpoint = platformEndpoints[platform as PlatformType];
    if (!endpoint) {
      return NextResponse.json<ConnectResult>(
        { success: false, message: `不支持的平台: ${platform}` },
        { status: 400 }
      );
    }

    const apiRequestBody: Record<string, unknown> = {
      action,
      credentials,
      ...params,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiRequestBody),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    return NextResponse.json<ConnectResult>(
      { success: false, message: `请求错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
