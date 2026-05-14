import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { signUserId, verifySessionCookie } from '../lib/session.js';
import type { AppEnv } from '../lib/types.js';

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function setSessionCookie(c: Context, userId: string): void {
  setCookie(c, 'session', signUserId(userId), {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SEC,
  });
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const cookie = getCookie(c, 'session');
  if (!cookie) return c.json({ error: 'Unauthorized' }, 401);

  const userId = verifySessionCookie(cookie);
  if (!userId) return c.json({ error: 'Unauthorized' }, 401);

  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user) return c.json({ error: 'Unauthorized' }, 401);

  // Rolling refresh: every authenticated request resets the 30-day window.
  setSessionCookie(c, user.id);

  c.set('user', user);
  await next();
});
