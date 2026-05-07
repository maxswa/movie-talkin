# Data Model

## Overview

The app is organized around **watch groups** (a persistent circle of friends) and **watch parties** (a single movie night event within a group). Each watch party moves through a structured lifecycle: the group first narrows down a category, then nominates movies in that category, then votes using a bracket-style tournament to pick a winner.

---

## Records

### `users`

A pre-created user. Users are not self-registered — they are created ahead of time by a host and given access via a magic link.

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | |
| `name` | text | Display name |
| `email` | text | Unique |
| `created_at` | timestamp | |

---

### `magic_link_tokens`

Stores the tokens used for passwordless login. Each token is tied to a user and is single-use with an expiry. Generating a new token invalidates the old one (by deleting or marking it used).

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | |
| `user_id` | integer FK → users | |
| `token` | text | Unique, cryptographically random |
| `expires_at` | timestamp | |
| `used_at` | timestamp | Null until consumed |
| `created_at` | timestamp | |

---

### `watch_groups`

A named group of friends who watch movies together. Groups persist across many watch parties.

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | |
| `name` | text | |
| `created_at` | timestamp | |

---

### `watch_group_members`

Join table connecting users to watch groups with a role. A host can advance the watch party status, create parties, and generate magic links. A guest can suggest and vote.

| Field | Type | Notes |
|-------|------|-------|
| `group_id` | integer FK → watch_groups | |
| `user_id` | integer FK → users | |
| `role` | enum: `host` \| `guest` | |
| `joined_at` | timestamp | |

Primary key: `(group_id, user_id)`

---

### `watch_parties`

A single movie night event belonging to a watch group. Moves through a linear status lifecycle driven by the host.

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | |
| `watch_group_id` | integer FK → watch_groups | |
| `status` | enum | See lifecycle below |
| `scheduled_for` | timestamp | Nullable — set when the date is decided |
| `selected_category` | text | Nullable — set when host closes category suggestions |
| `winning_suggestion_id` | integer FK → movie_suggestions | Nullable — set when bracket voting concludes |
| `created_at` | timestamp | |

#### Status lifecycle

```
draft
  └─▶ open_for_category_suggestions
        └─▶ category_suggestions_closed
              └─▶ open_for_movie_suggestions
                    └─▶ movie_suggestions_closed
                          └─▶ voting
                                └─▶ movie_selected
                                      └─▶ watched
```

Only a host can advance the status. The transition `movie_suggestions_closed → voting` triggers bracket generation.

---

### `category_suggestions`

A genre or vibe suggested by any group member during the category suggestion phase. The host picks from these (or ignores them) when closing the category phase — there is no vote on categories.

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | |
| `watch_party_id` | integer FK → watch_parties | |
| `suggested_by` | integer FK → users | |
| `name` | text | e.g. "90s thriller", "Studio Ghibli" |
| `created_at` | timestamp | |

---

### `movie_suggestions`

A movie nominated by a group member during the movie suggestion phase. Movie metadata is sourced from the TMDB API and cached here.

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | |
| `watch_party_id` | integer FK → watch_parties | |
| `suggested_by` | integer FK → users | |
| `tmdb_id` | integer | TMDB movie ID |
| `title` | text | |
| `poster_path` | text | TMDB poster path |
| `overview` | text | |
| `release_year` | integer | |
| `created_at` | timestamp | |

---

### `brackets`

A single head-to-head matchup between two movie suggestions. Brackets are generated automatically when the host transitions the party to the `voting` status. Multiple rounds are used to run a full tournament.

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | |
| `watch_party_id` | integer FK → watch_parties | |
| `round` | integer | Starts at 1 |
| `suggestion_a_id` | integer FK → movie_suggestions | |
| `suggestion_b_id` | integer FK → movie_suggestions | |
| `winner_id` | integer FK → movie_suggestions | Nullable — set when voting closes for this bracket |
| `created_at` | timestamp | |

#### Bracket generation

When the party enters `voting`, movie suggestions are shuffled and paired into round-1 brackets. If there is an odd number of suggestions, one gets a bye (auto-advances). When all brackets in a round have a winner, the next round is generated from the winners. The final bracket's winner becomes `watch_parties.winning_suggestion_id`.

---

### `movie_votes`

A user's vote in a single bracket. One row per user per bracket — re-voting overwrites the existing row (`voted_for` is updated in place, `updated_at` is set).

| Field | Type | Notes |
|-------|------|-------|
| `id` | integer PK | |
| `bracket_id` | integer FK → brackets | |
| `user_id` | integer FK → users | |
| `voted_for` | integer FK → movie_suggestions | Must be `suggestion_a_id` or `suggestion_b_id` |
| `created_at` | timestamp | |
| `updated_at` | timestamp | Updated on re-vote |

Unique constraint: `(bracket_id, user_id)`

---

## Auth

Users are pre-created by a host. To log in, the host generates a magic link for a user — this inserts a new row in `magic_link_tokens` (invalidating any prior unused token for that user). The user opens the link, the token is validated and marked `used_at`, and a session is established.

Sessions can be stored as a simple signed cookie containing the `user_id` — no external session store needed for this scale.

---

## External integrations

- **TMDB API** — used for movie search during the suggestion phase. Metadata (title, poster, overview, release year) is stored on `movie_suggestions` at suggestion time so the app does not depend on TMDB at read time.
- **TMDB npm wrapper**: [lorenzopant/tmdb](https://github.com/lorenzopant/tmdb)
