import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    await requireAdmin();
    const settings = await db.appSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.key] = s.value; });
    return NextResponse.json(map);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const data = await req.json();

    for (const [key, value] of Object.entries(data)) {
      if (key === 'adminUsername' || key === 'adminPassword') continue;
      await db.appSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      });
    }

    if (data.adminUsername) {
      const admin = await db.account.findFirst({ where: { role: 'admin' } });
      if (admin) {
        const existing = await db.account.findFirst({ where: { username: data.adminUsername, role: { not: 'admin' } } });
        if (existing) return NextResponse.json({ error: 'اسم المستخدم موجود' }, { status: 400 });
        await db.account.update({ where: { id: admin.id }, data: { username: data.adminUsername } });
      }
    }

    if (data.adminPassword) {
      const admin = await db.account.findFirst({ where: { role: 'admin' } });
      if (admin) {
        if (data.adminPassword.length < 4) return NextResponse.json({ error: 'كلمة المرور لازم 4 حروف' }, { status: 400 });
        await db.account.update({ where: { id: admin.id }, data: { password: await hashPassword(data.adminPassword) } });
      }
    }

    return NextResponse.json({ message: 'تم حفظ الإعدادات' });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'خطأ';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}