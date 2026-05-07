import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, eq } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  brackets,
  categorySuggestions,
  movieSuggestions,
  users,
  watchGroupMembers,
  watchParties,
} from "../db/schema.js";
import {
  CategorySuggestionSchema,
  ErrorSchema,
  MovieSuggestionSchema,
  WATCH_PARTY_STATUSES,
  WatchPartyDetailSchema,
  WatchPartySchema,
  type WatchPartyStatus,
} from "../lib/schemas.js";
import { requireAuth } from "../middleware/auth.js";
import type { AppEnv } from "../lib/types.js";

const PartyIdParam = z.object({ partyId: z.string() });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getPartyAndMembership(partyId: string, userId: string) {
  const party = await db.query.watchParties.findFirst({
    where: eq(watchParties.id, partyId),
  });
  if (!party) return { party: null, member: null };

  const member = await db.query.watchGroupMembers.findFirst({
    where: and(
      eq(watchGroupMembers.groupId, party.watchGroupId),
      eq(watchGroupMembers.userId, userId)
    ),
  });

  return { party, member };
}

function nextStatus(current: WatchPartyStatus): WatchPartyStatus | null {
  const idx = WATCH_PARTY_STATUSES.indexOf(current);
  if (idx === -1 || idx === WATCH_PARTY_STATUSES.length - 1) return null;
  return WATCH_PARTY_STATUSES[idx + 1];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function generateRoundOneBrackets(partyId: string) {
  const suggestions = await db.query.movieSuggestions.findMany({
    where: eq(movieSuggestions.watchPartyId, partyId),
  });

  if (suggestions.length < 2) {
    throw new Error("Need at least 2 movie suggestions to start voting");
  }

  const shuffled = shuffle(suggestions);
  const rows: (typeof brackets.$inferInsert)[] = [];

  for (let i = 0; i < shuffled.length; i += 2) {
    const a = shuffled[i];
    const b = shuffled[i + 1] ?? a; // bye: pair with self
    rows.push({
      watchPartyId: partyId,
      round: 1,
      suggestionAId: a.id,
      suggestionBId: b.id,
      winnerId: a.id === b.id ? a.id : null, // auto-resolve bye
    });
  }

  await db.insert(brackets).values(rows);
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const partiesRouter = new OpenAPIHono<AppEnv>();

partiesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{partyId}",
    tags: ["Parties"],
    summary: "Get full party details including members and winning suggestion",
    middleware: [requireAuth],
    request: { params: PartyIdParam },
    responses: {
      200: { content: { "application/json": { schema: WatchPartyDetailSchema } }, description: "Party detail" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a member" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Party not found" },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member) return c.json({ error: "Forbidden" }, 403);

    const members = await db
      .select({ userId: users.id, name: users.name, role: watchGroupMembers.role, joinedAt: watchGroupMembers.joinedAt })
      .from(watchGroupMembers)
      .innerJoin(users, eq(watchGroupMembers.userId, users.id))
      .where(eq(watchGroupMembers.groupId, party.watchGroupId));

    let winningSuggestion: z.infer<typeof MovieSuggestionSchema> | null = null;
    if (party.winningSuggestionId) {
      const s = await db.query.movieSuggestions.findFirst({
        where: eq(movieSuggestions.id, party.winningSuggestionId),
      });
      winningSuggestion = s ?? null;
    }

    return c.json(
      {
        ...party,
        status: party.status as WatchPartyStatus,
        members: members.map((m) => ({ ...m, role: m.role as "host" | "guest" })),
        winningSuggestion,
      },
      200
    );
  }
);

