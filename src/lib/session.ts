import { cookies } from 'next/headers';
import { db } from '@/lib/db';

export interface SessionPayload {
  accountId: string;
  username: string;
  role: string;
  employeeId: string | null;
}

const sessions = new Map<string, { data: SessionPayload; expires: number }>();

export function generateToken(): string {
  return Buffer.from(`${Date.now()}-${Math.random().toString(36).slice(2)}`).toString('base64url');
}

export async function createSession(data: SessionPayload): Promise<string> {
  const token = generateToken();
  sessions.set(token, { data, expires: Date.now() + 24 * 60 * 60 * 1000 });
  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('m2_session')?.value;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session.data;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s || s.role !== 'admin') throw new Error('غير مصرح');
  return s;
}

export async function requireAuth(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error('غير مسجل الدخول');
  return s;
}

export async function getEmployeeId(session: SessionPayload): Promise<string | null> {
  if (session.employeeId) return session.employeeId;
  if (session.role === 'admin') return null;
  const acc = await db.account.findUnique({ where: { id: session.accountId }, include: { employee: true } });
  return acc?.employeeId ?? null;
}