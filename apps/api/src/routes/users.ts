import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users, watchGroupMembers } from '../db/schema.js';
import { generateMagicLink } from '../lib/magic-link.js';
import { ErrorSchema, UserSchema } from '../lib/schemas.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

const CreateUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
});

const MagicLinkResponseSchema = z.object({ magicLink: z.string() });

const UserWithMagicLinkSchema = UserSchema.extend({ magicLink: z.string() });

async function requireAnyHost(userId: string) {
  return db.query.watchGroupMembers.findFirst({
    where: and(eq(watchGroupMembers.userId, userId), eq(watchGroupMembers.role, 'host')),
  });
}

export const usersRouter = new OpenAPIHono<AppEnv>();

usersRouter.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['Users'],
    summary: 'Return the current authenticated user',
    middleware: [requireAuth],
    responses: {
      200: { content: { 'application/json': { schema: UserSchema } }, description: 'Current user' },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not authenticated',
      },
    },
  }),
  (c) => {
    return c.json(c.get('user'), 200);
  },
);

usersRouter.openapi(
  createRoute({
    method: 'post',
    path: '/',
    tags: ['Users'],
    summary: 'Create a new user and return a magic link (host only)',
    middleware: [requireAuth],
    request: { body: { content: { 'application/json': { schema: CreateUserSchema } } } },
    responses: {
      201: {
        content: { 'application/json': { schema: UserWithMagicLinkSchema } },
        description: 'User created',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not authenticated',
      },
      403: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not a host' },
    },
  }),
  async (c) => {
    const currentUser = c.get('user');

    if (!(await requireAnyHost(currentUser.id))) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const { name, email } = c.req.valid('json');
    const [user] = await db.insert(users).values({ name, email }).returning();
    const magicLink = await generateMagicLink(user.id);

    return c.json({ ...user, magicLink }, 201);
  },
);

usersRouter.openapi(
  createRoute({
    method: 'post',
    path: '/{id}/magic-link',
    tags: ['Users'],
    summary: 'Generate a fresh magic link for a user (host only)',
    middleware: [requireAuth],
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: {
        content: { 'application/json': { schema: MagicLinkResponseSchema } },
        description: 'Magic link generated',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not authenticated',
      },
      403: { content: { 'application/json': { schema: ErrorSchema } }, description: 'Not a host' },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'User not found',
      },
    },
  }),
  async (c) => {
    const currentUser = c.get('user');

    if (!(await requireAnyHost(currentUser.id))) {
      return c.json({ error: 'Forbidden' }, 403);
    }

    const { id: userId } = c.req.valid('param');
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return c.json({ error: 'User not found' }, 404);

    const magicLink = await generateMagicLink(userId);
    return c.json({ magicLink }, 200);
  },
);
