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
        poster_path: string | null;
        overview: string;
        release_date: string;
      }>;
    };

    const movies = data.results.map((m) => ({
      id: m.id,
      title: m.title,
      posterPath: m.poster_path ?? null,
      overview: m.overview || null,
      releaseYear: m.release_date ? new Date(m.release_date).getFullYear() : null,
    }));

    return c.json(movies, 200);
  },
);
