import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const data = await req.json();
    const employee = await db.employee.update({ where: { id }, data });
    return NextResponse.json(employee);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.attendance.deleteMany({ where: { employeeId: id } });
    await db.leave.deleteMany({ where: { employeeId: id } });
    await db.deduction.deleteMany({ where: { employeeId: id } });
    await db.advance.deleteMany({ where: { employeeId: id } });
    await db.auditLog.deleteMany({ where: { userId: id } });
    await db.account.deleteMany({ where: { employeeId: id } });
    await db.employee.delete({ where: { id } });
    return NextResponse.json({ message: 'تم الحذف' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}