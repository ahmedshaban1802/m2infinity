import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  try {
    await requireAdmin();
    const records = await db.attendance.findMany({ include: { employee: { select: { name: true, code: true } } }, orderBy: { date: 'desc' } });
    const rows = [['التاريخ', 'الموظف', 'الكود', 'حضور', 'انصراف', 'تأخير']];
    records.forEach(a => rows.push([a.date, a.employee.name, a.employee.code, a.checkIn || '', a.checkOut || '', String(a.delayMinutes)]));
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv;charset=utf-8', 'Content-Disposition': 'attachment; filename=attendance.csv' } });
  } catch { return NextResponse.json({ error: 'خطأ' }, { status: 500 }); }
}