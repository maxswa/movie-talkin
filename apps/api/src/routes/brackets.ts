import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { brackets, movieVotes, watchGroupMembers, watchParties } from '../db/schema.js';
import { ErrorSchema } from '../lib/schemas.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

export const bracketsRouter = new OpenAPIHono<AppEnv>();

// ---------------------------------------------------------------------------
// 8.2 — POST /brackets/:bracketId/vote
// ---------------------------------------------------------------------------

bracketsRouter.openapi(
  createRoute({
    method: 'post',
    path: '/{bracketId}/vote',
    tags: ['Brackets'],
    summary: 'Cast or update a vote for a bracket (member only, party must be in voting status)',
    middleware: [requireAuth],
    request: {
      params: z.object({ bracketId: z.string() }),
      body: {
        content: {
          'application/json': { schema: z.object({ suggestionId: z.string() }) },
        },
      },
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.object({ ok: z.boolean() }) } },
        description: 'Vote recorded',
      },
      400: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Invalid suggestion or bracket already resolved',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not authenticated',
      },
      403: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not a member',
      },
      404: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Bracket not found',
      },
    },
  }),
  async (c) => {
    const { bracketId } = c.req.valid('param');
    const { suggestionId } = c.req.valid('json');
    const user = c.get('user');

    const bracket = await db.query.brackets.findFirst({
      where: eq(brackets.id, bracketId),
    });
    if (!bracket) return c.json({ error: 'Bracket not found' }, 404);

    const party = await db.query.watchParties.findFirst({
      where: eq(watchParties.id, bracket.watchPartyId),
    });

    const member = await db.query.watchGroupMembers.findFirst({
      where: and(
        eq(watchGroupMembers.groupId, party!.watchGroupId),
        eq(watchGroupMembers.userId, user.id),
      ),
    });
    if (!member) return c.json({ error: 'Forbidden' }, 403);

    if (party!.status !== 'voting') {
      return c.json({ error: 'Party is not currently in voting status' }, 400);
    }

    if (bracket.winnerId !== null) {
      return c.json({ error: 'Bracket is already resolved' }, 400);
    }

    if (suggestionId !== bracket.suggestionAId && suggestionId !== bracket.suggestionBId) {
      return c.json({ error: "suggestionId must be one of the bracket's two suggestions" }, 400);
    }

    await db
      .insert(movieVotes)
      .values({ bracketId, userId: user.id, votedFor: suggestionId })
      .onConflictDoUpdate({
        target: [movieVotes.bracketId, movieVotes.userId],
        set: { votedFor: suggestionId, updatedAt: new Date().toISOString() },
      });

    return c.json({ ok: true }, 200);
  },
);
