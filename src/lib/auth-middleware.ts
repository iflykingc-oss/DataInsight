import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, SignJWT } from 'jose';
import '@/lib/auth-server';
import { getUserByIdAsync } from '@/lib/auth-server';

// 使用稳定的 JWT 密钥，通过 globalThis 防止 HMR 导致 token 失效
const globalForJwt = globalThis as unknown as { __jwtSecret?: Uint8Array };

function getJwtSecret(): Uint8Array {
  if (globalForJwt.__jwtSecret) return globalForJwt.__jwtSecret;

  const envSecret = process.env.JWT_SECRET;
  if (envSecret && envSecret.length >= 32) {
    globalForJwt.__jwtSecret = new TextEncoder().encode(envSecret);
    return globalForJwt.__jwtSecret;
  }
  console.warn('[Security] JWT_SECRET not configured. Using default dev secret. Set JWT_SECRET env var for production.');
  globalForJwt.__jwtSecret = new TextEncoder().encode('datainsight-jwt-secret-stable-dev-key-2024');
  return globalForJwt.__jwtSecret;
}

// Access Token: 2小时有效
const ACCESS_TOKEN_EXPIRY = '2h';
// Refresh Token: 7天有效
const REFRESH_TOKEN_EXPIRY = '7d';

/** 签发 Access Token（2小时有效） */
export async function signToken(payload: { userId: number; username: string; role: string }): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(secret);
}

/** 签发 Refresh Token（7天有效） */
export async function signRefreshToken(payload: { userId: number; username: string; role: string }): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(secret);
}

/** 验证并刷新 Token 对 */
export async function refreshTokens(refreshToken: string): Promise<{
  success: boolean;
  token?: string;
  refreshToken?: string;
  error?: string;
}> {
  try {
    const { payload } = await jwtVerify(refreshToken, getJwtSecret());
    // 确保是 refresh token
    if (payload.type !== 'refresh') {
      return { success: false, error: '无效的刷新令牌' };
    }
    const userId = payload.userId as number;
    const user = await getUserByIdAsync(userId);
    if (!user || user.status === 'disabled') {
      return { success: false, error: '用户不存在或已被禁用' };
    }
    // 签发新的 token 对
    const tokenPayload = { userId: user.id, username: user.username, role: user.role };
    const newToken = await signToken(tokenPayload);
    const newRefreshToken = await signRefreshToken(tokenPayload);
    return { success: true, token: newToken, refreshToken: newRefreshToken };
  } catch {
    return { success: false, error: '刷新令牌已过期，请重新登录' };
  }
}

export async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: '未登录', status: 401, user: null };
  }

  try {
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, getJwtSecret(), { clockTolerance: 60 });

    // 拒绝 refresh token 用于 API 访问
    if (payload.type === 'refresh') {
      return { error: '请使用访问令牌', status: 401, user: null };
    }

    const userId = payload.userId as number;
    const user = await getUserByIdAsync(userId);

    if (!user) {
      return { error: '用户不存在', status: 401, user: null };
    }

    if (user.status === 'disabled') {
      return { error: '账号已被禁用', status: 403, user: null };
    }

    return { error: null, status: 200, user, userId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Token验证失败';
    if (message.includes('exp')) {
      return { error: '登录已过期，请重新登录', status: 401, user: null, expired: true };
    }
    return { error: '认证失败，请重新登录', status: 401, user: null };
  }
}

export async function verifyAdmin(request: NextRequest) {
  const result = await verifyAuth(request);
  if (result.error) return result;

  if (result.user!.role !== 'admin') {
    return { error: '需要管理员权限', status: 403, user: null };
  }

  return { error: null, status: 200, user: result.user };
}
