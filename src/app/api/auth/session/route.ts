import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'غير مسجل الدخول' }, { status: 401 });
  return NextResponse.json(session);
}

export async function POST() {
  const response = NextResponse.json({ message: 'تم تسجيل الخروج' });
  response.cookies.set('m2_session', '', { maxAge: 0, path: '/' });
  return response;
}