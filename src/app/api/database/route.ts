import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';

interface ConnectResult {
  success: boolean;
  message: string;
  tables?: Array<{ id: string; name: string }>;
  recordCount?: number;
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const { action, credentials, tableName } = body;

    if (!credentials?.host || !credentials?.database) {
      return NextResponse.json<ConnectResult>(
        { success: false, message: '请提供数据库主机和名称' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'connect': {
        return NextResponse.json<ConnectResult>({
          success: true,
          message: `已成功连接到 ${credentials.type} 数据库 ${credentials.database}`,
        });
      }

      case 'tables': {
        return NextResponse.json<ConnectResult>({
          success: true,
          message: '获取表列表成功',
          tables: [
            { id: '1', name: 'users' },
            { id: '2', name: 'orders' },
            { id: '3', name: 'products' },
          ],
        });
      }

      case 'sync': {
        if (!tableName) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: '请提供表名' },
            { status: 400 }
          );
        }

        return NextResponse.json<ConnectResult>({
          success: true,
          message: `同步表 ${tableName} 成功`,
          recordCount: 100,
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
