import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getUserById } from './auth';

const JWT_SECRET = new TextEncoder().encode('datainsight-jwt-secret-key-2024');

export async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: '未登录', status: 401, user: null };
  }

  try {
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    const userId = payload.userId as number;
    const user = getUserById(userId);

    if (!user) {
      return { error: '用户不存在', status: 401, user: null };
    }
    if (user.status === 'disabled') {
      return { error: '账号已被禁用', status: 403, user: null };
    }

    return { error: null, status: 200, user };
  } catch {
    return { error: '登录已过期', status: 401, user: null };
  }
}

export async function verifyAdmin(request: NextRequest) {
  const result = await verifyAuth(request);
  if (result.error) return result;
  if (result.user!.role !== 'admin') {
    return { error: '无权限', status: 403, user: null };
  }
  return result;
}
