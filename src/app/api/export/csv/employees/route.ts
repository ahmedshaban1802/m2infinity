import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  try {
    await requireAdmin();
    const employees = await db.employee.findMany();
    const rows = [['الكود', 'الاسم', 'الوظيفة', 'الراتب', 'الصلاحية']];
    employees.forEach(e => rows.push([e.code, e.name, e.job, String(e.salary), e.role]));
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv;charset=utf-8', 'Content-Disposition': 'attachment; filename=employees.csv' } });
  } catch { return NextResponse.json({ error: 'خطأ' }, { status: 500 }); }
}