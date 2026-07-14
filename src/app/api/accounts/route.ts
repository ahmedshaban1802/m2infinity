import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    await requireAdmin();
    const accounts = await db.account.findMany({
      where: { role: 'employee', isApproved: true },
      include: { employee: { select: { name: true } } },
    });
    return NextResponse.json(accounts);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { accountId, username, password } = await req.json();
    if (!accountId) return NextResponse.json({ error: 'حدد الحساب' }, { status: 400 });

    const data: Record<string, string> = {};
    if (username) {
      const existing = await db.account.findFirst({ where: { username, id: { not: accountId } } });
      if (existing) return NextResponse.json({ error: 'اسم المستخدم موجود' }, { status: 400 });
      data.username = username;
    }
    if (password) {
      if (password.length < 4) return NextResponse.json({ error: 'كلمة المرور لازم 4 حروف' }, { status: 400 });
      data.password = await hashPassword(password);
    }

    await db.account.update({ where: { id: accountId }, data });
    return NextResponse.json({ message: 'تم التحديث' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}