import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { employeeId, amount, reason, month } = await req.json();
    if (!employeeId || amount <= 0) return NextResponse.json({ error: 'أدخل بيانات صحيحة' }, { status: 400 });

    const emp = await db.employee.findUnique({ where: { id: employeeId } });
    const maxPercent = parseFloat((await db.appSetting.findUnique({ where: { key: 'advancePercent' } }))?.value || '50');
    const maxAmount = emp ? (emp.salary * maxPercent / 100) : 0;
    if (amount > maxAmount) {
      return NextResponse.json({ error: `السلفة تتجاوز الحد المسموح (${maxAmount.toLocaleString()})` }, { status: 400 });
    }

    await db.advance.create({
      data: { employeeId, month, amount, reason: reason || '' },
    });

    const admins = await db.account.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          accountId: admin.id,
          message: `سلفة: ${emp?.name || ''} — ${amount.toLocaleString()}`,
          type: 'advance',
        },
      });
    }

    return NextResponse.json({ message: 'تم صرف السلفة' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}