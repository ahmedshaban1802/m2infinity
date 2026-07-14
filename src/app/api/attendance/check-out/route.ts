import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, getEmployeeId } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const employeeId = await getEmployeeId(session);
    if (!employeeId) return NextResponse.json({ error: 'غير مرتبط بموظف' }, { status: 400 });

    const { method, extra } = await req.json() || {};
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const existing = await db.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } });
    if (!existing || !existing.checkIn) {
      return NextResponse.json({ error: 'سجل الحضور أولاً' }, { status: 400 });
    }
    if (existing.checkOut) {
      return NextResponse.json({ error: 'تم تسجيل الانصراف بالفعل' }, { status: 400 });
    }

    const record = await db.attendance.update({
      where: { id: existing.id },
      data: {
        checkOut: time,
        checkOutMethod: method || 'manual',
        checkOutExtra: extra || '',
      },
    });

    return NextResponse.json(record);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}