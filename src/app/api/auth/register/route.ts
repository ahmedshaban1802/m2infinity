import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { name, job, username, password, idFront, idBack } = await req.json();

    if (!name || !job || !username || !password) {
      return NextResponse.json({ error: 'أكمل جميع الحقول' }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'كلمة المرور لازم 4 حروف على الأقل' }, { status: 400 });
    }
    if (!idFront || !idBack) {
      return NextResponse.json({ error: 'يجب رفع صورة البطاقة (أمام وخلف)' }, { status: 400 });
    }

    const existing = await db.account.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: 'اسم المستخدم موجود بالفعل' }, { status: 400 });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    const employee = await db.employee.create({
      data: { code, name, job, idFront, idBack },
    });

    await db.account.create({
      data: {
        username,
        password: await hashPassword(password),
        role: 'employee',
        employeeId: employee.id,
        isApproved: false,
      },
    });

    return NextResponse.json({ message: 'تم التسجيل بنجاح، انتظر موافقة المدير' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ في الخادم';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}