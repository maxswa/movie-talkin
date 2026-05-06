import { int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").unique(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const magicLinkTokens = sqliteTable("magic_link_tokens", {
  id: int("id").primaryKey({ autoIncrement: true }),
  userId: int("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const watchGroups = sqliteTable("watch_groups", {
  id: int("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const watchGroupMembers = sqliteTable(
  "watch_group_members",
  {
    groupId: int("group_id")
      .notNull()
      .references(() => watchGroups.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // host | guest
    role: text("role").notNull().default("guest"),
    joinedAt: text("joined_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [unique().on(t.groupId, t.userId)]
);

export const watchParties = sqliteTable("watch_parties", {
  id: int("id").primaryKey({ autoIncrement: true }),
  watchGroupId: int("watch_group_id")
    .notNull()
    .references(() => watchGroups.id, { onDelete: "cascade" }),
  // draft | open_for_category_suggestions | category_suggestions_closed |
  // open_for_movie_suggestions | movie_suggestions_closed | voting |
  // movie_selected | watched
  status: text("status").notNull().default("draft"),
  scheduledFor: text("scheduled_for"),
  selectedCategory: text("selected_category"),
  // set when bracket voting concludes — references movie_suggestions
  winningSuggestionId: int("winning_suggestion_id"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const categorySuggestions = sqliteTable("category_suggestions", {
  id: int("id").primaryKey({ autoIncrement: true }),
  watchPartyId: int("watch_party_id")
    .notNull()
    .references(() => watchParties.id, { onDelete: "cascade" }),
  suggestedBy: int("suggested_by")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const movieSuggestions = sqliteTable("movie_suggestions", {
  id: int("id").primaryKey({ autoIncrement: true }),
  watchPartyId: int("watch_party_id")
    .notNull()
    .references(() => watchParties.id, { onDelete: "cascade" }),
  suggestedBy: int("suggested_by")
    .notNull()
    .references(() => users.id),
  tmdbId: int("tmdb_id").notNull(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  overview: text("overview"),
  releaseYear: int("release_year"),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const brackets = sqliteTable("brackets", {
  id: int("id").primaryKey({ autoIncrement: true }),
  watchPartyId: int("watch_party_id")
    .notNull()
    .references(() => watchParties.id, { onDelete: "cascade" }),
  round: int("round").notNull(),
  suggestionAId: int("suggestion_a_id")
    .notNull()
    .references(() => movieSuggestions.id),
  suggestionBId: int("suggestion_b_id")
    .notNull()
    .references(() => movieSuggestions.id),
  // null until the round closes
  winnerId: int("winner_id").references(() => movieSuggestions.id),
  createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
});

export const movieVotes = sqliteTable(
  "movie_votes",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    bracketId: int("bracket_id")
      .notNull()
      .references(() => brackets.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id),
    votedFor: int("voted_for")
      .notNull()
      .references(() => movieSuggestions.id),
    createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
    updatedAt: text("updated_at").notNull().default(sql`(current_timestamp)`),
  },
  (t) => [unique().on(t.bracketId, t.userId)]
);
