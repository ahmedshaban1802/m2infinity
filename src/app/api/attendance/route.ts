import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin, requireAuth, getEmployeeId } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 8;

    let employeeId = searchParams.get('employeeId');

    if (session.role !== 'admin') {
      employeeId = await getEmployeeId(session) || undefined;
    }

    const where: Record<string, unknown> = { date };
    if (employeeId) where.employeeId = employeeId;

    const total = await db.attendance.count({ where });
    const records = await db.attendance.findMany({
      where,
      include: { employee: { select: { name: true, code: true } } },
      orderBy: { date: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({ records, total, pages: Math.ceil(total / perPage) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: e instanceof Error && e.message.includes('غير') ? 403 : 500 });
  }
}