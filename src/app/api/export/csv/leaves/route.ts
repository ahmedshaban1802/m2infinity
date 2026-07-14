import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET() {
  try {
    await requireAdmin();
    const leaves = await db.leave.findMany({ include: { employee: { select: { name: true } } } });
    const tMap: Record<string, string> = { annual: 'اعتيادية', sick: 'مرضية' };
    const sMap: Record<string, string> = { pending: 'معلّق', approved: 'مقبول', rejected: 'مرفوض' };
    const rows = [['الموظف', 'النوع', 'من', 'إلى', 'الأيام', 'الحالة']];
    leaves.forEach(l => rows.push([l.employee.name, tMap[l.type] || l.type, l.startDate, l.endDate, String(l.days), sMap[l.status] || l.status]));
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\n');
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv;charset=utf-8', 'Content-Disposition': 'attachment; filename=leaves.csv' } });
  } catch { return NextResponse.json({ error: 'خطأ' }, { status: 500 }); }
}