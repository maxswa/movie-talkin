import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { usePartySocket } from '../hooks/usePartySocket';
import { useMe } from '../hooks/useMe';
import { api } from '../lib/api';
import { MovieSuggestionItem } from './MovieSuggestionItem';

export function MovieSuggestions({ partyId }: { partyId: string }) {
  const { user } = useMe();
  usePartySocket(partyId);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['movie-suggestions', partyId],
    queryFn: () => api.movieSuggestions.list(partyId),
  });

  const hasUserSuggested = suggestions.some((s) => s.suggestedBy.id === user?.id);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {suggestions.length === 0 && (
          <li className="text-white/30 text-sm text-center py-4">No movies suggested yet.</li>
        )}
        {suggestions.map((s) => (
          <MovieSuggestionItem
            key={s.id}
            suggestion={s}
            isOwn={s.suggestedBy.id === user?.id}
            partyId={s.suggestedBy.id === user?.id ? partyId : undefined}
          />
        ))}
      </ul>

      {!hasUserSuggested && (
        <Link
          to="/search"
          search={{ partyId }}
          className="block rounded-xl bg-accent-purple py-3 text-sm font-medium text-center"
        >
          Suggest a movie
        </Link>
      )}
    </div>
  );
}
