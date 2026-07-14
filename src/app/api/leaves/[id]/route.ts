import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { status } = await req.json();
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'حالة غير صحيحة' }, { status: 400 });
    }

    const leave = await db.leave.update({ where: { id }, data: { status } });
    const emp = await db.employee.findUnique({ where: { id: leave.employeeId } });

    const admins = await db.account.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          accountId: admin.id,
          message: `طلب إجازة ${status === 'approved' ? 'مقبول' : 'مرفوض'}: ${emp?.name || ''}`,
          type: 'leave',
        },
      });
    }

    return NextResponse.json(leave);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}