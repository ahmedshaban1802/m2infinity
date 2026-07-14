import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ message: 'ok' });
  response.cookies.set('m2_session', '', { maxAge: 0, path: '/' });
  return response;
}