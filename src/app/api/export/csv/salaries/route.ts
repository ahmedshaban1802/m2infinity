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
    for (let i = 1; i <= daysInMonth; i++) days.push(`${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`);

    const rows = [['الموظف', 'الوظيفة', 'الأساسي', 'خصم تأخير', 'خصومات', 'صافي']];
    for (const emp of employees) {
      const att = await db.attendance.findMany({ where: { employeeId: emp.id, date: { in: days } } });
      const delayDed = att.reduce((s, a) => s + a.delayMinutes * dm, 0);
      const manDed = (await db.deduction.findMany({ where: { employeeId: emp.id, month } })).reduce((s, d) => s + d.amount, 0);
      const adv = (await db.advance.findMany({ where: { employeeId: emp.id, month } })).reduce((s, a) => s + a.amount, 0);
      const net = Math.max(0, emp.salary - delayDed - manDed - adv);
      rows.push([emp.name, emp.job, String(emp.salary), String(delayDed), String(manDed + adv), String(net)]);
    }
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv;charset=utf-8', 'Content-Disposition': 'attachment; filename=salaries.csv' } });
  } catch { return NextResponse.json({ error: 'خطأ' }, { status: 500 }); }
}