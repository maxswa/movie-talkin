# Deployment

Single-origin deployment: one Fly.io machine serves the API + WebSockets + the built frontend, backed by a managed Turso (libSQL) database.

## Why single-origin

- **WebSockets** (`/ws/parties/:partyId`) need a persistent process — rules out Vercel/Netlify functions.
- **Session cookies** (`credentials: 'include'`) avoid `SameSite=None; Secure` and CORS preflight when the frontend and API share a domain.
- **In-memory state** (pubsub channels, round-scheduler timers, content-warnings cache) is per-process; one machine keeps it consistent. Round timers re-arm at boot via `restoreSchedules()`, so machine restarts are safe.

## Phase 1 — Code changes

**Single-origin routing.** Mount API routers under `/api/...` and stop the Vite proxy from stripping the prefix, so dev and prod URLs match exactly.

Files:

1. `apps/api/src/index.ts`
   - Mount each router at `/api/<name>` instead of `/<name>`.
   - In production, serve `apps/web/dist/*` as static files with an SPA fallback to `index.html` for any non-`/api` / non-`/ws` path.
   - Default `CORS_ORIGIN` to permit same-origin requests; keep cross-origin support if `CORS_ORIGIN` is set.
2. `apps/web/vite.config.ts`
   - Remove the `rewrite` from the `/api` proxy so `/api/...` is forwarded as-is.
3. `Dockerfile` (new, repo root)
   - Multi-stage build:
     1. **builder**: install pnpm + workspace deps, build `@movie-talkin/web` and `@movie-talkin/api`.
     2. **runtime**: slim `node:22-alpine`, copy compiled API (`apps/api/dist`), built frontend (`apps/web/dist`), migration SQL files (`apps/api/src/db/migrations`), and production-only `node_modules`. `CMD ["node", "apps/api/dist/index.js"]`.
4. `fly.toml` (new, repo root)
   - One `[http_service]` on internal port 3000, `force_https = true`.
   - `release_command = "node apps/api/dist/db/migrate.js"` runs migrations against Turso before traffic shifts.
   - `auto_stop_machines = "stop"` + `min_machines_running = 0` is fine for the free tier — round timers persist in DB and rebuild on cold start.
5. `.dockerignore` (new)
   - Exclude `node_modules`, `dist`, `.env`, `*.db`, `.git`, etc.

Verification before deploy: `pnpm dev` from the repo root must still work end-to-end (suggestions, voting, spinner, content warnings).

## Phase 2 — Infra setup

### A. Turso (one-time)

```bash
# macOS
brew install tursodatabase/tap/turso
# Windows (PowerShell)
# iwr -useb https://get.tur.so/install.ps1 | iex

turso auth signup
turso db create movie-talkin --location iad
turso db show movie-talkin --url            # → libsql://movie-talkin-<org>.turso.io
turso db tokens create movie-talkin         # → eyJhbGciOiJF...
```

Save both the URL and token; you'll set them as Fly secrets next.

### B. Fly.io (one-time)

```bash
# macOS
brew install flyctl
# Windows (PowerShell)
# iwr -useb https://fly.io/install.ps1 | iex

fly auth signup
fly launch --no-deploy
# - keep the existing fly.toml (answer "yes")
# - pick the same region you chose for Turso (e.g. iad)
# - skip Postgres, skip Redis, skip Sentry

fly secrets set \
  DB_URL='libsql://movie-talkin-<org>.turso.io' \
  DB_AUTH_TOKEN='eyJ...' \
  TMDB_API_KEY='...' \
  DOES_THE_DOG_DIE_API_KEY='...' \
  SESSION_SECRET="$(node -e 'console.log(require(\"crypto\").randomBytes(32).toString(\"hex\"))')" \
  APP_URL='https://movie-talkin.fly.dev' \
  NODE_ENV='production'

fly deploy
```

`APP_URL` must match the actual Fly hostname — it's used in magic-link emails and (effectively) as the same-origin base for cookies.

### Required env vars

| Var                        | Purpose                                     | Notes                                                                         |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `DB_URL`                   | libSQL connection                           | `libsql://...` for Turso                                                      |
| `DB_AUTH_TOKEN`            | Turso auth                                  | Token from `turso db tokens create`                                           |
| `SESSION_SECRET`           | Signs session cookies                       | 32+ random bytes                                                              |
| `APP_URL`                  | Magic-link base URL                         | `https://movie-talkin.fly.dev`                                                |
| `NODE_ENV`                 | Enables `Secure` cookie flag                | `production`                                                                  |
| `TMDB_API_KEY`             | Movie search                                | https://www.themoviedb.org/settings/api                                       |
| `DOES_THE_DOG_DIE_API_KEY` | Content warnings                            | Optional — endpoint returns empty warnings when unset                          |
| `CORS_ORIGIN`              | Cross-origin override                       | Leave unset for same-origin deploy                                            |
| `PORT`                     | HTTP listen port                            | Defaults to 3000; Fly's `internal_port` should match                          |

## Phase 3 — Verify & seed

```bash
fly logs
# Expected:
#   Migrations applied.
#   API running on http://localhost:3000
```

1. Open `https://movie-talkin.fly.dev` — the SPA should load.
2. Hit `https://movie-talkin.fly.dev/health` — should return `{"ok":true}`.
3. Seed the first host so you can sign in. Either:
   - `fly secrets set SEED_HOST_NAME='Max' SEED_HOST_EMAIL='you@example.com' SEED_GROUP_NAME='Movie Night'`
     then `fly ssh console -C "node /app/apps/api/dist/db/seed.js"` (the seed script prints a magic link to the logs).
   - Or insert directly via `turso db shell movie-talkin`.
4. Check the logs for the magic link, open it, you're in.

## Rollback / redeploy

- `fly deploy` rebuilds and re-releases (running `release_command` again — migrations are idempotent).
- `fly releases` lists prior versions; `fly releases rollback <id>` reverts.
- DB rollbacks: Turso has point-in-time restore on paid tiers; on free tier, keep your `apps/api/src/db/migrations/*.sql` history clean and additive.

## Future considerations

- **Multi-region or HA**: today's in-memory pubsub/scheduler/cache is per-process. Scaling to multiple machines means moving these to a shared store (Redis/Upstash for pubsub, a DB-backed scheduler). Don't blindly bump `min_machines_running` past 1 without doing this.
- **Background workers**: round-scheduler runs in-process. If a long timer fires while the machine is stopped, `restoreSchedules()` fires it on next boot — but only when traffic wakes the machine. If you need precise auto-advance during cold periods, set `min_machines_running = 1` (small cost) or move the scheduler off the machine.
- **Logs / observability**: `fly logs` is enough at this scale. If volume grows, ship to Logtail/Axiom via Fly's logging integrations.
