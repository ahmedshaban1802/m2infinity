import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth, getEmployeeId } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 8;

    const where: Record<string, unknown> = {};
    if (session.role !== 'admin') {
      const eid = await getEmployeeId(session);
      if (eid) where.employeeId = eid;
    }
    if (status) where.status = status;

    const total = await db.leave.count({ where });
    const leaves = await db.leave.findMany({
      where,
      include: { employee: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({ leaves, total, pages: Math.ceil(total / perPage) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { employeeId, type, startDate, endDate, reason } = await req.json();
    if (!employeeId || !startDate || !endDate) return NextResponse.json({ error: 'أكمل البيانات' }, { status: 400 });

    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    const days = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    const leave = await db.leave.create({
      data: { employeeId, type: type || 'annual', startDate, endDate, days, reason: reason || '', status: 'pending' },
    });

    const emp = await db.employee.findUnique({ where: { id: employeeId } });
    // Notify admin accounts
    const admins = await db.account.findMany({ where: { role: 'admin' } });
    for (const admin of admins) {
      await db.notification.create({
        data: {
          accountId: admin.id,
          message: `طلب إجازة جديد: ${emp?.name || ''} — ${days} يوم`,
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