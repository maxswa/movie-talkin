# Web Plan

Mobile-first React app built with TanStack Router and React Query. The UI is status-driven — the home screen changes based on the current watch party's lifecycle stage. Guests see a focused single-screen experience; hosts get additional management screens via a bottom nav.

**Key assumptions for v1**
- A user belongs to exactly one group — no group switcher needed
- The "active party" is the most recent non-`watched` party in that group
- Unauthenticated users see a "Check your magic link" prompt rather than a redirect

**Color palette**
| Token | Hex |
|-------|-----|
| `bg-deep` | `#30292F` |
| `bg-surface` | `#413F54` |
| `accent-purple` | `#5F5AA2` |
| `accent-blue` | `#355691` |
| `bg-neutral` | `#3F4045` |

---

## Progress

- [x] 1. Foundation
- [x] 2. Home / party status view
- [x] 3. Category suggestions
- [ ] 4. Movie suggestions & search
- [ ] 5. Brackets & voting
- [ ] 6. Parties management (host)
- [ ] 7. Users management (host)

---

## 1. Foundation

Shared chrome and data-fetching wiring before any feature screens.

**Tasks:**
- Configure Tailwind with the palette above as custom color tokens
- Replace the root layout with a mobile-first shell: full viewport height, scrollable content area, fixed bottom nav
- Bottom nav is only shown to authenticated users. Tabs differ by role:
  - **Guest:** no nav (single destination — just the home screen)
  - **Host:** Home · Parties · Users
- Add a `useMe` hook that wraps the existing `/auth/me` query and exposes `user`, `isHost` (derived from the user's role in their group), and `isLoading`
- Auth guard: any protected route renders a "Check your magic link to sign in" screen when unauthenticated, rather than redirecting
- Expand `api.ts` to cover all remaining endpoints: groups, parties, category suggestions, movie suggestions, TMDB search, brackets, votes

---

## 2. Home / party status view

The main screen for all users. Loads the user's group, then the active party, and renders a different UI per status.

**Route:** `/`

| Status | What the user sees |
|--------|--------------------|
| *(no active party)* | "No upcoming party yet" placeholder |
| `draft` | Party date if set, "Your host is planning the next party…" |
| `open_for_category_suggestions` | → step 3 |
| `category_suggestions_closed` | Selected category pill, "Movie suggestions opening soon" |
| `open_for_movie_suggestions` | → step 4 |
| `movie_suggestions_closed` | Submitted movie list, "Voting coming soon" |
| `voting` | → step 5 |
| `movie_selected` | Winning movie poster + title + party date |

A status badge and the scheduled date (if set) are pinned to the top of every state.

---

## 3. Category suggestions

Rendered inline on `/` when status is `open_for_category_suggestions`.

- List of submitted suggestions, each showing the suggestion text and the suggester's name
- Text input + submit button to add a new suggestion
- Optimistic UI: new suggestion appears immediately; rolls back on error

---

## 4. Movie suggestions & search

Rendered inline on `/` when status is `open_for_movie_suggestions`.

**Inline on `/`:**
- List of submitted suggestions: poster thumbnail, title, release year, suggester name
- "Suggest a movie" button → navigates to `/search`
- If the current user has already submitted a suggestion, their entry is highlighted and the button is hidden

**Route:** `/search`
- Debounced search input calling `GET /tmdb/search?q=`
- Results render below as a scrollable list: poster, title, release year
- Tapping a result submits `POST /parties/:partyId/movie-suggestions` then navigates back to `/`
- Back button cancels without submitting

---

## 5. Brackets & voting

Rendered inline on `/` when status is `voting`.

- Rounds displayed in order; the current (latest) round is expanded, earlier rounds are collapsed and dimmed
- Each bracket shows both movies side by side with poster + title
- Vote buttons on each side; the user's current pick is highlighted — tapping the other side updates the vote
- Bye brackets (`winnerId` already set on load) show "Auto-advanced" with no vote buttons
- Vote counts are hidden while a round is open; revealed once all brackets in the round have a `winnerId`

---

## 6. Parties management (host)

Host-only screens for creating and managing parties.

**Route:** `/parties`
- List of all parties for the group, newest first
- Each row: status badge, scheduled date
- "New party" button → `POST /groups/:groupId/parties` → navigates to the new party's detail page

**Route:** `/parties/$partyId`
- Date/time picker for `scheduledFor` (auto-saves on blur)
- Current status badge
- "Advance to next stage" button
  - When advancing to `category_suggestions_closed`: shows a selector of submitted category suggestions to pick the winner before confirming
- Read-only member list (sourced from group members)

---

## 7. Users management (host)

Host-only screen for managing group members.

**Route:** `/users`
- List of current group members with name and role badge
- "Add member" form: name (required) + email (optional) → `POST /users` → displays the returned magic link with a one-tap copy button
- "Get magic link" per existing member → `POST /users/:id/magic-link` → displays the link inline with a copy button
- "Remove" button per member (with a confirmation step) — disabled for the last host
