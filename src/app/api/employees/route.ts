import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = 8;

    const where: Record<string, unknown> = {};
    if (search) where.name = { contains: search };
    if (role) where.role = role;

    const total = await db.employee.count({ where });
    const employees = await db.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return NextResponse.json({ employees, total, pages: Math.ceil(total / perPage) });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: e instanceof Error && e.message.includes('غير') ? 403 : 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { name, job, salary, role, phone, address } = await req.json();
    if (!name || !job) return NextResponse.json({ error: 'أدخل الاسم والوظيفة' }, { status: 400 });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const employee = await db.employee.create({
      data: { code, name, job, salary: salary || 0, role: role || 'Employee', phone: phone || '', address: address || '' },
    });

    return NextResponse.json(employee);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}