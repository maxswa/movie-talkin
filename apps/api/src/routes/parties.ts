import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../db/client.js";
import {
  brackets,
  categorySuggestions,
  movieSuggestions,
  movieVotes,
  users,
  watchGroupMembers,
  watchParties,
} from "../db/schema.js";
import {
  BracketRoundSchema,
  CategorySuggestionSchema,
  ErrorSchema,
  MovieSuggestionSchema,
  WATCH_PARTY_STATUSES,
  WatchPartyDetailSchema,
  WatchPartySchema,
  type WatchPartyStatus,
} from "../lib/schemas.js";
import {
  buildNextRoundPairings,
  buildRoundOnePairings,
  type WinnerInfo,
} from "../lib/brackets.js";
import { requireAuth } from "../middleware/auth.js";
import { broadcast } from "../lib/pubsub.js";
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
      eq(watchGroupMembers.userId, userId),
    ),
  });

  return { party, member };
}

function nextStatus(current: WatchPartyStatus): WatchPartyStatus | null {
  const idx = WATCH_PARTY_STATUSES.indexOf(current);
  if (idx === -1 || idx === WATCH_PARTY_STATUSES.length - 1) return null;
  return WATCH_PARTY_STATUSES[idx + 1];
}

async function generateRoundOneBrackets(partyId: string) {
  const suggestions = await db.query.movieSuggestions.findMany({
    where: eq(movieSuggestions.watchPartyId, partyId),
  });

  const pairings = buildRoundOnePairings(suggestions.map((s) => s.id));
  await db
    .insert(brackets)
    .values(pairings.map((p) => ({ watchPartyId: partyId, round: 1, ...p })));
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
      200: {
        content: { "application/json": { schema: WatchPartyDetailSchema } },
        description: "Party detail",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a member",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not found",
      },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member) return c.json({ error: "Forbidden" }, 403);

    const members = await db
      .select({
        userId: users.id,
        name: users.name,
        role: watchGroupMembers.role,
        joinedAt: watchGroupMembers.joinedAt,
      })
      .from(watchGroupMembers)
      .innerJoin(users, eq(watchGroupMembers.userId, users.id))
      .where(eq(watchGroupMembers.groupId, party.watchGroupId));

    let winningSuggestion: z.infer<typeof MovieSuggestionSchema> | null = null;
    if (party.winningSuggestionId) {
      const [s] = await db
        .select({
          id: movieSuggestions.id,
          watchPartyId: movieSuggestions.watchPartyId,
          suggestedBy: { id: users.id, name: users.name },
          tmdbId: movieSuggestions.tmdbId,
          title: movieSuggestions.title,
          posterPath: movieSuggestions.posterPath,
          overview: movieSuggestions.overview,
          releaseYear: movieSuggestions.releaseYear,
          createdAt: movieSuggestions.createdAt,
        })
        .from(movieSuggestions)
        .innerJoin(users, eq(movieSuggestions.suggestedBy, users.id))
        .where(eq(movieSuggestions.id, party.winningSuggestionId));
      winningSuggestion = s ?? null;
    }

    return c.json(
      {
        ...party,
        status: party.status as WatchPartyStatus,
        members: members.map((m) => ({
          ...m,
          role: m.role as "host" | "guest",
        })),
        winningSuggestion,
      },
      200,
    );
  },
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
            schema: z.object({
              scheduledFor: z.string().nullable().optional(),
            }),
          },
        },
      },
    },
    responses: {
      200: {
        content: { "application/json": { schema: WatchPartySchema } },
        description: "Party updated",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a host",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not found",
      },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");
    const body = c.req.valid("json");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member || member.role !== "host")
      return c.json({ error: "Forbidden" }, 403);

    const [updated] = await db
      .update(watchParties)
      .set({ scheduledFor: body.scheduledFor })
      .where(eq(watchParties.id, partyId))
      .returning();

    return c.json(
      { ...updated, status: updated.status as WatchPartyStatus },
      200,
    );
  },
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
      200: {
        content: { "application/json": { schema: WatchPartySchema } },
        description: "Status advanced",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Invalid transition or missing required fields",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a host",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not found",
      },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");
    const body = c.req.valid("json");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member || member.role !== "host")
      return c.json({ error: "Forbidden" }, 403);

    const current = party.status as WatchPartyStatus;
    const next = nextStatus(current);
    if (!next)
      return c.json(
        { error: `Party is already at final status: ${current}` },
        400,
      );

    // Transition-specific validation and side effects
    const updates: Partial<typeof watchParties.$inferInsert> = { status: next };

    if (next === "category_suggestions_closed") {
      if (!body.selectedCategory) {
        return c.json(
          {
            error: "selectedCategory is required to close category suggestions",
          },
          400,
        );
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

    if (next === "movie_selected") {
      return c.json(
        {
          error:
            "movie_selected is only reachable via POST /parties/:partyId/brackets/close-round",
        },
        400,
      );
    }

    const [updated] = await db
      .update(watchParties)
      .set(updates)
      .where(eq(watchParties.id, partyId))
      .returning();

    return c.json(
      { ...updated, status: updated.status as WatchPartyStatus },
      200,
    );
  },
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
      200: {
        content: {
          "application/json": { schema: z.array(CategorySuggestionSchema) },
        },
        description: "Category suggestions",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a member",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not found",
      },
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
  },
);

partiesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{partyId}/category-suggestions",
    tags: ["Category Suggestions"],
    summary:
      "Submit a category suggestion (only during open_for_category_suggestions)",
    middleware: [requireAuth],
    request: {
      params: PartyIdParam,
      body: {
        content: {
          "application/json": {
            schema: z.object({ name: z.string().min(1).max(100) }),
          },
        },
      },
    },
    responses: {
      201: {
        content: { "application/json": { schema: CategorySuggestionSchema } },
        description: "Suggestion created",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not accepting category suggestions",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a member",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not found",
      },
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
      return c.json(
        { error: "Party is not currently accepting category suggestions" },
        400,
      );
    }

    await db
      .delete(categorySuggestions)
      .where(
        and(
          eq(categorySuggestions.watchPartyId, partyId),
          eq(categorySuggestions.suggestedBy, user.id),
        ),
      );

    const [inserted] = await db
      .insert(categorySuggestions)
      .values({ watchPartyId: partyId, suggestedBy: user.id, name })
      .returning();

    broadcast(partyId, { type: "category_suggestion" });

    return c.json(
      { ...inserted, suggestedBy: { id: user.id, name: user.name } },
      201,
    );
  },
);

partiesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{partyId}/movie-suggestions",
    tags: ["Movie Suggestions"],
    summary: "List all movie suggestions for the party",
    middleware: [requireAuth],
    request: { params: PartyIdParam },
    responses: {
      200: {
        content: {
          "application/json": { schema: z.array(MovieSuggestionSchema) },
        },
        description: "Movie suggestions",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a member",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not found",
      },
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
        id: movieSuggestions.id,
        watchPartyId: movieSuggestions.watchPartyId,
        suggestedBy: { id: users.id, name: users.name },
        tmdbId: movieSuggestions.tmdbId,
        title: movieSuggestions.title,
        posterPath: movieSuggestions.posterPath,
        overview: movieSuggestions.overview,
        releaseYear: movieSuggestions.releaseYear,
        createdAt: movieSuggestions.createdAt,
      })
      .from(movieSuggestions)
      .innerJoin(users, eq(movieSuggestions.suggestedBy, users.id))
      .where(eq(movieSuggestions.watchPartyId, partyId));

    return c.json(suggestions, 200);
  },
);

partiesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{partyId}/movie-suggestions",
    tags: ["Movie Suggestions"],
    summary:
      "Submit a movie suggestion (only during open_for_movie_suggestions)",
    middleware: [requireAuth],
    request: {
      params: PartyIdParam,
      body: {
        content: {
          "application/json": {
            schema: z.object({ tmdbId: z.number().int().positive() }),
          },
        },
      },
    },
    responses: {
      201: {
        content: { "application/json": { schema: MovieSuggestionSchema } },
        description: "Suggestion created",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not accepting movie suggestions",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a member",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party or movie not found",
      },
      502: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "TMDB request failed",
      },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");
    const { tmdbId } = c.req.valid("json");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member) return c.json({ error: "Forbidden" }, 403);

    if (party.status !== "open_for_movie_suggestions") {
      return c.json(
        { error: "Party is not currently accepting movie suggestions" },
        400,
      );
    }

    await db
      .delete(movieSuggestions)
      .where(
        and(
          eq(movieSuggestions.watchPartyId, partyId),
          eq(movieSuggestions.suggestedBy, user.id),
        ),
      );

    const tmdbRes = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`,
    );
    if (tmdbRes.status === 404)
      return c.json({ error: "Movie not found on TMDB" }, 404);
    if (!tmdbRes.ok) return c.json({ error: "TMDB request failed" }, 502);

    const movie = (await tmdbRes.json()) as {
      id: number;
      title: string;
      poster_path: string | null;
      overview: string;
      release_date: string;
    };

    const [inserted] = await db
      .insert(movieSuggestions)
      .values({
        watchPartyId: partyId,
        suggestedBy: user.id,
        tmdbId: movie.id,
        title: movie.title,
        posterPath: movie.poster_path ?? null,
        overview: movie.overview || null,
        releaseYear: movie.release_date
          ? new Date(movie.release_date).getFullYear()
          : null,
      })
      .returning();

    broadcast(partyId, { type: "movie_suggestion" });

    return c.json(
      { ...inserted, suggestedBy: { id: user.id, name: user.name } },
      201,
    );
  },
);

// ---------------------------------------------------------------------------
// 8.1 — GET /parties/:partyId/brackets
// ---------------------------------------------------------------------------

partiesRouter.openapi(
  createRoute({
    method: "get",
    path: "/{partyId}/brackets",
    tags: ["Brackets"],
    summary:
      "All brackets grouped by round with vote counts and current user's vote",
    middleware: [requireAuth],
    request: { params: PartyIdParam },
    responses: {
      200: {
        content: {
          "application/json": { schema: z.array(BracketRoundSchema) },
        },
        description: "Brackets by round",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a member",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not found",
      },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member) return c.json({ error: "Forbidden" }, 403);

    const allBrackets = await db.query.brackets.findMany({
      where: eq(brackets.watchPartyId, partyId),
      orderBy: [asc(brackets.round), asc(brackets.createdAt)],
    });

    if (allBrackets.length === 0) return c.json([], 200);

    const bracketIds = allBrackets.map((b) => b.id);
    const suggestionIds = [
      ...new Set([
        ...allBrackets.map((b) => b.suggestionAId),
        ...allBrackets.map((b) => b.suggestionBId),
      ]),
    ];

    const suggestions = await db
      .select({
        id: movieSuggestions.id,
        watchPartyId: movieSuggestions.watchPartyId,
        suggestedBy: { id: users.id, name: users.name },
        tmdbId: movieSuggestions.tmdbId,
        title: movieSuggestions.title,
        posterPath: movieSuggestions.posterPath,
        overview: movieSuggestions.overview,
        releaseYear: movieSuggestions.releaseYear,
        createdAt: movieSuggestions.createdAt,
      })
      .from(movieSuggestions)
      .innerJoin(users, eq(movieSuggestions.suggestedBy, users.id))
      .where(inArray(movieSuggestions.id, suggestionIds));

    const suggestionMap = new Map(suggestions.map((s) => [s.id, s]));

    const voteCounts = await db
      .select({
        bracketId: movieVotes.bracketId,
        votedFor: movieVotes.votedFor,
        tally: count(),
      })
      .from(movieVotes)
      .where(inArray(movieVotes.bracketId, bracketIds))
      .groupBy(movieVotes.bracketId, movieVotes.votedFor);

    const voteCountMap = new Map<string, Map<string, number>>();
    for (const v of voteCounts) {
      if (!voteCountMap.has(v.bracketId))
        voteCountMap.set(v.bracketId, new Map());
      voteCountMap.get(v.bracketId)!.set(v.votedFor, v.tally);
    }

    const myVotes = await db.query.movieVotes.findMany({
      where: and(
        inArray(movieVotes.bracketId, bracketIds),
        eq(movieVotes.userId, user.id),
      ),
    });
    const myVoteMap = new Map(myVotes.map((v) => [v.bracketId, v.votedFor]));

    const roundMap = new Map<
      number,
      z.infer<typeof BracketRoundSchema>["brackets"]
    >();
    for (const bracket of allBrackets) {
      const suggestionA = suggestionMap.get(bracket.suggestionAId)!;
      const suggestionB = suggestionMap.get(bracket.suggestionBId)!;
      const counts = voteCountMap.get(bracket.id) ?? new Map();

      const detail = {
        id: bracket.id,
        round: bracket.round,
        suggestionA,
        suggestionB,
        voteCountA: counts.get(bracket.suggestionAId) ?? 0,
        voteCountB: counts.get(bracket.suggestionBId) ?? 0,
        myVote: myVoteMap.get(bracket.id) ?? null,
        winnerId: bracket.winnerId,
      };

      if (!roundMap.has(bracket.round)) roundMap.set(bracket.round, []);
      roundMap.get(bracket.round)!.push(detail);
    }

    const rounds = [...roundMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([round, bs]) => ({ round, brackets: bs }));

    return c.json(rounds, 200);
  },
);

// ---------------------------------------------------------------------------
// 8.3 — POST /parties/:partyId/brackets/close-round
// ---------------------------------------------------------------------------

partiesRouter.openapi(
  createRoute({
    method: "post",
    path: "/{partyId}/brackets/close-round",
    tags: ["Brackets"],
    summary:
      "Close the current voting round, tally votes, advance or finalise (host only)",
    middleware: [requireAuth],
    request: { params: PartyIdParam },
    responses: {
      200: {
        content: { "application/json": { schema: WatchPartySchema } },
        description: "Round closed; party returned with updated status",
      },
      400: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "No open round or party not in voting status",
      },
      401: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not authenticated",
      },
      403: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Not a host",
      },
      404: {
        content: { "application/json": { schema: ErrorSchema } },
        description: "Party not found",
      },
    },
  }),
  async (c) => {
    const { partyId } = c.req.valid("param");
    const user = c.get("user");

    const { party, member } = await getPartyAndMembership(partyId, user.id);
    if (!party) return c.json({ error: "Party not found" }, 404);
    if (!member || member.role !== "host")
      return c.json({ error: "Forbidden" }, 403);
    if (party.status !== "voting")
      return c.json({ error: "Party is not currently in voting status" }, 400);

    const allBrackets = await db.query.brackets.findMany({
      where: eq(brackets.watchPartyId, partyId),
    });

    if (allBrackets.length === 0)
      return c.json({ error: "No brackets found" }, 400);

    const currentRound = Math.max(...allBrackets.map((b) => b.round));
    const roundBrackets = allBrackets.filter((b) => b.round === currentRound);
    const openBrackets = roundBrackets.filter((b) => b.winnerId === null);

    if (openBrackets.length === 0)
      return c.json({ error: "Current round is already closed" }, 400);

    const openBracketIds = openBrackets.map((b) => b.id);

    const votes = await db
      .select({
        bracketId: movieVotes.bracketId,
        votedFor: movieVotes.votedFor,
        tally: count(),
      })
      .from(movieVotes)
      .where(inArray(movieVotes.bracketId, openBracketIds))
      .groupBy(movieVotes.bracketId, movieVotes.votedFor);

    const voteMap = new Map<string, Map<string, number>>();
    for (const v of votes) {
      if (!voteMap.has(v.bracketId)) voteMap.set(v.bracketId, new Map());
      voteMap.get(v.bracketId)!.set(v.votedFor, v.tally);
    }

    // Carry forward pre-resolved bye brackets, then resolve open brackets.
    // Track margin and bye status so we can assign the next bye fairly.
    const winners: WinnerInfo[] = roundBrackets
      .filter((b) => b.winnerId !== null)
      .map((b) => ({ id: b.winnerId!, margin: Infinity, wasBye: true }));

    for (const bracket of openBrackets) {
      const counts = voteMap.get(bracket.id) ?? new Map();
      const countA = counts.get(bracket.suggestionAId) ?? 0;
      const countB = counts.get(bracket.suggestionBId) ?? 0;
      const winnerId =
        countA >= countB ? bracket.suggestionAId : bracket.suggestionBId;
      const margin = Math.abs(countA - countB);

      await db
        .update(brackets)
        .set({ winnerId })
        .where(eq(brackets.id, bracket.id));
      winners.push({ id: winnerId, margin, wasBye: false });
    }

    let [updated] = await db.query.watchParties.findMany({
      where: eq(watchParties.id, partyId),
    });

    if (winners.length === 1) {
      [updated] = await db
        .update(watchParties)
        .set({ status: "movie_selected", winningSuggestionId: winners[0].id })
        .where(eq(watchParties.id, partyId))
        .returning();
    } else {
      const nextRound = currentRound + 1;
      const pairings = buildNextRoundPairings(winners);
      await db.insert(brackets).values(
        pairings.map((p) => ({
          watchPartyId: partyId,
          round: nextRound,
          ...p,
        })),
      );
    }

    return c.json(
      { ...updated, status: updated.status as WatchPartyStatus },
      200,
    );
  },
);
