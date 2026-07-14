import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/session';

export async function GET() {
  try {
    const session = await requireAuth();
    const notifications = await db.notification.findMany({
      where: { accountId: session.accountId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json(notifications);
  } catch (e: unknown) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function PUT() {
  try {
    const session = await requireAuth();
    await db.notification.updateMany({
      where: { accountId: session.accountId, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ message: 'ok' });
  } catch {
    return NextResponse.json({ message: 'ok' });
  }
}