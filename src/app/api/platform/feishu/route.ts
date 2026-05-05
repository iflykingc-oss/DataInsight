import { NextResponse } from 'next/server';
import type { ConnectResult } from '@/lib/platform-types';

const FEISHU_BASE_URL = 'https://open.feishu.cn/open-apis';

interface FeishuCredentials {
  appId: string;
  appSecret: string;
}

interface FeishuTokenResponse {
  code: number;
  msg: string;
  tenant_access_token: string;
  expire: number;
}

interface FeishuTableListResponse {
  code: number;
  msg: string;
  data: {
    items: Array<{
      table_id: string;
      name: string;
    }>;
    has_more: boolean;
    page_token?: string;
  };
}

interface FeishuRecord extends Record<string, unknown> {
  fields?: Record<string, unknown>;
}

interface FeishuRecordListResponse {
  code: number;
  msg: string;
  data: {
    items: FeishuRecord[];
    has_more: boolean;
    page_token?: string;
    total: number;
  };
}

async function getFeishuToken(credentials: FeishuCredentials): Promise<{ token: string; error?: string }> {
  try {
    const response = await fetch(`${FEISHU_BASE_URL}/auth/v3/tenant_access_token/internal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: credentials.appId,
        app_secret: credentials.appSecret,
      }),
    });

    const data: FeishuTokenResponse = await response.json();

    if (data.code !== 0) {
      return { token: '', error: `获取访问令牌失败: ${data.msg}` };
    }

    return { token: data.tenant_access_token };
  } catch (error) {
    return { token: '', error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

async function getFeishuTables(token: string, appToken: string): Promise<{ tables: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const response = await fetch(`${FEISHU_BASE_URL}/bitable/v1/apps/${appToken}/tables`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data: FeishuTableListResponse = await response.json();

    if (data.code !== 0) {
      return { tables: [], error: `获取数据表失败: ${data.msg}` };
    }

    return {
      tables: data.data.items.map((table) => ({
        id: table.table_id,
        name: table.name,
      })),
    };
  } catch (error) {
    return { tables: [], error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

async function fetchFeishuRecords(
  token: string,
  appToken: string,
  tableId: string,
  params?: { pageSize?: number; pageToken?: string }
): Promise<{ records: FeishuRecord[]; total: number; hasMore: boolean; error?: string }> {
  try {
    const url = new URL(`${FEISHU_BASE_URL}/bitable/v1/apps/${appToken}/tables/${tableId}/records`);
    url.searchParams.set('page_size', String(params?.pageSize || 100));
    if (params?.pageToken) {
      url.searchParams.set('page_token', params.pageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data: FeishuRecordListResponse = await response.json();

    if (data.code !== 0) {
      return { records: [], total: 0, hasMore: false, error: `获取记录失败: ${data.msg}` };
    }

    return {
      records: data.data.items,
      total: data.data.total,
      hasMore: data.data.has_more,
    };
  } catch (error) {
    return { records: [], total: 0, hasMore: false, error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, credentials, appToken, tableId } = body;

    if (!credentials?.appId || !credentials?.appSecret) {
      return NextResponse.json<ConnectResult>(
        { success: false, message: '请提供 App ID 和 App Secret' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'connect': {
        const { token, error } = await getFeishuToken(credentials);
        if (error) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: error },
            { status: 400 }
          );
        }

        if (appToken) {
          const { tables, error: tableError } = await getFeishuTables(token, appToken);
          if (tableError) {
            return NextResponse.json<ConnectResult>(
              { success: false, message: tableError },
              { status: 400 }
            );
          }
          return NextResponse.json<ConnectResult>({
            success: true,
            message: '连接成功',
            platform: 'feishu',
            tables,
          });
        }

        return NextResponse.json<ConnectResult>({
          success: true,
          message: '连接成功',
          platform: 'feishu',
        });
      }

      case 'sync': {
        if (!appToken || !tableId) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: '请提供应用令牌和数据表 ID' },
            { status: 400 }
          );
        }

        const { token, error: tokenError } = await getFeishuToken(credentials);
        if (tokenError) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: tokenError },
            { status: 400 }
          );
        }

        const allRecords: Record<string, unknown>[] = [];
        let pageToken: string | undefined;
        let hasMore = true;
        let totalFetched = 0;

        while (hasMore) {
          const { records, total, hasMore: more, error } = await fetchFeishuRecords(
            token,
            appToken,
            tableId,
            { pageSize: 500, pageToken }
          );

          if (error) {
            return NextResponse.json<ConnectResult>(
              { success: false, message: error },
              { status: 400 }
            );
          }

          allRecords.push(...records.map(r => ({ fields: r.fields })));
          totalFetched += records.length;
          hasMore = more;
          pageToken = pageToken;

          if (totalFetched >= 10000) {
            break;
          }
        }

        return NextResponse.json<ConnectResult>({
          success: true,
          message: `同步成功，共 ${allRecords.length} 条记录`,
          platform: 'feishu',
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
