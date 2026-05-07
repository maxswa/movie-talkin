# API Plan

Routes are grouped by resource. Each section lists the endpoints, who can call them, and any non-obvious logic. Work through them in order — each group builds on the previous one.

**Auth levels**
- `host` — must be a host member of the relevant group
- `member` — must be any member (host or guest) of the relevant group
- `self` — must be the authenticated user (session cookie)

**Session** — a signed cookie containing `userId`, set on magic link verification. No external session store.

---

## Progress

- [x] 0. Seed script
- [x] 1. Auth middleware & session
- [x] 2. Users
- [x] 3. Watch groups
- [x] 4. Watch parties — CRUD & status transitions
- [x] 5. Category suggestions
- [x] 6. TMDB search proxy
- [x] 7. Movie suggestions
- [ ] 8. Brackets & voting

---

## 0. Seed script

One-time bootstrap run via `pnpm --filter @movie-talkin/api db:seed`. Creates the first host user and watch group, then prints a magic link to the terminal. Safe to re-run — no-ops if the user/group already exist.

**Env vars (add to `.env` and `.env.example`):**

| Variable | Description |
|----------|-------------|
| `SEED_HOST_NAME` | Display name for the first host user |
| `SEED_HOST_EMAIL` | (Optional) Email for the first host user |
| `SEED_GROUP_NAME` | Name of the first watch group |
| `APP_URL` | Base URL used to construct the magic link (e.g. `http://localhost:5173`) |

**Script behaviour (`src/db/seed.ts`):**
1. Upsert the host user by name (create if not found)
2. Upsert the watch group by name
3. Add the user to the group as `host` if not already a member
4. Delete any existing unused magic link tokens for the user
5. Insert a new token (24h expiry)
6. Print the full magic link to stdout and exit

---

## 1. Auth middleware & session

Foundational — everything else depends on this. No DB routes yet, just wiring.

| # | Method | Path | Auth | Notes |
|---|--------|------|------|-------|
| 1.1 | `GET` | `/auth/verify?token=:token` | — | Validate token, mark `used_at`, set session cookie, redirect to `/` |
| 1.2 | `POST` | `/auth/logout` | self | Clear session cookie |

**Shared middleware to write:**
- `requireAuth` — reads session cookie, loads user from DB, attaches to context. Returns 401 if missing/invalid.
- `requireGroupMember(role?)` — checks `watch_group_members` for the current user and group id from the route param. Returns 403 if not a member (or not a host when `role: "host"` is passed).

---

## 2. Users

| # | Method | Path | Auth | Notes |
|---|--------|------|------|-------|
| 2.1 | `POST` | `/users` | host* | Create a user (name required, email optional). Auto-generates a magic link token and returns it so the host can share it immediately. *Any host of any group can create users. |
| 2.2 | `GET` | `/users/me` | self | Return current user from session |
| 2.3 | `POST` | `/users/:id/magic-link` | host* | Invalidate any existing unused token, generate a fresh one, return the full magic link URL |

---

## 3. Watch groups

| # | Method | Path | Auth | Notes |
|---|--------|------|------|-------|
| 3.1 | `GET` | `/groups` | self | List all groups the current user belongs to, with role |
| 3.2 | `POST` | `/groups` | self | Create a group. Creator is automatically added as `host`. |
| 3.3 | `GET` | `/groups/:groupId` | member | Group details + member list with roles |
| 3.4 | `GET` | `/groups/:groupId/parties` | member | List all watch parties for the group |
| 3.5 | `POST` | `/groups/:groupId/members` | host | Add an existing user to the group. Body: `{ userId, role }` |
| 3.6 | `DELETE` | `/groups/:groupId/members/:userId` | host | Remove a member. Cannot remove the last host. |

---

## 4. Watch parties — CRUD & status transitions

| # | Method | Path | Auth | Notes |
|---|--------|------|------|-------|
| 4.1 | `POST` | `/groups/:groupId/parties` | host | Create a party in `draft` status |
| 4.2 | `GET` | `/parties/:partyId` | member | Full party detail: status, category, winning suggestion, member list |
| 4.3 | `PATCH` | `/parties/:partyId` | host | Update `scheduled_for`. Only fields that are always editable. |
| 4.4 | `POST` | `/parties/:partyId/advance` | host | Advance status to the next step in the lifecycle (see below). Handles side-effects per transition. |

**Status transition side-effects:**

| Transition | Side-effect |
|-----------|-------------|
| `→ category_suggestions_closed` | Body must include `selected_category`; stored on the party |
| `→ voting` | Shuffle movie suggestions, generate round-1 brackets (bye for odd count) |
| `→ movie_selected` | Determine winner from final bracket, write `winning_suggestion_id` |

---

## 5. Category suggestions

| # | Method | Path | Auth | Notes |
|---|--------|------|------|-------|
| 5.1 | `GET` | `/parties/:partyId/category-suggestions` | member | List all suggestions for the party |
| 5.2 | `POST` | `/parties/:partyId/category-suggestions` | member | Add a suggestion. Only allowed when status is `open_for_category_suggestions`. |

---

## 6. TMDB proxy

Keeps the TMDB API key server-side. Exact endpoints will be defined once UX is clearer — at minimum we need search. Others (movie detail, recommendations, etc.) can be added as needed.

| # | Method | Path | Auth | Notes |
|---|--------|------|------|-------|
| 6.1 | `GET` | `/tmdb/search?q=:query` | self | Forward to TMDB search, return `{ id, title, posterPath, overview, releaseYear }[]` |
| 6.x | TBD | `/tmdb/...` | self | Additional endpoints as UX requirements become clear |

**Env var to add:** `TMDB_API_KEY`

---

## 7. Movie suggestions

| # | Method | Path | Auth | Notes |
|---|--------|------|------|-------|
| 7.1 | `GET` | `/parties/:partyId/movie-suggestions` | member | List all suggestions for the party |
| 7.2 | `POST` | `/parties/:partyId/movie-suggestions` | member | Add a suggestion. Body: `{ tmdbId }` — server fetches and caches metadata from TMDB. Only allowed when status is `open_for_movie_suggestions`. |

---

## 8. Brackets & voting

| # | Method | Path | Auth | Notes |
|---|--------|------|------|-------|
| 8.1 | `GET` | `/parties/:partyId/brackets` | member | All brackets grouped by round, each with both suggestions and current vote counts. Includes the current user's vote per bracket. |
| 8.2 | `POST` | `/brackets/:bracketId/vote` | member | Cast or update vote. Body: `{ suggestionId }`. Must be `suggestion_a_id` or `suggestion_b_id`. Upserts on `(bracket_id, user_id)`. Only allowed when party status is `voting`. |
| 8.3 | `POST` | `/parties/:partyId/brackets/close-round` | host | Close the current round: tally votes, set `winner_id` on each bracket, generate next round or (if final) transition party to `movie_selected`. |
