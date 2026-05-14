import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { deleteCookie } from 'hono/cookie';
import { db } from '../db/client.js';
import { magicLinkTokens } from '../db/schema.js';
import { ErrorSchema, OkSchema, UserSchema } from '../lib/schemas.js';
import { requireAuth, setSessionCookie } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

export const authRouter = new OpenAPIHono<AppEnv>();

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/verify',
    tags: ['Auth'],
    summary: 'Verify a magic link token and set a session cookie',
    request: { query: z.object({ token: z.string() }) },
    responses: {
      200: {
        content: { 'application/json': { schema: OkSchema } },
        description: 'Token verified, session cookie set',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Missing token',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Invalid or expired token',
      },
    },
  }),
  async (c) => {
    const { token } = c.req.valid('query');
    const now = new Date().toISOString();

    const record = await db.query.magicLinkTokens.findFirst({
      where: and(
        eq(magicLinkTokens.token, token),
        isNull(magicLinkTokens.usedAt),
        gt(magicLinkTokens.expiresAt, now),
      ),
    });

    if (!record) return c.json({ error: 'Invalid or expired token' }, 401);

    await db.update(magicLinkTokens).set({ usedAt: now }).where(eq(magicLinkTokens.id, record.id));

    setSessionCookie(c, record.userId);

    return c.json({ ok: true }, 200);
  },
);

authRouter.openapi(
  createRoute({
    method: 'post',
    path: '/logout',
    tags: ['Auth'],
    summary: 'Clear the session cookie',
    responses: {
      200: { content: { 'application/json': { schema: OkSchema } }, description: 'Logged out' },
    },
  }),
  (c) => {
    deleteCookie(c, 'session', { path: '/' });
    return c.json({ ok: true }, 200);
  },
);

authRouter.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['Auth'],
    summary: 'Return the current authenticated user',
    middleware: [requireAuth],
    responses: {
      200: {
        content: { 'application/json': { schema: UserSchema.omit({ createdAt: true }) } },
        description: 'Current user',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not authenticated',
      },
    },
  }),
  (c) => {
    const { id, name, email } = c.get('user');
    return c.json({ id, name, email }, 200);
  },
);
