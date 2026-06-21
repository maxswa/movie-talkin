import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

const localUrl = process.env.LOCAL_DB_URL;
const remoteUrl = process.env.DB_URL ?? 'file:./movie-talkin.db';
const authToken = process.env.DB_AUTH_TOKEN;

// When LOCAL_DB_URL is set we run as an embedded replica: queries hit the
// local SQLite file, while writes commit to the remote and stream back.
// Otherwise we talk directly to whatever DB_URL points at (local dev: a file;
// migrations: Turso).
// Run our own sync loop instead of the client's `syncInterval` so errors
// surface — the built-in timer swallows them, which is how we end up wedged
// without warning.
const client = localUrl
  ? createClient({ url: localUrl, syncUrl: remoteUrl, authToken })
  : createClient({ url: remoteUrl, authToken });

if (localUrl) {
  try {
    await client.sync();
  } catch (err) {
    console.error('[db] initial sync failed:', err);
    throw err;
  }

  setInterval(() => {
    client.sync().catch((err) => {
      console.error('[db] background sync failed:', err);
    });
  }, 30_000).unref();
}

export const db = drizzle(client, { schema });

// Issues a zero-row UPDATE so libsql routes it through the embedded-replica
// write path (local → remote primary → ack). Exercises the exact connection
// that wedges while reads keep serving from the local file.
export async function probeWrite(): Promise<void> {
  await db.run(sql`UPDATE users SET name = name WHERE 1 = 0`);
}
