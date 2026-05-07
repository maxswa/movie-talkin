import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.SESSION_SECRET ?? 'dev-secret-change-me';

export function signUserId(userId: string): string {
  const sig = createHmac('sha256', SECRET).update(userId).digest('hex');
  return `${userId}.${sig}`;
}

export function verifySessionCookie(value: string): string | null {
  const dot = value.lastIndexOf('.');
  if (dot === -1) return null;

  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  const expected = createHmac('sha256', SECRET).update(payload).digest('hex');

  try {
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null;
  } catch {
    return null;
  }

  return payload || null;
}
