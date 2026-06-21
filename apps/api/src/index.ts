import { serve, upgradeWebSocket } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { WebSocketServer } from 'ws';
import { probeWrite } from './db/client.js';
import { subscribe } from './lib/pubsub.js';
import { restoreSchedules } from './lib/round-scheduler.js';
import { authRouter } from './routes/auth.js';
import { bracketsRouter } from './routes/brackets.js';
import { contentWarningsRouter } from './routes/content-warnings.js';
import { groupsRouter } from './routes/groups.js';
import { partiesRouter } from './routes/parties.js';
import { tmdbRouter } from './routes/tmdb.js';
import { usersRouter } from './routes/users.js';
import type { AppEnv } from './lib/types.js';

const app = new OpenAPIHono<AppEnv>();
const isProd = process.env.NODE_ENV === 'production';
const STATIC_ROOT = process.env.STATIC_ROOT ?? 'apps/web/dist';

app.use('*', logger());
app.use(
  '*',
  cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }),
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

app.get('/health', async (c) => {
  try {
    await probeWrite();
    return c.json({ ok: true });
  } catch (err) {
    console.error('[health] write probe failed:', err);
    return c.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 503);
  }
});

app.get(
  '/ws/parties/:partyId',
  upgradeWebSocket((c) => {
    const partyId = c.req.param('partyId')!;
    let unsubscribe: (() => void) | null = null;

    return {
      onOpen(_event, ws) {
        unsubscribe = subscribe(partyId, (event) => {
          ws.send(JSON.stringify(event));
        });
      },
      onClose() {
        unsubscribe?.();
      },
    };
  }),
);

app.route('/api/auth', authRouter);
app.route('/api/users', usersRouter);
app.route('/api/groups', groupsRouter);
app.route('/api/parties', partiesRouter);
app.route('/api/brackets', bracketsRouter);
app.route('/api/tmdb', tmdbRouter);
app.route('/api/content-warnings', contentWarningsRouter);

app.doc('/doc', {
  openapi: '3.0.0',
  info: { title: 'movie-talkin API', version: '0.1.0' },
});
app.get('/ui', swaggerUI({ url: '/doc' }));

if (isProd) {
  app.use('/*', serveStatic({ root: STATIC_ROOT }));
  app.get('/*', async (c) => {
    const path = c.req.path;
    if (
      path.startsWith('/api') ||
      path.startsWith('/ws') ||
      path === '/health' ||
      path === '/doc' ||
      path === '/ui'
    ) {
      return c.notFound();
    }
    const html = await readFile(join(STATIC_ROOT, 'index.html'), 'utf8');
    return c.html(html);
  });
}

const port = Number(process.env.PORT ?? 3000);
const wss = new WebSocketServer({ noServer: true });

serve({ fetch: app.fetch, port, websocket: { server: wss } }, () => {
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/ui`);
});

restoreSchedules().catch((err) => {
  console.error('Failed to restore round timers:', err);
});
