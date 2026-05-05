import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getUserById } from './auth';

// 安全：从环境变量读取JWT密钥，提供强默认值但优先使用环境变量
function getJwtSecret(): Uint8Array {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    return new TextEncoder().encode(envSecret);
  }
  // 降级：使用随机生成的密钥（每次重启会失效所有token，强制重新登录）
  console.warn('[Security] JWT_SECRET not configured or too short. Using ephemeral secret (all sessions will invalidate on restart).');
  return new TextEncoder().encode('datainsight-jwt-ephemeral-' + Date.now() + '-' + Math.random().toString(36).slice(2));
}

const JWT_SECRET = getJwtSecret();

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
