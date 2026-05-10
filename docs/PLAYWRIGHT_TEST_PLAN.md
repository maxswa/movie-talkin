# Playwright UI test plan

Plan for adding end-to-end UI coverage of the basic user paths through the app.

## Setup decisions

- **Tests live in `apps/web/tests/`** — co-located with the web app since they target the UI.
- **Real API backend** against an isolated `test.db`, separate from the dev database. The existing `db:fixture` script seeds scenarios.
- **Mock external deps only**: TMDB search and content-warnings. These are flaky / paid / slow. Stub via Playwright `page.route()`.
- **Auth shortcut**: most tests bypass the magic-link UI by calling `signUserId()` directly and setting the session cookie via `page.context().addCookies()`. One test exercises the real magic-link flow end-to-end.
- **DB reset per test file** (not per test) via a helper that truncates + reseeds. Fast enough, gives isolation across specs.
- **Playwright `webServer`** auto-starts the API (`pnpm --filter @movie-talkin/api dev`) and Web (`pnpm --filter @movie-talkin/web dev`) with `NODE_ENV=test` so they point at `test.db`.

## Phases

### P0 — Infrastructure

One PR's worth of setup.

- Install `@playwright/test`, create `apps/web/playwright.config.ts`.
- Test-only DB env (`TEST_DATABASE_URL`) + reset/seed helper that imports from the API package.
- Auth fixtures: `loggedInPage` (host) and `guestPage`.
- TMDB + content-warnings route mocks as reusable fixtures.
- One green smoke test: "unauthenticated home shows magic-link prompt."

### P1 — Auth flow (3–4 tests)

- Magic-link verify success → land on home.
- Invalid token → error message.
- Already-authenticated visit to `/auth/verify` redirects home.
- Sign out clears session.

### P2 — Host happy path (5–6 tests)

- Create new party from home → arrives at draft detail.
- Schedule a party (date input).
- Advance party through statuses: draft → category suggestions → close → movie suggestions → close → voting (one test per major transition, or one long test depending on signal).
- Category spin animation lands on a winner.
- Delete party.

### P3 — Voting & brackets (4–5 tests)

- Seed a party in `voting`, vote on a bracket, vote count updates.
- Switch vote, count updates.
- Close a round → next round pairings appear.
- Final round closes → `movie_selected` shows winner.
- Sanity: WebSocket reflects another user's vote (single test, two browser contexts).

### P4 — Guest paths & member management (3–4 tests)

- Guest suggests a category in `open_for_category_suggestions`.
- Guest suggests a movie via TMDB search (mocked).
- Host adds a member from `/users`, magic link is generated and shown.
- Host removes a member.

### P5 — Edge cases (as needed)

- Empty parties list.
- Guest navigation doesn't show host-only controls (BottomNav, advance buttons).

## Rough size

~25–30 tests across 5 phases.
