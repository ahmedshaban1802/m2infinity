import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    const employees = await db.employee.findMany();
    const dm = parseFloat((await db.appSetting.findUnique({ where: { key: 'delayDeductionPerMin' } }))?.value || '1');

    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const days: string[] = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(`${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`);
    }

    const rows = await Promise.all(employees.map(async (emp) => {
      const attendance = await db.attendance.findMany({
        where: { employeeId: emp.id, date: { in: days } },
      });
      const delayDed = attendance.reduce((s, a) => s + a.delayMinutes * dm, 0);
      const manDed = (await db.deduction.findMany({ where: { employeeId: emp.id, month } })).reduce((s, d) => s + d.amount, 0);
      const adv = (await db.advance.findMany({ where: { employeeId: emp.id, month } })).reduce((s, a) => s + a.amount, 0);
      const net = Math.max(0, emp.salary - delayDed - manDed - adv);
      return { ...emp, delayDeduction: delayDed, manualDeduction: manDed, advance: adv, net };
    }));

    const totals = rows.reduce((acc, r) => ({
      base: acc.base + r.salary,
      delay: acc.delay + r.delayDeduction,
      other: acc.other + r.manualDeduction + r.advance,
      net: acc.net + r.net,
    }), { base: 0, delay: 0, other: 0, net: 0 });

    return NextResponse.json({ rows, totals });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}