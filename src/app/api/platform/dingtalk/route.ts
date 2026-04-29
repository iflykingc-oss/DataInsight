import { NextResponse } from 'next/server';
import type { ConnectResult } from '@/lib/platform-types';

const DINGTALK_BASE_URL = 'https://api.dingtalk.com';

interface DingTalkCredentials {
  appKey: string;
  appSecret: string;
}

interface DingTalkTokenResponse {
  errcode: number;
  errmsg: string;
  access_token: string;
  expire_in: number;
}

interface DingTalkAttendanceRecord {
  userId: string;
  workDate: string;
  checkType: string;
  timeResult: string;
  locationMethod: string;
  sourceType: string;
  userAddress: string;
  userLongitude: number;
  userLatitude: number;
}

interface DingTalkAttendanceResponse {
  errcode: number;
  errmsg: string;
  result: {
    recordList: DingTalkAttendanceRecord[];
    nextCursor: number;
    hasMore: boolean;
  };
}

async function getDingTalkToken(credentials: DingTalkCredentials): Promise<{ token: string; error?: string }> {
  try {
    const response = await fetch(`${DINGTALK_BASE_URL}/v1.0/oauth2/accessToken`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appKey: credentials.appKey,
        appSecret: credentials.appSecret,
      }),
    });

    const data: DingTalkTokenResponse = await response.json();

    if (data.errcode !== 0 && data.errcode !== 40001) {
      return { token: '', error: `获取访问令牌失败: ${data.errmsg}` };
    }

    return { token: data.access_token };
  } catch (error) {
    return { token: '', error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

async function fetchDingTalkAttendance(
  token: string,
  workDateFrom: string,
  workDateTo: string,
  offset: number = 0,
  limit: number = 50
): Promise<{ records: DingTalkAttendanceRecord[]; nextCursor: number; hasMore: boolean; error?: string }> {
  try {
    const response = await fetch(`${DINGTALK_BASE_URL}/v1.0/attendance/records/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-acs-dingtalk-access-token': token,
      },
      body: JSON.stringify({
        workDateFrom,
        workDateTo,
        offset,
        limit,
      }),
    });

    const data: DingTalkAttendanceResponse = await response.json();

    if (data.errcode !== 0) {
      return { records: [], nextCursor: 0, hasMore: false, error: `获取考勤记录失败: ${data.errmsg}` };
    }

    return {
      records: data.result.recordList,
      nextCursor: data.result.nextCursor,
      hasMore: data.result.hasMore,
    };
  } catch (error) {
    return { records: [], nextCursor: 0, hasMore: false, error: `网络错误: ${error instanceof Error ? error.message : '未知错误'}` };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, credentials, workDateFrom, workDateTo } = body;

    if (!credentials?.appKey || !credentials?.appSecret) {
      return NextResponse.json<ConnectResult>(
        { success: false, message: '请提供 App Key 和 App Secret' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'connect': {
        const { token, error } = await getDingTalkToken(credentials);
        if (error) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: error },
            { status: 400 }
          );
        }

        return NextResponse.json<ConnectResult>({
          success: true,
          message: '连接成功',
          platform: 'dingtalk',
        });
      }

      case 'sync': {
        if (!workDateFrom || !workDateTo) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: '请提供考勤日期范围' },
            { status: 400 }
          );
        }

        const { token, error: tokenError } = await getDingTalkToken(credentials);
        if (tokenError) {
          return NextResponse.json<ConnectResult>(
            { success: false, message: tokenError },
            { status: 400 }
          );
        }

        const allRecords: Record<string, unknown>[] = [];
        let cursor = 0;
        let hasMore = true;
        let totalFetched = 0;

        while (hasMore) {
          const { records, nextCursor, hasMore: more, error } = await fetchDingTalkAttendance(
            token,
            workDateFrom,
            workDateTo,
            cursor,
            100
          );

          if (error) {
            return NextResponse.json<ConnectResult>(
              { success: false, message: error },
              { status: 400 }
            );
          }

          records.forEach((record) => {
            allRecords.push({
              userId: record.userId,
              workDate: record.workDate,
              checkType: record.checkType,
              timeResult: record.timeResult,
              locationMethod: record.locationMethod,
              sourceType: record.sourceType,
              address: record.userAddress,
              longitude: record.userLongitude,
              latitude: record.userLatitude,
            });
          });

          totalFetched += records.length;
          cursor = nextCursor;
          hasMore = more;

          if (totalFetched >= 10000) {
            break;
          }
        }

        return NextResponse.json<ConnectResult>({
          success: true,
          message: `同步成功，共 ${allRecords.length} 条记录`,
          platform: 'dingtalk',
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
