import { NextRequest, NextResponse } from 'next/server';
import '@/lib/auth-server';
import { verifyAdmin } from '@/lib/auth-middleware';
import { updateUser, deleteUser, getAllUsers, sanitizeUser } from '@/lib/auth';
import { validate, Validators, withSecurityHeaders } from '@/lib/validation';

// PUT /api/admin/users/:id - 更新用户
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return withSecurityHeaders(NextResponse.json({ error: '无效的用户ID' }, { status: 400 }));
    }

    const body = await request.json();

    // 可选字段验证
    const validation = validate(body, {
      name: { ...Validators.name, required: false },
      role: { ...Validators.role, required: false },
      password: { ...Validators.password, required: false },
      permissions: { type: 'object', required: false },
      status: { type: 'string', enum: ['active', 'inactive'], required: false },
    });

    if (!validation.valid) {
      return withSecurityHeaders(NextResponse.json(
        { error: '输入验证失败', details: validation.errors },
        { status: 400 }
      ));
    }

    const updated = await updateUser(userId, body);
    if (!updated) {
      return withSecurityHeaders(NextResponse.json({ error: '用户不存在' }, { status: 404 }));
    }

    return withSecurityHeaders(NextResponse.json({ success: true, data: sanitizeUser(updated) }));
  } catch (error) {
    console.error('更新用户失败:', error);
    return withSecurityHeaders(NextResponse.json(
      { error: '更新用户失败', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    ));
  }
}

// DELETE /api/admin/users/:id - 删除用户
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return withSecurityHeaders(NextResponse.json({ error: auth.error }, { status: auth.status }));
  }

  try {
    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return withSecurityHeaders(NextResponse.json({ error: '无效的用户ID' }, { status: 400 }));
    }

    // 不能删除自己
    if (auth.user?.id === userId) {
      return withSecurityHeaders(NextResponse.json({ error: '不能删除当前登录用户' }, { status: 400 }));
    }

    const deleted = deleteUser(userId);
    if (!deleted) {
      return withSecurityHeaders(NextResponse.json({ error: '用户不存在' }, { status: 404 }));
    }

    return withSecurityHeaders(NextResponse.json({ success: true }));
  } catch (error) {
    console.error('删除用户失败:', error);
    return withSecurityHeaders(NextResponse.json(
      { error: '删除用户失败', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    ));
  }
}
