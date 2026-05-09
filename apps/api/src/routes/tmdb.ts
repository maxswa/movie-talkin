import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { ErrorSchema } from '../lib/schemas.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

const TmdbMovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  posterPath: z.string().nullable(),
  overview: z.string().nullable(),
  releaseYear: z.number().nullable(),
});

export const tmdbRouter = new OpenAPIHono<AppEnv>();

tmdbRouter.openapi(
  createRoute({
    method: 'get',
    path: '/search',
    tags: ['TMDB'],
    summary: 'Search movies via TMDB',
    middleware: [requireAuth],
    request: {
      query: z.object({ q: z.string().min(1) }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: z.array(TmdbMovieSchema) } },
        description: 'Search results',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not authenticated',
      },
      502: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'TMDB request failed',
      },
    },
  }),
  async (c) => {
    const { q } = c.req.valid('query');
    const apiKey = process.env.TMDB_API_KEY;

    const url = new URL('https://api.themoviedb.org/3/search/movie');
    url.searchParams.set('query', q);
    url.searchParams.set('api_key', apiKey!);

    const res = await fetch(url.toString());
    if (!res.ok) return c.json({ error: 'TMDB request failed' }, 502);

    const data = (await res.json()) as {
      results: Array<{
        id: number;
        title: string;
        original_title?: string;
        poster_path: string | null;
        overview: string;
        release_date: string;
        popularity?: number;
      }>;
    };

    const normalizedQuery = q.toLowerCase().trim();

    function matchScore(title: string, originalTitle: string | undefined): number {
      const candidates = [title, originalTitle ?? ''].filter(Boolean).map((t) => t.toLowerCase());
      let best = 0;
      for (const t of candidates) {
        let s = 0;
        if (t === normalizedQuery) s = 1000;
        else if (t.startsWith(normalizedQuery)) s = 400;
        else if (t.split(/\s+/).some((w) => w.startsWith(normalizedQuery))) s = 200;
        else if (t.includes(normalizedQuery)) s = 80;
        if (s > best) best = s;
      }
      return best;
    }

    const ranked = data.results
      .map((m) => ({
        id: m.id,
        title: m.title,
        posterPath: m.poster_path ?? null,
        overview: m.overview || null,
        releaseYear: m.release_date ? new Date(m.release_date).getFullYear() : null,
        _score: matchScore(m.title, m.original_title) + Math.log1p(m.popularity ?? 0),
      }))
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...rest }) => {
        void _score;
        return rest;
      });

    return c.json(ranked, 200);
  },
);
