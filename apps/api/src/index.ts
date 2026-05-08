import { serve, upgradeWebSocket } from '@hono/node-server';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { WebSocketServer } from 'ws';
import { subscribe } from './lib/pubsub.js';
import { restoreSchedules } from './lib/round-scheduler.js';
import { authRouter } from './routes/auth.js';
import { bracketsRouter } from './routes/brackets.js';
import { groupsRouter } from './routes/groups.js';
import { partiesRouter } from './routes/parties.js';
import { tmdbRouter } from './routes/tmdb.js';
import { usersRouter } from './routes/users.js';
import type { AppEnv } from './lib/types.js';

const app = new OpenAPIHono<AppEnv>();

app.use('*', logger());
app.use(
  '*',
  cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true }),
);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: err.message }, 500);
});

app.get('/health', (c) => c.json({ ok: true }));

app.get(
  '/ws/parties/:partyId',
  upgradeWebSocket((c) => {
    const partyId = c.req.param('partyId');
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

app.route('/auth', authRouter);
app.route('/users', usersRouter);
app.route('/groups', groupsRouter);
app.route('/parties', partiesRouter);
app.route('/brackets', bracketsRouter);
app.route('/tmdb', tmdbRouter);

app.doc('/doc', {
  openapi: '3.0.0',
  info: { title: 'movie-talkin API', version: '0.1.0' },
});
app.get('/ui', swaggerUI({ url: '/doc' }));

const port = Number(process.env.PORT ?? 3000);
const wss = new WebSocketServer({ noServer: true });

serve({ fetch: app.fetch, port, websocket: { server: wss } }, () => {
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger UI at http://localhost:${port}/ui`);
});

restoreSchedules().catch((err) => {
  console.error('Failed to restore round timers:', err);
});
