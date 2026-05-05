import { NextResponse } from 'next/server';
import type { ConnectResult } from '@/lib/platform-types';

const WECHAT_BASE_URL = 'https://qyapi.weixin.qq.com/cgi-bin';

interface WeChatCredentials {
  corpId: string;
  corpSecret: string;
  agentId?: string;
}

interface WeChatTokenResponse {
  errcode: number;
  errmsg: string;
  access_token: string;
  expires_in: number;
}

interface WeChatDepartment {
  id: number;
  name: string;
  parentid: number;
  order: number;
}

interface WeChatDepartmentResponse {
  errcode: number;
  errmsg: string;
  department: WeChatDepartment[];
}

interface WeChatUser {
  userid: string;
  name: string;
  department: number[];
  position?: string;
  mobile?: string;
  email?: string;
}

interface WeChatUserListResponse {
  errcode: number;
  errmsg: string;
  userlist: WeChatUser[];
}

async function getWeChatToken(credentials: WeChatCredentials): Promise<{ token: string; error?: string }> {
  try {
    const url = new URL(`${WECHAT_BASE_URL}/gettoken`);
    url.searchParams.set('corpid', credentials.corpId);
    url.searchParams.set('corpsecret', credentials.corpSecret);

    const response = await fetch(url.toString());
    const data: WeChatTokenResponse = await response.json();

    if (data.errcode !== 0) {
      return { token: '', error: `获取访问令牌失败: ${data.errmsg}` };
    }

    return { token: data.access_token };
  } catch (error) {
    return { token: '', error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

async function getWeChatDepartments(token: string): Promise<{ departments: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const url = new URL(`${WECHAT_BASE_URL}/department/list`);
    url.searchParams.set('access_token', token);

    const response = await fetch(url.toString());
    const data: WeChatDepartmentResponse = await response.json();

    if (data.errcode !== 0) {
      return { departments: [], error: `获取部门列表失败: ${data.errmsg}` };
    }

    return {
      departments: data.department.map((dept) => ({
        id: String(dept.id),
        name: dept.name,
      })),
    };
  } catch (error) {
    return { departments: [], error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

async function getWeChatUsers(token: string, departmentId: number): Promise<{ users: WeChatUser[]; error?: string }> {
  try {
    const url = new URL(`${WECHAT_BASE_URL}/user/simplelist`);
    url.searchParams.set('access_token', token);
    url.searchParams.set('department_id', String(departmentId));
    url.searchParams.set('fetch_child', '1');
    url.searchParams.set('status', '0');

    const response = await fetch(url.toString());
    const data: WeChatUserListResponse = await response.json();

    if (data.errcode !== 0) {
      return { users: [], error: `获取成员列表失败: ${data.errmsg}` };
    }

    return { users: data.userlist };
  } catch (error) {
    return { users: [], error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, credentials, departmentId } = body;

    if (!credentials?.corpId || !credentials?.corpSecret) {
      return NextResponse.json<ConnectResult>(
        { success: false, message: '请提供企业 ID 和应用密钥' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'connect': {
        const { token, error } = await getWeChatToken(credentials);
        if (error) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: error },
            { status: 400 }
          );
        }

        const { departments, error: deptError } = await getWeChatDepartments(token);
        if (deptError) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: deptError },
            { status: 400 }
          );
        }

        return NextResponse.json<ConnectResult>({
          success: true,
          message: '连接成功',
          platform: 'wechat',
          databases: departments,
        });
      }

      case 'sync': {
        if (!departmentId) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: '请提供部门 ID' },
            { status: 400 }
          );
        }

        const { token, error: tokenError } = await getWeChatToken(credentials);
        if (tokenError) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: tokenError },
            { status: 400 }
          );
        }

        const { users, error: usersError } = await getWeChatUsers(token, departmentId);
        if (usersError) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: usersError },
            { status: 400 }
          );
        }

        const allUsers: Record<string, unknown>[] = users.map((user) => ({
          userId: user.userid,
          name: user.name,
          department: user.department,
          position: user.position || '',
          mobile: user.mobile || '',
          email: user.email || '',
        }));

        return NextResponse.json<ConnectResult>({
          success: true,
          message: `同步成功，共 ${allUsers.length} 条记录`,
          platform: 'wechat',
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
