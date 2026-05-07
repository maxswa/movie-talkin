import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DB_URL ?? 'file:./movie-talkin.db',
    authToken: process.env.DB_AUTH_TOKEN,
  },
});
