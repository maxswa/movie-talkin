# movie-talkin

A web app for coordinating movie watch parties.

## Prerequisites

- [Node.js](https://nodejs.org) v20+
- [pnpm](https://pnpm.io) v9+ — `npm install -g pnpm`

## Setup

```sh
# Install all dependencies
pnpm install

# Copy the API env file and adjust if needed
cp apps/api/.env.example apps/api/.env

# Generate the initial database migration (already done — skip if migrations exist)
pnpm --filter @movie-talkin/api db:generate

# Apply migrations to create the local SQLite database
pnpm --filter @movie-talkin/api db:migrate
```

## Running locally

Open two terminals:

```sh
# Terminal 1 — API (http://localhost:3000)
pnpm --filter @movie-talkin/api dev

# Terminal 2 — Web (http://localhost:5173)
pnpm --filter @movie-talkin/web dev
```

The web app proxies all `/api/*` requests to the API, so you only need to open `http://localhost:5173`.

## Project structure

```
apps/
  api/        Hono API server + Drizzle ORM + SQLite (via libsql)
  web/        Vite + React + TanStack Router + Tailwind CSS
packages/
  shared/     TypeScript types and Zod schemas shared between apps
```

## Key commands

| Command | Description |
|---------|-------------|
| `pnpm --filter @movie-talkin/api dev` | Start the API in watch mode |
| `pnpm --filter @movie-talkin/web dev` | Start the web dev server |
| `pnpm --filter @movie-talkin/api db:generate` | Generate a new migration after editing `schema.ts` |
| `pnpm --filter @movie-talkin/api db:migrate` | Apply pending migrations |
| `pnpm --filter @movie-talkin/shared build` | Build the shared package (required before typechecking apps) |
| `pnpm typecheck` | Typecheck all packages |
| `pnpm build` | Production build of all apps |

## Database

The API uses SQLite stored as a local file (`apps/api/movie-talkin.db`). The file is created automatically when you first run migrations.

To change the schema, edit `apps/api/src/db/schema.ts`, then run:

```sh
pnpm --filter @movie-talkin/api db:generate
pnpm --filter @movie-talkin/api db:migrate
```

When you're ready to deploy, you can swap the local SQLite file for [Turso](https://turso.tech) (cloud SQLite) by updating two env vars — no code changes needed:

```env
DB_URL=libsql://<your-db>.turso.io
DB_AUTH_TOKEN=<your-token>
```

## Environment variables

`apps/api/.env` (see `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `DB_URL` | `file:./movie-talkin.db` | libsql database URL |
| `DB_AUTH_TOKEN` | — | Auth token (Turso cloud only) |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed origin for CORS |
