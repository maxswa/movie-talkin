import { randomUUID } from 'crypto';
import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core';

const uuid = () =>
  text('id')
    .primaryKey()
    .$defaultFn(() => randomUUID());
const now = () => text().$defaultFn(() => new Date().toISOString());

export const users = sqliteTable('users', {
  id: uuid(),
  name: text('name').notNull(),
  email: text('email').unique(),
  createdAt: now().notNull(),
});

export const magicLinkTokens = sqliteTable(
  'magic_link_tokens',
  {
    id: uuid(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: now().notNull(),
  },
  (t) => [index('magic_link_tokens_user_id_idx').on(t.userId)],
);

export const watchGroups = sqliteTable('watch_groups', {
  id: uuid(),
  name: text('name').notNull(),
  createdAt: now().notNull(),
});

export const watchGroupMembers = sqliteTable(
  'watch_group_members',
  {
    groupId: text('group_id')
      .notNull()
      .references(() => watchGroups.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('guest'),
    joinedAt: now().notNull(),
  },
  (t) => [unique().on(t.groupId, t.userId), index('watch_group_members_user_id_idx').on(t.userId)],
);

export const watchParties = sqliteTable(
  'watch_parties',
  {
    id: uuid(),
    watchGroupId: text('watch_group_id')
      .notNull()
      .references(() => watchGroups.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('draft'),
    scheduledFor: text('scheduled_for'),
    selectedCategory: text('selected_category'),
    winningSuggestionId: text('winning_suggestion_id'),
    votingStartsAt: text('voting_starts_at'),
    votingDurationMs: integer('voting_duration_ms'),
    createdAt: now().notNull(),
  },
  (t) => [
    index('watch_parties_group_id_idx').on(t.watchGroupId),
    index('watch_parties_status_idx').on(t.status),
  ],
);

export const categorySuggestions = sqliteTable(
  'category_suggestions',
  {
    id: uuid(),
    watchPartyId: text('watch_party_id')
      .notNull()
      .references(() => watchParties.id, { onDelete: 'cascade' }),
    suggestedBy: text('suggested_by')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    createdAt: now().notNull(),
  },
  (t) => [index('category_suggestions_party_id_idx').on(t.watchPartyId)],
);

export const movieSuggestions = sqliteTable(
  'movie_suggestions',
  {
    id: uuid(),
    watchPartyId: text('watch_party_id')
      .notNull()
      .references(() => watchParties.id, { onDelete: 'cascade' }),
    suggestedBy: text('suggested_by')
      .notNull()
      .references(() => users.id),
    tmdbId: integer('tmdb_id').notNull(),
    title: text('title').notNull(),
    posterPath: text('poster_path'),
    overview: text('overview'),
    releaseYear: integer('release_year'),
    createdAt: now().notNull(),
  },
  (t) => [index('movie_suggestions_party_id_idx').on(t.watchPartyId)],
);

export const brackets = sqliteTable(
  'brackets',
  {
    id: uuid(),
    watchPartyId: text('watch_party_id')
      .notNull()
      .references(() => watchParties.id, { onDelete: 'cascade' }),
    round: integer('round').notNull(),
    suggestionAId: text('suggestion_a_id')
      .notNull()
      .references(() => movieSuggestions.id),
    suggestionBId: text('suggestion_b_id')
      .notNull()
      .references(() => movieSuggestions.id),
    winnerId: text('winner_id').references(() => movieSuggestions.id),
    roundEndsAt: text('round_ends_at'),
    createdAt: now().notNull(),
  },
  (t) => [
    index('brackets_party_id_idx').on(t.watchPartyId),
    index('brackets_party_round_idx').on(t.watchPartyId, t.round),
  ],
);

export const movieVotes = sqliteTable(
  'movie_votes',
  {
    id: uuid(),
    bracketId: text('bracket_id')
      .notNull()
      .references(() => brackets.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id),
    votedFor: text('voted_for')
      .notNull()
      .references(() => movieSuggestions.id),
    createdAt: now().notNull(),
    updatedAt: now().notNull(),
  },
  (t) => [unique().on(t.bracketId, t.userId)],
);
