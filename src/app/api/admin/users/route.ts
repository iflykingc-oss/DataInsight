import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth-middleware';
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  sanitizeUser,
  getUserByUsername,
} from '@/lib/auth';

// GET /api/admin/users - 用户列表
export async function GET(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const users = getAllUsers().map(sanitizeUser);
  return NextResponse.json({ success: true, data: users });
}

// POST /api/admin/users - 添加用户
export async function POST(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await request.json();
    const { username, name, role = 'member', password, permissions } = body;

    if (!username || !name) {
      return NextResponse.json({ error: '账户和姓名必填' }, { status: 400 });
    }

    const existing = getUserByUsername(username);
    if (existing) {
      return NextResponse.json({ error: '该账户已存在' }, { status: 400 });
    }

    const user = await createUser({
      username,
      name,
      role,
      password,
      permissions,
      createdBy: auth.user!.id,
    });

    return NextResponse.json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/users/:id - 编辑用户
export async function PUT(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const url = new URL(request.url);
    const id = parseInt(url.searchParams.get('id') || '');
    if (!id) {
      return NextResponse.json({ error: '用户ID必填' }, { status: 400 });
    }

    const body = await request.json();
    const user = await updateUser(id, body);
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/:id - 删除用户
export async function DELETE(request: NextRequest) {
  const auth = await verifyAdmin(request);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const id = parseInt(url.searchParams.get('id') || '');
  if (!id) {
    return NextResponse.json({ error: '用户ID必填' }, { status: 400 });
  }

  if (id === auth.user!.id) {
    return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
  }

  const deleted = deleteUser(id);
  if (!deleted) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
