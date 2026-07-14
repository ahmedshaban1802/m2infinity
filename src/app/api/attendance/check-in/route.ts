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
    const now = new Date();
    const time = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

    const existing = await db.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } });

    if (existing) {
      if (existing.checkOut) return NextResponse.json({ error: 'تم تسجيل الانصراف بالفعل' }, { status: 400 });
      return NextResponse.json({ error: 'تم تسجيل الحضور بالفعل' }, { status: 400 });
    }

    // Calculate delay
    const settings = await db.appSetting.findMany();
    const workStart = settings.find(s => s.key === 'workStart')?.value || '09:00';
    const [wh, wm] = workStart.split(':').map(Number);
    const workTime = new Date(); workTime.setHours(wh, wm, 0, 0);
    const delay = Math.max(0, Math.floor((now.getTime() - workTime.getTime()) / 60000));

    const record = await db.attendance.create({
      data: {
        employeeId,
        date: today,
        checkIn: time,
        checkInMethod: method || 'manual',
        checkInExtra: extra || '',
        delayMinutes: delay,
      },
    });

    if (delay > 0) {
      const emp = await db.employee.findUnique({ where: { id: employeeId } });
      await db.notification.create({
        data: {
          accountId: session.accountId,
          message: `تأخير: ${emp?.name || ''} — ${delay} دقيقة`,
          type: 'delay',
        },
      });
    }

    return NextResponse.json(record);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}