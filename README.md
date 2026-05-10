# movie-talkin

A web app for coordinating movie watch parties: a host creates a party, members suggest a category, the host spins to pick one, members suggest movies, and the group runs a single-elimination bracket to vote on what to watch. Real-time updates over WebSocket; auth via emailed magic links.

## Tech

- **Web** — Vite + React 19 + TypeScript + TanStack Router + TanStack Query + Tailwind CSS
- **API** — Hono + Drizzle ORM + libSQL (local SQLite for dev, Turso for prod)
- **Tooling** — pnpm workspaces, tsx, vitest

## Prerequisites

- [Node.js](https://nodejs.org) v22+
- [pnpm](https://pnpm.io) v10+ — `npm install -g pnpm`

## Setup

```sh
pnpm install

# API env: copy and fill in values you have (TMDB key is required for movie search)
cp apps/api/.env.example apps/api/.env

# Apply migrations to create the local SQLite database
pnpm db:migrate
```

## Running locally

```sh
# Starts both the API (:3000) and the web app (:5173) in parallel
pnpm dev
```

Open `http://localhost:5173`. The dev server proxies `/api/*` to the API, so everything is on the same origin.

You'll need at least one host user to sign in. Either:

```sh
# Bootstrap a single host (set SEED_HOST_NAME and SEED_GROUP_NAME in apps/api/.env first)
pnpm db:seed
```

…or use the test-data script below to spin up a party in any state.

## Test data

```sh
# Defaults: voting status, 10 users, group "Test Movie Night"
pnpm db:fixture

# Pick the status, user count, and group name
pnpm db:fixture --status movie_selected --users 12
pnpm db:fixture --status open_for_movie_suggestions --users 8 --group-name "Cult Cinema"
```

Valid statuses: `draft`, `open_for_category_suggestions`, `category_suggestions_closed`, `open_for_movie_suggestions`, `movie_suggestions_closed`, `voting`, `movie_selected`, `watched`. The script:

- Creates `Test User 1..N` (idempotent — reused across runs)
- Creates a fresh party at the requested status with stage-appropriate data (suggestions, brackets, votes, winner — whatever is needed)
- Prints a magic link for every user so you can open them in different browsers / incognito windows to test multi-user flows

## Project structure

```
apps/
  api/        Hono API server + Drizzle schema + libSQL client
  web/        React SPA (TanStack Router pages in src/routes)
packages/
  shared/     Reserved for shared types (currently unused)
docs/
  PLAN.md                  Project plan / tech choices
  DEPLOYMENT.md            Fly.io + Turso deployment guide
  FEATURE_REQUESTS.md      Original feature plan (all shipped)
  MORE_FEATURE_REQUESTS.md Current feature plan
```

## Commands

All scripts run from the repo root. They forward to the right workspace via pnpm filters.

### Dev

| Command          | What it does                                  |
| ---------------- | --------------------------------------------- |
| `pnpm dev`       | Start API + web in parallel                   |
| `pnpm dev:api`   | Start the API only (`tsx watch`, `:3000`)     |
| `pnpm dev:web`   | Start the web dev server only (Vite, `:5173`) |
| `pnpm typecheck` | Typecheck every workspace                     |
| `pnpm lint`      | ESLint across workspaces                      |
| `pnpm format`    | Prettier write across the repo                |

### Build

| Command         | What it does                                                                    |
| --------------- | ------------------------------------------------------------------------------- |
| `pnpm build`    | Production build (compile API to `apps/api/dist`, build web to `apps/web/dist`) |
| `pnpm test:api` | Run API vitest suite                                                            |

### Database

| Command            | What it does                                                           |
| ------------------ | ---------------------------------------------------------------------- |
| `pnpm db:generate` | Generate a new migration after editing `apps/api/src/db/schema.ts`     |
| `pnpm db:migrate`  | Apply pending migrations against `DB_URL`                              |
| `pnpm db:seed`     | One-time host bootstrap (uses `SEED_*` env vars, prints a magic link)  |
| `pnpm db:fixture`  | Generate a test party at any status with N users (see Test data above) |
| `pnpm db:studio`   | Open Drizzle Studio against the current DB                             |

## Environment variables

`apps/api/.env` (see `.env.example`):

| Variable                   | Default                  | Description                                             |
| -------------------------- | ------------------------ | ------------------------------------------------------- |
| `PORT`                     | `3000`                   | API server port                                         |
| `DB_URL`                   | `file:./movie-talkin.db` | libSQL URL (`libsql://...` for Turso)                   |
| `DB_AUTH_TOKEN`            | —                        | Required for Turso, not for local file DB               |
| `CORS_ORIGIN`              | `http://localhost:5173`  | Allowed origin (irrelevant in same-origin prod deploy)  |
| `APP_URL`                  | `http://localhost:5173`  | Base URL embedded in magic-link emails                  |
| `SESSION_SECRET`           | dev placeholder          | Signs session cookies — set a real 32-byte hex in prod  |
| `TMDB_API_KEY`             | —                        | Required for movie search (https://themoviedb.org)      |
| `DOES_THE_DOG_DIE_API_KEY` | —                        | Optional — content warnings degrade to empty when unset |
| `SEED_HOST_NAME`           | —                        | Used by `db:seed`                                       |
| `SEED_HOST_EMAIL`          | —                        | Used by `db:seed` (optional)                            |
| `SEED_GROUP_NAME`          | —                        | Used by `db:seed`                                       |

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the Fly.io + Turso single-origin deploy.

Quick reference once the app is launched:

```sh
flyctl deploy           # rebuild + redeploy
flyctl logs             # tail logs
flyctl secrets list     # view configured env vars
flyctl ssh console      # remote shell on the running machine
```

## Feature plans

- [`docs/FEATURE_REQUESTS.md`](docs/FEATURE_REQUESTS.md) — first batch (all shipped)
- [`docs/MORE_FEATURE_REQUESTS.md`](docs/MORE_FEATURE_REQUESTS.md) — current backlog with implementation notes
