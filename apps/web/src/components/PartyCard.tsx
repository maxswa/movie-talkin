import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useMe } from '../hooks/useMe';
import { usePartySocket } from '../hooks/usePartySocket';
import {
  api,
  tmdbImageUrl,
  type CategorySuggestion,
  type MovieSuggestion,
  type WatchPartyDetail,
} from '../lib/api';
import { formatDate } from '../lib/utils';
import { RoundCountdown } from './RoundCountdown';
import { StatusBadge } from './StatusBadge';

export function PartyCard({ party }: { party: WatchPartyDetail }) {
  usePartySocket(party.id);
  const { user } = useMe();
  const isVoting = party.status === 'voting';
  const isMovieSuggestPhase = party.status === 'open_for_movie_suggestions';
  const isCategorySuggestPhase = party.status === 'open_for_category_suggestions';

  const { data: rounds = [] } = useQuery({
    queryKey: ['brackets', party.id],
    queryFn: () => api.brackets.list(party.id),
    enabled: isVoting,
  });

  const { data: movieSuggestions = [] } = useQuery({
    queryKey: ['movie-suggestions', party.id],
    queryFn: () => api.movieSuggestions.list(party.id),
    enabled: isMovieSuggestPhase,
  });

  const { data: categorySuggestions = [] } = useQuery({
    queryKey: ['category-suggestions', party.id],
    queryFn: () => api.categorySuggestions.list(party.id),
    enabled: isCategorySuggestPhase,
  });

  const currentRoundNumber = rounds.length > 0 ? Math.max(...rounds.map((r) => r.round)) : null;
  const currentRoundData =
    currentRoundNumber != null ? rounds.find((r) => r.round === currentRoundNumber) : null;
  const currentEndsAt = currentRoundData?.brackets.find((b) => b.roundEndsAt)?.roundEndsAt ?? null;

  return (
    <Link
      to="/party/$partyId"
      params={{ partyId: party.id }}
      aria-label={`Open ${party.selectedCategory ?? 'party'} details`}
      className="rounded-2xl bg-surface p-5 flex flex-col gap-4 hover:bg-white/5 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{party.selectedCategory || 'Category TBD'}</p>
        <StatusBadge status={party.status} />
      </div>

      {party.scheduledFor && (
        <p className="text-white/70 text-sm">📅 {formatDate(party.scheduledFor)}</p>
      )}

      {isVoting && currentEndsAt && <RoundCountdown endsAt={currentEndsAt} />}

      <PartyPreview
        party={party}
        rounds={rounds}
        movieSuggestions={movieSuggestions}
        categorySuggestions={categorySuggestions}
        currentUserId={user?.id ?? null}
      />

      <p className="text-xs text-white/60 text-right">Tap to open →</p>
    </Link>
  );
}

