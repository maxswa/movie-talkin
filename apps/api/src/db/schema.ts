import { randomUUID } from "crypto";
import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";

const uuid = () => text("id").primaryKey().$defaultFn(() => randomUUID());
const now = () => text().$defaultFn(() => new Date().toISOString());

export const users = sqliteTable("users", {
  id: uuid(),
  name: text("name").notNull(),
  email: text("email").unique(),
  createdAt: now().notNull(),
});

export const magicLinkTokens = sqliteTable("magic_link_tokens", {
  id: uuid(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: now().notNull(),
});

export const watchGroups = sqliteTable("watch_groups", {
  id: uuid(),
  name: text("name").notNull(),
  createdAt: now().notNull(),
});

export const watchGroupMembers = sqliteTable(
  "watch_group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => watchGroups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("guest"),
    joinedAt: now().notNull(),
  },
  (t) => [unique().on(t.groupId, t.userId)]
);

export const watchParties = sqliteTable("watch_parties", {
  id: uuid(),
  watchGroupId: text("watch_group_id")
    .notNull()
    .references(() => watchGroups.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("draft"),
  scheduledFor: text("scheduled_for"),
  selectedCategory: text("selected_category"),
  winningSuggestionId: text("winning_suggestion_id"),
  createdAt: now().notNull(),
});

export const categorySuggestions = sqliteTable("category_suggestions", {
  id: uuid(),
  watchPartyId: text("watch_party_id")
    .notNull()
    .references(() => watchParties.id, { onDelete: "cascade" }),
  suggestedBy: text("suggested_by")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  createdAt: now().notNull(),
});

export const movieSuggestions = sqliteTable("movie_suggestions", {
  id: uuid(),
  watchPartyId: text("watch_party_id")
    .notNull()
    .references(() => watchParties.id, { onDelete: "cascade" }),
  suggestedBy: text("suggested_by")
    .notNull()
    .references(() => users.id),
  tmdbId: integer("tmdb_id").notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  overview: text("overview"),
  releaseYear: integer("release_year"),
  createdAt: now().notNull(),
});

export const brackets = sqliteTable("brackets", {
  id: uuid(),
  watchPartyId: text("watch_party_id")
    .notNull()
    .references(() => watchParties.id, { onDelete: "cascade" }),
  round: integer("round").notNull(),
  suggestionAId: text("suggestion_a_id")
    .notNull()
    .references(() => movieSuggestions.id),
  suggestionBId: text("suggestion_b_id")
    .notNull()
    .references(() => movieSuggestions.id),
  winnerId: text("winner_id").references(() => movieSuggestions.id),
  createdAt: now().notNull(),
});

export const movieVotes = sqliteTable(
  "movie_votes",
  {
    id: uuid(),
    bracketId: text("bracket_id")
      .notNull()
      .references(() => brackets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    votedFor: text("voted_for")
      .notNull()
      .references(() => movieSuggestions.id),
    createdAt: now().notNull(),
    updatedAt: now().notNull(),
  },
  (t) => [unique().on(t.bracketId, t.userId)]
);
