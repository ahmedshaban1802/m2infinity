import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  try {
    await requireAdmin();
    const pending = await db.account.findMany({
      where: { isApproved: false, role: 'employee' },
      include: { employee: true },
    });
    return NextResponse.json(pending);
  } catch (e: unknown) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const { accountId, action, username, password } = await req.json();

    if (action === 'approve') {
      await db.account.update({ where: { id: accountId }, data: { isApproved: true } });
      return NextResponse.json({ message: 'تمت الموافقة' });
    }
    if (action === 'reject') {
      const acc = await db.account.findUnique({ where: { id: accountId } });
      if (acc?.employeeId) {
        await db.account.delete({ where: { id: accountId } });
        await db.employee.delete({ where: { id: acc.employeeId } });
      }
      return NextResponse.json({ message: 'تم الرفض' });
    }
    if (action === 'updateAccount') {
      const updateData: Record<string, string | boolean> = {};
      if (username) updateData.username = username;
      if (password) updateData.password = password;
      await db.account.update({ where: { id: accountId }, data: updateData });
      return NextResponse.json({ message: 'تم التحديث' });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}