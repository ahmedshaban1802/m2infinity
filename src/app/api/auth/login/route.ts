import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth';
import { createSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: 'أدخل اسم المستخدم وكلمة المرور' }, { status: 400 });
    }

    const account = await db.account.findUnique({ where: { username } });
    if (!account || !verifyPassword(password, account.password)) {
      return NextResponse.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, { status: 401 });
    }

    if (account.role !== 'admin' && !account.isApproved) {
      return NextResponse.json({ error: 'حسابك قيد المراجعة، انتظر موافقة المدير' }, { status: 403 });
    }

    await db.account.update({
      where: { id: account.id },
      data: { lastLogin: new Date() },
    });

    const token = await createSession({
      accountId: account.id,
      username: account.username,
      role: account.role,
      employeeId: account.employeeId,
    });

    const response = NextResponse.json({
      id: account.id,
      username: account.username,
      role: account.role,
      employeeId: account.employeeId,
    });

    response.cookies.set('m2_session', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ في الخادم';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}