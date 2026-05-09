# More Feature Requests

## Implementation Plan

**Suggested order:**

- [x] 1 — Voted-movie highlight stronger (trivial CSS)
- [x] 2 — Hide content warnings until movie selected (trivial)
- [ ] 3 — Confirm-advance modal (trivial UX)
- [ ] 4 — Spinner persists longer with confetti (trivial polish)
- [ ] 5 — Future parties section on home (small, FE only)
- [ ] 6 — Voting counter "x/y voted" per round (medium, builds on existing votes endpoint)
- [ ] 7 — Delete party (small-medium)
- [ ] 8 — Go back a status (medium)
- [ ] 9 — Fuzzy TMDB search (small-medium)
- [ ] 10 — Healing WebSocket connection + more event types (medium)
- [ ] 11 — "Voting soon" as a planning stage with per-round scheduling (high)

---

## 1. Voted-movie highlight stronger — Trivial (FE only)

- `BracketMovieOption` currently uses a soft ring/background to mark `isVoted` — bump it to a clearly visible accent (stronger ring, brighter bg, maybe a small "✓ Your vote" tag)
- No data changes; just CSS / one component edit

## 2. Hide content warnings until movie selected — Trivial (FE only)

- Drop `<ContentWarnings>` from `MovieSuggestionItem` — warnings are spoiler-y during the suggest/vote phases
- Keep them in `PartyBody` for `movie_selected` / `watched` (already there, collapsible)

## 3. Confirm-advance modal — Trivial (FE only)

- Wrap `AdvancePartyButton`'s click in a small confirmation step ("Advance to 'Voting'? This will lock movie suggestions.")
- Native `confirm()` is fine, or a small modal component reused later
- Same treatment for the close-round button so a host can't accidentally end voting

## 4. Spinner persists longer with confetti — Trivial / Small (FE only)

- Bump `SPIN_DURATION_MS` and `POST_SPIN_PAUSE_MS` in `CategorySpinner` so the winner sits on-screen longer
- Add a confetti burst when the wheel stops (use `canvas-confetti` package or a simple CSS keyframe shower)
- Tear down the spin cache (the existing `queryClient.removeQueries` call) only after the confetti finishes

## 5. Future parties section on home — Small (FE only)

- The "Past parties" section currently includes anything that isn't the active party
- Split it into `Upcoming` (parties whose `scheduledFor` is in the future and which aren't the active party) and `Past` (everything else, sorted as today)
- Empty states for both

## 6. Voting counter "x/y voted" per round — Medium

- Backend: extend `GET /parties/:partyId/brackets` so each bracket includes `voterCount` (distinct users who voted) and the round payload includes `eligibleVoterCount` (group member count)
- Frontend: render `3/5 voted` next to each open bracket. Wire WebSocket invalidation so the count updates live while votes come in
- Hosts: existing `BracketVoteBreakdown` already shows per-user breakdown when bracket is resolved — extend it to also work mid-round (host-only) so "who hasn't voted yet?" is visible

## 7. Delete party — Small-Medium

- Backend: `DELETE /parties/:partyId` (host only). DB cascades on `watch_parties` already wipe brackets, suggestions, and votes
- Cancel any auto-close timer for that party in the scheduler
- Frontend: destructive button on the host management section of `/party/$partyId`, behind a confirmation. After delete, navigate home and invalidate `['parties']`

## 8. Go back a status — Medium

- Backend: `POST /parties/:partyId/back` (host only). Reverse status by one step with stage-specific cleanup:
  - `category_suggestions_closed` → `open_for_category_suggestions`: clear `selectedCategory`
  - `voting` → `movie_suggestions_closed`: delete all brackets + votes (cancel auto-close timer)
  - `movie_selected` → `voting`: delete latest round's brackets, clear `winningSuggestionId`
  - block when current status is `draft` (nothing to go back to)
- Frontend: small "Back a step" host action next to "Advance stage", with confirmation

## 9. Fuzzy TMDB search — Small-Medium

- Current `/tmdb/search` proxies straight to TMDB's `/search/movie` which already does fuzzy matching but ranks loosely
- Options to improve:
  - Switch to `/search/multi` and filter to movies (catches typos better)
  - Sort/boost results by popularity + title-similarity (use a lib like `fastest-levenshtein`)
  - Optional year filter input on the search page
- Pick one based on what feels missing — most likely "boost popular results that fuzzy-match the query"

## 10. Healing WebSocket connection + more event types — Medium

- `usePartySocket` currently opens one `WebSocket` and never reconnects. Add exponential-backoff reconnect on `onclose` / `onerror`, with a max delay and a "reconnecting…" indicator
- Broadcast more events from the backend so guests see things change without reload:
  - `status_changed` (any party advance / back / spin landing)
  - `scheduled_for_changed`
  - `member_added` / `member_removed`
  - `vote_cast` (cheap signal so the voting counter updates live)
- Frontend: invalidate the right query keys per event type
- Optional but related: tag the WS connection with a session id so the server can drop stale subscriptions on the same machine

## 11. "Voting soon" as a planning stage with per-round scheduling — High

- Today the `movie_suggestions_closed` (label: "Voting Soon") status is a placeholder. Make it a real stage:
  - **Host UI**: full movie-suggestions list, plus a per-round schedule editor — pick start (and inherit end via duration) for round 1, round 2, …
  - **Guest UI**: countdown to round-1 start; otherwise read-only suggestion list
  - When the round-1 start time hits, auto-advance to `voting` and run the existing scheduler so subsequent rounds auto-close at their pre-set times
- Schema: add `roundStartsAt` to brackets (mirror of `roundEndsAt`) OR a separate `round_schedule` table keyed by `(watchPartyId, roundNumber)` if we want to plan rounds before brackets exist
- Backend changes:
  - New endpoint `PATCH /parties/:partyId/round-schedule` accepting `{ rounds: [{ round, startsAt, endsAt }] }`
  - Extend the round-scheduler so it can also schedule the *opening* of a round, not just the close
  - On advance to `voting`, generate round-1 brackets with the planned start/end
- Frontend:
  - New `RoundSchedulePlanner` component on the detail page during this stage (host only)
  - Countdown component for guests
  - Live updates via the new `status_changed` WS event from item 10
- This is the chunkiest one; worth splitting into sub-PRs (schema + backend first, then host UI, then guest countdown)
