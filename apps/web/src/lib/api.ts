const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  name: string;
  email: string | null;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  role: "host" | "guest";
}

export interface GroupMember {
  userId: string;
  name: string;
  role: "host" | "guest";
  joinedAt: string;
}

export interface GroupDetail extends Omit<Group, "role"> {
  members: GroupMember[];
}

export type WatchPartyStatus =
  | "draft"
  | "open_for_category_suggestions"
  | "category_suggestions_closed"
  | "open_for_movie_suggestions"
  | "movie_suggestions_closed"
  | "voting"
  | "movie_selected"
  | "watched";

export interface WatchParty {
  id: string;
  watchGroupId: string;
  status: WatchPartyStatus;
  scheduledFor: string | null;
  selectedCategory: string | null;
  winningSuggestionId: string | null;
  createdAt: string;
}

export interface SuggestedBy {
  id: string;
  name: string;
}

export interface CategorySuggestion {
  id: string;
  watchPartyId: string;
  suggestedBy: SuggestedBy;
  name: string;
  createdAt: string;
}

export interface MovieSuggestion {
  id: string;
  watchPartyId: string;
  suggestedBy: SuggestedBy;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  overview: string | null;
  releaseYear: number | null;
  createdAt: string;
}

export interface WatchPartyDetail extends WatchParty {
  members: GroupMember[];
  winningSuggestion: MovieSuggestion | null;
}

export interface TmdbMovie {
  id: number;
  title: string;
  posterPath: string | null;
  overview: string | null;
  releaseYear: number | null;
}

export interface Bracket {
  id: string;
  round: number;
  suggestionA: MovieSuggestion;
  suggestionB: MovieSuggestion;
  voteCountA: number;
  voteCountB: number;
  myVote: string | null;
  winnerId: string | null;
}

export interface BracketRound {
  round: number;
  brackets: Bracket[];
}

export function tmdbImageUrl(path: string | null, size = "w342"): string | null {
  if (!path) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const api = {
  auth: {
    verify: (token: string) => request<{ ok: boolean }>(`/auth/verify?token=${token}`),
    me: () => request<User>("/auth/me"),
    logout: () => request<{ ok: boolean }>("/auth/logout", { method: "POST" }),
  },

  users: {
    create: (name: string, email?: string) =>
      request<User & { magicLink: string }>("/users", {
        method: "POST",
        body: JSON.stringify({ name, email }),
      }),
    magicLink: (userId: string) =>
      request<{ magicLink: string }>(`/users/${userId}/magic-link`, { method: "POST" }),
  },

  groups: {
    list: () => request<Group[]>("/groups"),
    get: (groupId: string) => request<GroupDetail>(`/groups/${groupId}`),
    addMember: (groupId: string, userId: string, role: "host" | "guest" = "guest") =>
      request<{ ok: boolean }>(`/groups/${groupId}/members`, {
        method: "POST",
        body: JSON.stringify({ userId, role }),
      }),
    removeMember: (groupId: string, userId: string) =>
      request<{ ok: boolean }>(`/groups/${groupId}/members/${userId}`, { method: "DELETE" }),
  },

  parties: {
    list: (groupId: string) => request<WatchParty[]>(`/groups/${groupId}/parties`),
    get: (partyId: string) => request<WatchPartyDetail>(`/parties/${partyId}`),
    create: (groupId: string) =>
      request<WatchParty>(`/groups/${groupId}/parties`, { method: "POST" }),
    update: (partyId: string, body: { scheduledFor?: string | null }) =>
      request<WatchParty>(`/parties/${partyId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    advance: (partyId: string, body: { selectedCategory?: string } = {}) =>
      request<WatchParty>(`/parties/${partyId}/advance`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  categorySuggestions: {
    list: (partyId: string) =>
      request<CategorySuggestion[]>(`/parties/${partyId}/category-suggestions`),
    create: (partyId: string, name: string) =>
      request<CategorySuggestion>(`/parties/${partyId}/category-suggestions`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
  },

  movieSuggestions: {
    list: (partyId: string) =>
      request<MovieSuggestion[]>(`/parties/${partyId}/movie-suggestions`),
    create: (partyId: string, tmdbId: number) =>
      request<MovieSuggestion>(`/parties/${partyId}/movie-suggestions`, {
        method: "POST",
        body: JSON.stringify({ tmdbId }),
      }),
  },

  tmdb: {
    search: (q: string) =>
      request<TmdbMovie[]>(`/tmdb/search?q=${encodeURIComponent(q)}`),
  },

  brackets: {
    list: (partyId: string) => request<BracketRound[]>(`/parties/${partyId}/brackets`),
    vote: (bracketId: string, suggestionId: string) =>
      request<{ ok: boolean }>(`/brackets/${bracketId}/vote`, {
        method: "POST",
        body: JSON.stringify({ suggestionId }),
      }),
    closeRound: (partyId: string) =>
      request<WatchParty>(`/parties/${partyId}/brackets/close-round`, { method: "POST" }),
  },
};
