import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { employeeId, type } = await req.json();
    if (!employeeId) return NextResponse.json({ error: 'حدد الموظف' }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    if (type === 'in') {
      const existing = await db.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } });
      if (existing) return NextResponse.json({ error: 'تم تسجيل الحضور بالفعل' }, { status: 400 });

      const settings = await db.appSetting.findMany();
      const workStart = settings.find(s => s.key === 'workStart')?.value || '09:00';
      const [wh, wm] = workStart.split(':').map(Number);
      const workTime = new Date(); workTime.setHours(wh, wm, 0, 0);
      const delay = Math.max(0, Math.floor((now.getTime() - workTime.getTime()) / 60000));

      const record = await db.attendance.create({
        data: { employeeId, date: today, checkIn: time, checkInMethod: 'manual', delayMinutes: delay },
      });
      return NextResponse.json(record);
    } else {
      const existing = await db.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } });
      if (!existing || !existing.checkIn) return NextResponse.json({ error: 'سجل الحضور أولاً' }, { status: 400 });
      if (existing.checkOut) return NextResponse.json({ error: 'تم تسجيل الانصراف بالفعل' }, { status: 400 });

      const record = await db.attendance.update({
        where: { id: existing.id },
        data: { checkOut: time, checkOutMethod: 'manual' },
      });
      return NextResponse.json(record);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}