import { NextResponse } from 'next/server';

/** POST /api/auth/send-code - 已废弃，注册不再使用验证码 */
export async function POST() {
  return NextResponse.json(
    { error: '该接口已废弃，请使用安全问题验证注册' },
    { status: 410 }
  );
}
