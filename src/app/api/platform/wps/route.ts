import { NextResponse } from 'next/server';
import type { ConnectResult } from '@/lib/platform-types';

const WPS_BASE_URL = 'https://docs-api.kdocs.cn';

interface WPSCredentials {
  apiKey: string;
  apiSecret?: string;
}

interface WPSDocument {
  docId: string;
  name: string;
  type: string;
  createdAt: string;
  modifiedAt: string;
}

interface WPSAuthResponse {
  code: number;
  message: string;
  data: {
    access_token: string;
    expires_in: number;
  };
}

interface WPSDocumentListResponse {
  code: number;
  message: string;
  data: {
    docs: WPSDocument[];
    nextToken?: string;
    hasMore: boolean;
  };
}

interface WPSDocumentContentResponse {
  code: number;
  message: string;
  data: {
    content: string;
    title?: string;
  };
}

async function getWPSToken(credentials: WPSCredentials): Promise<{ token: string; error?: string }> {
  try {
    const response = await fetch(`${WPS_BASE_URL}/api/v1/oauth2/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret || '',
        grant_type: 'client_credentials',
      }),
    });

    const data: WPSAuthResponse = await response.json();

    if (data.code !== 0) {
      return { token: '', error: `获取访问令牌失败: ${data.message}` };
    }

    return { token: data.data.access_token };
  } catch (error) {
    return { token: '', error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

async function listWPSDocuments(token: string, limit: number = 20): Promise<{ documents: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const response = await fetch(`${WPS_BASE_URL}/api/v1/docs?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data: WPSDocumentListResponse = await response.json();

    if (data.code !== 0) {
      return { documents: [], error: `获取文档列表失败: ${data.message}` };
    }

    return {
      documents: data.data.docs.map((doc) => ({
        id: doc.docId,
        name: doc.name,
      })),
    };
  } catch (error) {
    return { documents: [], error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

async function fetchWPSDocumentContent(token: string, docId: string): Promise<{ content: Record<string, unknown>; error?: string }> {
  try {
    const response = await fetch(`${WPS_BASE_URL}/api/v1/docs/${docId}/content`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data: WPSDocumentContentResponse = await response.json();

    if (data.code !== 0) {
      return { content: {}, error: `获取文档内容失败: ${data.message}` };
    }

    return {
      content: {
        title: data.data.title || '未命名文档',
        content: data.data.content,
      },
    };
  } catch (error) {
    return { content: {}, error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, credentials, docId } = body;

    if (!credentials?.apiKey) {
      return NextResponse.json<ConnectResult>(
        { success: false, message: '请提供 API Key' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'connect': {
        const { token, error } = await getWPSToken(credentials);
        if (error) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: error },
            { status: 400 }
          );
        }

        const { documents, error: listError } = await listWPSDocuments(token);
        if (listError) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: listError },
            { status: 400 }
          );
        }

        return NextResponse.json<ConnectResult>({
          success: true,
          message: '连接成功',
          platform: 'wps',
          tables: documents,
        });
      }

      case 'sync': {
        if (!docId) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: '请提供文档 ID' },
            { status: 400 }
          );
        }

        const { token, error: tokenError } = await getWPSToken(credentials);
        if (tokenError) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: tokenError },
            { status: 400 }
          );
        }

        const { content, error: contentError } = await fetchWPSDocumentContent(token, docId);
        if (contentError) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: contentError },
            { status: 400 }
          );
        }

        return NextResponse.json<ConnectResult>({
          success: true,
          message: '同步成功',
          platform: 'wps',
        });
      }

      default:
        return NextResponse.json<ConnectResult>(
          { success: false, message: '未知操作' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json<ConnectResult>(
      { success: false, message: `请求错误: ${error instanceof Error ? error.message : '未知错误'}` },
      { status: 500 }
    );
  }
}
