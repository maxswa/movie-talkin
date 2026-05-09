import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = process.env.MIGRATIONS_DIR ?? resolve(here, 'migrations');

const client = createClient({
  url: process.env.DB_URL ?? 'file:./movie-talkin.db',
  authToken: process.env.DB_AUTH_TOKEN,
});

const db = drizzle(client);
await migrate(db, { migrationsFolder });
console.log(`Migrations applied from ${migrationsFolder}`);
client.close();
