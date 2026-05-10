import { useQuery } from '@tanstack/react-query';
import { tmdbImageUrl, type CategorySpinPayload, type WatchPartyDetail } from '../lib/api';
import { BracketView } from './BracketView';
import { CategorySpinner } from './CategorySpinner';
import { CategorySuggestions } from './CategorySuggestions';
import { ContentWarnings } from './ContentWarnings';
import { MovieSuggestions } from './MovieSuggestions';
import { PlanningStage } from './PlanningStage';

export function PartyBody({ party }: { party: WatchPartyDetail }) {
  const { data: spin } = useQuery<CategorySpinPayload | null>({
    queryKey: ['category-spin', party.id],
    queryFn: () => null,
    enabled: false,
    staleTime: Infinity,
  });

  if (spin) {
    return <CategorySpinner partyId={party.id} spin={spin} />;
  }

  switch (party.status) {
    case 'draft':
      return (
        <p className="text-white/40 text-sm text-center py-8">
          Your host is planning the next party…
        </p>
      );

    case 'open_for_category_suggestions':
      return <CategorySuggestions partyId={party.id} />;

    case 'category_suggestions_closed':
      return (
        <div className="flex flex-col items-center gap-3 py-6 rounded-2xl bg-surface">
          <p className="text-white/40 text-xs uppercase tracking-widest">Category</p>
          <span className="rounded-full bg-accent-purple/20 text-accent-purple px-5 py-2 text-sm font-medium">
            {party.selectedCategory}
          </span>
          <p className="text-white/40 text-sm mt-1">Movie suggestions opening soon…</p>
        </div>
      );

    case 'open_for_movie_suggestions':
      return <MovieSuggestions partyId={party.id} />;

    case 'movie_suggestions_closed':
      return <PlanningStage party={party} />;

    case 'voting':
      return <BracketView party={party} />;

    case 'movie_selected':
    case 'watched': {
      const movie = party.winningSuggestion;
      if (!movie) return null;
      const poster = tmdbImageUrl(movie.posterPath);
      return (
        <div className="flex flex-col items-center gap-4 py-4">
          {poster && <img src={poster} alt={movie.title} className="w-36 rounded-xl shadow-2xl" />}
          <div className="text-center">
            <p className="font-semibold text-lg leading-snug">{movie.title}</p>
            {movie.releaseYear && <p className="text-white/40 text-sm">{movie.releaseYear}</p>}
            <p className="text-white/50 text-xs mt-2">Suggested by {movie.suggestedBy.name}</p>
          </div>
          <ContentWarnings title={movie.title} year={movie.releaseYear} />
        </div>
      );
    }

    default:
      return null;
  }
}