partiesRouter.openapi(
  createRoute({
    method: "patch",
    path: "/{partyId}",
    tags: ["Parties"],
    summary: "Update party fields (host only)",
    middleware: [requireAuth],
    request: {
      params: PartyIdParam,
      body: {
        content: {
          "application/json": {
            schema: z.object({ scheduledFor: z.string().nullable().optional() }),
          },
        },
      },
    },
    responses: {
      200: { content: { "application/json": { schema: WatchPartySchema } }, description: "Party updated" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a host" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Party not found" },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");
    const body = c.req.valid("json");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member || member.role !== "host") return c.json({ error: "Forbidden" }, 403);

    const [updated] = await db
      .update(watchParties)
      .set({ scheduledFor: body.scheduledFor })
      .where(eq(watchParties.id, partyId))
      .returning();

    return c.json({ ...updated, status: updated.status as WatchPartyStatus }, 200);
  }
);

partiesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{partyId}/advance",
    tags: ["Parties"],
    summary: "Advance the party to the next status (host only)",
    middleware: [requireAuth],
    request: {
      params: PartyIdParam,
      body: {
        content: {
          "application/json": {
            schema: z.object({
              selectedCategory: z.string().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: { content: { "application/json": { schema: WatchPartySchema } }, description: "Status advanced" },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid transition or missing required fields" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a host" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Party not found" },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");
    const body = c.req.valid("json");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member || member.role !== "host") return c.json({ error: "Forbidden" }, 403);

    const current = party.status as WatchPartyStatus;
    const next = nextStatus(current);
    if (!next) return c.json({ error: `Party is already at final status: ${current}` }, 400);

    // Transition-specific validation and side effects
    const updates: Partial<typeof watchParties.$inferInsert> = { status: next };

    if (next === "category_suggestions_closed") {
      if (!body.selectedCategory) {
        return c.json({ error: "selectedCategory is required to close category suggestions" }, 400);
      }
      updates.selectedCategory = body.selectedCategory;
    }

    if (next === "voting") {
      try {
        await generateRoundOneBrackets(partyId);
      } catch (e) {
        return c.json({ error: (e as Error).message }, 400);
      }
    }

    const [updated] = await db
      .update(watchParties)
      .set(updates)
      .where(eq(watchParties.id, partyId))
      .returning();

    return c.json({ ...updated, status: updated.status as WatchPartyStatus }, 200);
  }
);

partiesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{partyId}/category-suggestions",
    tags: ["Category Suggestions"],
    summary: "List all category suggestions for the party",
    middleware: [requireAuth],
    request: { params: PartyIdParam },
    responses: {
      200: { content: { "application/json": { schema: z.array(CategorySuggestionSchema) } }, description: "Category suggestions" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a member" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Party not found" },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member) return c.json({ error: "Forbidden" }, 403);

    const suggestions = await db
      .select({
        id: categorySuggestions.id,
        watchPartyId: categorySuggestions.watchPartyId,
        suggestedBy: { id: users.id, name: users.name },
        name: categorySuggestions.name,
        createdAt: categorySuggestions.createdAt,
      })
      .from(categorySuggestions)
      .innerJoin(users, eq(categorySuggestions.suggestedBy, users.id))
      .where(eq(categorySuggestions.watchPartyId, partyId));

    return c.json(suggestions, 200);
  }
);

partiesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{partyId}/category-suggestions",
    tags: ["Category Suggestions"],
    summary: "Submit a category suggestion (only during open_for_category_suggestions)",
    middleware: [requireAuth],
    request: {
      params: PartyIdParam,
      body: {
        content: {
          "application/json": { schema: z.object({ name: z.string().min(1).max(100) }) },
        },
      },
    },
    responses: {
      201: { content: { "application/json": { schema: CategorySuggestionSchema } }, description: "Suggestion created" },
      400: { content: { "application/json": { schema: ErrorSchema } }, description: "Party not accepting category suggestions" },
      401: { content: { "application/json": { schema: ErrorSchema } }, description: "Not authenticated" },
      403: { content: { "application/json": { schema: ErrorSchema } }, description: "Not a member" },
      404: { content: { "application/json": { schema: ErrorSchema } }, description: "Party not found" },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");
    const { name } = c.req.valid("json");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member) return c.json({ error: "Forbidden" }, 403);

    if (party.status !== "open_for_category_suggestions") {
      return c.json({ error: "Party is not currently accepting category suggestions" }, 400);
    }

    const [inserted] = await db
      .insert(categorySuggestions)
      .values({ watchPartyId: partyId, suggestedBy: user.id, name })
      .returning();

    return c.json(
      { ...inserted, suggestedBy: { id: user.id, name: user.name } },
      201
    );
  }
);
