import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-middleware';
import { getUserByIdAsync, getLoginLogsByUsernameAsync } from '@/lib/auth-server';
import { sanitizeUser } from '@/lib/auth';

/**
 * GET /api/auth/export-data - 导出用户个人数据（GDPR 数据可携带权）
 * 返回 JSON 格式的用户所有个人数据
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error || !authResult.userId) {
      return NextResponse.json({ error: authResult.error || '请先登录' }, { status: authResult.status || 401 });
    }

    const user = await getUserByIdAsync(authResult.userId);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 收集所有用户相关数据
    const exportData = {
      exportDate: new Date().toISOString(),
      notice: '本文件包含您在 DataInsight 平台的所有个人数据，依据 GDPR 第20条（数据可携带权）导出。',
      user: {
        username: user.username,
        email: user.email || '',
        name: user.name,
        role: user.role,
        status: user.status,
        securityQuestion: user.securityQuestion || '',
        createdAt: user.createdAt,
      },
      loginLogs: (await getLoginLogsByUsernameAsync(user.username)).map(log => ({
        username: log.username,
        status: log.status,
        createdAt: log.createdAt,
      })),
      // localStorage 存储的数据（仅列出与用户相关的配置类数据）
      browserStorage: {
        notice: '以下数据存储在浏览器本地，不会上传到服务器。如需完整导出，请在浏览器控制台执行 localStorage 导出。',
        items: [
          'dashboard-config (仪表盘配置)',
          'custom-metrics (自定义指标)',
          'alert-rules (告警规则)',
          'form-config (表单配置)',
          'clean-templates (清洗模板)',
        ],
      },
    };

    // 返回 JSON 文件下载
    const jsonStr = JSON.stringify(exportData, null, 2);
    return new NextResponse(jsonStr, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="datainsight-export-${user.username}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('[Auth] Export data error:', error);
    return NextResponse.json({ error: '导出数据失败' }, { status: 500 });
  }
}
