import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { employeeId, amount, reason, month } = await req.json();
    if (!employeeId || amount <= 0) return NextResponse.json({ error: 'أدخل بيانات صحيحة' }, { status: 400 });

    await db.deduction.create({
      data: { employeeId, month, amount, reason: reason || '' },
    });

    return NextResponse.json({ message: 'تم تسجيل الخصم' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}