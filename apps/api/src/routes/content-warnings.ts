import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { ErrorSchema } from '../lib/schemas.js';
import { requireAuth } from '../middleware/auth.js';
import type { AppEnv } from '../lib/types.js';

const WarningSchema = z.object({
  name: z.string(),
  yes: z.number(),
  no: z.number(),
});

const ResponseSchema = z.object({
  warnings: z.array(WarningSchema),
  source: z.object({ id: z.number(), name: z.string() }).nullable(),
});

interface DddSearchItem {
  id?: number;
  name?: string;
  releaseYear?: number;
  year?: number;
}

interface DddTopicStat {
  yesSum?: number;
  noSum?: number;
  Topic?: { name?: string };
  topic?: { name?: string };
}

interface CacheEntry {
  expiresAt: number;
  body: { warnings: { name: string; yes: number; no: number }[]; source: { id: number; name: string } | null };
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function cacheKey(title: string, year?: string) {
  return `${title.toLowerCase()}|${year ?? ''}`;
}

const EMPTY_BODY: CacheEntry['body'] = { warnings: [], source: null };

export const contentWarningsRouter = new OpenAPIHono<AppEnv>();

contentWarningsRouter.openapi(
  createRoute({
    method: 'get',
    path: '/',
    tags: ['ContentWarnings'],
    summary: 'Content warnings via doesthedogdie.com',
    middleware: [requireAuth],
    request: {
      query: z.object({
        title: z.string().min(1),
        year: z.string().optional(),
      }),
    },
    responses: {
      200: {
        content: { 'application/json': { schema: ResponseSchema } },
        description: 'Content warnings',
      },
      401: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'Not authenticated',
      },
      502: {
        content: { 'application/json': { schema: ErrorSchema } },
        description: 'doesthedogdie request failed',
      },
    },
  }),
  async (c) => {
    const { title, year } = c.req.valid('query');
    const apiKey = process.env.DOES_THE_DOG_DIE_API_KEY;

    if (!apiKey) {
      return c.json(EMPTY_BODY, 200);
    }

    const key = cacheKey(title, year);
    const cached = cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return c.json(cached.body, 200);
    }

    const headers = {
      Accept: 'application/json',
      'X-API-KEY': apiKey,
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
    };

    const searchUrl = new URL('https://www.doesthedogdie.com/dddsearch');
    searchUrl.searchParams.set('q', title);

    let searchPayload: unknown;
    try {
      const res = await fetch(searchUrl.toString(), { headers });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(
          `[content-warnings] search "${title}" failed: ${res.status} ${res.statusText}`,
          body.slice(0, 200),
        );
        return c.json(EMPTY_BODY, 200);
      }
      searchPayload = await res.json();
    } catch (err) {
      console.error('[content-warnings] search threw:', err);
      return c.json(EMPTY_BODY, 200);
    }

    const items: DddSearchItem[] = Array.isArray(searchPayload)
      ? (searchPayload as DddSearchItem[])
      : ((searchPayload as { items?: DddSearchItem[] }).items ?? []);
    if (items.length === 0) {
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, body: EMPTY_BODY });
      return c.json(EMPTY_BODY, 200);
    }

    let match = items[0];
    if (year) {
      const yearNum = Number(year);
      const yearMatch = items.find((it) => it.releaseYear === yearNum || it.year === yearNum);
      if (yearMatch) match = yearMatch;
    }

    if (!match.id) {
      cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, body: EMPTY_BODY });
      return c.json(EMPTY_BODY, 200);
    }

    let mediaPayload: unknown;
    try {
      const res = await fetch(`https://www.doesthedogdie.com/media/${match.id}`, { headers });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(
          `[content-warnings] media ${match.id} failed: ${res.status} ${res.statusText}`,
          body.slice(0, 200),
        );
        return c.json(EMPTY_BODY, 200);
      }
      mediaPayload = await res.json();
    } catch (err) {
      console.error('[content-warnings] media threw:', err);
      return c.json(EMPTY_BODY, 200);
    }

    const root = mediaPayload as {
      item?: { id?: number; name?: string };
      topicItemStats?: DddTopicStat[];
    };
    const stats = root.topicItemStats ?? [];

    const warnings = stats
      .map((s) => ({
        name: s.Topic?.name ?? s.topic?.name ?? '',
        yes: s.yesSum ?? 0,
        no: s.noSum ?? 0,
      }))
      .filter((w) => w.name && w.yes > w.no)
      .sort((a, b) => b.yes - a.yes);

    const body = {
      warnings,
      source: { id: match.id, name: match.name ?? title },
    };
    cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, body });
    return c.json(body, 200);
  },
);
