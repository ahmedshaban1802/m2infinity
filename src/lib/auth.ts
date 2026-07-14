import { createHash } from 'crypto';

export function hashPassword(password: string): string {
  const hash = createHash('sha256').update(password + 'm2_salt').digest('hex');
  return hash;
}

export function verifyPassword(password: string, stored: string): boolean {
  const hash = createHash('sha256').update(password + 'm2_salt').digest('hex');
  return hash === stored;
}