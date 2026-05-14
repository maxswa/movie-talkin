import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema.js';

const localUrl = process.env.LOCAL_DB_URL;
const remoteUrl = process.env.DB_URL ?? 'file:./movie-talkin.db';
const authToken = process.env.DB_AUTH_TOKEN;

// When LOCAL_DB_URL is set we run as an embedded replica: queries hit the
// local SQLite file, while writes commit to the remote and stream back.
// Otherwise we talk directly to whatever DB_URL points at (local dev: a file;
// migrations: Turso).
const client = localUrl
  ? createClient({ url: localUrl, syncUrl: remoteUrl, authToken, syncInterval: 30 })
  : createClient({ url: remoteUrl, authToken });

// Pull the latest state once at boot so queries don't race the first
// background sync. Skipped when there's no syncUrl to pull from.
if (localUrl) {
  await client.sync();
}

export const db = drizzle(client, { schema });