function PartyPreview({
  party,
  rounds,
  movieSuggestions,
  categorySuggestions,
  currentUserId,
}: {
  party: WatchPartyDetail;
  rounds: { round: number; brackets: { winnerId: string | null }[] }[];
  movieSuggestions: MovieSuggestion[];
  categorySuggestions: CategorySuggestion[];
  currentUserId: string | null;
}) {
  switch (party.status) {
    case 'draft':
      return <p className="text-sm text-white/70">Your host is planning the next party</p>;

    case 'open_for_category_suggestions': {
      const own = currentUserId
        ? categorySuggestions.find((s) => s.suggestedBy.id === currentUserId)
        : undefined;
      const otherCount = categorySuggestions.length - (own ? 1 : 0);

      if (own) {
        return (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <p className="text-[11px] uppercase tracking-wide text-white/60">Your pick</p>
              <span className="self-start rounded-full bg-accent-purple/25 ring-1 ring-accent-purple/50 px-3 py-1 text-sm font-medium">
                {own.name}
              </span>
            </div>
            {otherCount > 0 && (
              <p className="text-xs text-white/70">
                {otherCount} other{otherCount === 1 ? '' : 's'}{' '}
                {otherCount === 1 ? 'has' : 'have'} suggested a category
              </p>
            )}
          </div>
        );
      }

      if (categorySuggestions.length === 0) {
        return <p className="text-sm text-white/70">No categories suggested yet — be the first.</p>;
      }
      return (
        <p className="text-sm text-white/70">
          {categorySuggestions.length} categor
          {categorySuggestions.length === 1 ? 'y' : 'ies'} suggested — you still need to make your
          pick!
        </p>
      );
    }

    case 'category_suggestions_closed':
      return <p className="text-sm text-white/70">Movie suggestions opening soon…</p>;

    case 'open_for_movie_suggestions': {
      const own = currentUserId
        ? movieSuggestions.find((s) => s.suggestedBy.id === currentUserId)
        : undefined;
      const otherCount = movieSuggestions.length - (own ? 1 : 0);

      if (own) {
        const poster = tmdbImageUrl(own.posterPath, 'w185');
        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {poster ? (
                <img
                  src={poster}
                  alt={own.title}
                  className="w-12 h-16 object-cover rounded-lg shrink-0"
                />
              ) : (
                <div className="w-12 h-16 rounded-lg bg-white/10 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide text-white/60">Your pick</p>
                <p className="text-sm font-medium truncate">{own.title}</p>
                {own.releaseYear && <p className="text-xs text-white/70">{own.releaseYear}</p>}
              </div>
            </div>
            {otherCount > 0 && (
              <p className="text-xs text-white/70">
                {otherCount} other{otherCount === 1 ? '' : 's'} {otherCount === 1 ? 'has' : 'have'}{' '}
                suggested a movie
              </p>
            )}
          </div>
        );
      }

      if (movieSuggestions.length === 0) {
        return <p className="text-sm text-white/70">No movies suggested yet — be the first.</p>;
      }
      return (
        <p className="text-sm text-white/70">
          {movieSuggestions.length} movie{movieSuggestions.length === 1 ? '' : 's'} suggested — you
          still need to make your pick!
        </p>
      );
    }

    case 'movie_suggestions_closed':
      return party.votingStartsAt ? (
        <VotingStartsCountdown startsAt={party.votingStartsAt} />
      ) : (
        <p className="text-sm text-white/70">Voting will open shortly…</p>
      );

    case 'voting': {
      if (rounds.length === 0) {
        return <p className="text-sm text-white/70">Brackets being set up…</p>;
      }
      const currentRound = Math.max(...rounds.map((r) => r.round));
      const data = rounds.find((r) => r.round === currentRound);
      const open = data?.brackets.filter((b) => b.winnerId === null).length ?? 0;
      const total = data?.brackets.length ?? 0;
      return (
        <p className="text-sm text-white/70">
          Round {currentRound} · {open} of {total} match{total === 1 ? '' : 'es'} still open
        </p>
      );
    }

    case 'movie_selected':
    case 'watched': {
      const movie = party.winningSuggestion;
      if (!movie) return null;
      const poster = tmdbImageUrl(movie.posterPath, 'w185');
      return (
        <div className="flex items-center gap-3">
          {poster ? (
            <img
              src={poster}
              alt={movie.title}
              className="w-12 h-16 object-cover rounded-lg shrink-0"
            />
          ) : (
            <div className="w-12 h-16 rounded-lg bg-white/10 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{movie.title}</p>
            {movie.releaseYear && <p className="text-xs text-white/70">{movie.releaseYear}</p>}
            <p className="text-xs text-white/60 truncate">Picked by {movie.suggestedBy.name}</p>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

function VotingStartsCountdown({ startsAt }: { startsAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = new Date(startsAt).getTime() - now;
  if (remainingMs <= 0) return <p className="text-sm text-white/70">Voting opening…</p>;
  if (remainingMs < 60_000) {
    return <p className="text-sm text-white/70">Voting will start in less than a minute.</p>;
  }

  return (
    <p className="text-sm text-white/70">
      Voting will start in {formatRelativeUntil(remainingMs)}.
    </p>
  );
}

function formatRelativeUntil(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const minutes = totalMin % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);

  if (parts.length <= 1) return parts[0] ?? 'less than a minute';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}
