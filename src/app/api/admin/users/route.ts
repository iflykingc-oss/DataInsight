import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyAdmin } from '@/lib/auth-middleware';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  sanitizeUser,
  getUserByUsername,
} from '@/lib/auth';
import { validate, Validators, withSecurityHeaders } from '@/lib/validation';
import { logAdminAction, maskSensitiveData } from '@/lib/audit-logger';

// GET /api/admin/users - 用户列表
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  const users = getAllUsers().map(sanitizeUser);
  return withSecurityHeaders(NextResponse.json({ success: true, data: users }));
}

// POST /api/admin/users - 添加用户
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  try {
    const body = await request.json();

    // 严格输入验证
    const validation = validate(body, {
      username: Validators.username,
      name: Validators.name,
      role: Validators.role,
      password: Validators.password,
      permissions: { type: 'object' },
    });

    if (!validation.valid) {
      return withSecurityHeaders(NextResponse.json(
        { error: '输入验证失败', details: validation.errors },
        { status: 400 }
      ));
    }

    const { username, name, role, password, permissions } = validation.sanitized;

    const existing = getUserByUsername(username as string);
    if (existing) {
      return withSecurityHeaders(NextResponse.json({ error: '该账户已存在' }, { status: 400 }));
    }

    const startTime = Date.now();
    const user = await createUser({
      username: username as string,
      name: name as string,
      role: role as 'admin' | 'editor' | 'analyst' | 'viewer' | 'custom',
      password: password as string,
      permissions: permissions as unknown as import('@/lib/auth').UserPermissions | undefined,
      createdBy: auth.user!.id,
    });

    logAdminAction('CREATE_USER', 'success', {
      userId: auth.user!.id,
      username: auth.user!.username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      details: maskSensitiveData({ targetUser: user.username, role: user.role }),
      durationMs: Date.now() - startTime,
    });

    return withSecurityHeaders(NextResponse.json({ success: true, data: sanitizeUser(user) }));
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建失败';
    logAdminAction('CREATE_USER', 'failure', {
      userId: auth.user!.id,
      username: auth.user!.username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      errorMessage: message,
    });
    return withSecurityHeaders(NextResponse.json({ error: message }, { status: 500 }));
  }
}

// PUT /api/admin/users/:id - 编辑用户
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  try {
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '');
    if (!id || isNaN(id)) {
      return withSecurityHeaders(NextResponse.json({ error: '用户ID必填' }, { status: 400 }));
    }

    const body = await request.json();
    const validation = validate(body, {
      username: { type: 'string', minLength: 3, maxLength: 50 },
      name: { type: 'string', minLength: 1, maxLength: 100 },
      role: { type: 'string', enum: ['admin', 'editor', 'analyst', 'viewer', 'custom'] },
      status: { type: 'string', enum: ['active', 'disabled'] },
      password: { type: 'string', minLength: 8, maxLength: 128 },
      permissions: { type: 'object' },
    });

    if (!validation.valid) {
      return withSecurityHeaders(NextResponse.json(
        { error: '输入验证失败', details: validation.errors },
        { status: 400 }
      ));
    }

    const user = await updateUser(id, validation.sanitized);
    if (!user) {
      return withSecurityHeaders(NextResponse.json({ error: '用户不存在' }, { status: 404 }));
    }

    logAdminAction('UPDATE_USER', 'success', {
      userId: auth.user!.id,
      username: auth.user!.username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      details: { targetUserId: id, updates: Object.keys(validation.sanitized) },
    });

    return withSecurityHeaders(NextResponse.json({ success: true, data: sanitizeUser(user) }));
  } catch (error) {
    const message = error instanceof Error ? error.message : '更新失败';
    logAdminAction('UPDATE_USER', 'failure', {
      userId: auth.user!.id,
      username: auth.user!.username,
      ip: request.headers.get('x-forwarded-for') || 'unknown',
      errorMessage: message,
    });
    return withSecurityHeaders(NextResponse.json({ error: message }, { status: 500 }));
  }
}

// DELETE /api/admin/users/:id - 删除用户
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '');
  if (!id || isNaN(id)) {
    return withSecurityHeaders(NextResponse.json({ error: '用户ID必填' }, { status: 400 }));
  }

  if (id === auth.user!.id) {
    return withSecurityHeaders(NextResponse.json({ error: '不能删除自己' }, { status: 400 }));
  }

  const deleted = deleteUser(id);
  if (!deleted) {
    return withSecurityHeaders(NextResponse.json({ error: '用户不存在' }, { status: 404 }));
  }

  logAdminAction('DELETE_USER', 'success', {
    userId: auth.user!.id,
    username: auth.user!.username,
    ip: request.headers.get('x-forwarded-for') || 'unknown',
    details: { deletedUserId: id },
  });

  return withSecurityHeaders(NextResponse.json({ success: true }));
}
