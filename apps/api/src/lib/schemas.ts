import { z } from 'zod';

export const ErrorSchema = z.object({ error: z.string() });
export const OkSchema = z.object({ ok: z.boolean() });

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().nullable(),
  createdAt: z.string(),
});

export const GroupMemberSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.enum(['host', 'guest']),
  joinedAt: z.string(),
});

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export const GroupDetailSchema = GroupSchema.extend({
  members: z.array(GroupMemberSchema),
});

export const GroupSummarySchema = GroupSchema.extend({
  role: z.enum(['host', 'guest']),
});

export const WATCH_PARTY_STATUSES = [
  'draft',
  'open_for_category_suggestions',
  'category_suggestions_closed',
  'open_for_movie_suggestions',
  'movie_suggestions_closed',
  'voting',
  'movie_selected',
  'watched',
] as const;

export type WatchPartyStatus = (typeof WATCH_PARTY_STATUSES)[number];

export const WatchPartySchema = z.object({
  id: z.string(),
  watchGroupId: z.string(),
  status: z.enum(WATCH_PARTY_STATUSES),
  scheduledFor: z.string().nullable(),
  selectedCategory: z.string().nullable(),
  winningSuggestionId: z.string().nullable(),
  createdAt: z.string(),
});

export const SuggestedBySchema = z.object({ id: z.string(), name: z.string() });

export const MovieSuggestionSchema = z.object({
  id: z.string(),
  watchPartyId: z.string(),
  suggestedBy: SuggestedBySchema,
  tmdbId: z.number(),
  title: z.string(),
  posterPath: z.string().nullable(),
  overview: z.string().nullable(),
  releaseYear: z.number().nullable(),
  createdAt: z.string(),
});

export const WatchPartyDetailSchema = WatchPartySchema.extend({
  members: z.array(GroupMemberSchema),
  winningSuggestion: MovieSuggestionSchema.nullable(),
});

export const CategorySuggestionSchema = z.object({
  id: z.string(),
  watchPartyId: z.string(),
  suggestedBy: SuggestedBySchema,
  name: z.string(),
  createdAt: z.string(),
});

export const BracketSchema = z.object({
  id: z.string(),
  round: z.number(),
  suggestionA: MovieSuggestionSchema,
  suggestionB: MovieSuggestionSchema,
  voteCountA: z.number(),
  voteCountB: z.number(),
  myVote: z.string().nullable(),
  winnerId: z.string().nullable(),
});

export const BracketRoundSchema = z.object({
  round: z.number(),
  brackets: z.array(BracketSchema),
});
